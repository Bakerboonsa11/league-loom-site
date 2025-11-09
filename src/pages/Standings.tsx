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
  logoUrl?: string;
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
  teamLogo?: string | null;
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

const Standings = () => {
  const [groupStandings, setGroupStandings] = useState<GroupStanding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [teamsSnapshot, groupsSnapshot, resultsSnapshot] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "groups")),
          getDocs(collection(db, "results")),
        ]);

        const teams: Team[] = teamsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Team, "id">),
        }));
        const teamMap = new Map<string, Team>();
        teams.forEach((team) => teamMap.set(team.id, team));

        const groups: GroupDoc[] = groupsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<GroupDoc, "id">),
        }));

        const results: ResultDoc[] = resultsSnapshot.docs.map((doc) => doc.data() as ResultDoc);

        const groupStandingsMap: Record<string, { meta: GroupDoc; rows: Record<string, StandingRow> }> = {};
        const teamGroupIndex: Record<string, Set<string>> = {};

        groups.forEach((group) => {
          const teamIds = group.teamIds ?? [];
          const rows: Record<string, StandingRow> = {};
          teamIds.forEach((teamId) => {
            const teamInfo = teamMap.get(teamId);
            const teamName = teamInfo?.name ?? teamId;
            rows[teamId] = {
              teamId,
              teamName,
              teamLogo: teamInfo?.logoUrl ?? null,
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

        const ensureGroupRow = (groupId: string, teamId: string) => {
          const container = groupStandingsMap[groupId];
          if (!container) {
            return undefined;
          }
          if (!container.rows[teamId]) {
            const teamInfo = teamMap.get(teamId);
            const teamName = teamInfo?.name ?? teamId;
            container.rows[teamId] = {
              teamId,
              teamName,
              teamLogo: teamInfo?.logoUrl ?? null,
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

        const overallRows: Record<string, StandingRow> = {};
        const ensureOverallRow = (teamId: string) => {
          if (!overallRows[teamId]) {
            const teamInfo = teamMap.get(teamId);
            const teamName = teamInfo?.name ?? teamId;
            overallRows[teamId] = {
              teamId,
              teamName,
              teamLogo: teamInfo?.logoUrl ?? null,
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
          return overallRows[teamId];
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

          const homeOverall = ensureOverallRow(homeTeamId);
          const awayOverall = ensureOverallRow(awayTeamId);

          homeOverall.played += 1;
          homeOverall.won += homePoints === 3 ? 1 : 0;
          homeOverall.drawn += homePoints === 1 ? 1 : 0;
          homeOverall.lost += homePoints === 0 ? 1 : 0;
          homeOverall.gf += homeScore;
          homeOverall.ga += awayScore;
          homeOverall.gd += homeScore - awayScore;
          homeOverall.points += homePoints;

          awayOverall.played += 1;
          awayOverall.won += awayPoints === 3 ? 1 : 0;
          awayOverall.drawn += awayPoints === 1 ? 1 : 0;
          awayOverall.lost += awayPoints === 0 ? 1 : 0;
          awayOverall.gf += awayScore;
          awayOverall.ga += homeScore;
          awayOverall.gd += awayScore - homeScore;
          awayOverall.points += awayPoints;

          const homeGroups = teamGroupIndex[homeTeamId];
          const awayGroups = teamGroupIndex[awayTeamId];
          const commonGroups = homeGroups && awayGroups
            ? Array.from(homeGroups).filter((groupId) => awayGroups.has(groupId))
            : [];

          commonGroups.forEach((groupId) => {
            const targetRowHome = ensureGroupRow(groupId, homeTeamId);
            const targetRowAway = ensureGroupRow(groupId, awayTeamId);

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

        const overallRowsArray = sortRows(Object.values(overallRows));

        const computedStandings: GroupStanding[] = Object.values(groupStandingsMap)
          .map(({ meta, rows }) => ({
            groupId: meta.id,
            groupName: meta.name,
            description: meta.description ?? undefined,
            rows: sortRows(Object.values(rows)),
          }))
          .filter((group) => group.rows.length > 0);

        if (overallRowsArray.length > 0) {
          computedStandings.unshift({
            groupId: "__overall",
            groupName: "Overall Standings",
            rows: overallRowsArray,
          });
        }

        setGroupStandings(computedStandings);
      } catch (err) {
        console.error("Failed to load standings", err);
        setError("Failed to load standings. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStandings();
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              League Standings
            </h1>
            <p className="text-muted-foreground text-lg">Season {currentYear}</p>
          </div>

          {isLoading && (
            <Card className="max-w-5xl mx-auto">
              <CardContent className="p-6 text-center text-muted-foreground">Loading standings...</CardContent>
            </Card>
          )}

          {error && !isLoading && (
            <Card className="max-w-5xl mx-auto">
              <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
            </Card>
          )}

          {!isLoading && !error && groupStandings.length === 0 && (
            <Card className="max-w-5xl mx-auto">
              <CardContent className="p-6 text-center text-muted-foreground">
                No groups or results recorded yet. Check back soon!
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && groupStandings.map((group) => (
            <Card
              key={group.groupId}
              className="max-w-5xl mx-auto border-border bg-card/50 backdrop-blur overflow-hidden mb-10"
            >
              <CardContent className="p-0">
                <div className="flex flex-col gap-1 p-6 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{group.groupName}</h2>
                    {group.rows.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Top performer</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.rows[0].teamName}
                        </Badge>
                        <Trophy className="h-4 w-4 text-secondary" />
                      </div>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  )}
                </div>

                {group.rows.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No matches recorded for this group yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <div className="hidden md:grid md:grid-cols-11 gap-4 p-4 bg-muted/20 border-b border-border font-semibold text-muted-foreground">
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
                    {group.rows.map((team, index) => (
                      <div
                        key={team.teamId}
                        className={`p-4 hover:bg-muted/20 transition-colors ${
                          index === 0 ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="grid md:grid-cols-11 md:gap-4 items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{index + 1}</span>
                            {index === 0 && <Trophy className="w-5 h-5 text-secondary" />}
                          </div>
                          <div className="md:col-span-2 flex items-center gap-3 font-semibold">
                            {team.teamLogo ? (
                              <img
                                src={team.teamLogo}
                                alt={team.teamName}
                                className="h-9 w-9 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {team.teamName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span>{team.teamName}</span>
                            {index < 3 && (
                              <Badge variant="secondary" className="text-xs">
                                Top {index + 1}
                              </Badge>
                            )}
                          </div>
                          <div className="hidden md:block text-center font-semibold text-primary">{team.played}</div>
                          <div className="hidden md:block text-center text-muted-foreground">{team.won}</div>
                          <div className="hidden md:block text-center text-muted-foreground">{team.drawn}</div>
                          <div className="hidden md:block text-center text-muted-foreground">{team.lost}</div>
                          <div className="hidden md:block text-center text-muted-foreground">{team.gf}</div>
                          <div className="hidden md:block text-center text-muted-foreground">{team.ga}</div>
                          <div className="hidden md:block text-center text-muted-foreground">{team.gd}</div>
                          <div className="hidden md:block text-center font-bold text-accent">{team.points}</div>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-3 text-sm text-muted-foreground md:hidden">
                          <div className="flex justify-between"><span>P</span><span className="font-medium text-foreground">{team.played}</span></div>
                          <div className="flex justify-between"><span>W</span><span className="font-medium text-foreground">{team.won}</span></div>
                          <div className="flex justify-between"><span>D</span><span className="font-medium text-foreground">{team.drawn}</span></div>
                          <div className="flex justify-between"><span>L</span><span className="font-medium text-foreground">{team.lost}</span></div>
                          <div className="flex justify-between"><span>GF</span><span className="font-medium text-foreground">{team.gf}</span></div>
                          <div className="flex justify-between"><span>GA</span><span className="font-medium text-foreground">{team.ga}</span></div>
                          <div className="flex justify-between"><span>GD</span><span className="font-medium text-foreground">{team.gd}</span></div>
                          <div className="flex justify-between"><span>Pts</span><span className="font-semibold text-primary">{team.points}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

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
