import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssignStudentToTeam from "@/components/team/AssignStudentToTeam";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";

const db = getFirestore();

type MonthData = { name: string; value: number };

const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CollageHeadDashboard = () => {
  const { user } = useAuth();
  const self = user;

  const [studentCount, setStudentCount] = useState<number>(0);
  const [monthlyMatches, setMonthlyMatches] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      if (!self?.college) return;
      setLoading(true);
      try {
        // Count students in this college
        const usersSnap = await getDocs(query(collection(db, 'users'), where('college', '==', self.college), where('role','==','student')));
        setStudentCount(usersSnap.size);

        // Get IDs of teams from this college
        const teamsSnap = await getDocs(query(collection(db, 'teams'), where('collegeName','==', self.college)));
        const teamIds = new Set<string>(teamsSnap.docs.map(d => d.id));

        // Load all games and tally by month if they involve any of these teams
        const gamesSnap = await getDocs(collection(db, 'games'));
        const counts = new Array(12).fill(0) as number[];
        gamesSnap.docs.forEach(docSnap => {
          const data = docSnap.data() as any;
          const team1Id = data.team1?.id || data.team1Id || null;
          const team2Id = data.team2?.id || data.team2Id || null;
          const involvesCollege = (team1Id && teamIds.has(team1Id)) || (team2Id && teamIds.has(team2Id));
          if (!involvesCollege) return;
          const raw = data.date;
          const date = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
          if (!date || isNaN(date.getTime())) return;
          const m = date.getMonth();
          counts[m] += 1;
        });
        const currentYear = new Date().getFullYear();
        const monthly: MonthData[] = monthLabels.map((name, idx) => ({ name: `${name} ${String(currentYear).slice(-2)}`, value: counts[idx] }));
        setMonthlyMatches(monthly);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [self?.college]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your College's Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
            <p className="text-xs text-muted-foreground">Active students registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matches This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyMatches.reduce((a,b)=>a+b.value,0)}</div>
            <p className="text-xs text-muted-foreground">Across all teams in your college</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="students">Manage Students</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matches per Month ({new Date().getFullYear()})</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyMatches}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignStudentToTeam />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollageHeadDashboard;
