import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy } from "lucide-react";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { auth } from "@/firebase";

const db = getFirestore(auth.app);

interface Team {
  id: string;
  name: string;
  collegeName?: string;
  wins?: number; // legacy/static
  losses?: number; // legacy/static
  rank?: number; // legacy/static
  logoUrl?: string;
}

interface ResultDoc {
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamRef?: { id: string } | null;
  awayTeamRef?: { id: string } | null;
  homeScore?: number;
  awayScore?: number;
  homePoints?: number;
  awayPoints?: number;
  // optional fair play inputs used for tiebreakers
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
}

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultDoc[]>([]);

  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [teamsSnap, resultsSnap] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "results")),
        ]);
        const fetchedTeams = teamsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Team, "id">) }));
        const fetchedResults = resultsSnap.docs.map((doc) => doc.data() as ResultDoc);
        setTeams(fetchedTeams);
        setResults(fetchedResults);
      } catch (err) {
        console.error("Failed to load teams", err);
        setError("Failed to load teams. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Derive per-team stats from results
  type Stats = {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
    fairPlay: number; // yellow=1, red=3
  };

  const { statsByTeam, rankByTeam, teamsSortedForDisplay } = useMemo(() => {
    const initialStats: Record<string, Stats> = {};
    const ensure = (id: string) => {
      if (!initialStats[id]) {
        initialStats[id] = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0, fairPlay: 0 };
      }
      return initialStats[id];
    };

    for (const r of results) {
      const homeId = r.homeTeamId ?? r.homeTeamRef?.id;
      const awayId = r.awayTeamId ?? r.awayTeamRef?.id;
      if (!homeId || !awayId) continue;

      const homeScore = r.homeScore ?? 0;
      const awayScore = r.awayScore ?? 0;
      const derivedHomePts = homeScore > awayScore ? 3 : homeScore < awayScore ? 0 : 1;
      const homePts = r.homePoints ?? derivedHomePts;
      const awayPts = r.awayPoints ?? (homeScore > awayScore ? 0 : homeScore < awayScore ? 3 : 1);

      const home = ensure(homeId);
      const away = ensure(awayId);

      home.played += 1;
      home.wins += homePts === 3 ? 1 : 0;
      home.draws += homePts === 1 ? 1 : 0;
      home.losses += homePts === 0 ? 1 : 0;
      home.gf += homeScore;
      home.ga += awayScore;
      home.gd += homeScore - awayScore;
      home.points += homePts;
      home.fairPlay += (r.homeYellowCards ?? 0) * 1 + (r.homeRedCards ?? 0) * 3;

      away.played += 1;
      away.wins += awayPts === 3 ? 1 : 0;
      away.draws += awayPts === 1 ? 1 : 0;
      away.losses += awayPts === 0 ? 1 : 0;
      away.gf += awayScore;
      away.ga += homeScore;
      away.gd += awayScore - homeScore;
      away.points += awayPts;
      away.fairPlay += (r.awayYellowCards ?? 0) * 1 + (r.awayRedCards ?? 0) * 3;
    }

    // Build array for ranking (Pts desc, GD desc, GF desc, FairPlay asc), tie-aware rank
    const arr = teams.map((t) => ({ id: t.id, name: t.name, ...(initialStats[t.id] ?? ensure(t.id)) }));
    arr.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      if (a.fairPlay !== b.fairPlay) return a.fairPlay - b.fairPlay;
      return a.name.localeCompare(b.name);
    });

    const rankMap = new Map<string, number>();
    let last: { points: number; gd: number; gf: number; fairPlay: number } | null = null;
    let lastRank = 0;
    arr.forEach((row, idx) => {
      const position = idx + 1;
      const current = { points: row.points, gd: row.gd, gf: row.gf, fairPlay: row.fairPlay };
      const isTie = last &&
        current.points === last.points &&
        current.gd === last.gd &&
        current.gf === last.gf &&
        current.fairPlay === last.fairPlay;
      const rank = isTie ? lastRank : position;
      rankMap.set(row.id, rank);
      last = current;
      lastRank = rank;
    });

    const statsByTeam: Record<string, Stats> = initialStats;
    const teamsSortedForDisplay = arr.map((r) => r.id);
    return { statsByTeam, rankByTeam: rankMap, teamsSortedForDisplay };
  }, [teams, results]);

  const sortedTeams = useMemo(() => {
    if (teams.length === 0) return [];
    // Prefer the computed ranking order; fallback to name sort
    if (teamsSortedForDisplay.length === teams.length) {
      const order = new Map<string, number>();
      teamsSortedForDisplay.forEach((id, i) => order.set(id, i));
      return teams.slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    return teams.slice().sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [teams, teamsSortedForDisplay]);

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              College Teams
            </h1>
            <p className="text-muted-foreground text-lg">Compete, excel, dominate</p>
          </div>

          {isLoading && (
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6 text-center text-muted-foreground">Loading teams...</CardContent>
            </Card>
          )}

          {error && !isLoading && (
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
            </Card>
          )}

          {!isLoading && !error && sortedTeams.length === 0 && (
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6 text-center text-muted-foreground">
                No teams have been registered yet. Check back soon!
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && sortedTeams.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTeams.map((team, index) => {
                const s = statsByTeam[team.id] ?? { played: 0, wins: 0, draws: 0, losses: 0 } as any;
                const wins = s.wins ?? 0;
                const losses = s.losses ?? 0;
                const draws = s.draws ?? 0;
                const totalGames = (s.played ?? wins + losses + draws) as number;
                const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
                const rank = rankByTeam.get(team.id) ?? (team.rank ?? index + 1);

                return (
                  <Card
                    key={team.id}
                    className="border-border hover:border-primary transition-all duration-300 bg-card/50 backdrop-blur hover:shadow-glow-primary cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/teams/${team.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/teams/${team.id}`); } }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              className="w-12 h-12 rounded-lg object-cover border border-border"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow-primary">
                              <Users className="w-6 h-6 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold">{team.name}</span>
                            {team.collegeName && (
                              <span className="text-sm text-muted-foreground">{team.collegeName}</span>
                            )}
                          </div>
                        </div>
                        {rank <= 3 && <Trophy className="w-5 h-5 text-secondary" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Rank</span>
                          <Badge variant={rank === 1 ? "default" : "secondary"}>#{rank}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Record</span>
                          <span className="font-semibold">
                            {wins}W - {losses}L{s.played ? ` - ${draws}D` : ""}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Win Rate</span>
                          <span className="font-semibold text-primary">{winRate}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Teams;
