import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, TrendingUp, Star, Quote, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";
import { collection, doc, getDoc, getDocs, getFirestore, Timestamp, query, where, type DocumentReference } from "firebase/firestore";
import { auth } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const db = getFirestore(auth.app);

type MatchStatus = "Upcoming" | "Live" | "Finished";

interface GameDoc {
  team1?: DocumentReference;
  team2?: DocumentReference;
  team1Id?: string;
  team2Id?: string;
  date?: Timestamp | Date | null;
  status?: MatchStatus;
  venue?: string | null;
  location?: string | null;
}

interface TeamDoc {
  id: string;
  name?: string;
  collegeName?: string;
  logoUrl?: string;
}

interface ResultDoc {
  homeScore?: number;
  awayScore?: number;
}

interface GoalDoc {
  scorerId: string;
  scorerName: string;
  scorerPhotoUrl?: string;
}

interface ScorerSummary {
  scorerId: string;
  scorerName: string;
  goals: number;
  photoUrl?: string;
}

interface HighlightMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  dateLabel: string;
  status: MatchStatus;
  venue?: string | null;
  location?: string | null;
  kickoffTime?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeLogo?: string | null;
  awayLogo?: string | null;
}

const formatLocalTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

const Index = () => {
  const [matches, setMatches] = useState<HighlightMatch[]>([]);
  const [teamsCount, setTeamsCount] = useState(0);
  const [playersCount, setPlayersCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [topScorers, setTopScorers] = useState<ScorerSummary[]>([]);

  useEffect(() => {
    const fetchHomepageData = async () => {
      setIsLoadingMatches(true);
      setMatchesError(null);

      try {
        const [teamsSnapshot, gamesSnapshot, resultsSnapshot, goalsSnapshot, uniqueGoalsSnapshot] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "games")),
          getDocs(collection(db, "results")),
          getDocs(collection(db, "goals")),
          getDocs(collection(db, "unique_goals")),
        ]);

        setTeamsCount(teamsSnapshot.size);
        setMatchesCount(gamesSnapshot.size);

        try {
          const usersSnapshot = await getDocs(collection(db, "users"));
          const playerCount = usersSnapshot.docs.filter((docSnap) => {
            const data = docSnap.data();
            return data.role === "student";
          }).length;
          setPlayersCount(playerCount);
        } catch (usersError) {
          console.warn("Unable to load player count", usersError);
          setPlayersCount(0);
        }

        const teamMap = new Map<string, TeamDoc>();
        teamsSnapshot.docs.forEach((teamDoc) => {
          teamMap.set(teamDoc.id, { id: teamDoc.id, ...(teamDoc.data() as Omit<TeamDoc, "id">) });
        });

        const resultMap = new Map<string, ResultDoc>();
        resultsSnapshot.docs.forEach((resultDoc) => {
          resultMap.set(resultDoc.id, resultDoc.data() as ResultDoc);
        });

        const highlightMatches: HighlightMatch[] = gamesSnapshot.docs
          .map((gameDoc) => {
            const data = gameDoc.data() as GameDoc;
            const dateValue = data.date instanceof Timestamp ? data.date.toDate() : data.date ? new Date(data.date) : null;
            const team1Id = data.team1?.id ?? data.team1Id ?? null;
            const team2Id = data.team2?.id ?? data.team2Id ?? null;
            const team1 = (team1Id ? teamMap.get(team1Id) : undefined) ?? { id: team1Id ?? "", name: "TBD" };
            const team2 = (team2Id ? teamMap.get(team2Id) : undefined) ?? { id: team2Id ?? "", name: "TBD" };
            const result = resultMap.get(gameDoc.id);

            const dateLabel = dateValue
              ? dateValue.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "TBA";

            const formattedKickoff =
              data.kickoffTime ?? (dateValue ? `${formatLocalTime(dateValue)} local time` : null);

            return {
              id: gameDoc.id,
              homeTeam: team1?.name ?? "TBD",
              awayTeam: team2?.name ?? "TBD",
              dateLabel,
              status: data.status ?? "Upcoming",
              venue: data.venue ?? data.location ?? null,
              location: data.location ?? data.venue ?? null,
              kickoffTime: formattedKickoff,
              homeScore: result?.homeScore ?? null,
              awayScore: result?.awayScore ?? null,
              homeLogo: team1?.logoUrl ?? null,
              awayLogo: team2?.logoUrl ?? null,
            } satisfies HighlightMatch;
          })
          .sort((a, b) => {
            const statusOrder: Record<MatchStatus, number> = { Live: 0, Upcoming: 1, Finished: 2 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            if (statusDiff !== 0) return statusDiff;
            return a.dateLabel.localeCompare(b.dateLabel);
          })
          .slice(0, 3);

        setMatches(highlightMatches);

        const scorerMap = new Map<string, ScorerSummary>();

        const accumulateGoal = (data: GoalDoc | null | undefined) => {
          if (!data?.scorerId || !data.scorerName) return;
          const existing = scorerMap.get(data.scorerId);
          if (existing) {
            existing.goals += 1;
            if (!existing.photoUrl && data.scorerPhotoUrl) {
              existing.photoUrl = data.scorerPhotoUrl;
            }
          } else {
            scorerMap.set(data.scorerId, {
              scorerId: data.scorerId,
              scorerName: data.scorerName,
              goals: 1,
              photoUrl: data.scorerPhotoUrl,
            });
          }
        };

        goalsSnapshot.docs.forEach((goalDoc) => accumulateGoal(goalDoc.data() as GoalDoc));
        uniqueGoalsSnapshot.docs.forEach((goalDoc) => accumulateGoal(goalDoc.data() as GoalDoc));

        const scorers = Array.from(scorerMap.values());

        const photoMap = new Map<string, string>();
        const scorerIds = scorers.map((scorer) => scorer.scorerId);

        for (let i = 0; i < scorerIds.length; i += 10) {
          const chunk = scorerIds.slice(i, i + 10);
          try {
            const scorerQuery = query(collection(db, "users"), where("userId", "in", chunk));
            const chunkSnapshot = await getDocs(scorerQuery);
            chunkSnapshot.forEach((docSnap) => {
              const data = docSnap.data() as { userId?: string; photoUrl?: string };
              if (data.userId && data.photoUrl) {
                photoMap.set(data.userId, data.photoUrl);
              }
            });
          } catch (error) {
            console.warn("Unable to batch load scorer avatars", error, { chunk });
          }
        }

        await Promise.all(
          scorers
            .filter((scorer) => !photoMap.has(scorer.scorerId) && !scorer.scorerId.includes("/"))
            .map(async (scorer) => {
              try {
                const userRef = doc(db, "users", scorer.scorerId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  const data = userSnap.data() as { photoUrl?: string; userId?: string };
                  const key = data?.userId ?? scorer.scorerId;
                  if (data?.photoUrl) {
                    photoMap.set(key, data.photoUrl);
                  }
                }
              } catch (fallbackError) {
                console.warn(`Unable to fetch fallback avatar for scorer ${scorer.scorerId}`, fallbackError);
              }
            }),
        );

        const sortedScorers = scorers
          .sort((a, b) => {
            const diff = b.goals - a.goals;
            if (diff !== 0) return diff;
            return a.scorerName.localeCompare(b.scorerName);
          })
          .slice(0, 3)
          .map((scorer) => ({
            ...scorer,
            photoUrl: scorer.photoUrl ?? photoMap.get(scorer.scorerId),
          }));
        setTopScorers(sortedScorers);
      } catch (error) {
        console.error("Failed to load homepage data", error);
        setMatchesError("We couldn't load the latest matches right now. Please check back soon.");
      } finally {
        setIsLoadingMatches(false);
      }
    };

    void fetchHomepageData();
  }, []);

  const stats = useMemo(() => {
    return [
      { icon: Trophy, label: "Active Teams", value: String(teamsCount) },
      { icon: Users, label: "Registered Students", value: String(playersCount) },
      { icon: Calendar, label: "Matches Hosted", value: String(matchesCount) },
      { icon: TrendingUp, label: "Season", value: new Date().getFullYear().toString() },
    ];
  }, [matchesCount, playersCount, teamsCount]);

  const galleryImages = [
    {
      id: 1,
      url: "/stadium.jpg",
      alt: "Stadium",
      caption: "Main stadium under the evening lights",
      badge: "Venue",
      layout: "md:col-span-2 md:row-span-2",
    },
    {
      id: 2,
      url: "/haramayateam1.jpg",
      alt: "Haramaya Sports Team",
      caption: "Hornets ready for the big fixture",
      badge: "Teams",
      layout: "md:row-span-2",
    },
    {
      id: 3,
      url: "/haramayafans.jpg",
      alt: "Haramaya Fans",
      caption: "Fans igniting the arena with Hornet pride",
      badge: "Fans",
    },
    {
      id: 4,
      url: "/training.jpg",
      alt: "Haramaya Training",
      caption: "Morning drills sharpening team chemistry",
      badge: "Training",
    },
    {
      id: 5,
      url: "/goal.jpg",
      alt: "Scoring Moment",
      caption: "Clinical finish sealing the win",
      badge: "Highlights",
      layout: "md:col-span-2",
    },
    {
      id: 6,
      url: "/coachs.jpg",
      alt: "Coaching Staff",
      caption: "Coaches dialing up the perfect play",
      badge: "Coaches",
    },
    {
      id: 7,
      url: "/haramayateam2.jpg",
      alt: "Team Huddle",
      caption: "Hornets regrouping with laser focus",
      badge: "Unity",
    },
    {
      id: 8,
      url: "/fans3.jpg",
      alt: "Crowd Celebration",
      caption: "Elation erupts after a last-minute winner",
      badge: "Celebration",
    },
  ];

  const testimonials = [
    {
      id: 1,
      name: "Bonsa Tadesse",
      role: "Winger, Haramaya Men’s Football",
      content: "As a touchline threat, I study defensive gaps and finishing clips on League Loom before every Hornets derby night.",
      avatar: "/bonsa.jpg",
      rating: 5,
    },
    {
      id: 2,
      name: "Barni Alemu",
      role: "Midfielder, Haramaya Men’s Football",
      content: "The lads keep our midfield shape sharp with shared scouting clips and fixture reminders right inside the platform.",
      avatar: "/barni2.jpg",
      rating: 5,
    },
    {
      id: 3,
      name: "Anaba Hussein",
      role: "Libero, Hornet Futsal",
      content: "I organise the back line by reviewing opponent movement and set-piece plans between lectures on my phone.",
      avatar: "/naba.jpg",
      rating: 5,
    },
    {
      id: 4,
      name: "Kiya Dawit",
      role: "Midfielder, Haramaya Women’s Football",
      content: "Match recaps, training slots, and campus shout-outs all live here—perfect for keeping our engine room connected.",
      avatar: "/kiya.jpg",
      rating: 4,
    },
    {
      id: 5,
      name: "Tade Bekele",
      role: "Goalkeeper, Haramaya Men’s Football",
      content: "League Loom’s alerts and film breakdowns help me prep for penalty saves and command the box with confidence.",
      avatar: "/tade.jpg",
      rating: 5,
    },
  ];

  const sponsors = [
    { name: "Haramaya Alumni Association", logo: "https://res.cloudinary.com/dg2kyhuh0/image/upload/v1731001234/league-loom/sponsor-alumni.png" },
    { name: "Oromia Coffee", logo: "https://res.cloudinary.com/dg2kyhuh0/image/upload/v1731001234/league-loom/sponsor-coffee.png" },
    { name: "Green Fields Agro", logo: "https://res.cloudinary.com/dg2kyhuh0/image/upload/v1731001234/league-loom/sponsor-agro.png" },
    { name: "Hornet Telecom", logo: "https://res.cloudinary.com/dg2kyhuh0/image/upload/v1731001234/league-loom/sponsor-telecom.png" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBanner})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-float">
              Haramaya University League Hub
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Celebrating Hornet spirit with real-time fixtures, standings, and campus-wide highlights
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link to="/matches">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow-primary">
                  View Matches
                </Button>
              </Link>
              <Link to="/standings">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  Standings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Top Scorers */}
      <section className="py-16 bg-gradient-to-b from-card/70 via-background to-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Golden Boot Leaders
            </h2>
            <p className="text-muted-foreground">Blink-and-you'll-miss-it finishers lighting up the league.</p>
          </div>
          {topScorers.length === 0 ? (
            <Card className="max-w-3xl mx-auto border-dashed border-muted/60 bg-card/60 backdrop-blur">
              <CardContent className="py-10 text-center text-muted-foreground">
                No goals recorded yet.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center sm:flex-row sm:items-stretch justify-center gap-6 max-w-5xl mx-auto">
              {topScorers.map((scorer, index) => {
                const initials = scorer.scorerName
                  .split(" ")
                  .map((part) => part.charAt(0).toUpperCase())
                  .slice(0, 2)
                  .join("") || "U";

                const gradientClasses = [
                  "from-primary/90 via-primary to-primary/60",
                  "from-secondary/90 via-secondary to-secondary/60",
                  "from-accent/90 via-accent to-accent/60",
                ];

                return (
                  <div
                    key={scorer.scorerId}
                    className={cn(
                      "relative flex-1 min-w-[220px] max-w-[260px] rounded-2xl border border-border/50 bg-card/80 backdrop-blur px-5 py-6",
                      "shadow-[0_20px_45px_-25px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_45px_-20px_rgba(0,0,0,0.7)] transition-shadow",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 rounded-2xl opacity-10",
                        "bg-gradient-to-br",
                        gradientClasses[index % gradientClasses.length],
                      )}
                    />
                    <div className="relative flex items-center gap-4">
                      <div className="flex flex-col items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="text-[0.65rem]">Rank</span>
                        <span className="text-3xl font-black text-foreground">#{index + 1}</span>
                      </div>
                      <Avatar className="h-14 w-14 border-2 border-background/40 shadow-inner">
                        {scorer.photoUrl ? (
                          <AvatarImage src={scorer.photoUrl} alt={scorer.scorerName} />
                        ) : (
                          <AvatarFallback className="bg-muted/70 text-lg font-semibold text-foreground">
                            {initials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{scorer.goals} goals</p>
                        <p className="text-lg font-semibold text-foreground line-clamp-2">{scorer.scorerName}</p>
                      </div>
                    </div>
                    <div className="relative mt-5 h-1 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r",
                          gradientClasses[index % gradientClasses.length],
                        )}
                        style={{ width: `${Math.max(20, Math.min(100, scorer.goals * 20))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute inset-x-12 bottom-0 hidden md:block h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
        <div className="container relative mx-auto px-4">
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card/70 p-6 shadow-[0_25px_60px_-40px_rgba(56,189,248,0.75)] backdrop-blur transition duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_35px_80px_-40px_rgba(56,189,248,0.95)]"
              >
                <div className="absolute -top-20 right-0 h-32 w-32 rounded-full bg-primary/15 blur-3xl transition-transform duration-500 group-hover:translate-y-4" />
                <div className="absolute -bottom-24 left-0 h-40 w-40 rounded-full bg-secondary/15 blur-3xl transition-transform duration-500 group-hover:-translate-y-2" />

                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground shadow-lg shadow-primary/40">
                    <stat.icon className="h-6 w-6" />
                    <span className="absolute inset-0 rounded-xl border border-white/20" />
                  </div>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 text-center sm:text-right">
                    {stat.label}
                  </span>
                </div>

                <p className="mt-6 text-4xl font-black tracking-tight text-foreground drop-shadow-md text-center sm:text-left">
                  {stat.value}
                </p>

                <div className="mt-6 h-[1px] w-full overflow-hidden rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent">
                  <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Matches */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">This Week on Haramaya Courts</h2>
            <p className="text-muted-foreground text-lg">Catch the latest Hornet action lined up across our campuses.</p>
          </div>
          
          {isLoadingMatches ? (
            <div className="max-w-4xl mx-auto">
              <Card className="border-dashed border-muted">
                <CardContent className="py-10 text-center text-muted-foreground">Loading Haramaya fixtures…</CardContent>
              </Card>
            </div>
          ) : matchesError ? (
            <div className="max-w-4xl mx-auto">
              <Card className="border-destructive/60">
                <CardContent className="py-8 text-center text-destructive">{matchesError}</CardContent>
              </Card>
            </div>
          ) : matches.length === 0 ? (
            <div className="max-w-4xl mx-auto">
              <Card className="border-dashed border-muted">
                <CardContent className="py-10 text-center text-muted-foreground">
                  No fixtures scheduled yet. Check back as Haramaya teams publish their next clashes.
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {matches.map((match) => (
                <Card key={match.id} className="border-border bg-card/70 backdrop-blur">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{match.dateLabel}</span>
                      <Badge variant={match.status === "Live" ? "secondary" : "outline"}>{match.status}</Badge>
                    </div>
                    <CardTitle className="text-xl text-center">
                      {match.homeTeam} <span className="text-muted-foreground text-base">vs</span> {match.awayTeam}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{match.venue ?? "Haramaya Campus Arena"}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {match.homeLogo ? (
                          <img src={match.homeLogo} alt={match.homeTeam} className="h-12 w-12 rounded-full object-cover border border-border" />
                        ) : null}
                        <span className="text-2xl font-bold">VS</span>
                        {match.awayLogo ? (
                          <img src={match.awayLogo} alt={match.awayTeam} className="h-12 w-12 rounded-full object-cover border border-border" />
                        ) : null}
                      </div>
                      <p className="text-lg font-semibold mt-1">{match.awayTeam}</p>
                    </div>
                    {match.status === "Live" || match.status === "Finished" ? (
                      <div className="flex items-center justify-center gap-6 text-2xl font-bold">
                        <span>{match.homeScore ?? "-"}</span>
                        <span className="text-sm text-muted-foreground">:</span>
                        <span>{match.awayScore ?? "-"}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span>{match.kickoffTime ?? "TBA"}</span>
                      {match.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{match.location}</span>}
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/matches">Match Centre</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Moments That Matter</h2>
            <p className="text-muted-foreground text-lg">Capturing the excitement of college league</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-5xl mx-auto auto-rows-[150px] md:auto-rows-[190px]">
            {galleryImages.map((image) => (
              <div
                key={image.id}
                className={`group relative overflow-hidden rounded-2xl shadow-lg shadow-primary/20 border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10 ${
                  image.layout ?? ""
                }`}
              >
                <div className="absolute inset-0">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/20 to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm shadow-lg shadow-primary/30">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    {image.badge}
                  </span>
                </div>

                <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-primary/70 transition" />
                <div className="absolute inset-0 rounded-2xl group-hover:shadow-[0_0_40px_rgba(80,200,255,0.45)] transition-shadow duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Voices from Haramaya</h2>
            <p className="text-muted-foreground text-lg">Administrators, coaches, and athletes on the Hornet experience</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="relative overflow-hidden hover:shadow-glow-primary transition-shadow">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                    />
                    <div>
                      <h3 className="font-semibold">{testimonial.name}</h3>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{testimonial.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="py-16 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">Our Partners</h2>
            <p className="text-muted-foreground">Trusted by leading brands in esports and education</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto items-center">
            {sponsors.map((sponsor, index) => (
              <div 
                key={index} 
                className="flex items-center justify-center p-6 bg-background rounded-lg hover:shadow-lg transition-shadow grayscale hover:grayscale-0"
              >
                <img 
                  src={sponsor.logo} 
                  alt={sponsor.name}
                  className="w-full h-12 object-contain opacity-60 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6 bg-gradient-primary rounded-2xl p-12 shadow-glow-primary">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              Ready to Represent Haramaya?
            </h2>
            <p className="text-lg text-primary-foreground/90">
              Register your squad, manage rosters, and showcase Hornet pride across every fixture.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="shadow-lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/teams">
                <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  View Teams
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
