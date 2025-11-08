import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, doc, addDoc } from "firebase/firestore";
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
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as User)
        );
        setUsers(usersList);

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
      <Card>
        <CardHeader>
          <CardTitle>Player Selection</CardTitle>
        </CardHeader>
        <CardContent>
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
              <SelectTrigger>
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

          {isLoading && <p>Loading users...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading && !error && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-state={selectedUsers.includes(user.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.college}</TableCell>
                      <TableCell>{user.role}</TableCell>
                    </TableRow>
                  ))}
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
