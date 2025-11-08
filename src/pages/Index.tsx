import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const featuredMatches = [
    {
      id: 1,
      homeTeam: "Stanford Cardinals",
      awayTeam: "MIT Engineers",
      time: "Today, 7:00 PM",
      status: "Live",
    },
    {
      id: 2,
      homeTeam: "Harvard Crimson",
      awayTeam: "Yale Bulldogs",
      time: "Tomorrow, 6:00 PM",
      status: "Upcoming",
    },
    {
      id: 3,
      homeTeam: "Berkeley Bears",
      awayTeam: "Princeton Tigers",
      time: "Friday, 8:00 PM",
      status: "Upcoming",
    },
  ];

  const stats = [
    { icon: Trophy, label: "Active Teams", value: "32" },
    { icon: Users, label: "Total Players", value: "480" },
    { icon: Calendar, label: "Matches Played", value: "156" },
    { icon: TrendingUp, label: "Season", value: "2024" },
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
              College League
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Where champions are made and legends are born
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
            <h2 className="text-4xl font-bold mb-4">Featured Matches</h2>
            <p className="text-muted-foreground text-lg">Don't miss these exciting matchups</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {featuredMatches.map((match) => (
              <Card key={match.id} className="border-border hover:border-primary transition-colors bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{match.homeTeam}</span>
                    {match.status === "Live" && (
                      <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full animate-glow">
                        {match.status}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-center text-2xl font-bold text-muted-foreground">VS</p>
                  <p className="text-lg font-semibold">{match.awayTeam}</p>
                  <p className="text-sm text-muted-foreground">{match.time}</p>
                  <Button className="w-full" variant="outline">View Details</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
