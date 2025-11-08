import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

const Standings = () => {
  const standings = [
    { rank: 1, team: "Stanford Cardinals", wins: 12, losses: 3, points: 36 },
    { rank: 2, team: "MIT Engineers", wins: 11, losses: 4, points: 33 },
    { rank: 3, team: "Harvard Crimson", wins: 10, losses: 5, points: 30 },
    { rank: 4, team: "Yale Bulldogs", wins: 10, losses: 5, points: 30 },
    { rank: 5, team: "Berkeley Bears", wins: 9, losses: 6, points: 27 },
    { rank: 6, team: "Princeton Tigers", wins: 8, losses: 7, points: 24 },
    { rank: 7, team: "Cornell Big Red", wins: 7, losses: 8, points: 21 },
    { rank: 8, team: "Columbia Lions", wins: 6, losses: 9, points: 18 },
    { rank: 9, team: "Brown Bears", wins: 5, losses: 10, points: 15 },
    { rank: 10, team: "Dartmouth Big Green", wins: 4, losses: 11, points: 12 },
    { rank: 11, team: "Penn Quakers", wins: 3, losses: 12, points: 9 },
    { rank: 12, team: "Caltech Beavers", wins: 2, losses: 13, points: 6 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              League Standings
            </h1>
            <p className="text-muted-foreground text-lg">Season 2024 Rankings</p>
          </div>

          {/* Standings Table */}
          <Card className="max-w-5xl mx-auto border-border bg-card/50 backdrop-blur overflow-hidden">
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 p-4 bg-muted/30 border-b border-border font-semibold text-muted-foreground">
                <div className="col-span-1">Rank</div>
                <div className="col-span-2">Team</div>
                <div className="text-center">W</div>
                <div className="text-center">L</div>
                <div className="text-center">Pts</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-border">
                {standings.map((team) => (
                  <div
                    key={team.rank}
                    className={`grid grid-cols-6 gap-4 p-4 hover:bg-muted/20 transition-colors ${
                      team.rank <= 3 ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="col-span-1 flex items-center gap-2">
                      <span className="font-bold text-lg">{team.rank}</span>
                      {team.rank === 1 && <Trophy className="w-5 h-5 text-secondary" />}
                    </div>
                    <div className="col-span-2 flex items-center gap-2 font-semibold">
                      {team.team}
                      {team.rank <= 3 && (
                        <Badge variant="secondary" className="text-xs">
                          Top 3
                        </Badge>
                      )}
                    </div>
                    <div className="text-center font-semibold text-primary">{team.wins}</div>
                    <div className="text-center text-muted-foreground">{team.losses}</div>
                    <div className="text-center font-bold text-accent">{team.points}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="max-w-5xl mx-auto mt-8 text-center text-sm text-muted-foreground">
            <p>Points are calculated as: Win = 3 points, Loss = 0 points</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Standings;
