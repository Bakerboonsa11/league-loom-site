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
import { getFirestore, doc, setDoc, addDoc, collection, getDoc } from "firebase/firestore";
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
    try {
      // Calculate points
      let homePoints = 0;
      let awayPoints = 0;
      if (values.homeScore > values.awayScore) {
        homePoints = 3;
      } else if (values.homeScore < values.awayScore) {
        awayPoints = 3;
      } else {
        homePoints = 1;
        awayPoints = 1;
      }

      // Get team references from the game document
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        throw new Error("Game not found!");
      }
      const gameData = gameSnap.data();

      // Create a new document in the 'results' collection
      const resultsCollection = collection(db, "results");
      await addDoc(resultsCollection, {
        gameRef: gameRef,
        homeTeamRef: gameData.team1,
        awayTeamRef: gameData.team2,
        homeScore: values.homeScore,
        awayScore: values.awayScore,
        homePoints,
        awayPoints,
        homeYellowCards: values.homeYellowCards,
        awayYellowCards: values.awayYellowCards,
        homeRedCards: values.homeRedCards,
        awayRedCards: values.awayRedCards,
        createdAt: new Date(),
      });

      // Update the game status to 'Finished'
      await setDoc(gameRef, { status: "Finished" }, { merge: true });

      toast({ title: "Result added", description: "The game result has been successfully added." });
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
