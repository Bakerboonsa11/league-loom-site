import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, doc, deleteDoc, DocumentReference, query, where } from "firebase/firestore";
import { auth } from "@/firebase";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GameForm from "@/components/admin/GameForm";
import ResultForm from "@/components/admin/ResultForm";
import { getDoc } from "firebase/firestore";

const db = getFirestore(auth.app);

interface Team {
  id: string;
  name: string;
}

interface Game {
  id: string;
  team1: DocumentReference;
  team2: DocumentReference;
  team1Data?: Team;
  team2Data?: Team;
  date: { seconds: number; nanoseconds: number; };
  status: "Upcoming" | "Live" | "Finished";
  kickoffTime?: string | null;
  location?: string | null;
}

interface UniqueGame extends Game {
  team1GroupName?: string | null;
  team2GroupName?: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const formatGameTime = (date: { seconds: number; nanoseconds: number } | Date | undefined | null) => {
  if (!date) return "TBA";
  const value = date instanceof Date ? date : new Date(date.seconds * 1000);
  return value.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const AdminGamesPage = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [uniqueGames, setUniqueGames] = useState<UniqueGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUniqueLoading, setIsUniqueLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uniqueError, setUniqueError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUniqueCreateDialogOpen, setIsUniqueCreateDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editingUniqueGame, setEditingUniqueGame] = useState<UniqueGame | null>(null);
  const [addingResultGame, setAddingResultGame] = useState<Game | null>(null);
  const [addingUniqueResultGame, setAddingUniqueResultGame] = useState<UniqueGame | null>(null);

  const { toast } = useToast();

  const resolveTeams = async (teamRef: DocumentReference): Promise<Team> => {
    const teamSnap = await getDoc(teamRef);
    return { id: teamSnap.id, ...teamSnap.data() } as Team;
  };

  const fetchGames = async () => {
    setIsLoading(true);
    setIsUniqueLoading(true);
    setError(null);
    setUniqueError(null);
    try {
      const [gamesSnapshot, uniqueGamesSnapshot] = await Promise.all([
        getDocs(collection(db, "games")),
        getDocs(collection(db, "unique_game")),
      ]);

      const gamesList = await Promise.all(
        gamesSnapshot.docs.map(async (snapshot) => {
          const gameData = { id: snapshot.id, ...snapshot.data() } as Game;
          const [team1Data, team2Data] = await Promise.all([
            resolveTeams(gameData.team1),
            resolveTeams(gameData.team2),
          ]);
          return {
            ...gameData,
            team1Data,
            team2Data,
          } satisfies Game;
        }),
      );

      const uniqueGamesList = await Promise.all(
        uniqueGamesSnapshot.docs.map(async (snapshot) => {
          const data = { id: snapshot.id, ...snapshot.data() } as UniqueGame;
          const [team1Data, team2Data] = await Promise.all([
            resolveTeams(data.team1),
            resolveTeams(data.team2),
          ]);
          return {
            ...data,
            team1Data,
            team2Data,
          } satisfies UniqueGame;
        }),
      );

      setGames(gamesList);
      setUniqueGames(uniqueGamesList);
    } catch (err) {
      setError("Failed to fetch games. Make sure you have the correct permissions.");
      setUniqueError("Failed to fetch round-off games. Check your permissions.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsUniqueLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleDelete = async (gameId: string) => {
    try {
      await deleteDoc(doc(db, "games", gameId));
      toast({ title: "Game deleted", description: "The game has been successfully deleted." });
      fetchGames(); // Refresh the list
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error deleting game",
        description: "There was a problem deleting the game.",
      });
    }
  };

  const handleUniqueDelete = async (gameId: string) => {
    try {
      await deleteDoc(doc(db, "unique_game", gameId));
      await deleteDoc(doc(db, "unique_results", gameId));

      const uniqueGoalsSnapshot = await getDocs(query(collection(db, "unique_goals"), where("gameId", "==", gameId)));
      if (!uniqueGoalsSnapshot.empty) {
        await Promise.all(uniqueGoalsSnapshot.docs.map((goalDoc) => deleteDoc(goalDoc.ref)));
      }

      toast({ title: "Round-Off game deleted", description: "The unique matchup has been removed." });
      fetchGames();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error deleting round-off game",
        description: "There was a problem deleting the unique matchup.",
      });
    }
  };

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Game Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-end mb-4">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>Create Game</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Game</DialogTitle>
                  <DialogDescription>Set up a matchup by selecting teams, scheduling, and status.</DialogDescription>
                </DialogHeader>
                <GameForm
                  onFinished={() => {
                    setIsCreateDialogOpen(false);
                    fetchGames();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {isLoading && <p>Loading games...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading && !error && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team 1</TableHead>
                    <TableHead>Team 2</TableHead>
                    <TableHead className="hidden md:table-cell">Kickoff</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {games.map((game) => (
                    <motion.tr
                      key={game.id}
                      variants={itemVariants}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">{game.team1Data?.name}</TableCell>
                      <TableCell className="font-medium">{game.team2Data?.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {game.kickoffTime ?? formatGameTime(game.date)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {game.location ?? "TBD"}
                      </TableCell>
                      <TableCell>{new Date(game.date.seconds * 1000).toLocaleDateString()}</TableCell>
                      <TableCell>{game.status}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddingResultGame(game)}
                          >
                            Add/Edit Result
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingGame(game)}>
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the game's data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(game.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Round-Off Game Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-end mb-4">
            <Dialog open={isUniqueCreateDialogOpen} onOpenChange={setIsUniqueCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">Create Round-Off Game</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Round-Off Game</DialogTitle>
                  <DialogDescription>Schedule a cross-group showcase fixture.</DialogDescription>
                </DialogHeader>
                <GameForm
                  targetCollection="unique_game"
                  onFinished={() => {
                    setIsUniqueCreateDialogOpen(false);
                    fetchGames();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {isUniqueLoading && <p>Loading round-off games...</p>}
          {uniqueError && <p className="text-destructive">{uniqueError}</p>}
          {!isUniqueLoading && !uniqueError && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team 1</TableHead>
                    <TableHead>Team 2</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead className="hidden md:table-cell">Kickoff</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                  {uniqueGames.map((game) => (
                    <motion.tr key={game.id} variants={itemVariants} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{game.team1Data?.name}</TableCell>
                      <TableCell className="font-medium">{game.team2Data?.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(game.team1GroupName ?? "Independent") + " vs " + (game.team2GroupName ?? "Independent")}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {game.kickoffTime ?? formatGameTime(game.date)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {game.location ?? "TBD"}
                      </TableCell>
                      <TableCell>{new Date((game.date as any).seconds * 1000).toLocaleDateString()}</TableCell>
                      <TableCell>{game.status}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddingUniqueResultGame(game)}
                          >
                            Add/Edit Result
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingUniqueGame(game)}>
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove round-off game?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the matchup and its recorded results.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleUniqueDelete(game.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingGame} onOpenChange={(open) => !open && setEditingGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
            <DialogDescription>Update game scheduling, participants, or status as needed.</DialogDescription>
          </DialogHeader>
          {editingGame && (
            <GameForm
              game={{
                ...editingGame,
                team1: editingGame.team1.id,
                team2: editingGame.team2.id,
                date: new Date(editingGame.date.seconds * 1000),
                kickoffTime: editingGame.kickoffTime ?? formatGameTime(editingGame.date),
                location: editingGame.location ?? "",
              }}
              onFinished={() => {
                setEditingGame(null);
                fetchGames();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!addingResultGame} onOpenChange={(open) => !open && setAddingResultGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Result for Game</DialogTitle>
            <DialogDescription>Record the final score and statistics for this completed game.</DialogDescription>
          </DialogHeader>
          {addingResultGame && (
            <ResultForm
              gameId={addingResultGame.id}
              cardsCollection="cards"
              onFinished={() => {
                setAddingResultGame(null);
                fetchGames();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUniqueGame} onOpenChange={(open) => !open && setEditingUniqueGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Round-Off Game</DialogTitle>
            <DialogDescription>Update the matchup details for this showcase game.</DialogDescription>
          </DialogHeader>
          {editingUniqueGame && (
            <GameForm
              targetCollection="unique_game"
              game={{
                ...editingUniqueGame,
                team1: editingUniqueGame.team1.id,
                team2: editingUniqueGame.team2.id,
                date: new Date((editingUniqueGame.date as any).seconds * 1000),
                kickoffTime: editingUniqueGame.kickoffTime ?? formatGameTime(editingUniqueGame.date),
                location: editingUniqueGame.location ?? "",
              }}
              onFinished={() => {
                setEditingUniqueGame(null);
                fetchGames();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!addingUniqueResultGame} onOpenChange={(open) => !open && setAddingUniqueResultGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Result for Round-Off Game</DialogTitle>
            <DialogDescription>Record the final outcome for this round-off fixture.</DialogDescription>
          </DialogHeader>
          {addingUniqueResultGame && (
            <ResultForm
              gameId={addingUniqueResultGame.id}
              gameCollection="unique_game"
              resultCollection="unique_results"
              goalsCollection="unique_goals"
              matchContext="round-off"
              cardsCollection="unique_cards"
              onFinished={() => {
                setAddingUniqueResultGame(null);
                fetchGames();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGamesPage;
