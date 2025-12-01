import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, TrendingUp, Star, Quote, MapPin, ChevronUp, ChevronDown, Sparkles, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";
import { collection, doc, getDoc, getDocs, getFirestore, Timestamp, query, where, onSnapshot, type DocumentReference } from "firebase/firestore";
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

type RankedScorer = ScorerSummary & { rank: number };

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

const Index = () => {
  const [matches, setMatches] = useState<HighlightMatch[]>([]);
  const [teamsCount, setTeamsCount] = useState(0);
  const [playersCount, setPlayersCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [topScorers, setTopScorers] = useState<ScorerSummary[]>([]);
  const [liveItems, setLiveItems] = useState<{ id: string; text: string; createdAt?: Date }[]>([]);
  const [liveTick, setLiveTick] = useState<number>(0);
  const [scrollIndex, setScrollIndex] = useState<number>(0);

  useEffect(() => {
    const fetchHomepageData = async () => {
      setIsLoadingMatches(true);
      setMatchesError(null);

      try {
        const [teamsSnapshot, gamesSnapshot, resultsSnapshot, goalsSnapshot, uniqueGoalsSnapshot, liveResultsSnapshot] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "games")),
          getDocs(collection(db, "results")),
          getDocs(collection(db, "goals")),
          getDocs(collection(db, "unique_goals")),
          getDocs(collection(db, "live_results")),
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

        const liveResultMap = new Map<string, { homeScore?: number; awayScore?: number }>();
        liveResultsSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as { homeScore?: number; awayScore?: number };
          liveResultMap.set(docSnap.id, data);
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
            const liveResult = (data.status ?? "Upcoming") === "Live" ? liveResultMap.get(gameDoc.id) : undefined;

            const dateLabel = dateValue
              ? dateValue.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "TBA";

            const formattedKickoffRaw = data.kickoffTime ?? (dateValue ? `${formatLocalTime(dateValue)}` : null);
            const formattedKickoff = toLT(formattedKickoffRaw);

            return {
              id: gameDoc.id,
              homeTeam: team1?.name ?? "TBD",
              awayTeam: team2?.name ?? "TBD",
              dateLabel,
              status: data.status ?? "Upcoming",
              venue: data.venue ?? data.location ?? null,
              location: data.location ?? data.venue ?? null,
              kickoffTime: formattedKickoff,
              homeScore: liveResult?.homeScore ?? result?.homeScore ?? null,
              awayScore: liveResult?.awayScore ?? result?.awayScore ?? null,
              homeLogo: team1?.logoUrl ?? null,
              awayLogo: team2?.logoUrl ?? null,
            } satisfies HighlightMatch;
          })
          // Only show Live and Upcoming games in this section
          .filter((m) => m.status === "Live" || m.status === "Upcoming")
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

  // Live texts subscription (last 60s visible)
  useEffect(() => {
    const ref = collection(db, "live_texts");
    const unsub = onSnapshot(ref, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() as { text?: string; createdAt?: Timestamp | Date | string | null };
        let created: Date | undefined;
        const raw = data.createdAt as any;
        if (raw?.toDate) created = raw.toDate();
        else if (typeof raw === "string") created = new Date(raw);
        else if (raw instanceof Date) created = raw;
        return { id: d.id, text: data.text ?? "", createdAt: created };
      })
      // Sort newest first (client-side)
      .sort((a, b) => {
        const ta = a.createdAt?.getTime?.() ?? 0;
        const tb = b.createdAt?.getTime?.() ?? 0;
        return tb - ta;
      });
      // Debug aid: see incoming items (remove later if noisy)
      try { console.debug("Live texts snapshot", items); } catch {}
      setLiveItems(items);
    });
    // Fallback: initial fetch in case snapshot stalls
    (async () => {
      try {
        const snap = await getDocs(ref);
        const items = snap.docs
          .map((d) => {
            const data = d.data() as { text?: string; createdAt?: Timestamp | Date | string | null };
            let created: Date | undefined;
            const raw = data.createdAt as any;
            if (raw?.toDate) created = raw.toDate();
            else if (typeof raw === "string") created = new Date(raw);
            else if (raw instanceof Date) created = raw;
            return { id: d.id, text: data.text ?? "", createdAt: created };
          })
          .sort((a, b) => {
            const ta = a.createdAt?.getTime?.() ?? 0;
            const tb = b.createdAt?.getTime?.() ?? 0;
            return tb - ta;
          });
        setLiveItems((prev) => (prev.length ? prev : items));
      } catch (e) {
        try { console.debug("Live texts initial fetch failed", e); } catch {}
      }
    })();
    const interval = setInterval(() => setLiveTick((t) => t + 1), 5000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const visibleLive = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    return liveItems.filter((it) => {
      if (!it.createdAt) return false;
      const dt = it.createdAt;
      return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
    });
  }, [liveItems, liveTick]);

  // No auto-motion; user controls via buttons

  //

  const stats = useMemo(() => {
    return [
      { icon: Trophy, label: "Active Teams", value: String(teamsCount) },
      { icon: Users, label: "Registered Students", value: String(playersCount) },
      { icon: Calendar, label: "Matches Hosted", value: String(matchesCount) },
      { icon: TrendingUp, label: "Season", value: new Date().getFullYear().toString() },
    ];
  }, [matchesCount, playersCount, teamsCount]);

  const rankedTopScorers: RankedScorer[] = useMemo(() => {
    // Ensure list is sorted by goals desc then name asc as setTopScorers does
    const list = [...topScorers].sort((a, b) => {
      const diff = b.goals - a.goals;
      if (diff !== 0) return diff;
      return a.scorerName.localeCompare(b.scorerName);
    });
    let lastGoals: number | null = null;
    let lastRank = 0;
    return list.map((s, idx) => {
      const position = idx + 1;
      const rank = lastGoals !== null && s.goals === lastGoals ? lastRank : position;
      lastGoals = s.goals;
      lastRank = rank;
      return { ...s, rank } as RankedScorer;
    });
  }, [topScorers]);

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
    { name: "Sponsor 1", logo: "/sponsur1.png" },
    { name: "Sponsor 2", logo: "/sponsur2.png" },
    { name: "Sponsor 3", logo: "/sponsur3.jpeg" },
    { name: "Sponsor 4", logo: "/sponsur4.png" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Spacer to avoid overlap with fixed navbar */}
      <div className="h-14 md:h-16" />
      
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

            {/* Live Now inside Hero */}
            {(() => {
              const liveMatches = matches.filter((m) => m.status === "Live");
              if (liveMatches.length === 0) return null;
              const top = liveMatches.slice(0, 2);
              return (
                <div className="relative mt-8 mx-auto max-w-3xl overflow-hidden rounded-2xl border border-rose-400/30 bg-gradient-to-br from-background/80 via-background/60 to-background/80 backdrop-blur-xl shadow-[0_40px_90px_-45px_rgba(244,63,94,0.5)]">
                  <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-rose-500/25 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
                  <div className="relative px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/50 bg-rose-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-300">
                        <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                        Live Now
                      </span>
                      <Badge variant="secondary" className="bg-rose-500/15 text-rose-200 border-rose-400/30">
                        {liveMatches.length} Live
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      {top.map((m) => (
                        <Card key={m.id} className="border border-border/60 bg-background/70 backdrop-blur group">
                          <CardHeader className="relative pb-2">
                            <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                              <span>{m.dateLabel}</span>
                              <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/50 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                                Live
                              </span>
                            </div>
                            <CardTitle className="text-lg text-center">
                              <span className="font-semibold">{m.homeTeam}</span>
                              <span className="mx-2 text-muted-foreground text-base">vs</span>
                              <span className="font-semibold">{m.awayTeam}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="relative">
                            <div className="flex items-center justify-center gap-6 text-3xl font-black tracking-tight">
                              <span className="text-foreground">{m.homeScore ?? "-"}</span>
                              <span className="text-rose-400 text-2xl">:</span>
                              <span className="text-foreground">{m.awayScore ?? "-"}</span>
                            </div>
                            <div className="mt-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                              <span>{m.kickoffTime ?? "Live"}</span>
                              {m.location && (
                                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-center">
                      <Link to="/matches">
                        <Button size="sm" variant="secondary" className="border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25">
                          Open Match Centre
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>
      {/* Golden Boot Leaders (directly below Hero) */}
      <section className="relative z-20 pt-0">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card/80 backdrop-blur shadow-[0_30px_80px_-40px_rgba(56,189,248,0.6)]">
            <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative px-5 sm:px-8 py-6 sm:py-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <Trophy className="h-3.5 w-3.5" />
                    Golden Boot Leaders
                  </span>
                </div>
                <Badge variant="secondary" className="hidden sm:inline">Live Season {new Date().getFullYear()}</Badge>
              </div>
              {rankedTopScorers.length === 0 ? (
                <div className="mt-5">
                  <Card className="max-w-3xl mx-auto border-dashed border-muted/60 bg-card/60 backdrop-blur">
                    <CardContent className="py-8 text-center text-muted-foreground">No goals recorded yet.</CardContent>
                  </Card>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {rankedTopScorers.slice(0, 3).map((scorer, index) => {
                    const initials = scorer.scorerName
                      .split(" ")
                      .map((part) => part.charAt(0).toUpperCase())
                      .slice(0, 2)
                      .join("") || "U";
                    const cardGlow = [
                      "shadow-[0_22px_64px_-28px_rgba(56,189,248,0.75)]",
                      "shadow-[0_22px_64px_-28px_rgba(168,85,247,0.6)]",
                      "shadow-[0_22px_64px_-28px_rgba(16,185,129,0.6)]",
                    ][index % 3];
                    const gradient = [
                      "from-primary/90 via-primary to-primary/60",
                      "from-secondary/90 via-secondary to-secondary/60",
                      "from-accent/90 via-accent to-accent/60",
                    ][index % 3];
                    return (
                      <div
                        key={scorer.scorerId}
                        className={cn(
                          "relative rounded-2xl border border-border/50 bg-background/70 backdrop-blur p-5 sm:p-6",
                          "hover:border-primary/60 transition-all duration-300 hover:-translate-y-0.5",
                          cardGlow,
                        )}
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-10 rounded-2xl bg-gradient-to-br" />
                        <div className="relative flex items-center gap-5">
                          <div className="text-center min-w-[64px]">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rank</div>
                            <div className="text-3xl font-black tracking-tight">#{scorer.rank}</div>
                          </div>
                          <div className="relative">
                            <Avatar className="h-18 w-18 md:h-20 md:w-20 border-2 border-background/40 shadow-inner ring-2 ring-primary/30">
                              {scorer.photoUrl ? (
                                <AvatarImage src={scorer.photoUrl} alt={scorer.scorerName} />
                              ) : (
                              <AvatarFallback className="bg-muted/70 text-xl font-semibold text-foreground">{initials}</AvatarFallback>
                              )}
                            </Avatar>
                            <span className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-yellow-900 shadow ring-1 ring-yellow-500">
                              <Crown className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">{scorer.goals} goals</div>
                            <div className="font-semibold truncate text-base md:text-lg">{scorer.scorerName}</div>
                            <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full bg-gradient-to-r", gradient, "relative")}
                                   style={{ width: `${Math.max(20, Math.min(100, scorer.goals * 20))}%` }}>
                                <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.25),transparent)] animate-pulse/slow" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      

      {/* Featured Matches - after Golden Boot */}
      {(isLoadingMatches || matchesError || matches.length > 0) && (
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
          ) : matches.length > 0 ? (
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
                    {(match.status === "Live" || match.status === "Finished") ? (
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
          ) : null}
        </div>
      </section>
      )}
      

      {/* Live Look - ultra-styled card after Hero */}
      <div className="relative z-30 py-6">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/70 backdrop-blur shadow-[0_20px_45px_-25px_rgba(56,189,248,0.5)]">
              <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Live Look
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5">{visibleLive.length}</span>
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Today</div>
              </div>
              <div className="relative h-[192px] overflow-hidden">
                <motion.ul
                  className="divide-y divide-border/60"
                  animate={{ y: -1 * (scrollIndex * 48) }}
                  transition={{ type: "spring", stiffness: 80, damping: 20 }}
                >
                  {visibleLive.length > 0 ? (
                    visibleLive.map((item) => (
                      <li key={item.id} className="h-12 px-4 sm:px-6 flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span
                          className="inline-flex max-w-[70%] items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/15 via-secondary/10 to-accent/15 px-3 py-1.5 text-sm md:text-base font-medium text-foreground shadow-[0_8px_24px_-18px_rgba(56,189,248,0.6)] backdrop-blur transition-transform hover:scale-[1.02] hover:shadow-[0_10px_28px_-16px_rgba(56,189,248,0.75)]"
                          title={item.text}
                        >
                          <span className="line-clamp-1">{item.text}</span>
                        </span>
                        <span className="ml-auto text-xs md:text-[13px] text-muted-foreground bg-muted/30 border border-border/60 rounded-md px-2 py-0.5 tabular-nums">
                          {item.createdAt ? formatLocalTime(item.createdAt) : ""}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="h-12 px-4 sm:px-6 flex items-center text-sm italic text-muted-foreground">No live updates yet</li>
                  )}
                </motion.ul>
                {/* Edge gradients */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-card/80 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card/80 to-transparent" />

                {/* Above/Below indicators */}
                {scrollIndex > 0 ? (
                  <div className="pointer-events-none absolute right-12 top-2 z-10 rounded-full border border-primary/40 bg-primary/10 backdrop-blur px-2.5 py-1 text-[10px] font-medium text-primary animate-pulse">
                    {scrollIndex} earlier
                  </div>
                ) : null}
                {Math.max(0, visibleLive.length - (scrollIndex + 4)) > 0 ? (
                  <div className="pointer-events-none absolute right-12 bottom-12 z-10 rounded-full border border-primary/40 bg-primary/10 backdrop-blur px-2.5 py-1 text-[10px] font-medium text-primary animate-pulse">
                    {Math.max(0, visibleLive.length - (scrollIndex + 4))} more below
                  </div>
                ) : null}

                {/* Scroll controls - bottom-right */}
                <div className="absolute right-2 bottom-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setScrollIndex((v) => Math.max(0, v - 1))}
                    disabled={scrollIndex <= 0}
                    className="h-9 w-9 rounded-full bg-background/70 border border-border backdrop-blur flex items-center justify-center hover:bg-background/90 disabled:opacity-50 shadow"
                    aria-label="Scroll up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setScrollIndex((v) => Math.min(Math.max(0, visibleLive.length - 4), v + 1))}
                    disabled={scrollIndex >= Math.max(0, visibleLive.length - 4)}
                    className="h-9 w-9 rounded-full bg-background/70 border border-border backdrop-blur flex items-center justify-center hover:bg-background/90 disabled:opacity-50 shadow"
                    aria-label="Scroll down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      

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
      <section className="py-16 bg-gradient-to-b from-background via-card/40 to-background border-y border-border/60">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Our Partners
            </h2>
            <p className="text-muted-foreground">Trusted by leading brands in esports and education</p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 blur-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 relative">
              {sponsors.map((sponsor, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-[0_12px_40px_-20px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.45)] transition-all duration-300"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10" />
                  <div className="relative aspect-[3/1] flex items-center justify-center p-4">
                    <img
                      src={sponsor.logo}
                      alt={sponsor.name}
                      className="max-h-12 w-full object-contain grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition duration-300"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
              ))}
            </div>
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
