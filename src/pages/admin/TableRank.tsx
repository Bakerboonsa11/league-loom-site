import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, DocumentReference } from "firebase/firestore";
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

interface GroupDoc {
  id: string;
  name: string;
  teamIds?: string[];
  description?: string | null;
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

interface GroupStanding {
  groupId: string;
  groupName: string;
  rows: StandingRow[];
  description?: string | null;
}

const sortRows = (rows: StandingRow[]) =>
  rows.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.gd !== a.gd) {
      return b.gd - a.gd;
    }
    return b.gf - a.gf;
  });

const TableRankPage = () => {
  const [groupStandings, setGroupStandings] = useState<GroupStanding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateStandings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [teamsSnapshot, groupsSnapshot, resultsSnapshot] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "groups")),
          getDocs(collection(db, "results")),
        ]);

        const teams: Team[] = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        const teamMap = new Map<string, Team>();
        teams.forEach(team => teamMap.set(team.id, team));

        const groups: GroupDoc[] = groupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<GroupDoc, "id">),
        }));

        const results: ResultDoc[] = resultsSnapshot.docs.map(doc => doc.data() as ResultDoc);

        const groupStandingsMap: Record<string, { meta: GroupDoc; rows: Record<string, StandingRow> }> = {};
        const teamGroupIndex: Record<string, Set<string>> = {};

        groups.forEach(group => {
          const teamIds = group.teamIds ?? [];
          const rows: Record<string, StandingRow> = {};
          teamIds.forEach(teamId => {
            const teamName = teamMap.get(teamId)?.name ?? teamId;
            rows[teamId] = {
              teamId,
              teamName,
              played: 0,
              won: 0,
              drawn: 0,
              lost: 0,
              gf: 0,
              ga: 0,
              gd: 0,
              points: 0,
            };
            if (!teamGroupIndex[teamId]) {
              teamGroupIndex[teamId] = new Set();
            }
            teamGroupIndex[teamId].add(group.id);
          });
          groupStandingsMap[group.id] = { meta: group, rows };
        });

        const ensureRow = (groupId: string, teamId: string) => {
          const container = groupStandingsMap[groupId];
          if (!container) {
            return undefined;
          }
          if (!container.rows[teamId]) {
            const teamName = teamMap.get(teamId)?.name ?? teamId;
            container.rows[teamId] = {
              teamId,
              teamName,
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
          return container.rows[teamId];
        };

        const ungroupedRows: Record<string, StandingRow> = {};
        const upsertUngroupedRow = (teamId: string) => {
          if (!ungroupedRows[teamId]) {
            const teamName = teamMap.get(teamId)?.name ?? teamId;
            ungroupedRows[teamId] = {
              teamId,
              teamName,
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
          return ungroupedRows[teamId];
        };

        results.forEach(result => {
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

          const homeGroups = teamGroupIndex[homeTeamId];
          const awayGroups = teamGroupIndex[awayTeamId];
          const commonGroups = homeGroups && awayGroups
            ? Array.from(homeGroups).filter(groupId => awayGroups.has(groupId))
            : [];

          const groupsToUpdate = commonGroups.length > 0 ? commonGroups : ["__ungrouped"];

          groupsToUpdate.forEach(groupId => {
            const targetRowHome = groupId === "__ungrouped"
              ? upsertUngroupedRow(homeTeamId)
              : ensureRow(groupId, homeTeamId);
            const targetRowAway = groupId === "__ungrouped"
              ? upsertUngroupedRow(awayTeamId)
              : ensureRow(groupId, awayTeamId);

            if (!targetRowHome || !targetRowAway) {
              return;
            }

            targetRowHome.played += 1;
            targetRowHome.won += homePoints === 3 ? 1 : 0;
            targetRowHome.drawn += homePoints === 1 ? 1 : 0;
            targetRowHome.lost += homePoints === 0 ? 1 : 0;
            targetRowHome.gf += homeScore;
            targetRowHome.ga += awayScore;
            targetRowHome.gd += homeScore - awayScore;
            targetRowHome.points += homePoints;

            targetRowAway.played += 1;
            targetRowAway.won += awayPoints === 3 ? 1 : 0;
            targetRowAway.drawn += awayPoints === 1 ? 1 : 0;
            targetRowAway.lost += awayPoints === 0 ? 1 : 0;
            targetRowAway.gf += awayScore;
            targetRowAway.ga += homeScore;
            targetRowAway.gd += awayScore - homeScore;
            targetRowAway.points += awayPoints;
          });
        });

        const computedStandings: GroupStanding[] = Object.values(groupStandingsMap).map(({ meta, rows }) => ({
          groupId: meta.id,
          groupName: meta.name,
          description: meta.description ?? undefined,
          rows: sortRows(Object.values(rows)),
        }));

        if (Object.keys(ungroupedRows).length > 0) {
          computedStandings.push({
            groupId: "__ungrouped",
            groupName: "Ungrouped Matches",
            rows: sortRows(Object.values(ungroupedRows)),
          });
        }

        setGroupStandings(computedStandings);
      } catch (err) {
        setError("Failed to calculate standings. Make sure you have the correct permissions.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    calculateStandings();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {isLoading && <p>Calculating standings...</p>}
      {error && <p className="text-destructive">{error}</p>}
      {!isLoading && !error && groupStandings.length === 0 && (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            No groups found. Create a group and add teams to see standings.
          </CardContent>
        </Card>
      )}
      {!isLoading && !error && groupStandings.map(group => (
        <Card key={group.groupId}>
          <CardHeader>
            <CardTitle>{group.groupName}</CardTitle>
            {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
          </CardHeader>
          <CardContent>
            {group.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches recorded for this group yet.</p>
            ) : (
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
                    {group.rows.map((team, index) => (
                      <TableRow key={team.teamId}>
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
      ))}
    </div>
  );
};

export default TableRankPage;
