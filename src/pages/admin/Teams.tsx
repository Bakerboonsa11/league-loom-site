import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
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
import { Input } from "@/components/ui/input";
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
import TeamForm from "@/components/admin/TeamForm";

const db = getFirestore(auth.app);

interface Team {
  id: string;
  name: string;
  collegeName: string;
  logoUrl: string;
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

const AdminTeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const { toast } = useToast();

  const fetchTeams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const teamsCollection = collection(db, "teams");
      const teamsSnapshot = await getDocs(teamsCollection);
      const teamsList = teamsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Team)
      );
      setTeams(teamsList);
    } catch (err) {
      setError("Failed to fetch teams. Make sure you have the correct permissions.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleDelete = async (teamId: string) => {
    try {
      await deleteDoc(doc(db, "teams", teamId));
      toast({ title: "Team deleted", description: "The team has been successfully deleted." });
      fetchTeams(); // Refresh the list
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error deleting team",
        description: "There was a problem deleting the team.",
      });
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>Create Team</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>Enter the team details to add them to the competition.</DialogDescription>
                </DialogHeader>
                <TeamForm
                  onFinished={() => {
                    setIsCreateDialogOpen(false);
                    fetchTeams();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {isLoading && <p>Loading teams...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading && !error && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredTeams.map((team) => (
                    <motion.tr
                      key={team.id}
                      variants={itemVariants}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <img src={team.logoUrl} alt={team.name} className="h-10 w-10 rounded-full object-cover" />
                      </TableCell>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.collegeName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingTeam(team)}>
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
                                  This action cannot be undone. This will permanently delete the team's data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(team.id)}>
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

      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update this team’s information and save your changes.</DialogDescription>
          </DialogHeader>
          {editingTeam && (
            <TeamForm
              team={editingTeam}
              onFinished={() => {
                setEditingTeam(null);
                fetchTeams();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeamsPage;
