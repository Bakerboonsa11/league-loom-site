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
import { getFirestore, doc, setDoc, addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "../ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  groupId?: string | null;
  groupName?: string | null;
}

interface GameFormProps {
  game?: Game;
  onFinished: () => void;
  targetCollection?: "games" | "unique_game";
}

const GameForm = ({ game, onFinished, targetCollection = "games" }: GameFormProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pendingGameValues, setPendingGameValues] = useState<z.infer<typeof formSchema> | null>(null);
  const [pendingTeams, setPendingTeams] = useState<{ team1?: Team; team2?: Team } | null>(null);
  const [isMismatchDialogOpen, setIsMismatchDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      const [teamsSnapshot, groupsSnapshot] = await Promise.all([
        getDocs(collection(db, "teams")),
        getDocs(collection(db, "groups")),
      ]);

      const groupMap = new Map<string, string>();
      groupsSnapshot.docs.forEach((groupDoc) => {
        const data = groupDoc.data() as { name?: string };
        groupMap.set(groupDoc.id, data.name ?? "Unnamed group");
      });

      const teamsList = teamsSnapshot.docs.map((teamDoc) => {
        const data = teamDoc.data() as { name?: string; groupId?: string | null };
        const groupId = data.groupId ?? null;
        return {
          id: teamDoc.id,
          name: data.name ?? "Unnamed team",
          groupId,
          groupName: groupId ? groupMap.get(groupId) ?? "Unnamed group" : null,
        } satisfies Team;
      });
      setTeams(teamsList);
    };
    fetchTeams();
  }, []);

  const teamLookup = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((team) => map.set(team.id, team));
    return map;
  }, [teams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      team1: game?.team1 || "",
      team2: game?.team2 || "",
      date: game?.date ? new Date(game.date) : new Date(),
      status: game?.status || "Upcoming",
    },
  });

  const handlePersistGame = async (
    values: z.infer<typeof formSchema>,
    target: "games" | "unique_game",
    context: { team1?: Team; team2?: Team },
  ) => {
    setIsSaving(true);
    try {
      const payload = {
        date: values.date,
        status: values.status,
        team1: doc(db, "teams", values.team1),
        team2: doc(db, "teams", values.team2),
      };

      if (target === "unique_game") {
        if (game?.id) {
          const uniqueRef = doc(db, "unique_game", game.id);
          await setDoc(
            uniqueRef,
            {
              ...payload,
              team1GroupId: context.team1?.groupId ?? null,
              team2GroupId: context.team2?.groupId ?? null,
              team1GroupName: context.team1?.groupName ?? null,
              team2GroupName: context.team2?.groupName ?? null,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
          toast({ title: "Round-Off game updated", description: "The matchup has been refreshed." });
        } else {
          await addDoc(collection(db, "unique_game"), {
            ...payload,
            team1GroupId: context.team1?.groupId ?? null,
            team2GroupId: context.team2?.groupId ?? null,
            team1GroupName: context.team1?.groupName ?? null,
            team2GroupName: context.team2?.groupName ?? null,
            createdAt: serverTimestamp(),
          });
          toast({
            title: "Unique matchup logged",
            description: "Saved this cross-group matchup to the unique games list.",
          });
        }
      } else if (game?.id) {
        const gameRef = doc(db, "games", game.id);
        await setDoc(gameRef, payload, { merge: true });
        toast({ title: "Game updated", description: "The game has been successfully updated." });
      } else {
        await addDoc(collection(db, "games"), payload);
        toast({ title: "Game created", description: "The game has been successfully created." });
      }

      onFinished();
    } catch (error) {
      console.error("Failed to save game", error);
      toast({
        variant: "destructive",
        title: "Error saving game",
        description: "There was a problem saving the game.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const team1 = teamLookup.get(values.team1);
    const team2 = teamLookup.get(values.team2);

    if (!game && targetCollection === "games") {
      const sameGroup = (team1?.groupId ?? null) === (team2?.groupId ?? null);
      if (!sameGroup) {
        setPendingGameValues(values);
        setPendingTeams({ team1, team2 });
        setIsMismatchDialogOpen(true);
        return;
      }
    }

    await handlePersistGame(values, targetCollection, { team1, team2 });
    onFinished();
    form.reset();
  };

  const teamOptions = teams.map((team) => ({ label: team.name, value: team.id }));

  const dismissMismatchDialog = () => {
    setIsMismatchDialogOpen(false);
    setPendingGameValues(null);
    setPendingTeams(null);
  };

  const handleConfirmUniqueGame = async () => {
    if (!pendingGameValues) {
      return;
    }

    await handlePersistGame(pendingGameValues, "unique_game", {
      team1: pendingTeams?.team1,
      team2: pendingTeams?.team2,
    });
    dismissMismatchDialog();
  };

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
        <Button type="submit" disabled={form.formState.isSubmitting || isSaving}>
          {form.formState.isSubmitting || isSaving ? "Saving..." : targetCollection === "unique_game" ? "Save Round-Off Game" : "Save Game"}
        </Button>
      </form>

      <AlertDialog
        open={isMismatchDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            dismissMismatchDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teams are in different groups</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTeams?.team1 ? (
                <span>
                  {pendingTeams.team1.name} {pendingTeams.team1.groupName ? `is in ${pendingTeams.team1.groupName}` : "is currently unassigned"}
                </span>
              ) : null}
              <br />
              {pendingTeams?.team2 ? (
                <span>
                  {pendingTeams.team2.name} {pendingTeams.team2.groupName ? `is in ${pendingTeams.team2.groupName}` : "is currently unassigned"}
                </span>
              ) : null}
              <br />
              This matchup will be saved in the unique games list instead of the main schedule. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dismissMismatchDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUniqueGame} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save as Unique Game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
};

export default GameForm;
