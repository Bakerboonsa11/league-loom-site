import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy } from "lucide-react";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { auth } from "@/firebase";

const db = getFirestore(auth.app);

interface Team {
  id: string;
  name: string;
  collegeName?: string;
  wins?: number;
  losses?: number;
  rank?: number;
  logoUrl?: string;
}

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const snapshot = await getDocs(collection(db, "teams"));
        const fetchedTeams = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Team, "id">) }));
        setTeams(fetchedTeams);
      } catch (err) {
        console.error("Failed to load teams", err);
        setError("Failed to load teams. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const sortedTeams = useMemo(() => {
    if (teams.length === 0) {
      return [];
    }

    const withRank = teams.every((team) => team.rank !== undefined);
    if (withRank) {
      return teams.slice().sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    }

    return teams.slice().sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [teams]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              College Teams
            </h1>
            <p className="text-muted-foreground text-lg">Compete, excel, dominate</p>
          </div>

          {isLoading && (
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6 text-center text-muted-foreground">Loading teams...</CardContent>
            </Card>
          )}

          {error && !isLoading && (
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
            </Card>
          )}

          {!isLoading && !error && sortedTeams.length === 0 && (
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6 text-center text-muted-foreground">
                No teams have been registered yet. Check back soon!
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && sortedTeams.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTeams.map((team, index) => {
                const wins = team.wins ?? 0;
                const losses = team.losses ?? 0;
                const totalGames = wins + losses;
                const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
                const rank = team.rank ?? index + 1;

                return (
                  <Card
                    key={team.id}
                    className="border-border hover:border-primary transition-all duration-300 bg-card/50 backdrop-blur hover:shadow-glow-primary"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt={team.name}
                              className="w-12 h-12 rounded-lg object-cover border border-border"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow-primary">
                              <Users className="w-6 h-6 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold">{team.name}</span>
                            {team.collegeName && (
                              <span className="text-sm text-muted-foreground">{team.collegeName}</span>
                            )}
                          </div>
                        </div>
                        {rank <= 3 && <Trophy className="w-5 h-5 text-secondary" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Rank</span>
                          <Badge variant={rank === 1 ? "default" : "secondary"}>#{rank}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Record</span>
                          <span className="font-semibold">
                            {wins}W - {losses}L
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Win Rate</span>
                          <span className="font-semibold text-primary">{winRate}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Teams;
