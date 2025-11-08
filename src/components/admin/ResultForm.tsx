import { useForm } from "react-hook-form";
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
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, DocumentReference } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const db = getFirestore();

const formSchema = z.object({
  homeScore: z.coerce.number().min(0),
  awayScore: z.coerce.number().min(0),
  homeYellowCards: z.coerce.number().min(0),
  awayYellowCards: z.coerce.number().min(0),
  homeRedCards: z.coerce.number().min(0),
  awayRedCards: z.coerce.number().min(0),
});

interface ResultFormProps {
  gameId: string;
  onFinished: () => void;
}

const ResultForm = ({ gameId, onFinished }: ResultFormProps) => {
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
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const {
      homeScore,
      awayScore,
      homeYellowCards,
      awayYellowCards,
      homeRedCards,
      awayRedCards,
    } = values;

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

      const gameRef = doc(db, "games", gameId);
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

      const resultRef = doc(db, "results", gameId);
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
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Result"}
        </Button>
      </form>
    </Form>
  );
};

export default ResultForm;
