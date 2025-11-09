import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, TrendingUp, Star, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";
import { collection, getDocs, getFirestore, Timestamp, type DocumentReference } from "firebase/firestore";
import { auth } from "@/firebase";

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

interface HighlightMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  status: MatchStatus;
  venue?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeLogo?: string | null;
  awayLogo?: string | null;
}

const Index = () => {
  const [matches, setMatches] = useState<HighlightMatch[]>([]);
  const [teamsCount, setTeamsCount] = useState(0);
  const [playersCount, setPlayersCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomepageData = async () => {
      setIsLoadingMatches(true);
      setMatchesError(null);

      try {
        const [teamsSnapshot, gamesSnapshot, resultsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "games")),
          getDocs(collection(db, "results")),
          getDocs(collection(db, "users")),
        ]);

        setTeamsCount(teamsSnapshot.size);
        setMatchesCount(gamesSnapshot.size);

        const playerCount = usersSnapshot.docs.filter((docSnap) => {
          const data = docSnap.data();
          return data.role === "student";
        }).length;
        setPlayersCount(playerCount);

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

            const timeString = dateValue
              ? dateValue.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "TBA";

            return {
              id: gameDoc.id,
              homeTeam: team1?.name ?? "TBD",
              awayTeam: team2?.name ?? "TBD",
              time: timeString,
              status: data.status ?? "Upcoming",
              venue: data.venue ?? data.location ?? null,
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
            return a.time.localeCompare(b.time);
          })
          .slice(0, 3);

        setMatches(highlightMatches);
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
      avatar: "/barni.jpg",
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
      avatar: "https://res.cloudinary.com/dg2kyhuh0/image/upload/v1731001234/league-loom/testimonial-coach.png",
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

      {/* Stats Section */}
      <section className="py-12 border-y border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow-primary">
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
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
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {matches.map((match) => (
                <Card key={match.id} className="border-border hover:border-primary transition-colors bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">{match.homeTeam}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          match.status === "Live"
                            ? "bg-secondary text-secondary-foreground animate-glow"
                            : match.status === "Upcoming"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {match.status}
                      </span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{match.venue ?? "Haramaya Campus Arena"}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-4 mb-2">
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
                    <p className="text-sm text-muted-foreground text-center">{match.time}</p>
                    {match.status === "Live" || match.status === "Finished" ? (
                      <div className="flex items-center justify-center gap-6 text-2xl font-bold">
                        <span>{match.homeScore ?? "-"}</span>
                        <span className="text-sm text-muted-foreground">:</span>
                        <span>{match.awayScore ?? "-"}</span>
                      </div>
                    ) : null}
                    <Button className="w-full" variant="outline" asChild>
                      <Link to={`/matches`}>Match Centre</Link>
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
