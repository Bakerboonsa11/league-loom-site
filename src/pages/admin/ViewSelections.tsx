import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, getDoc } from "firebase/firestore";
import { auth } from "@/firebase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { User } from "@/contexts/AuthContext";
import { Gamepad2, Shield, User as UserIcon, Calendar } from "lucide-react";

const db = getFirestore(auth.app);

interface Selection {
  id: string;
  name?: string;
  team?: any; // DocumentReference
  sport?: string;
  players: any[]; // Array of DocumentReference
  createdAt: { seconds: number };
  adminInfo?: { id: string; name: string };
}

interface GroupedSelections {
  [sport: string]: Selection[];
}

const ViewSelectionsPage = () => {
  const [groupedSelections, setGroupedSelections] = useState<GroupedSelections>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSelections = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const selectionsCollection = collection(db, "selections");
        const selectionsSnapshot = await getDocs(selectionsCollection);
        const selectionsList = await Promise.all(
          selectionsSnapshot.docs.map(async (doc) => {
            const selectionData = { id: doc.id, ...doc.data() } as Selection;
            // Fetch team name
            if (selectionData.team) {
              const teamDoc = await getDoc(selectionData.team);
              selectionData.team = teamDoc.data();
            }
            // Fetch player data
            const playersData = await Promise.all(
              selectionData.players.map(async (playerRef) => {
                const playerDoc = await getDoc(playerRef);
                return { id: playerDoc.id, ...playerDoc.data() } as User;
              })
            );
            selectionData.players = playersData;
            return selectionData;
          })
        );

        const grouped: GroupedSelections = selectionsList.reduce((acc, selection) => {
          const sport = selection.sport || "Unspecified Sport";
          if (!acc[sport]) {
            acc[sport] = [];
          }
          acc[sport].push(selection);
          return acc;
        }, {} as GroupedSelections);

        setGroupedSelections(grouped);
      } catch (err) {
        setError("Failed to fetch selections. Make sure you have the correct permissions.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSelections();
  }, []);

  return (
    <div className="p-4 md:p-8">
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="text-2xl">View Player Selections</CardTitle>
          <CardDescription>Review the player selections organized by sport.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading selections...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading && !error && (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {Object.entries(groupedSelections).map(([sport, selectionsForSport]) => (
                <AccordionItem value={sport} key={sport} className="border rounded-lg">
                  <AccordionTrigger className="text-lg font-semibold p-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Gamepad2 className="h-5 w-5 text-primary" />
                      {sport}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectionsForSport.map((selection) => (
                        <Card key={selection.id} className="hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                          <CardHeader>
                            <CardTitle className="text-lg">{selection.name || 'Unnamed Selection'}</CardTitle>
                            <CardDescription className="flex items-center gap-2 pt-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(selection.createdAt.seconds * 1000).toLocaleDateString()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">Team:</span> {selection.team?.name || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">Created By:</span> {selection.adminInfo?.name || 'N/A'}
                            </div>
                            <div>
                              <h5 className="font-semibold mb-2 text-sm">Selected Players:</h5>
                              <ul className="space-y-1 text-sm text-muted-foreground pl-2">
                                {selection.players.map((player: User) => (
                                  <li key={player.id} className="flex items-center gap-2">
                                    <span>- {player.name}</span>
                                    <span className="text-xs opacity-70">({player.email})</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewSelectionsPage;
