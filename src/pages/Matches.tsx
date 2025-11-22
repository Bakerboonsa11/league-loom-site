import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { collection, DocumentReference, getDocs, getFirestore, Timestamp } from "firebase/firestore";
import { auth } from "@/firebase";

const db = getFirestore(auth.app);

type GameStatus = "Upcoming" | "Live" | "Finished";

type GameDoc = {
  team1?: DocumentReference;
  team2?: DocumentReference;
  team1Id?: string;
  team2Id?: string;
  date?: Timestamp | Date | null;
  status?: GameStatus;
  venue?: string | null;
  location?: string | null;
  kickoffTime?: string | null;
};

type ResultDoc = {
  homeScore?: number;
  awayScore?: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
};

type GoalDoc = {
  gameId?: string;
  scorerName?: string;
  scorerPhotoUrl?: string;
  teamSide?: "home" | "away";
};

type GoalSummary = {
  scorerName: string;
  scorerPhotoUrl?: string;
};

type GameGoals = {
  home: GoalSummary[];
  away: GoalSummary[];
};

type TeamDoc = {
  id: string;
  name?: string;
  logoUrl?: string;
};

type GameWithTeams = {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Name: string;
  team2Name: string;
  team1Logo?: string;
  team2Logo?: string;
  status: GameStatus;
  date: Date | null;
  venue?: string | null;
  location?: string | null;
  kickoffTime?: string | null;
  result?: {
    homeScore: number | null;
    awayScore: number | null;
    homeYellowCards?: number | null;
    awayYellowCards?: number | null;
    homeRedCards?: number | null;
    awayRedCards?: number | null;
  } | null;
  goals?: GameGoals | null;
};

const formatLocalTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

// Normalize time label to use 'LT' instead of AM/PM and ensure LT is present
const toLT = (label: string | null | undefined): string | null => {
  if (!label) return label ?? null;
  let t = String(label);
  t = t.replace(/\b(AM|PM)\b/gi, "LT");
  t = t.replace(/\s*local time$/i, " LT");
  if (!/\bLT\b/i.test(t)) {
    t = `${t} LT`;
  }
  return t.replace(/\s+/g, " ").trim();
};

const formatDate = (date: Date | null) => {
  if (!date) return "TBD";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (date: Date | null) => {
  if (!date) return "";
  return toLT(`${formatLocalTime(date)}`) ?? "";
};

const Matches = () => {
  const [games, setGames] = useState<GameWithTeams[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [teamsSnapshot, gamesSnapshot, resultsSnapshot, goalsSnapshot] = await Promise.all([
        getDocs(collection(db, "teams")),
        getDocs(collection(db, "games")),
        getDocs(collection(db, "results")),
        getDocs(collection(db, "goals")),
      ]);

      const teamMap = new Map<string, TeamDoc>();
      teamsSnapshot.docs.forEach((teamDoc) => {
        const data = { id: teamDoc.id, ...(teamDoc.data() as Omit<TeamDoc, "id">) };
        teamMap.set(teamDoc.id, data);
      });

      const resultMap = new Map<string, ResultDoc>();
      resultsSnapshot.docs.forEach((resultDoc) => {
        resultMap.set(resultDoc.id, resultDoc.data() as ResultDoc);
      });

      const goalMap = new Map<string, GameGoals>();
      goalsSnapshot.docs.forEach((goalDoc) => {
        const data = goalDoc.data() as GoalDoc;
        if (!data.gameId || !data.teamSide || !data.scorerName) {
          return;
        }
        const entry = goalMap.get(data.gameId) ?? { home: [], away: [] };
        const goalSummary: GoalSummary = {
          scorerName: data.scorerName,
          scorerPhotoUrl: data.scorerPhotoUrl,
        };
        if (data.teamSide === "home") {
          entry.home.push(goalSummary);
        } else {
          entry.away.push(goalSummary);
        }
        goalMap.set(data.gameId, entry);
      });

      const gamesList: GameWithTeams[] = gamesSnapshot.docs.map((gameDoc) => {
        const data = gameDoc.data() as GameDoc;
        const dateValue = data.date instanceof Timestamp ? data.date.toDate() : data.date ? new Date(data.date) : null;
        const team1Id = data.team1?.id ?? data.team1Id ?? null;
        const team2Id = data.team2?.id ?? data.team2Id ?? null;
        const team1 = (team1Id ? teamMap.get(team1Id) : undefined) ?? { id: team1Id ?? "", name: "TBD" };
        const team2 = (team2Id ? teamMap.get(team2Id) : undefined) ?? { id: team2Id ?? "", name: "TBD" };
        const result = resultMap.get(gameDoc.id);
        const kickoffTime = toLT(data.kickoffTime ?? (dateValue ? `${formatLocalTime(dateValue)}` : null));
        const location = data.location ?? data.venue ?? null;
        const goals = goalMap.get(gameDoc.id);

        return {
          id: gameDoc.id,
          team1Id,
          team2Id,
          team1Name: team1?.name ?? "TBD",
          team2Name: team2?.name ?? "TBD",
          team1Logo: team1?.logoUrl,
          team2Logo: team2?.logoUrl,
          status: data.status ?? "Upcoming",
          date: dateValue,
          venue: data.venue ?? null,
          location,
          kickoffTime,
          result: result
            ? {
                homeScore: result.homeScore ?? null,
                awayScore: result.awayScore ?? null,
                homeYellowCards: result.homeYellowCards ?? null,
                awayYellowCards: result.awayYellowCards ?? null,
                homeRedCards: result.homeRedCards ?? null,
                awayRedCards: result.awayRedCards ?? null,
              }
            : null,
          goals: goals && (goals.home.length > 0 || goals.away.length > 0) ? goals : null,
        } satisfies GameWithTeams;
      });

      setGames(gamesList);
    } catch (err) {
      console.error("Failed to fetch games", err);
      setError("We couldn't load games right now. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGames();
  }, [fetchGames]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const startDateObj = useMemo(() => {
    if (!startDate) return null;
    const date = new Date(startDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [startDate]);

  const endDateObj = useMemo(() => {
    if (!endDate) return null;
    const date = new Date(endDate);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [endDate]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch =
        !normalizedSearch ||
        game.team1Name.toLowerCase().includes(normalizedSearch) ||
        game.team2Name.toLowerCase().includes(normalizedSearch);

      const matchesStartDate = !startDateObj || (game.date ? game.date >= startDateObj : true);
      const matchesEndDate = !endDateObj || (game.date ? game.date <= endDateObj : true);

      return matchesSearch && matchesStartDate && matchesEndDate;
    });
  }, [games, normalizedSearch, startDateObj, endDateObj]);

  const liveGames = useMemo(
    () =>
      filteredGames
        .filter((game) => game.status === "Live")
        .sort((a, b) => (a.date?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.date?.getTime() ?? Number.MAX_SAFE_INTEGER)),
    [filteredGames],
  );

  const upcomingGames = useMemo(
    () =>
      filteredGames
        .filter((game) => game.status === "Upcoming")
        .sort((a, b) => (a.date?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.date?.getTime() ?? Number.MAX_SAFE_INTEGER)),
    [filteredGames],
  );

  const completedGames = useMemo(
    () =>
      filteredGames
        .filter((game) => game.status === "Finished")
        .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)),
    [filteredGames],
  );

  const resetFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  const renderNoGames = (message: string) => (
    <Card className="border-dashed border-2 border-muted">
      <CardContent className="py-10 text-center text-muted-foreground">{message}</CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Matches
            </h1>
            <p className="text-muted-foreground text-lg">Explore live games, upcoming fixtures, and final scores.</p>
          </div>

          <div className="max-w-5xl mx-auto mb-10 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by team name"
              />
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={endDate || undefined}
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate || undefined}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={resetFilters} disabled={!searchTerm && !startDate && !endDate}>
                Clear filters
              </Button>
              <Button variant="secondary" onClick={() => void fetchGames()} disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
            {error ? (
              <Card className="border-destructive/60">
                <CardContent className="py-6 text-center text-destructive">{error}</CardContent>
              </Card>
            ) : null}
          </div>

          {isLoading ? (
            <div className="max-w-5xl mx-auto">
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">Loading matches…</CardContent>
              </Card>
            </div>
          ) : (
            <Tabs defaultValue="live" className="max-w-5xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="live">Live</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="live" className="space-y-6">
                {liveGames.length === 0
                  ? renderNoGames("No live games right now. Check back soon!")
                  : liveGames.map((game) => (
                      <Card key={game.id} className="border-border bg-card/50 backdrop-blur">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">Live Match</CardTitle>
                            <Badge className="bg-secondary text-secondary-foreground animate-glow">On air</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                            {game.date ? <span>{formatDate(game.date)}</span> : null}
                            {game.kickoffTime ? <span>{game.kickoffTime}</span> : game.date ? <span>{formatTime(game.date)}</span> : null}
                            {game.location ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {game.location}
                              </span>
                            ) : null}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                {game.team1Logo ? (
                                  <img src={game.team1Logo} alt={game.team1Name} className="h-10 w-10 rounded-full object-cover border border-border" />
                                ) : null}
                                <span className="text-lg font-semibold">{game.team1Name}</span>
                              </div>
                              <span className="text-3xl font-bold text-primary">{game.result?.homeScore ?? "—"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                {game.team2Logo ? (
                                  <img src={game.team2Logo} alt={game.team2Name} className="h-10 w-10 rounded-full object-cover border border-border" />
                                ) : null}
                                <span className="text-lg font-semibold">{game.team2Name}</span>
                              </div>
                              <span className="text-3xl font-bold text-primary">{game.result?.awayScore ?? "—"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-6">
                {upcomingGames.length === 0
                  ? renderNoGames("No upcoming games match your filters.")
                  : upcomingGames.map((game) => (
                      <Card key={game.id} className="border-border hover:border-primary transition-colors bg-card/50 backdrop-blur">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3 justify-center md:justify-start">
                                {game.team1Logo ? (
                                  <img src={game.team1Logo} alt={game.team1Name} className="h-9 w-9 rounded-full object-cover border border-border" />
                                ) : null}
                                <p className="text-lg font-semibold">{game.team1Name}</p>
                              </div>
                              <p className="text-center text-muted-foreground font-bold">VS</p>
                              <div className="flex items-center gap-3 justify-center md:justify-start">
                                {game.team2Logo ? (
                                  <img src={game.team2Logo} alt={game.team2Name} className="h-9 w-9 rounded-full object-cover border border-border" />
                                ) : null}
                                <p className="text-lg font-semibold">{game.team2Name}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 text-muted-foreground min-w-[160px]">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(game.date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{game.kickoffTime || formatTime(game.date) || "TBA"}</span>
                              </div>
                              {game.location ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <MapPin className="w-3.5 h-3.5" /> {game.location}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
              </TabsContent>

              <TabsContent value="completed" className="space-y-6">
                {completedGames.length === 0
                  ? renderNoGames("No finished games match your filters.")
                  : completedGames.map((game) => (
                      <Card key={game.id} className="border-border bg-card/50 backdrop-blur">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  {game.team1Logo ? (
                                    <img src={game.team1Logo} alt={game.team1Name} className="h-9 w-9 rounded-full object-cover border border-border" />
                                  ) : null}
                                  <span className="text-lg font-semibold">{game.team1Name}</span>
                                </div>
                                <span className="text-2xl font-bold">{game.result?.homeScore ?? "—"}</span>
                              </div>
                              {game.goals?.home?.length ? (
                                <GoalScorerList scorers={game.goals.home} alignment="start" />
                              ) : null}
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  {game.team2Logo ? (
                                    <img src={game.team2Logo} alt={game.team2Name} className="h-9 w-9 rounded-full object-cover border border-border" />
                                  ) : null}
                                  <span className="text-lg font-semibold">{game.team2Name}</span>
                                </div>
                                <span className="text-2xl font-bold">{game.result?.awayScore ?? "—"}</span>
                              </div>
                              {game.goals?.away?.length ? (
                                <GoalScorerList scorers={game.goals.away} alignment="end" />
                              ) : null}
                            </div>
                            <div className="text-muted-foreground text-sm space-y-1 min-w-[160px]">
                              {game.date ? <div>{formatDate(game.date)}</div> : null}
                              {game.kickoffTime ? <div>{game.kickoffTime}</div> : game.date ? <div>{formatTime(game.date)}</div> : null}
                              {game.location ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" /> {game.location}
                                </div>
                              ) : null}
                              {game.result ? (
                                <div className="text-xs text-muted-foreground">
                                  Cards: {game.result.homeYellowCards ?? 0}Y / {game.result.homeRedCards ?? 0}R vs {game.result.awayYellowCards ?? 0}Y / {game.result.awayRedCards ?? 0}R
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Matches;

const GoalScorerList = ({ scorers, alignment }: { scorers: GoalSummary[]; alignment: "start" | "end" }) => {
  if (scorers.length === 0) {
    return null;
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "G";

  return (
    <div className="flex flex-wrap gap-2" style={{ justifyContent: alignment === "end" ? "flex-end" : "flex-start" }}>
      {scorers.map((scorer, index) => (
        <div
          key={`${scorer.scorerName}-${index}`}
          className="flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs text-foreground shadow-sm"
        >
          <Avatar className="h-6 w-6 border border-border/50">
            {scorer.scorerPhotoUrl ? (
              <AvatarImage src={scorer.scorerPhotoUrl} alt={scorer.scorerName} />
            ) : (
              <AvatarFallback className="text-[0.65rem] font-semibold">{getInitials(scorer.scorerName)}</AvatarFallback>
            )}
          </Avatar>
          <span>{scorer.scorerName}</span>
        </div>
      ))}
    </div>
  );
};
