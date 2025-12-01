import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, query, where, getDoc, DocumentReference } from "firebase/firestore";
import { auth } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LiveResultForm from "@/components/admin/LiveResultForm";

const db = getFirestore(auth.app);

interface Team {
  id: string;
  name: string;
}

interface GameBase {
  id: string;
  team1: DocumentReference;
  team2: DocumentReference;
  team1Data?: Team;
  team2Data?: Team;
  status: "Upcoming" | "Live" | "Finished";
  kickoffTime?: string | null;
  location?: string | null;
}

interface RegularGame extends GameBase {
  type: "regular";
}

interface UniqueGame extends GameBase {
  type: "unique";
}

const LiveCenter = () => {
  const [liveGames, setLiveGames] = useState<Array<RegularGame | UniqueGame>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLive, setEditingLive] = useState<RegularGame | UniqueGame | null>(null);

  const resolveTeam = async (ref: DocumentReference): Promise<Team> => {
    const snap = await getDoc(ref);
    return { id: snap.id, ...(snap.data() as any) } as Team;
  };

  useEffect(() => {
    const fetchLive = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [gamesSnap, uniqueSnap] = await Promise.all([
          getDocs(query(collection(db, "games"), where("status", "==", "Live"))),
          getDocs(query(collection(db, "unique_game"), where("status", "==", "Live"))),
        ]);

        const reg = await Promise.all(
          gamesSnap.docs.map(async (d) => {
            const data = { id: d.id, ...(d.data() as any) } as GameBase;
            const [team1Data, team2Data] = await Promise.all([resolveTeam(data.team1), resolveTeam(data.team2)]);
            return { ...data, team1Data, team2Data, type: "regular" } as RegularGame;
          }),
        );
        const uniq = await Promise.all(
          uniqueSnap.docs.map(async (d) => {
            const data = { id: d.id, ...(d.data() as any) } as GameBase;
            const [team1Data, team2Data] = await Promise.all([resolveTeam(data.team1), resolveTeam(data.team2)]);
            return { ...data, team1Data, team2Data, type: "unique" } as UniqueGame;
          }),
        );
        setLiveGames([...reg, ...uniq]);
      } catch (e) {
        setError("Failed to load live games.");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchLive();
  }, []);

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Live Center</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading live games...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : liveGames.length === 0 ? (
            <p>No live games at the moment.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead className="hidden md:table-cell">Kickoff</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveGames.map((g) => (
                    <TableRow key={`${g.type}-${g.id}`}>
                      <TableCell className="font-medium">{g.team1Data?.name} vs {g.team2Data?.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{g.kickoffTime ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{g.location ?? "TBD"}</TableCell>
                      <TableCell>{g.type === "regular" ? "League" : "Round-Off"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditingLive(g)}>
                          Update Live Result
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingLive} onOpenChange={(open) => !open && setEditingLive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Live Result</DialogTitle>
            <DialogDescription>Post or edit the in-progress result for this live game.</DialogDescription>
          </DialogHeader>
          {editingLive && (
            <LiveResultForm
              gameId={editingLive.id}
              gameCollection={editingLive.type === "regular" ? "games" : "unique_game"}
              liveResultCollection={editingLive.type === "regular" ? "live_results" : "unique_live_results"}
              liveGoalsCollection={editingLive.type === "regular" ? "live_goals" : "unique_live_goals"}
              liveCardsCollection={editingLive.type === "regular" ? "live_cards" : "unique_live_cards"}
              onFinished={() => setEditingLive(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveCenter;
