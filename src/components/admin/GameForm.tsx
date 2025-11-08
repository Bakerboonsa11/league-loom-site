import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFirestore, doc, setDoc, addDoc, collection, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "../ui/calendar";

const db = getFirestore();

const formSchema = z.object({
  team1: z.string().min(1, "Please select Team 1."),
  team2: z.string().min(1, "Please select Team 2."),
  date: z.date(),
  status: z.enum(["Upcoming", "Live", "Finished"]),
});

interface Game {
  id?: string;
  team1: string;
  team2: string;
  date: Date;
  status: "Upcoming" | "Live" | "Finished";
}

interface Team {
  id: string;
  name: string;
}

interface GameFormProps {
  game?: Game;
  onFinished: () => void;
}

const GameForm = ({ game, onFinished }: GameFormProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const fetchTeams = async () => {
      const teamsCollection = collection(db, "teams");
      const teamsSnapshot = await getDocs(teamsCollection);
      const teamsList = teamsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Team)
      );
      setTeams(teamsList);
    };
    fetchTeams();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      team1: game?.team1 || "",
      team2: game?.team2 || "",
      date: game?.date ? new Date(game.date) : new Date(),
      status: game?.status || "Upcoming",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const gameData = {
        ...values,
        team1: doc(db, "teams", values.team1),
        team2: doc(db, "teams", values.team2),
      };

      if (game) {
        // Update existing game
        const gameRef = doc(db, "games", game.id!);
        await setDoc(gameRef, gameData, { merge: true });
        toast({ title: "Game updated", description: "The game has been successfully updated." });
      } else {
        // Create new game
        await addDoc(collection(db, "games"), gameData);
        toast({ title: "Game created", description: "The game has been successfully created." });
      }
      onFinished();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving game",
        description: "There was a problem saving the game.",
      });
    }
  };

  const teamOptions = teams.map((team) => ({ label: team.name, value: team.id }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="team1"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Team 1</FormLabel>
              <Combobox
                options={teamOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select Team 1"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="team2"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Team 2</FormLabel>
              <Combobox
                options={teamOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select Team 2"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Live">Live</SelectItem>
                  <SelectItem value="Finished">Finished</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Game"}
        </Button>
      </form>
    </Form>
  );
};

export default GameForm;
