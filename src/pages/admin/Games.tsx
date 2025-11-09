import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, doc, deleteDoc, DocumentReference } from "firebase/firestore";
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

const AdminGamesPage = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [addingResultGame, setAddingResultGame] = useState<Game | null>(null);

  const { toast } = useToast();

  const fetchGames = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const gamesCollection = collection(db, "games");
      const gamesSnapshot = await getDocs(gamesCollection);
      const gamesList = await Promise.all(gamesSnapshot.docs.map(async (doc) => {
        const gameData = { id: doc.id, ...doc.data() } as Game;
        const team1Doc = await getDoc(gameData.team1);
        const team2Doc = await getDoc(gameData.team2);
        gameData.team1Data = { id: team1Doc.id, ...team1Doc.data() } as Team;
        gameData.team2Data = { id: team2Doc.id, ...team2Doc.data() } as Team;
        return gameData;
      }));
      setGames(gamesList);
    } catch (err) {
      setError("Failed to fetch games. Make sure you have the correct permissions.");
      console.error(err);
    } finally {
      setIsLoading(false);
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
                      <TableCell>{new Date(game.date.seconds * 1000).toLocaleDateString()}</TableCell>
                      <TableCell>{game.status}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddingResultGame(game)}
                            disabled={game.status === 'Finished'}
                          >
                            Add Result
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

      <Dialog open={!!editingGame} onOpenChange={(open) => !open && setEditingGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
            <DialogDescription>Update game scheduling, participants, or status as needed.</DialogDescription>
          </DialogHeader>
          {editingGame && (
            <GameForm
              game={{...editingGame, team1: editingGame.team1.id, team2: editingGame.team2.id, date: new Date(editingGame.date.seconds * 1000)}}
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
              onFinished={() => {
                setAddingResultGame(null);
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
