import { useForm, useFieldArray } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  DocumentReference,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const db = getFirestore();

const goalSchema = z.object({
  team: z.enum(["home", "away"]),
  scorerName: z.string().min(1, "Scorer name is required"),
  scorerId: z.string().min(1, "Scorer ID is required"),
});

const cardSchema = z.object({
  team: z.enum(["home", "away"]),
  playerName: z.string().min(1, "Player name is required"),
  playerId: z.string().min(1, "Player ID is required"),
});

const formSchema = z.object({
  homeScore: z.coerce.number().min(0),
  awayScore: z.coerce.number().min(0),
  goals: z.array(goalSchema),
  yellowCards: z.array(cardSchema),
  redCards: z.array(cardSchema),
});

interface ResultFormProps {
  gameId: string;
  onFinished: () => void;
  gameCollection?: string;
  resultCollection?: string;
  goalsCollection?: string;
  matchContext?: string;
  cardsCollection?: string;
}

const ResultForm = ({
  gameId,
  onFinished,
  gameCollection = "games",
  resultCollection = "results",
  goalsCollection = "goals",
  matchContext,
  cardsCollection = "cards",
}: ResultFormProps) => {
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
  const { fields: goalFields, append: appendGoal, remove: removeGoal } = useFieldArray({
    control: form.control,
    name: "goals",
  });
  const {
    fields: yellowCardFields,
    append: appendYellowCard,
    remove: removeYellowCard,
  } = useFieldArray({
    control: form.control,
    name: "yellowCards",
  });
  const {
    fields: redCardFields,
    append: appendRedCard,
    remove: removeRedCard,
  } = useFieldArray({
    control: form.control,
    name: "redCards",
  });

  // Load existing result to allow editing
  // This fetches result doc, goals and cards and pre-fills the form
  // Runs when dialog opens (gameId/collections change)
  useEffect(() => {
    let cancelled = false;
    const loadExisting = async () => {
      try {
        const resultRef = doc(db, resultCollection, gameId);
        const resultSnap = await getDoc(resultRef);
        const goalsSnap = await getDocs(query(collection(db, goalsCollection), where("gameId", "==", gameId)));
        const cardsSnap = await getDocs(query(collection(db, cardsCollection), where("gameId", "==", gameId)));

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
        // Silent: if loading fails, leave defaults
      }
    };
    void loadExisting();
    return () => {
      cancelled = true;
    };
  }, [gameId, resultCollection, goalsCollection, cardsCollection]);

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

    const uniqueParticipantIds = Array.from(
      new Set(
        [
          ...normalizedGoals.map((goal) => goal.scorerId),
          ...normalizedYellowCards.map((card) => card.playerId),
          ...normalizedRedCards.map((card) => card.playerId),
        ].filter((id) => id.length > 0),
      ),
    );

    const scorerPhotoMap = new Map<string, string>();
    for (let i = 0; i < uniqueParticipantIds.length; i += 10) {
      const chunk = uniqueParticipantIds.slice(i, i + 10);
      try {
        const scorerQuery = query(collection(db, "users"), where("userId", "in", chunk));
        const snapshot = await getDocs(scorerQuery);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as { userId?: string; photoUrl?: string };
          if (data.userId && data.photoUrl) {
            scorerPhotoMap.set(data.userId, data.photoUrl);
          }
        });
      } catch (error) {
        console.warn("Unable to fetch scorer avatars", error, { chunk });
      }
    }

    try {
      let homePoints = 0;
      let awayPoints = 0;
      if (homeScore > awayScore) {
        homePoints = 3;
      } else if (homeScore < awayScore) {
        awayPoints = 3;
      } else {
        homePoints = 1;
        awayPoints = 1;
      }

      const gameRef = doc(db, gameCollection, gameId);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        throw new Error("Game not found!");
      }

      const { team1, team2 } = gameSnap.data() as {
        team1?: DocumentReference;
        team2?: DocumentReference;
      };

      if (!team1 || !team2) {
        throw new Error("Game document is missing team references!");
      }

      const homeTeamRef = team1;
      const awayTeamRef = team2;

      const resultRef = doc(db, resultCollection, gameId);
      const existingResultSnap = await getDoc(resultRef);
      const timestamp = serverTimestamp();

      const homeYellowCards = normalizedYellowCards.filter((card) => card.team === "home").length;
      const awayYellowCards = normalizedYellowCards.filter((card) => card.team === "away").length;
      const homeRedCards = normalizedRedCards.filter((card) => card.team === "home").length;
      const awayRedCards = normalizedRedCards.filter((card) => card.team === "away").length;

      const baseResultData = {
        gameId,
        gameRef,
        homeTeamRef,
        awayTeamRef,
        homeTeamId: homeTeamRef.id,
        awayTeamId: awayTeamRef.id,
        homeScore,
        awayScore,
        homePoints,
        awayPoints,
        homeYellowCards,
        awayYellowCards,
        homeRedCards,
        awayRedCards,
        homeGoalDifference: homeScore - awayScore,
        awayGoalDifference: awayScore - homeScore,
        updatedAt: timestamp,
      };

      const resultData = existingResultSnap.exists()
        ? baseResultData
        : { ...baseResultData, createdAt: timestamp };

      await setDoc(resultRef, resultData, { merge: true });

      await setDoc(
        gameRef,
        {
          status: "Finished",
          resultRef,
        },
        { merge: true },
      );

      const goalsCollectionRef = collection(db, goalsCollection);
      const existingGoalsSnap = await getDocs(query(goalsCollectionRef, where("gameId", "==", gameId)));
      if (!existingGoalsSnap.empty) {
        await Promise.all(existingGoalsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      }

      if (normalizedGoals.length > 0) {
        await Promise.all(
          normalizedGoals.map((goal) => {
            const isHomeGoal = goal.team === "home";
            const teamRef = isHomeGoal ? homeTeamRef : awayTeamRef;
            const scorerPhotoUrl = scorerPhotoMap.get(goal.scorerId);
            const goalPayload: Record<string, unknown> = {
              gameId,
              resultId: resultRef.id,
              teamSide: goal.team,
              teamRef,
              teamId: teamRef.id,
              scorerName: goal.scorerName,
              scorerId: goal.scorerId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            if (scorerPhotoUrl) {
              goalPayload.scorerPhotoUrl = scorerPhotoUrl;
            }

            if (matchContext) {
              goalPayload.matchContext = matchContext;
            }

            return addDoc(goalsCollectionRef, goalPayload);
          }),
        );
      }

      const cardsCollectionRef = collection(db, cardsCollection);
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
            const playerPhotoUrl = scorerPhotoMap.get(card.playerId);
            const cardPayload: Record<string, unknown> = {
              gameId,
              resultId: resultRef.id,
              teamSide: card.team,
              teamRef,
              teamId: teamRef.id,
              playerName: card.playerName,
              playerId: card.playerId,
              cardType: card.cardType,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            if (playerPhotoUrl) {
              cardPayload.playerPhotoUrl = playerPhotoUrl;
            }

            if (matchContext) {
              cardPayload.matchContext = matchContext;
            }

            return addDoc(cardsCollectionRef, cardPayload);
          }),
        );
      }

      toast({
        title: "Result saved",
        description: "The game result has been successfully recorded.",
      });
      onFinished();
    } catch (error) {
      console.error("Error adding result:", error);
      toast({
        variant: "destructive",
        title: "Error adding result",
        description: "There was a problem adding the result. Check the console for details.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="homeScore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home Score</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="awayScore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Away Score</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Yellow Cards</FormLabel>
            <Button type="button" variant="outline" onClick={() => appendYellowCard({ team: "home", playerName: "", playerId: "" })}>
              Add Yellow Card
            </Button>
          </div>
          {yellowCardFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No yellow cards recorded yet.</p>
          ) : (
            yellowCardFields.map((field, index) => (
              <div key={field.id} className="grid gap-3 md:grid-cols-4 md:items-end">
                <FormField
                  control={form.control}
                  name={`yellowCards.${index}.team`}
                  render={({ field }) => (
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
                  )}
                />
                <FormField
                  control={form.control}
                  name={`yellowCards.${index}.playerName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player name</FormLabel>
                      <FormControl>
                        <Input placeholder="Player name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`yellowCards.${index}.playerId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Player ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            <p className="text-sm text-muted-foreground">No red cards recorded yet.</p>
          ) : (
            redCardFields.map((field, index) => (
              <div key={field.id} className="grid gap-3 md:grid-cols-4 md:items-end">
                <FormField
                  control={form.control}
                  name={`redCards.${index}.team`}
                  render={({ field }) => (
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
                  )}
                />
                <FormField
                  control={form.control}
                  name={`redCards.${index}.playerName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player name</FormLabel>
                      <FormControl>
                        <Input placeholder="Player name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`redCards.${index}.playerId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Player ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            <p className="text-sm text-muted-foreground">No goals recorded yet.</p>
          ) : (
            goalFields.map((field, index) => (
              <div key={field.id} className="grid gap-3 md:grid-cols-4 md:items-end">
                <FormField
                  control={form.control}
                  name={`goals.${index}.team`}
                  render={({ field }) => (
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
                  )}
                />
                <FormField
                  control={form.control}
                  name={`goals.${index}.scorerName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scorer name</FormLabel>
                      <FormControl>
                        <Input placeholder="Player name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`goals.${index}.scorerId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scorer ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Player ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
          {form.formState.isSubmitting ? "Saving..." : "Save Result"}
        </Button>
      </form>
    </Form>
  );
};

export default ResultForm;
