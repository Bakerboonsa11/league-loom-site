import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { Users, Gamepad2, BarChart3, Video, FileText, Shield, User, UserCheck, Eye, Layers, Trophy, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { collection, getDocs, getFirestore, addDoc, serverTimestamp } from "firebase/firestore";
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
  const [liveText, setLiveText] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const postLiveText = async () => {
    const text = liveText.trim();
    if (!text) return;
    try {
      await addDoc(collection(db, "live_texts"), {
        text,
        createdAt: serverTimestamp(),
      });
      setLiveText("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1600);
    } catch (e) {
      // silent fail for now
      // console.error("Failed to post live text", e);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await postLiveText();
  };

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
    { to: "/admin/live-center", icon: <Eye className="h-5 w-5" />, label: "Live Center" },
    { to: "/admin/table-rank", icon: <BarChart3 className="h-5 w-5" />, label: "Table Rank" },
    { to: "/admin/vlog", icon: <Video className="h-5 w-5" />, label: "Manage Vlog" },
    { to: "/admin/blog", icon: <FileText className="h-5 w-5" />, label: "Manage Blog" },
    { to: "/admin/teams", icon: <Shield className="h-5 w-5" />, label: "Teams" },
    { to: "/profile", icon: <User className="h-5 w-5" />, label: "Profile" },
    { to: "/admin/player-selection", icon: <UserCheck className="h-5 w-5" />, label: "Player Selection" },
    { to: "/admin/view-selections", icon: <Eye className="h-5 w-5" />, label: "View Selections" },
  ];

  return (
    <div className="space-y-10">
      <section
        className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-background via-background/60 to-background"
      >
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_rgba(147,197,253,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(244,114,182,0.2),_transparent_60%)]" />
        <div className="relative grid gap-6 p-8 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={isLoadingStats ? "-" : userCount ?? "—"}
            description="Total registered accounts"
            accent="from-primary/60 via-primary/20 to-transparent"
          />
          <MetricCard
            title="Total Colleges"
            value={isLoadingStats ? "-" : collegeCount ?? "—"}
            description="Distinct colleges represented"
            accent="from-secondary/60 via-secondary/20 to-transparent"
          />
          <MetricCard
            title="Top Scorers"
            value={isLoadingScorers ? "-" : topScorers[0]?.goals ?? "—"}
            description={topScorers[0]?.scorerName ?? "No data yet"}
            accent="from-accent/60 via-accent/20 to-transparent"
          />
          <MetricCard
            title="Season Progress"
            value={new Date().getFullYear().toString()}
            description={new Date().toLocaleDateString(undefined, { month: "long" })}
            accent="from-emerald-500/50 via-emerald-400/20 to-transparent"
          />
        </div>
      </section>

      <Card className="border-border/40 bg-background/70 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-rose-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Live Text
            </CardTitle>
            <span className="text-xs uppercase tracking-[0.45em] text-muted-foreground">Live Look</span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center" aria-live="polite">
            <Input
              placeholder="Type a live update (e.g., Goal for CCI!)"
              value={liveText}
              onChange={(e) => setLiveText(e.target.value)}
            />
            <div className="flex items-center gap-2 sm:ml-2">
              <Button type="submit" disabled={!liveText.trim()}>
                Post Live
              </Button>
              {showSuccess && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur animate-in fade-in duration-200">
                  <CheckCircle className="h-3.5 w-3.5" /> Posted
                </span>
              )}
            </div>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Posts appear on the home page instantly and expire after 1 minute.</p>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-background/70 backdrop-blur-xl shadow-[0_30px_60px_-30px_rgba(59,130,246,0.45)]">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Quick Actions
            </CardTitle>
            <span className="text-xs uppercase tracking-[0.45em] text-muted-foreground">Admin Suite</span>
          </div>
          <p className="text-sm text-muted-foreground">Jump directly into the areas you manage most.</p>
        </CardHeader>
        <motion.div
          className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {quickActions.map((action) => (
            <motion.div key={action.label} variants={itemVariants} className="group">
              <Link to={action.to}>
                <div
                  className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background/90 via-background/60 to-background/30 p-[1px] transition-transform duration-300 group-hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex h-28 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur-sm shadow-[0_18px_30px_-18px_rgba(59,130,246,0.55)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-primary/10 text-primary transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/20">
                      {action.icon}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{action.label}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border/40 bg-background/70 backdrop-blur-xl shadow-[0_40px_70px_-40px_rgba(99,102,241,0.55)]">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
                New Users per Month
              </CardTitle>
              <span className="text-xs uppercase tracking-[0.45em] text-muted-foreground">Analytics</span>
            </div>
            <p className="text-sm text-muted-foreground">Track registration momentum across the academic cycle.</p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-2xl border border-border/40 bg-background/80 p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.35)" />
                  <XAxis dataKey="name" stroke="rgba(148,163,184,0.8)" />
                  <YAxis stroke="rgba(148,163,184,0.8)" />
                  <Tooltip contentStyle={{ background: "rgba(17,24,39,0.85)", borderRadius: 12, border: "1px solid rgba(148,163,184,0.3)", color: "#f8fafc" }} />
                  <Legend />
                  <Bar dataKey="users" fill="url(#usersGradient)" radius={[12, 12, 0, 0]} />
                  <defs>
                    <linearGradient id="usersGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(14,165,233,0.9)" />
                      <stop offset="100%" stopColor="rgba(236,72,153,0.9)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-background/70 backdrop-blur-xl shadow-[0_40px_70px_-40px_rgba(236,72,153,0.45)]">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Top Goal Scorers
              </CardTitle>
              <span className="text-xs uppercase tracking-[0.45em] text-muted-foreground">Performance</span>
            </div>
            <p className="text-sm text-muted-foreground">Spotlight on league leaders lighting up the scoreboard.</p>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoadingScorers ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading scorers…</div>
            ) : topScorers.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No goals recorded yet.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {topScorers.map((scorer, index) => (
                  <div
                    key={scorer.scorerId}
                    className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background/90 via-background/70 to-background/50 p-[1px]"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.3),_transparent_65%)]" />
                    <div className="relative rounded-2xl bg-background/85 p-5 text-center backdrop-blur-sm">
                      <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span>#{index + 1}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{scorer.scorerName}</h3>
                      <p className="mt-4 text-3xl font-bold text-primary">{scorer.goals}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Goals</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

interface MetricCardProps {
  title: string;
  value: string | number | null;
  description: string;
  accent: string;
}

const MetricCard = ({ title, value, description, accent }: MetricCardProps) => (
  <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/80 p-[1px] shadow-[0_25px_45px_-30px_rgba(15,118,255,0.4)] backdrop-blur-xl">
    <div className={"absolute inset-0 bg-gradient-to-br " + accent} />
    <div className="relative flex h-full flex-col justify-between gap-4 rounded-2xl bg-background/85 p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Metric</span>
        <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-primary/40 via-secondary/30 to-accent/30" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <p className="mt-2 text-3xl font-bold text-foreground">{value ?? "—"}</p>
      </div>
      <p className="text-xs text-muted-foreground/80">{description}</p>
    </div>
  </div>
);
