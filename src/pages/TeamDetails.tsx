import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { auth } from "@/firebase";

const db = getFirestore(auth.app);

interface TeamDoc {
  id: string;
  name: string;
  collegeName?: string;
  logoUrl?: string;
  description?: string | null;
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
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
  matchDate?: string | number | Date;
}

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<TeamDoc[]>([]);
  const [results, setResults] = useState<ResultDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const team = useMemo(() => teams.find((t) => t.id === teamId) ?? null, [teams, teamId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [teamsSnap, resultsSnap] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "results")),
        ]);
        const fetchedTeams = teamsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamDoc, "id">) }));
        const fetchedResults = resultsSnap.docs.map((d) => d.data() as ResultDoc);
        setTeams(fetchedTeams);
        setResults(fetchedResults);
      } catch (e) {
        console.error("Failed to load team details", e);
        setError("Failed to load team details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  type Stats = {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
    yc: number;
    rc: number;
    fairPlay: number; // yellow=1, red=3
  };

  const { teamStats, rank, matches, winRate } = useMemo(() => {
    const initial: Record<string, Stats> = {};
    const ensure = (id: string) => {
      if (!initial[id]) {
        initial[id] = {
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
          yc: 0,
          rc: 0,
          fairPlay: 0,
        };
      }
      return initial[id];
    };

    const matches: Array<{
      opponentId: string;
      opponentName: string;
      isHome: boolean;
      gf: number;
      ga: number;
      yc: number;
      rc: number;
      date?: Date | null;
      result: "W" | "D" | "L";
    }> = [];

    for (const r of results) {
      const hId = r.homeTeamId ?? r.homeTeamRef?.id;
      const aId = r.awayTeamId ?? r.awayTeamRef?.id;
      if (!hId || !aId) continue;

      const homeScore = r.homeScore ?? 0;
      const awayScore = r.awayScore ?? 0;
      const derivedHomePts = homeScore > awayScore ? 3 : homeScore < awayScore ? 0 : 1;
      const homePts = r.homePoints ?? derivedHomePts;
      const awayPts = r.awayPoints ?? (homeScore > awayScore ? 0 : homeScore < awayScore ? 3 : 1);

      const home = ensure(hId);
      const away = ensure(aId);

      home.played += 1;
      home.wins += homePts === 3 ? 1 : 0;
      home.draws += homePts === 1 ? 1 : 0;
      home.losses += homePts === 0 ? 1 : 0;
      home.gf += homeScore;
      home.ga += awayScore;
      home.gd += homeScore - awayScore;
      home.points += homePts;
      const hYC = r.homeYellowCards ?? 0;
      const hRC = r.homeRedCards ?? 0;
      home.yc += hYC;
      home.rc += hRC;
      home.fairPlay += hYC + hRC * 3;

      away.played += 1;
      away.wins += awayPts === 3 ? 1 : 0;
      away.draws += awayPts === 1 ? 1 : 0;
      away.losses += awayPts === 0 ? 1 : 0;
      away.gf += awayScore;
      away.ga += homeScore;
      away.gd += awayScore - homeScore;
      away.points += awayPts;
      const aYC = r.awayYellowCards ?? 0;
      const aRC = r.awayRedCards ?? 0;
      away.yc += aYC;
      away.rc += aRC;
      away.fairPlay += aYC + aRC * 3;

      if (teamId && (hId === teamId || aId === teamId)) {
        const isHome = hId === teamId;
        const gf = isHome ? homeScore : awayScore;
        const ga = isHome ? awayScore : homeScore;
        const yc = isHome ? hYC : aYC;
        const rc = isHome ? hRC : aRC;
        const result: "W" | "D" | "L" = gf > ga ? "W" : gf === ga ? "D" : "L";
        const opponentId = isHome ? aId : hId;
        const opponentName = teams.find((t) => t.id === opponentId)?.name ?? opponentId;
        const date = r.matchDate ? new Date(r.matchDate) : undefined;
        matches.push({ opponentId, opponentName, isHome, gf, ga, yc, rc, date: date ?? null, result });
      }
    }

    // Compute ranking across all teams using standings rules
    const arr = teams.map((t) => ({ id: t.id, name: t.name, ...(initial[t.id] ?? ensure(t.id)) }));
    arr.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      if (a.fairPlay !== b.fairPlay) return a.fairPlay - b.fairPlay;
      return a.name.localeCompare(b.name);
    });
    let computedRank = undefined as number | undefined;
    let last: { points: number; gd: number; gf: number; fairPlay: number } | null = null;
    let lastRank = 0;
    arr.forEach((row, idx) => {
      const position = idx + 1;
      const current = { points: row.points, gd: row.gd, gf: row.gf, fairPlay: row.fairPlay };
      const isTie = last && current.points === last.points && current.gd === last.gd && current.gf === last.gf && current.fairPlay === last.fairPlay;
      const rank = isTie ? lastRank : position;
      if (row.id === teamId) computedRank = rank;
      last = current;
      lastRank = rank;
    });

    const stats = teamId ? (initial[teamId] ?? { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0, yc: 0, rc: 0, fairPlay: 0 }) : undefined;
    const winRate = stats && stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

    return { teamStats: stats, rank: computedRank ?? null, matches, winRate };
  }, [results, teamId, teams]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {isLoading && (
            <Card className="max-w-5xl mx-auto"><CardContent className="p-6 text-center text-muted-foreground">Loading team...</CardContent></Card>
          )}
          {error && !isLoading && (
            <Card className="max-w-5xl mx-auto"><CardContent className="p-6 text-center text-destructive">{error}</CardContent></Card>
          )}
          {!isLoading && !error && !team && (
            <Card className="max-w-5xl mx-auto"><CardContent className="p-6 text-center text-muted-foreground">Team not found.</CardContent></Card>
          )}
          {!isLoading && !error && team && teamStats && (
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="h-16 w-16 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold">{team.name}</h1>
                    {team.collegeName && (
                      <p className="text-muted-foreground">{team.collegeName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {typeof rank === "number" && <Badge variant={rank === 1 ? "default" : "secondary"}>Rank #{rank}</Badge>}
                  <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
                </div>
              </div>

              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="text-xs text-muted-foreground">Record</div>
                      <div className="text-lg font-semibold">{teamStats.wins}W - {teamStats.losses}L - {teamStats.draws}D</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                      <div className="text-lg font-semibold text-primary">{winRate}%</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="text-xs text-muted-foreground">Played</div>
                      <div className="text-lg font-semibold">{teamStats.played}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="text-xs text-muted-foreground">Points</div>
                      <div className="text-lg font-semibold">{teamStats.points}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="text-xs text-muted-foreground">GF / GA</div>
                      <div className="text-lg font-semibold">{teamStats.gf} / {teamStats.ga}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="text-xs text-muted-foreground">GD</div>
                      <div className="text-lg font-semibold">{teamStats.gd}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="text-xs text-muted-foreground">Yellow Cards</div>
                      <div className="text-lg font-semibold flex items-center gap-2">
                        <span className="inline-block h-3 w-2.5 rounded-[2px] bg-yellow-500 border border-yellow-600 shadow-sm" />
                        {teamStats.yc}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="text-xs text-muted-foreground">Red Cards</div>
                      <div className="text-lg font-semibold flex items-center gap-2">
                        <span className="inline-block h-3 w-2.5 rounded-[2px] bg-red-500 border border-red-700 shadow-sm" />
                        {teamStats.rc}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 bg-background/50 md:col-span-2">
                      <div className="text-xs text-muted-foreground">Fair Play (lower is better)</div>
                      <div className="text-lg font-semibold">{teamStats.fairPlay}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  {matches.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No matches recorded for this team yet.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {matches.map((m, i) => (
                        <div key={i} className="py-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground">
                            {m.date ? new Date(m.date).toLocaleDateString() : ""}
                          </div>
                          <div className="flex-1 min-w-[200px] text-center font-semibold">
                            {m.isHome ? team.name : m.opponentName} {m.isHome ? m.gf : m.ga}
                            <span className="text-muted-foreground"> : </span>
                            {m.isHome ? m.ga : m.gf} {m.isHome ? m.opponentName : team.name}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`font-semibold ${m.result === "W" ? "text-green-600" : m.result === "L" ? "text-red-600" : "text-muted-foreground"}`}>{m.result}</span>
                            <span className="inline-flex items-center gap-2 text-xs font-normal text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block h-3 w-2.5 rounded-[2px] bg-yellow-500 border border-yellow-600 shadow-sm" />
                                {m.yc}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block h-3 w-2.5 rounded-[2px] bg-red-500 border border-red-700 shadow-sm" />
                                {m.rc}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TeamDetails;
