import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, doc, addDoc, where, query } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { User, useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const db = getFirestore(auth.app);

interface Team {
  id: string;
  name: string;
}

const sports = ["Valorant", "League of Legends", "CS:GO", "Overwatch", "Rocket League"];

const PlayerSelectionPage = () => {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [players, setPlayers] = useState<Array<{ id: string; userId: string; fullName: string; email?: string; college?: string; department?: string; year?: string; teamId?: string; teamName?: string; assignedBy?: string; assignedAt?: string; status?: string }>>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectionName, setSelectionName] = useState("");
  const [selectedSport, setSelectedSport] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch current-year active players
        const playersCol = collection(db, "players");
        const snap = await getDocs(query(playersCol, where("status", "==", "active")));
        const currentYear = new Date().getFullYear();
        const playerRows = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(p => {
            const dt = p.assignedAt ? new Date(p.assignedAt) : null;
            return dt ? dt.getFullYear() === currentYear : true;
          })
          .map(p => ({
            id: p.id,
            userId: p.userId,
            fullName: p.fullName || p.scorerName || "",
            email: p.email,
            college: p.college,
            department: p.department,
            year: p.year,
            teamId: p.teamId,
            teamName: p.teamName,
            assignedBy: p.assignedBy,
            assignedAt: p.assignedAt,
            status: p.status,
          }));
        setPlayers(playerRows);

        // Keep original selection logic: map players to users for selection/saving
        const usersList: User[] = playerRows.map(p => ({
          id: p.userId,
          email: p.email || "",
          name: p.fullName || "",
          role: "player",
          college: p.college || "",
          department: p.department || "",
          userId: p.userId,
          photoUrl: "",
        }));
        setUsers(usersList);

        // Fetch teams for combobox
        const teamsCollection = collection(db, "teams");
        const teamsSnapshot = await getDocs(teamsCollection);
        const teamsList = teamsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Team)
        );
        setTeams(teamsList);
      } catch (err) {
        setError("Failed to fetch data. Make sure you have the correct permissions.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredUsers = users
    .filter((user) =>
      (user.name || "").toLowerCase().includes(nameFilter.toLowerCase())
    )
    .filter((user) =>
      (user.college || "").toLowerCase().includes(collegeFilter.toLowerCase())
    );

  const handleSaveSelection = async () => {
    try {
      const selectionsCollection = collection(db, "selections");
      const playerRefs = selectedUsers.map(userId => doc(db, "users", userId));
      
      const dataToSave: any = {
        players: playerRefs,
        createdAt: new Date(),
        adminInfo: {
          id: adminUser?.id,
          name: adminUser?.name,
        },
      };

      if (selectionName) {
        dataToSave.name = selectionName;
      }
      if (selectedTeam) {
        dataToSave.team = doc(db, "teams", selectedTeam);
      }
      if (selectedSport) {
        dataToSave.sport = selectedSport;
      }

      await addDoc(selectionsCollection, dataToSave);
      toast({ title: "Selection saved", description: "The player selection has been saved." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving selection",
        description: "There was a problem saving the selection.",
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
  };
  
  const teamOptions = teams.map((team) => ({ label: team.name, value: team.id }));

  return (
    <div className="p-4 md:p-8">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 text-white">
          <CardTitle className="text-xl md:text-2xl">Player Selection</CardTitle>
          <p className="text-white/90 text-sm">Viewing active players (current year)</p>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Filter by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
            <Input
              placeholder="Filter by college..."
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
            />
            <Combobox
              options={teamOptions}
              value={selectedTeam}
              onChange={setSelectedTeam}
              placeholder="Select a team (optional)..."
            />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Name for this selection (optional)..."
              value={selectionName}
              onChange={(e) => setSelectionName(e.target.value)}
              className="md:col-span-2"
            />
            <Select onValueChange={setSelectedSport}>
              <SelectTrigger className="border-violet-300 focus:ring-violet-500 focus:border-violet-500">
                <SelectValue placeholder="Select a sport (optional)" />
              </SelectTrigger>
              <SelectContent>
                {sports.map(sport => (
                  <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center mb-4">
            <Button variant="outline" onClick={toggleSelectAll}>
              {selectedUsers.length === filteredUsers.length ? "Deselect All" : "Select All"}
            </Button>
            <Button onClick={handleSaveSelection} disabled={selectedUsers.length === 0}>
              Save Selection
            </Button>
          </div>

          {isLoading && <p>Loading players...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading && !error && (
            <div className="rounded-lg border shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Email</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">College</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Team</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Assigned</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const player = players.find(p => p.userId === user.id);
                    return (
                      <TableRow key={user.id} data-state={selectedUsers.includes(user.id) && "selected"} className="even:bg-muted/20 hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.id}</div>
                        </TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell className="text-sm">{user.college}</TableCell>
                        <TableCell className="text-sm">{player?.teamName || '-'}</TableCell>
                        <TableCell className="text-sm">{player?.assignedAt ? new Date(player.assignedAt).toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${
                            player?.status === 'active'
                              ? 'bg-violet-50 text-violet-700 ring-violet-200'
                              : 'bg-slate-50 text-slate-700 ring-slate-200'
                          }`}>
                            {player?.status || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerSelectionPage;
