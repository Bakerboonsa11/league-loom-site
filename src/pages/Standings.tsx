import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { collection, getDocs, getFirestore, DocumentReference } from "firebase/firestore";
import { auth } from "@/firebase";

const db = getFirestore(auth.app);

interface Team {
  id: string;
  name: string;
}

interface ResultDoc {
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamRef?: DocumentReference;
  awayTeamRef?: DocumentReference;
  homeScore?: number;
  awayScore?: number;
  homePoints?: number;
  awayPoints?: number;
}

interface StandingRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

const Standings = () => {
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        const teams: Team[] = teamsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Team, "id">),
        }));

        const standingsMap: Record<string, StandingRow> = {};
        teams.forEach((team) => {
          standingsMap[team.id] = {
            teamId: team.id,
            teamName: team.name,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            points: 0,
          };
        });

        const resultsSnapshot = await getDocs(collection(db, "results"));
        const results: ResultDoc[] = resultsSnapshot.docs.map((doc) => doc.data() as ResultDoc);

        const ensureStanding = (teamId: string) => {
          if (!standingsMap[teamId]) {
            const fallbackName = teams.find((team) => team.id === teamId)?.name ?? teamId;
            standingsMap[teamId] = {
              teamId,
              teamName: fallbackName,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              gf: 0,
              ga: 0,
              gd: 0,
              points: 0,
            };
          }
          return standingsMap[teamId];
        };

        results.forEach((result) => {
          const homeTeamId = result.homeTeamId ?? result.homeTeamRef?.id;
          const awayTeamId = result.awayTeamId ?? result.awayTeamRef?.id;

          if (!homeTeamId || !awayTeamId) {
            return;
          }

          const homeScore = result.homeScore ?? 0;
          const awayScore = result.awayScore ?? 0;

          const derivedHomePoints = homeScore > awayScore ? 3 : homeScore < awayScore ? 0 : 1;
          const homePoints = result.homePoints ?? derivedHomePoints;
          const awayPoints = result.awayPoints ?? (homeScore > awayScore ? 0 : homeScore < awayScore ? 3 : 1);

          const homeStanding = ensureStanding(homeTeamId);
          const awayStanding = ensureStanding(awayTeamId);

          homeStanding.played += 1;
          homeStanding.won += homePoints === 3 ? 1 : 0;
          homeStanding.drawn += homePoints === 1 ? 1 : 0;
          homeStanding.lost += homePoints === 0 ? 1 : 0;
          homeStanding.gf += homeScore;
          homeStanding.ga += awayScore;
          homeStanding.gd += homeScore - awayScore;
          homeStanding.points += homePoints;

          awayStanding.played += 1;
          awayStanding.won += awayPoints === 3 ? 1 : 0;
          awayStanding.drawn += awayPoints === 1 ? 1 : 0;
          awayStanding.lost += awayPoints === 0 ? 1 : 0;
          awayStanding.gf += awayScore;
          awayStanding.ga += homeScore;
          awayStanding.gd += awayScore - homeScore;
          awayStanding.points += awayPoints;
        });

        const sortedStandings = Object.values(standingsMap).sort((a, b) => {
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          if (b.gd !== a.gd) {
            return b.gd - a.gd;
          }
          return b.gf - a.gf;
        });

        setStandings(sortedStandings);
      } catch (err) {
        console.error("Failed to load standings", err);
        setError("Failed to load standings. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStandings();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              League Standings
            </h1>
            <p className="text-muted-foreground text-lg">Season Rankings</p>
          </div>

          <Card className="max-w-5xl mx-auto border-border bg-card/50 backdrop-blur overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-11 gap-4 p-4 bg-muted/30 border-b border-border font-semibold text-muted-foreground">
                <div>Rank</div>
                <div className="col-span-2">Team</div>
                <div className="text-center">P</div>
                <div className="text-center">W</div>
                <div className="text-center">D</div>
                <div className="text-center">L</div>
                <div className="text-center">GF</div>
                <div className="text-center">GA</div>
                <div className="text-center">GD</div>
                <div className="text-center">Pts</div>
              </div>

              <div className="divide-y divide-border">
                {isLoading && (
                  <div className="p-6 text-center text-muted-foreground">Loading standings...</div>
                )}
                {error && !isLoading && (
                  <div className="p-6 text-center text-destructive">{error}</div>
                )}
                {!isLoading && !error && standings.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground">No results recorded yet.</div>
                )}
                {!isLoading && !error && standings.length > 0 &&
                  standings.map((team, index) => (
                    <div
                      key={team.teamId}
                      className={`grid grid-cols-11 gap-4 p-4 hover:bg-muted/20 transition-colors ${
                        index < 3 ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{index + 1}</span>
                        {index === 0 && <Trophy className="w-5 h-5 text-secondary" />}
                      </div>
                      <div className="col-span-2 flex items-center gap-2 font-semibold">
                        {team.teamName}
                        {index < 3 && (
                          <Badge variant="secondary" className="text-xs">
                            Top 3
                          </Badge>
                        )}
                      </div>
                      <div className="text-center font-semibold text-primary">{team.played}</div>
                      <div className="text-center text-muted-foreground">{team.won}</div>
                      <div className="text-center text-muted-foreground">{team.drawn}</div>
                      <div className="text-center text-muted-foreground">{team.lost}</div>
                      <div className="text-center text-muted-foreground">{team.gf}</div>
                      <div className="text-center text-muted-foreground">{team.ga}</div>
                      <div className="text-center text-muted-foreground">{team.gd}</div>
                      <div className="text-center font-bold text-accent">{team.points}</div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="max-w-5xl mx-auto mt-8 text-center text-sm text-muted-foreground">
            <p>Points are calculated as: Win = 3 points, Draw = 1 point.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Standings;
