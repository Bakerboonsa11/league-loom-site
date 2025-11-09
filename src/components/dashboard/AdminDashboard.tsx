import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { Users, Gamepad2, BarChart3, Video, FileText, Shield, User, UserCheck, Eye, Layers, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { auth } from "@/firebase";

const data = [
  { name: 'Jan', users: 400 },
  { name: 'Feb', users: 300 },
  { name: 'Mar', users: 600 },
  { name: 'Apr', users: 800 },
  { name: 'May', users: 500 },
  { name: 'Jun', users: 700 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

interface GoalDoc {
  scorerId?: string;
  scorerName?: string;
}

interface ScorerSummary {
  scorerId: string;
  scorerName: string;
  goals: number;
}

const db = getFirestore(auth.app);

const AdminDashboard = () => {
  const [topScorers, setTopScorers] = useState<ScorerSummary[]>([]);
  const [isLoadingScorers, setIsLoadingScorers] = useState(true);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [collegeCount, setCollegeCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchTopScorers = async () => {
      setIsLoadingScorers(true);
      try {
        const goalsSnapshot = await getDocs(collection(db, "goals"));
        const scorerMap = new Map<string, ScorerSummary>();

        goalsSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as GoalDoc;
          if (!data.scorerId || !data.scorerName) {
            return;
          }
          const existing = scorerMap.get(data.scorerId);
          if (existing) {
            existing.goals += 1;
          } else {
            scorerMap.set(data.scorerId, {
              scorerId: data.scorerId,
              scorerName: data.scorerName,
              goals: 1,
            });
          }
        });

        const sorted = Array.from(scorerMap.values())
          .sort((a, b) => {
            const diff = b.goals - a.goals;
            if (diff !== 0) return diff;
            return a.scorerName.localeCompare(b.scorerName);
          })
          .slice(0, 3);
        setTopScorers(sorted);
      } catch (error) {
        console.error("Failed to load top scorers", error);
        setTopScorers([]);
      } finally {
        setIsLoadingScorers(false);
      }
    };

    void fetchTopScorers();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const [usersSnapshot, teamsSnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "teams")),
        ]);

        setUserCount(usersSnapshot.size);

        const collegeSet = new Set<string>();
        teamsSnapshot.docs.forEach((teamDoc) => {
          const data = teamDoc.data() as { collegeName?: string | null };
          if (data.collegeName) {
            collegeSet.add(data.collegeName.trim().toLowerCase());
          }
        });
        setCollegeCount(collegeSet.size);
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
        setUserCount(null);
        setCollegeCount(null);
      } finally {
        setIsLoadingStats(false);
      }
    };

    void fetchStats();
  }, []);

  const quickActions = [
    { to: "/admin/group", icon: <Layers className="h-5 w-5" />, label: "Create Group" },
    { to: "/admin/users", icon: <Users className="h-5 w-5" />, label: "Users" },
    { to: "/admin/games", icon: <Gamepad2 className="h-5 w-5" />, label: "Games" },
    { to: "/admin/table-rank", icon: <BarChart3 className="h-5 w-5" />, label: "Table Rank" },
    { to: "/admin/vlog", icon: <Video className="h-5 w-5" />, label: "Manage Vlog" },
    { to: "/admin/blog", icon: <FileText className="h-5 w-5" />, label: "Manage Blog" },
    { to: "/admin/teams", icon: <Shield className="h-5 w-5" />, label: "Teams" },
    { to: "/profile", icon: <User className="h-5 w-5" />, label: "Profile" },
    { to: "/admin/player-selection", icon: <UserCheck className="h-5 w-5" />, label: "Player Selection" },
    { to: "/admin/view-selections", icon: <Eye className="h-5 w-5" />, label: "View Selections" },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "-" : userCount ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground">Total registered accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Colleges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "-" : collegeCount ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground">Distinct colleges represented in teams</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {quickActions.map((action) => (
            <motion.div key={action.label} variants={itemVariants}>
              <Link to={action.to}>
                <Button
                  variant="outline"
                  className="w-full h-28 flex flex-col gap-2 justify-center items-center
                             transition-all duration-300 ease-in-out
                             hover:scale-105 hover:bg-primary/10 hover:text-primary"
                >
                  {action.icon}
                  <span className="text-sm font-semibold">{action.label}</span>
                </Button>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>New Users per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="users" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Top Goal Scorers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingScorers ? (
            <p className="text-sm text-muted-foreground">Loading scorers…</p>
          ) : topScorers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals recorded yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {topScorers.map((scorer, index) => (
                <Card key={scorer.scorerId} className="border-border bg-card/60">
                  <CardHeader className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span>#{index + 1}</span>
                    </div>
                    <CardTitle className="text-lg font-semibold">{scorer.scorerName}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-3xl font-bold text-primary">{scorer.goals}</p>
                    <p className="text-xs text-muted-foreground">Goals</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AdminDashboard;
