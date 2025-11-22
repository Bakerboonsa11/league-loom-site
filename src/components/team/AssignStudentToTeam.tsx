import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc,
  updateDoc 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auth } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Team {
  id: string;
  name: string;
  collegeName: string;
}

interface Student {
  // Handle both uid and id for compatibility
  uid?: string;
  id?: string;
  displayName: string;
  email: string;
  department?: string;
  year?: string;
  college?: string;
  role?: string;
  // Add index signature to allow any string key with string or undefined value
  [key: string]: any;
}

const db = getFirestore();

interface Team {
  id: string;
  name: string;
  collegeName: string;
}

const AssignStudentToTeam = () => {
  const { user } = useAuth();
  const self = user;
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    userId: "",
    fullName: "",
    email: "",
    department: "",
    year: "",
    teamId: "",
  });
  const [assignedStudents, setAssignedStudents] = useState<Set<string>>(new Set());

  // Fetch teams and students for the college head's college
  useEffect(() => {
    const fetchData = async () => {
      if (!self?.college) return;
      
      try {
        setLoading(true);
        
        // Fetch teams and filter by normalized college name (case/whitespace insensitive)
        const teamsRef = collection(db, "teams");
        const allTeamsSnap = await getDocs(teamsRef);
        const normCollege = (self.college || "").trim().toLowerCase();
        const teamsData = allTeamsSnap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(t => ((t.collegeName || "").trim().toLowerCase()) === normCollege) as Team[];
        
        setTeams(teamsData);
        
        // Fetch students from the same college
        const usersRef = collection(db, "users");
        const usersQuery = query(
          usersRef,
          where("college", "==", self.college),
          where("role", "==", "student")
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        const usersData = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as Student[];
        
        setStudents(usersData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load data. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [self, toast]);

  // Load active assignments for the selected team
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!self?.college || !formData.teamId) {
        setAssignedStudents(new Set());
        return;
      }
      try {
        const playersSnap = await getDocs(
          query(
            collection(db, "players"),
            where("teamId", "==", formData.teamId),
            where("status", "==", "active")
          )
        );
        const ids = new Set<string>(
          playersSnap.docs.map(d => (d.data().userId as string) || "")
        );
        setAssignedStudents(ids);
      } catch (e) {
        console.error("Failed to load assignments", e);
        setAssignedStudents(new Set());
      }
    };
    void fetchAssignments();
  }, [formData.teamId, self?.college]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return <div>Loading data...</div>;
  }
  
  if (!self?.college) {
    return <div>No college information found. Please contact support.</div>;
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 text-white">
        <CardTitle className="text-xl md:text-2xl">Student Management</CardTitle>
        <p className="text-white/90 text-sm">Assign students to your college teams</p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamId" className="text-sm font-semibold">Select Team</Label>
            <Select
              value={formData.teamId}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, teamId: value }))
              }
              required
            >
              <SelectTrigger className="w-full md:max-w-sm border-violet-300 focus:ring-violet-500 focus:border-violet-500">
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
                {teams.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">
                    No teams found for your college
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Email</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Department</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const keyId = (student.uid || student.id || "");
                    const isAssigned = assignedStudents.has(keyId);
                    return (
                      <TableRow key={keyId} className="even:bg-muted/20 hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="font-medium">{student.displayName || student.name || 'No Name'}</div>
                          <div className="text-xs text-muted-foreground">{keyId}</div>
                        </TableCell>
                        <TableCell className="text-sm">{student.email}</TableCell>
                        <TableCell className="text-sm">{student.department || '-'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${
                            isAssigned
                              ? 'bg-violet-50 text-violet-700 ring-violet-200'
                              : 'bg-slate-50 text-slate-700 ring-slate-200'
                          }`}>
                            {isAssigned ? 'Assigned' : 'Not Assigned'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            className={isAssigned ? 'border-rose-300 text-rose-600 hover:bg-rose-50' : 'bg-violet-600 hover:bg-violet-700'}
                            variant={isAssigned ? 'outline' : 'default'}
                            size="sm"
                            onClick={async () => {
                              if (!formData.teamId) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Select a team',
                                  description: 'Please select a team first.'
                                });
                                return;
                              }
                              try {
                                if (isAssigned) {
                                  const snap = await getDocs(query(
                                    collection(db, 'players'),
                                    where('teamId', '==', formData.teamId),
                                    where('userId', '==', keyId),
                                    where('status', '==', 'active')
                                  ));
                                  for (const d of snap.docs) {
                                    await updateDoc(d.ref, { status: 'inactive' });
                                  }
                                  const next = new Set(assignedStudents);
                                  next.delete(keyId);
                                  setAssignedStudents(next);
                                  toast({ title: 'Student unassigned' });
                                } else {
                                  const assignedBy = self?.uid || (self as any)?.id || (self as any)?.userId || auth.currentUser?.uid;
                                  if (!assignedBy) {
                                    toast({ variant: 'destructive', title: 'Unable to assign', description: 'Missing current user id. Please re-login and try again.' });
                                    return;
                                  }
                                  await addDoc(collection(db, 'players'), {
                                    userId: keyId,
                                    fullName: student.displayName || student.name || '',
                                    email: student.email || '',
                                    department: student.department || '',
                                    year: student.year || '',
                                    teamId: formData.teamId,
                                    teamName: teams.find(t => t.id === formData.teamId)?.name || '',
                                    college: self?.college,
                                    assignedBy,
                                    assignedAt: new Date().toISOString(),
                                    status: 'active'
                                  });
                                  const next = new Set(assignedStudents);
                                  next.add(keyId);
                                  setAssignedStudents(next);
                                  toast({ title: 'Student assigned' });
                                }
                              } catch (err) {
                                console.error('Assignment toggle failed', err);
                                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update assignment.' });
                              }
                            }}
                            disabled={!formData.teamId}
                          >
                            {isAssigned ? 'Unassign' : 'Assign'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AssignStudentToTeam;
