import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays, Clock, MapPin, RefreshCw, Sparkles, Swords, Timer } from "lucide-react";
import { collection, doc, getDoc, getDocs, getFirestore, Timestamp, type DocumentReference } from "firebase/firestore";
import { auth } from "@/firebase";
import { cn } from "@/lib/utils";

const db = getFirestore(auth.app);

interface UniqueGameDoc {
  date?: Timestamp | Date | null;
  status?: "Upcoming" | "Live" | "Finished";
  team1?: DocumentReference;
  team2?: DocumentReference;
  team1GroupName?: string | null;
  team2GroupName?: string | null;
  team1GroupId?: string | null;
  team2GroupId?: string | null;
  kickoffTime?: string | null;
  location?: string | null;
}

interface TeamSummary {
  id: string;
  name: string;
  collegeName?: string | null;
  logoUrl?: string | null;
}

interface UniqueResultDoc {
  homeScore?: number;
  awayScore?: number;
}

interface UniqueGoalDoc {
  gameId?: string;
  scorerId?: string;
  scorerName?: string;
  scorerPhotoUrl?: string;
  teamSide?: "home" | "away";
}

interface GoalSummary {
  scorerName: string;
  scorerPhotoUrl?: string;
}

interface RoundOffMatch {
  id: string;
  status: "Upcoming" | "Live" | "Finished";
  dateText: string;
  teamOne: TeamSummary;
  teamTwo: TeamSummary;
  groupBadge: string;
  kickoffTime?: string | null;
  location?: string | null;
  score?: {
    home: number | null;
    away: number | null;
  };
  goals: {
    home: GoalSummary[];
    away: GoalSummary[];
  };
}

const statusStyles: Record<"Upcoming" | "Live" | "Finished", string> = {
  Upcoming: "bg-primary/15 text-primary border border-primary/30",
  Live: "bg-secondary/20 text-secondary-foreground border border-secondary/40 animate-pulse",
  Finished: "bg-muted text-muted-foreground border border-border",
};

const statusIcon: Record<"Upcoming" | "Live" | "Finished", JSX.Element> = {
  Upcoming: <CalendarDays className="h-4 w-4" />,
  Live: <Timer className="h-4 w-4" />,
  Finished: <RefreshCw className="h-4 w-4" />,
};

const RoundOff = () => {
  const [matches, setMatches] = useState<RoundOffMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoundOffGames = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [uniqueGamesSnapshot, teamsSnapshot, resultsSnapshot, goalsSnapshot] = await Promise.all([
          getDocs(collection(db, "unique_game")),
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "unique_results")),
          getDocs(collection(db, "unique_goals")),
        ]);

        const teamMap = new Map<string, TeamSummary>();
        teamsSnapshot.docs.forEach((teamDoc) => {
          const data = teamDoc.data() as TeamSummary;
          teamMap.set(teamDoc.id, {
            id: teamDoc.id,
            name: data.name ?? "Unnamed Squad",
            collegeName: data.collegeName ?? null,
            logoUrl: data.logoUrl ?? null,
          });
        });

        const resultMap = new Map<string, UniqueResultDoc>();
        resultsSnapshot.docs.forEach((resultDoc) => {
          resultMap.set(resultDoc.id, resultDoc.data() as UniqueResultDoc);
        });

        const goalMap = new Map<string, { home: GoalSummary[]; away: GoalSummary[] }>();
        goalsSnapshot.docs.forEach((goalDoc) => {
          const data = goalDoc.data() as UniqueGoalDoc;
          const gameId = data.gameId;
          if (!data.teamSide || !data.scorerName || !gameId) {
            return;
          }
          const target = goalMap.get(gameId) ?? { home: [], away: [] };
          const goalSummary: GoalSummary = {
            scorerName: data.scorerName,
            scorerPhotoUrl: data.scorerPhotoUrl,
          };
          if (data.teamSide === "home") {
            target.home.push(goalSummary);
          } else {
            target.away.push(goalSummary);
          }
          goalMap.set(gameId, target);
        });

        const uniqueMatches: RoundOffMatch[] = await Promise.all(
          uniqueGamesSnapshot.docs.map(async (gameDoc) => {
            const data = gameDoc.data() as UniqueGameDoc;

            const teamOneRef = data.team1;
            const teamTwoRef = data.team2;

            const [teamOne, teamTwo] = await Promise.all([
              resolveTeam(teamOneRef, teamMap),
              resolveTeam(teamTwoRef, teamMap),
            ]);

            const dateValue = data.date instanceof Timestamp ? data.date.toDate() : typeof data.date === "string" ? new Date(data.date) : data.date ?? null;

            const dateText = dateValue
              ? dateValue.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "Date TBA";

            const status = data.status ?? "Upcoming";

            const groupBadge = [data.team1GroupName ?? "Independent", data.team2GroupName ?? "Independent"]
              .filter(Boolean)
              .map((name) => name?.toString() ?? "Independent")
              .join(" vs ");

            const kickoffTime = data.kickoffTime
              ?? (dateValue ? dateValue.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : null);
            const location = data.location ?? null;

            return {
              id: gameDoc.id,
              status,
              dateText,
              teamOne,
              teamTwo,
              groupBadge,
              kickoffTime,
              location,
              score: resultMap.has(gameDoc.id)
                ? {
                    home: resultMap.get(gameDoc.id)?.homeScore ?? null,
                    away: resultMap.get(gameDoc.id)?.awayScore ?? null,
                  }
                : undefined,
              goals: goalMap.get(gameDoc.id) ?? { home: [], away: [] },
            } satisfies RoundOffMatch;
          }),
        );

        setMatches(
          uniqueMatches.sort((a, b) => {
            if (a.status === b.status) {
              return a.dateText.localeCompare(b.dateText);
            }
            const order: Record<"Live" | "Upcoming" | "Finished", number> = { Live: 0, Upcoming: 1, Finished: 2 };
            return order[a.status] - order[b.status];
          }),
        );
      } catch (fetchError) {
        console.error("Failed to load round-off games", fetchError);
        setError("We couldn't load the Round-Off fixtures right now. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchRoundOffGames();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="relative container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Badge className="mx-auto w-fit bg-primary/15 text-primary border border-primary/30 uppercase tracking-wide">
              Round Off
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-foreground">Cross-Group Showdowns</h1>
            <p className="text-muted-foreground text-lg">
              Handpicked fixtures outside the group stage. Every matchup is a statement game where form is tested and rivalries ignite.
            </p>
          </div>
        </div>
      </section>

      <main className="relative z-10">
        <div className="container mx-auto px-4 pb-24">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : matches.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-8 sm:gap-10 lg:grid-cols-2">
              {matches.map((match, index) => (
                <MatchCard key={match.id} match={match} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const resolveTeam = async (teamRef: DocumentReference | undefined, teamMap: Map<string, TeamSummary>): Promise<TeamSummary> => {
  if (!teamRef) {
    return { id: "unknown", name: "TBD" } satisfies TeamSummary;
  }

  const cached = teamMap.get(teamRef.id);
  if (cached) {
    return cached;
  }

  try {
    const teamSnap = await getDoc(teamRef);
    if (teamSnap.exists()) {
      const data = teamSnap.data() as TeamSummary;
      const resolved: TeamSummary = {
        id: teamSnap.id,
        name: data.name ?? "Unknown Team",
        collegeName: data.collegeName ?? null,
        logoUrl: data.logoUrl ?? null,
      };
      teamMap.set(teamSnap.id, resolved);
      return resolved;
    }
  } catch (error) {
    console.warn("Failed to resolve team reference", error);
  }

  return { id: teamRef.id, name: "Unknown Team" } satisfies TeamSummary;
};

const MatchCard = ({ match, index }: { match: RoundOffMatch; index: number }) => {
  const gradientPalette = [
    "from-primary/80 via-primary/60 to-primary/30",
    "from-secondary/80 via-secondary/50 to-secondary/20",
    "from-accent/80 via-accent/50 to-accent/20",
  ];
  const palette = gradientPalette[index % gradientPalette.length];

  return (
    <Card className="relative overflow-hidden border border-border/30 bg-card/75 backdrop-blur-xl shadow-[0_30px_65px_-35px_rgba(30,30,60,0.6)]">
      <div className={cn("absolute inset-0 opacity-25 blur-2xl bg-gradient-to-br", palette)} />
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
      <CardContent className="relative space-y-7 p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Badge className={cn("flex items-center gap-2 px-3 py-1 text-xs font-semibold shadow-sm", statusStyles[match.status])}>
            {statusIcon[match.status]}
            {match.status}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {match.dateText}
          </div>
        </div>

        <div className="relative rounded-3xl border border-border/50 bg-background/80 p-5 shadow-inner sm:p-6">
          <div className="absolute left-6 right-6 -top-3 h-1 rounded-full bg-gradient-to-r from-primary via-secondary to-accent sm:inset-x-10" />
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <TeamDisplay team={match.teamOne} align="left" score={match.score?.home ?? null} goalScorers={match.goals.home} />
            <div className="relative flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-[0.45em] text-muted-foreground">Round Off</span>
              {match.score ? (
                <div className="flex items-center gap-3 text-3xl font-bold text-foreground">
                  <span>{match.score.home ?? "-"}</span>
                  <span className="text-base text-muted-foreground">:</span>
                  <span>{match.score.away ?? "-"}</span>
                </div>
              ) : null}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
                <div className="absolute inset-0 rounded-full border border-border/40" />
                <Swords className="h-7 w-7 text-foreground" />
              </div>
              <span className="text-[0.7rem] text-muted-foreground tracking-wide">Showdown</span>
            </div>
            <TeamDisplay team={match.teamTwo} align="right" score={match.score?.away ?? null} goalScorers={match.goals.away} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-wide text-muted-foreground sm:justify-start">
          <Badge variant="outline" className="bg-background/70 border-dashed border-border/50 flex items-center gap-2 text-xs uppercase">
            <MapPin className="h-3 w-3" />
            {match.groupBadge}
          </Badge>
          <Badge variant="outline" className="bg-background/70 border-dashed border-border/50 flex items-center gap-2 text-xs uppercase">
            <Sparkles className="h-3 w-3" /> Elite Showcase
          </Badge>
        </div>

        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            <span>{match.kickoffTime ?? "TBA"}</span>
          </div>
          {match.location ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>{match.location}</span>
            </div>
          ) : null}
        </div>

        <Button variant="outline" className="w-full border-primary/60 text-primary hover:bg-primary/10 transition-colors tracking-wide">
          Match Centre
        </Button>
      </CardContent>
    </Card>
  );
};

const TeamDisplay = ({
  team,
  align,
  score,
  goalScorers,
}: {
  team: TeamSummary;
  align: "left" | "right";
  score?: number | null;
  goalScorers?: GoalSummary[];
}) => {
  const initials = team.name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("") || "T";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-center sm:text-left",
        align === "right" ? "items-center sm:items-end" : "items-center sm:items-start",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3",
          align === "right" ? "flex-col sm:flex-row-reverse" : "flex-col sm:flex-row",
        )}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 via-secondary/25 to-accent/25 blur-sm" />
          <Avatar className="relative h-16 w-16 border-2 border-border/60 shadow-lg">
            {team.logoUrl ? (
              <AvatarImage src={team.logoUrl} alt={team.name} />
            ) : (
              <AvatarFallback className="bg-muted text-lg font-semibold text-foreground">{initials}</AvatarFallback>
            )}
          </Avatar>
        </div>
        <div
          className={cn(
            "flex flex-col gap-1",
            align === "right" ? "items-center sm:items-end" : "items-center sm:items-start",
          )}
        >
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{team.collegeName ?? "Independent"}</span>
          <span className="text-2xl font-semibold text-foreground">{team.name}</span>
          {typeof score === "number" ? (
            <span className="text-lg font-bold text-primary">{score}</span>
          ) : null}
        </div>
      </div>
      {goalScorers && goalScorers.length > 0 ? (
        <div className={cn(
          "flex flex-wrap justify-center gap-2 sm:justify-start",
        )}>
          {goalScorers.map((goal, index) => (
            <ScorerTag key={`${goal.scorerName}-${index}`} scorer={goal} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ScorerTag = ({ scorer }: { scorer: GoalSummary }) => {
  const initials = scorer.scorerName
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("") || "G";

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs text-foreground shadow-sm">
      <Avatar className="h-6 w-6 border border-border/50">
        {scorer.scorerPhotoUrl ? (
          <AvatarImage src={scorer.scorerPhotoUrl} alt={scorer.scorerName} />
        ) : (
          <AvatarFallback className="text-[0.65rem] font-semibold">{initials}</AvatarFallback>
        )}
      </Avatar>
      <span>{scorer.scorerName}</span>
    </div>
  );
};

const LoadingState = () => (
  <div className="max-w-4xl mx-auto">
    <Card className="border-dashed border-border/50">
      <CardContent className="p-10 flex flex-col items-center gap-4 text-muted-foreground">
        <Timer className="h-8 w-8 animate-spin" />
        <p>Loading Round-Off fixtures…</p>
      </CardContent>
    </Card>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="max-w-4xl mx-auto">
    <Card className="border border-destructive/40 bg-destructive/10">
      <CardContent className="p-10 text-center text-destructive">
        {message}
      </CardContent>
    </Card>
  </div>
);

const EmptyState = () => (
  <div className="max-w-4xl mx-auto">
    <Card className="border-dashed border-border/50 bg-card/60">
      <CardContent className="p-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">No Round-Off games yet</h2>
        <p className="text-muted-foreground">Once cross-group fixtures are scheduled, they will appear here with full detail.</p>
      </CardContent>
    </Card>
  </div>
);

export default RoundOff;
