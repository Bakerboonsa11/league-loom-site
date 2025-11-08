import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock } from "lucide-react";

const Matches = () => {
  const liveMatches = [
    {
      id: 1,
      homeTeam: "Stanford Cardinals",
      awayTeam: "MIT Engineers",
      homeScore: 24,
      awayScore: 21,
      quarter: "Q4 - 5:23",
    },
  ];

  const upcomingMatches = [
    {
      id: 2,
      homeTeam: "Harvard Crimson",
      awayTeam: "Yale Bulldogs",
      date: "Dec 10, 2024",
      time: "6:00 PM EST",
    },
    {
      id: 3,
      homeTeam: "Berkeley Bears",
      awayTeam: "Princeton Tigers",
      date: "Dec 12, 2024",
      time: "8:00 PM EST",
    },
    {
      id: 4,
      homeTeam: "Cornell Big Red",
      awayTeam: "Columbia Lions",
      date: "Dec 14, 2024",
      time: "7:00 PM EST",
    },
  ];

  const completedMatches = [
    {
      id: 5,
      homeTeam: "Brown Bears",
      awayTeam: "Dartmouth Big Green",
      homeScore: 28,
      awayScore: 14,
      date: "Dec 5, 2024",
    },
    {
      id: 6,
      homeTeam: "Penn Quakers",
      awayTeam: "Caltech Beavers",
      homeScore: 31,
      awayScore: 17,
      date: "Dec 3, 2024",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Matches
            </h1>
            <p className="text-muted-foreground text-lg">Follow the action live</p>
          </div>

          {/* Matches Tabs */}
          <Tabs defaultValue="live" className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            {/* Live Matches */}
            <TabsContent value="live" className="space-y-6">
              {liveMatches.map((match) => (
                <Card key={match.id} className="border-border bg-card/50 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">Live Match</CardTitle>
                      <Badge className="bg-secondary text-secondary-foreground animate-glow">
                        {match.quarter}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">{match.homeTeam}</span>
                        <span className="text-3xl font-bold text-primary">{match.homeScore}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">{match.awayTeam}</span>
                        <span className="text-3xl font-bold text-primary">{match.awayScore}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Upcoming Matches */}
            <TabsContent value="upcoming" className="space-y-6">
              {upcomingMatches.map((match) => (
                <Card key={match.id} className="border-border hover:border-primary transition-colors bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="text-lg font-semibold">{match.homeTeam}</p>
                        <p className="text-center text-muted-foreground font-bold">VS</p>
                        <p className="text-lg font-semibold">{match.awayTeam}</p>
                      </div>
                      <div className="flex flex-col gap-2 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{match.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{match.time}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Completed Matches */}
            <TabsContent value="completed" className="space-y-6">
              {completedMatches.map((match) => (
                <Card key={match.id} className="border-border bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold">{match.homeTeam}</span>
                          <span className="text-2xl font-bold">{match.homeScore}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold">{match.awayTeam}</span>
                          <span className="text-2xl font-bold">{match.awayScore}</span>
                        </div>
                      </div>
                      <div className="text-muted-foreground text-sm">{match.date}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Matches;
