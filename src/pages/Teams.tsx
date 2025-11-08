import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy } from "lucide-react";

const Teams = () => {
  const teams = [
    { name: "Stanford Cardinals", wins: 12, losses: 3, rank: 1 },
    { name: "MIT Engineers", wins: 11, losses: 4, rank: 2 },
    { name: "Harvard Crimson", wins: 10, losses: 5, rank: 3 },
    { name: "Yale Bulldogs", wins: 10, losses: 5, rank: 4 },
    { name: "Berkeley Bears", wins: 9, losses: 6, rank: 5 },
    { name: "Princeton Tigers", wins: 8, losses: 7, rank: 6 },
    { name: "Cornell Big Red", wins: 7, losses: 8, rank: 7 },
    { name: "Columbia Lions", wins: 6, losses: 9, rank: 8 },
    { name: "Brown Bears", wins: 5, losses: 10, rank: 9 },
    { name: "Dartmouth Big Green", wins: 4, losses: 11, rank: 10 },
    { name: "Penn Quakers", wins: 3, losses: 12, rank: 11 },
    { name: "Caltech Beavers", wins: 2, losses: 13, rank: 12 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              College Teams
            </h1>
            <p className="text-muted-foreground text-lg">Compete, excel, dominate</p>
          </div>

          {/* Teams Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card 
                key={team.name} 
                className="border-border hover:border-primary transition-all duration-300 bg-card/50 backdrop-blur hover:shadow-glow-primary cursor-pointer"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow-primary">
                        <Users className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <span className="text-lg">{team.name}</span>
                    </div>
                    {team.rank <= 3 && (
                      <Trophy className="w-5 h-5 text-secondary" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Rank</span>
                      <Badge variant={team.rank === 1 ? "default" : "secondary"}>
                        #{team.rank}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Record</span>
                      <span className="font-semibold">
                        {team.wins}W - {team.losses}L
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className="font-semibold text-primary">
                        {Math.round((team.wins / (team.wins + team.losses)) * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;
