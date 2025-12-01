import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, where, addDoc, DocumentReference } from "firebase/firestore";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFieldArray } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

const db = getFirestore(auth.app);

const goalSchema = z.object({
  team: z.enum(["home", "away"]),
  scorerName: z.string().min(1),
  scorerId: z.string().min(1),
});

const cardSchema = z.object({
  team: z.enum(["home", "away"]),
  playerName: z.string().min(1),
  playerId: z.string().min(1),
});

const formSchema = z.object({
  homeScore: z.coerce.number().min(0),
  awayScore: z.coerce.number().min(0),
  goals: z.array(goalSchema),
  yellowCards: z.array(cardSchema),
  redCards: z.array(cardSchema),
});

interface LiveResultFormProps {
  gameId: string;
  onFinished: () => void;
  gameCollection?: string;
  liveResultCollection?: string;
  liveGoalsCollection?: string;
  liveCardsCollection?: string;
}

const LiveResultForm = ({
  gameId,
  onFinished,
  gameCollection = "games",
  liveResultCollection = "live_results",
  liveGoalsCollection = "live_goals",
  liveCardsCollection = "live_cards",
}: LiveResultFormProps) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeScore: 0,
      awayScore: 0,
      goals: [],
      yellowCards: [],
      redCards: [],
    },
  });

  const { fields: goalFields, append: appendGoal, remove: removeGoal } = useFieldArray({ control: form.control, name: "goals" });
  const { fields: yellowCardFields, append: appendYellowCard, remove: removeYellowCard } = useFieldArray({ control: form.control, name: "yellowCards" });
  const { fields: redCardFields, append: appendRedCard, remove: removeRedCard } = useFieldArray({ control: form.control, name: "redCards" });

  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      try {
        const resultRef = doc(db, liveResultCollection, gameId);
        const resultSnap = await getDoc(resultRef);
        const goalsSnap = await getDocs(query(collection(db, liveGoalsCollection), where("gameId", "==", gameId)));
        const cardsSnap = await getDocs(query(collection(db, liveCardsCollection), where("gameId", "==", gameId)));

        const existingGoals = goalsSnap.docs.map((d) => d.data() as any).map((g) => ({
          team: (g.teamSide as "home" | "away") ?? "home",
          scorerName: g.scorerName ?? "",
          scorerId: g.scorerId ?? "",
        }));

        const yellowCards = cardsSnap.docs
          .map((d) => d.data() as any)
          .filter((c) => (c.cardType ?? "").toLowerCase() === "yellow")
          .map((c) => ({
            team: (c.teamSide as "home" | "away") ?? "home",
            playerName: c.playerName ?? "",
            playerId: c.playerId ?? "",
          }));

        const redCards = cardsSnap.docs
          .map((d) => d.data() as any)
          .filter((c) => (c.cardType ?? "").toLowerCase() === "red")
          .map((c) => ({
            team: (c.teamSide as "home" | "away") ?? "home",
            playerName: c.playerName ?? "",
            playerId: c.playerId ?? "",
          }));

        if (!cancelled) {
          if (resultSnap.exists()) {
            const data = resultSnap.data() as any;
            form.reset({
              homeScore: Number(data.homeScore ?? 0),
              awayScore: Number(data.awayScore ?? 0),
              goals: existingGoals,
              yellowCards,
              redCards,
            });
          } else {
            form.reset({
              homeScore: 0,
              awayScore: 0,
              goals: existingGoals,
              yellowCards,
              redCards,
            });
          }
        }
      } catch (e) {
        // silent
      }
    };
    void loadExisting();
    return () => {
      cancelled = true;
    };
  }, [gameId, liveResultCollection, liveGoalsCollection, liveCardsCollection]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { goals, homeScore, awayScore, yellowCards, redCards } = values;

    const normalizedGoals = goals.map((goal) => ({
      ...goal,
      scorerName: goal.scorerName.trim(),
      scorerId: goal.scorerId.trim(),
    }));

    const normalizedYellowCards = yellowCards.map((card) => ({
      ...card,
      playerName: card.playerName.trim(),
      playerId: card.playerId.trim(),
    }));

    const normalizedRedCards = redCards.map((card) => ({
      ...card,
      playerName: card.playerName.trim(),
      playerId: card.playerId.trim(),
    }));

    try {
      const gameRef = doc(db, gameCollection, gameId);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        throw new Error("Game not found!");
      }

      const { team1, team2 } = gameSnap.data() as { team1?: DocumentReference; team2?: DocumentReference };
      if (!team1 || !team2) {
        throw new Error("Game document is missing team references!");
      }

      const homeTeamRef = team1;
      const awayTeamRef = team2;

      const liveRef = doc(db, liveResultCollection, gameId);
      const existingLiveSnap = await getDoc(liveRef);
      const timestamp = serverTimestamp();

      const baseLiveData = {
        gameId,
        gameRef,
        homeTeamRef,
        awayTeamRef,
        homeTeamId: homeTeamRef.id,
        awayTeamId: awayTeamRef.id,
        homeScore,
        awayScore,
        updatedAt: timestamp,
      };

      const liveData = existingLiveSnap.exists() ? baseLiveData : { ...baseLiveData, createdAt: timestamp };
      await setDoc(liveRef, liveData, { merge: true });

      // Replace live goals
      const goalsCollectionRef = collection(db, liveGoalsCollection);
      const existingGoalsSnap = await getDocs(query(goalsCollectionRef, where("gameId", "==", gameId)));
      if (!existingGoalsSnap.empty) {
        await Promise.all(existingGoalsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      }
      if (normalizedGoals.length > 0) {
        await Promise.all(
          normalizedGoals.map((goal) => {
            const isHomeGoal = goal.team === "home";
            const teamRef = isHomeGoal ? homeTeamRef : awayTeamRef;
            const goalPayload: Record<string, unknown> = {
              gameId,
              teamSide: goal.team,
              teamRef,
              teamId: teamRef.id,
              scorerName: goal.scorerName,
              scorerId: goal.scorerId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            return addDoc(goalsCollectionRef, goalPayload);
          }),
        );
      }

      // Replace live cards
      const cardsCollectionRef = collection(db, liveCardsCollection);
      const existingCardsSnap = await getDocs(query(cardsCollectionRef, where("gameId", "==", gameId)));
      if (!existingCardsSnap.empty) {
        await Promise.all(existingCardsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      }
      const combinedCards = [
        ...normalizedYellowCards.map((card) => ({ ...card, cardType: "yellow" as const })),
        ...normalizedRedCards.map((card) => ({ ...card, cardType: "red" as const })),
      ];
      if (combinedCards.length > 0) {
        await Promise.all(
          combinedCards.map((card) => {
            const isHomeCard = card.team === "home";
            const teamRef = isHomeCard ? homeTeamRef : awayTeamRef;
            const cardPayload: Record<string, unknown> = {
              gameId,
              teamSide: card.team,
              teamRef,
              teamId: teamRef.id,
              playerName: card.playerName,
              playerId: card.playerId,
              cardType: card.cardType,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            return addDoc(cardsCollectionRef, cardPayload);
          }),
        );
      }

      toast({ title: "Live result updated", description: "Live data saved successfully." });
      onFinished();
    } catch (error) {
      console.error("Error saving live result:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save live result." });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="homeScore" render={({ field }) => (
            <FormItem>
              <FormLabel>Home Score</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="awayScore" render={({ field }) => (
            <FormItem>
              <FormLabel>Away Score</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Yellow Cards</FormLabel>
            <Button type="button" variant="outline" onClick={() => appendYellowCard({ team: "home", playerName: "", playerId: "" })}>
              Add Yellow Card
            </Button>
          </div>
          {yellowCardFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No yellow cards yet.</p>
          ) : (
            yellowCardFields.map((field, index) => (
              <div key={field.id} className="grid gap-3 md:grid-cols-4 md:items-end">
                <FormField control={form.control} name={`yellowCards.${index}.team`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`yellowCards.${index}.playerName`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player name</FormLabel>
                    <FormControl>
                      <Input placeholder="Player name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`yellowCards.${index}.playerId`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Player ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end md:justify-start">
                  <Button type="button" variant="destructive" onClick={() => removeYellowCard(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Red Cards</FormLabel>
            <Button type="button" variant="outline" onClick={() => appendRedCard({ team: "home", playerName: "", playerId: "" })}>
              Add Red Card
            </Button>
          </div>
          {redCardFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No red cards yet.</p>
          ) : (
            redCardFields.map((field, index) => (
              <div key={field.id} className="grid gap-3 md:grid-cols-4 md:items-end">
                <FormField control={form.control} name={`redCards.${index}.team`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`redCards.${index}.playerName`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player name</FormLabel>
                    <FormControl>
                      <Input placeholder="Player name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`redCards.${index}.playerId`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Player ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end md:justify-start">
                  <Button type="button" variant="destructive" onClick={() => removeRedCard(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Goals</FormLabel>
            <Button type="button" variant="outline" onClick={() => appendGoal({ team: "home", scorerName: "", scorerId: "" })}>
              Add Goal
            </Button>
          </div>
          {goalFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals yet.</p>
          ) : (
            goalFields.map((field, index) => (
              <div key={field.id} className="grid gap-3 md:grid-cols-4 md:items-end">
                <FormField control={form.control} name={`goals.${index}.team`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`goals.${index}.scorerName`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scorer name</FormLabel>
                    <FormControl>
                      <Input placeholder="Player name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`goals.${index}.scorerId`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scorer ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Player ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end md:justify-start">
                  <Button type="button" variant="destructive" onClick={() => removeGoal(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Live Result"}
        </Button>
      </form>
    </Form>
  );
};

export default LiveResultForm;
