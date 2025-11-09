import { useForm, useFieldArray } from "react-hook-form";
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

const formSchema = z.object({
  homeScore: z.coerce.number().min(0),
  awayScore: z.coerce.number().min(0),
  homeYellowCards: z.coerce.number().min(0),
  awayYellowCards: z.coerce.number().min(0),
  homeRedCards: z.coerce.number().min(0),
  awayRedCards: z.coerce.number().min(0),
  goals: z.array(goalSchema),
});

interface ResultFormProps {
  gameId: string;
  onFinished: () => void;
  gameCollection?: string;
  resultCollection?: string;
  goalsCollection?: string;
  matchContext?: string;
}

const ResultForm = ({
  gameId,
  onFinished,
  gameCollection = "games",
  resultCollection = "results",
  goalsCollection = "goals",
  matchContext,
}: ResultFormProps) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeScore: 0,
      awayScore: 0,
      homeYellowCards: 0,
      awayYellowCards: 0,
      homeRedCards: 0,
      awayRedCards: 0,
      goals: [],
    },
  });
  const { fields: goalFields, append: appendGoal, remove: removeGoal } = useFieldArray({
    control: form.control,
    name: "goals",
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { goals, homeScore, awayScore, homeYellowCards, awayYellowCards, homeRedCards, awayRedCards } = values;

    const normalizedGoals = goals.map((goal) => ({
      ...goal,
      scorerName: goal.scorerName.trim(),
      scorerId: goal.scorerId.trim(),
    }));

    const uniqueScorerIds = Array.from(new Set(normalizedGoals.map((goal) => goal.scorerId).filter((id) => id.length > 0)));

    const scorerPhotoMap = new Map<string, string>();
    for (let i = 0; i < uniqueScorerIds.length; i += 10) {
      const chunk = uniqueScorerIds.slice(i, i + 10);
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="homeYellowCards"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home Yellow Cards</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="awayYellowCards"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Away Yellow Cards</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="homeRedCards"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home Red Cards</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="awayRedCards"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Away Red Cards</FormLabel>
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
