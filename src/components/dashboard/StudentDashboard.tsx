import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
  type DocumentReference,
  type Timestamp,
} from "firebase/firestore";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, Trophy, Users, AlertTriangle } from "lucide-react";
import { auth } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const db = getFirestore(auth.app);

type TimestampLike = Timestamp | { seconds: number; nanoseconds?: number } | Date | null | undefined;

interface TeamDoc {
  id: string;
  name: string;
  collegeName?: string;
  rank?: number;
  wins?: number;
  losses?: number;
  logoUrl?: string;
  players?: string[];
  playerEmails?: string[];
}

interface ResultDoc {
  id: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamRef?: DocumentReference;
  awayTeamRef?: DocumentReference;
  homeScore?: number;
  awayScore?: number;
  createdAt?: TimestampLike;
}

interface UpcomingMatch {
  id: string;
  team1Name: string;
  team2Name: string;
  date?: TimestampLike;
  status?: string;
}

const pieColors = ["#22c55e", "#facc15", "#ef4444"];

const toDate = (value: TimestampLike) => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  if (typeof (value as { seconds: number }).seconds === "number") {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return undefined;
};

const deriveRecord = (teamId: string, results: ResultDoc[]) =>
  results.reduce(
    (acc, result) => {
      const homeId = result.homeTeamId ?? result.homeTeamRef?.id;
      const awayId = result.awayTeamId ?? result.awayTeamRef?.id;
      if (homeId !== teamId && awayId !== teamId) return acc;

      const homeScore = result.homeScore ?? 0;
      const awayScore = result.awayScore ?? 0;
      if (homeScore === awayScore) {
        acc.draws += 1;
      } else {
        const didWin = (homeId === teamId && homeScore > awayScore) || (awayId === teamId && awayScore > homeScore);
        if (didWin) acc.wins += 1;
        else acc.losses += 1;
      }
      return acc;
    },
    { wins: 0, draws: 0, losses: 0 },
  );

const StudentDashboard = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamDoc | null>(null);
  const [results, setResults] = useState<ResultDoc[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingMatch[]>([]);
  const [standings, setStandings] = useState<TeamDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        const teams = teamsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<TeamDoc, "id">) }));

        const studentTeam = teams.find((teamDoc) => {
          const nameMatch = user.name ? (teamDoc.players ?? []).map((p) => p.toLowerCase()).includes(user.name.toLowerCase()) : false;
          const emailMatch = user.email ? (teamDoc.playerEmails ?? []).map((e) => e.toLowerCase()).includes(user.email.toLowerCase()) : false;
          return nameMatch || emailMatch;
        });

        setTeam(studentTeam ?? null);

        const standingsOrdered = teams
          .filter((teamDoc) => typeof teamDoc.rank === "number")
          .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
        setStandings(standingsOrdered.slice(0, 6));

        const resultsSnapshot = await getDocs(collection(db, "results"));
        setResults(resultsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ResultDoc, "id">) })));

        if (studentTeam) {
          const gamesSnapshot = await getDocs(query(collection(db, "games"), where("status", "in", ["Upcoming", "Live"])));
          const relevantGames = await Promise.all(
            gamesSnapshot.docs.map(async (docSnap) => {
              const raw = docSnap.data() as {
                team1: DocumentReference;
                team2: DocumentReference;
                date?: TimestampLike;
                status?: string;
              };

              if (raw.team1.id !== studentTeam.id && raw.team2.id !== studentTeam.id) return null;

              const [team1Doc, team2Doc] = await Promise.all([getDoc(raw.team1), getDoc(raw.team2)]);
              return {
                id: docSnap.id,
                team1Name: (team1Doc.data() as TeamDoc | undefined)?.name ?? "TBD",
                team2Name: (team2Doc.data() as TeamDoc | undefined)?.name ?? "TBD",
                date: raw.date,
                status: raw.status,
              } as UpcomingMatch;
            }),
          );

          setUpcoming(
            relevantGames
              .filter((game): game is UpcomingMatch => Boolean(game))
              .sort((a, b) => {
                const aTime = toDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
                const bTime = toDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
                return aTime - bTime;
              })
              .slice(0, 4),
          );
        } else {
          setUpcoming([]);
        }
      } catch (err) {
        console.error("Failed to load student dashboard data", err);
        setError("We couldn't load your dashboard data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [user]);

  const record = useMemo(() => (team ? deriveRecord(team.id, results) : { wins: 0, draws: 0, losses: 0 }), [team, results]);
  const pieData = useMemo(() => {
    const total = record.wins + record.draws + record.losses;
    return total
      ? [
          { name: "Wins", value: record.wins },
          { name: "Draws", value: record.draws },
          { name: "Losses", value: record.losses },
        ]
      : [{ name: "No matches recorded", value: 1 }];
  }, [record]);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Dashboard</CardTitle>
          <CardDescription>Sign in to view your personalized updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/auth">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/60">
          <CardHeader className="flex flex-col gap-1 pb-2">
            <CardTitle className="text-sm font-medium">Your Team</CardTitle>
            <CardDescription>{team?.collegeName ?? user.college ?? "College not set"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <p className="text-xl font-semibold">{team?.name ?? "Not assigned"}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/teams">Browse teams</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardHeader className="flex flex-col gap-1 pb-2">
            <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
            <CardDescription>Based on recorded standings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-secondary" />
              <p className="text-2xl font-semibold">{team?.rank ? `#${team.rank}` : "TBD"}</p>
            </div>
            <p className="text-xs text-muted-foreground">Updated whenever admins record new match results.</p>
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardHeader className="flex flex-col gap-1 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Matches</CardTitle>
            <CardDescription>Published fixtures for your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-accent" />
              <p className="text-2xl font-semibold">{upcoming.length}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/matches">View schedule</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardHeader className="flex flex-col gap-1 pb-2">
            <CardTitle className="text-sm font-medium">Season Record</CardTitle>
            <CardDescription>Wins · Draws · Losses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold">{`${record.wins}-${record.draws}-${record.losses}`}</p>
            <p className="text-xs text-muted-foreground">Pulled from official results.</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/60">
          <CardHeader>
            <CardTitle>Match Form</CardTitle>
            <CardDescription>Results recorded for your team this season.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] flex items-center justify-center">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading chart…</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardHeader>
            <CardTitle>Upcoming Matches</CardTitle>
            <CardDescription>Stay ready for the next challenge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading matches…</p>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming matches posted yet.</p>
            ) : (
              upcoming.map((match) => {
                const date = toDate(match.date);
                return (
                  <div key={match.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{match.team1Name} vs {match.team2Name}</p>
                      <p className="text-xs text-muted-foreground">{date ? date.toLocaleString() : "TBD"}</p>
                    </div>
                    {match.status && <Badge variant="secondary">{match.status}</Badge>}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/60">
        <CardHeader>
          <CardTitle>Teammates Snapshot</CardTitle>
          <CardDescription>Roster entries synced from Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading roster…</p>
          ) : !team || !team.players?.length ? (
            <p className="text-sm text-muted-foreground">Roster information has not been added yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {team.players.slice(0, 6).map((player, index) => (
                <div key={`${player}-${index}`} className="rounded-lg border p-3">
                  <p className="font-medium">{player}</p>
                  <p className="text-xs text-muted-foreground">Listed teammate</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60">
        <CardHeader>
          <CardTitle>Top of the Table</CardTitle>
          <CardDescription>Snapshot of leading teams.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading standings…</p>
          ) : standings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Standings will appear once results are recorded.</p>
          ) : (
            standings.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant={entry.rank && entry.rank <= 3 ? "default" : "outline"}>#{entry.rank}</Badge>
                  <div>
                    <p className="font-semibold">{entry.name}</p>
                    {entry.collegeName && <p className="text-xs text-muted-foreground">{entry.collegeName}</p>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(entry.wins ?? 0)}W - {(entry.losses ?? 0)}L
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
