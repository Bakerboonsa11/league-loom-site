import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { auth } from "@/firebase";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const db = getFirestore(auth.app);

interface Team {
  id: string;
  name: string;
}

interface ResultDoc {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homePoints: number;
  awayPoints: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
  homeGoalDifference?: number;
  awayGoalDifference?: number;
}

interface Standings {
  [teamId: string]: {
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
  };
}

const TableRankPage = () => {
  const [standings, setStandings] = useState<Standings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateStandings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const teamsCollection = collection(db, "teams");
        const teamsSnapshot = await getDocs(teamsCollection);
        const teams: Team[] = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

        const initialStandings: Standings = {};
        teams.forEach(team => {
          initialStandings[team.id] = {
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

        const resultsCollection = collection(db, "results");
        const resultsSnapshot = await getDocs(resultsCollection);
        const results: ResultDoc[] = resultsSnapshot.docs.map(doc => doc.data() as ResultDoc);

        results.forEach(result => {
          const { homeTeamId, awayTeamId, homeScore, awayScore, homePoints, awayPoints } = result;

          if (initialStandings[homeTeamId]) {
            initialStandings[homeTeamId].played += 1;
            initialStandings[homeTeamId].won += homePoints === 3 ? 1 : 0;
            initialStandings[homeTeamId].drawn += homePoints === 1 ? 1 : 0;
            initialStandings[homeTeamId].lost += homePoints === 0 ? 1 : 0;
            initialStandings[homeTeamId].gf += homeScore;
            initialStandings[homeTeamId].ga += awayScore;
            initialStandings[homeTeamId].gd += homeScore - awayScore;
            initialStandings[homeTeamId].points += homePoints;
          }

          if (initialStandings[awayTeamId]) {
            initialStandings[awayTeamId].played += 1;
            initialStandings[awayTeamId].won += awayPoints === 3 ? 1 : 0;
            initialStandings[awayTeamId].drawn += awayPoints === 1 ? 1 : 0;
            initialStandings[awayTeamId].lost += awayPoints === 0 ? 1 : 0;
            initialStandings[awayTeamId].gf += awayScore;
            initialStandings[awayTeamId].ga += homeScore;
            initialStandings[awayTeamId].gd += awayScore - homeScore;
            initialStandings[awayTeamId].points += awayPoints;
          }
        });

        setStandings(initialStandings);
      } catch (err) {
        setError("Failed to calculate standings. Make sure you have the correct permissions.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    calculateStandings();
  }, []);

  const sortedStandings = Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return b.gd - a.gd;
  });

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>League Table</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Calculating standings...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading && !error && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>P</TableHead>
                    <TableHead>W</TableHead>
                    <TableHead>D</TableHead>
                    <TableHead>L</TableHead>
                    <TableHead>GF</TableHead>
                    <TableHead>GA</TableHead>
                    <TableHead>GD</TableHead>
                    <TableHead>Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStandings.map((team, index) => (
                    <TableRow key={team.teamName}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{team.teamName}</TableCell>
                      <TableCell>{team.played}</TableCell>
                      <TableCell>{team.won}</TableCell>
                      <TableCell>{team.drawn}</TableCell>
                      <TableCell>{team.lost}</TableCell>
                      <TableCell>{team.gf}</TableCell>
                      <TableCell>{team.ga}</TableCell>
                      <TableCell>{team.gd}</TableCell>
                      <TableCell className="font-semibold">{team.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TableRankPage;
