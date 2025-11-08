import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayRemove,
  arrayUnion,
} from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/firebase";

const db = getFirestore(auth.app);

const groupSchema = z.object({
  name: z.string().min(2, "Group name is required"),
  description: z.string().trim().optional(),
  teamIds: z.array(z.string()),
});

type GroupFormValues = z.infer<typeof groupSchema>;

interface TeamOption {
  id: string;
  name: string;
  collegeName?: string;
  groupId?: string | null;
}

interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  teamIds: string[];
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

const AdminGroupPage = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [editingGroup, setEditingGroup] = useState<GroupSummary | null>(null);
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
      teamIds: [],
    },
  });

  const refreshTeams = useCallback(async () => {
    setIsLoadingTeams(true);
    try {
      const snapshot = await getDocs(collection(db, "teams"));
      const data = snapshot.docs.map((teamDoc) => {
        const raw = teamDoc.data() as { name?: string; collegeName?: string; groupId?: string | null };
        return {
          id: teamDoc.id,
          name: raw.name ?? "Unnamed team",
          collegeName: raw.collegeName,
          groupId: raw.groupId ?? null,
        } satisfies TeamOption;
      });
      setTeams(data);
    } catch (error) {
      console.error("Failed to load teams", error);
      toast({
        variant: "destructive",
        title: "Failed to load teams",
        description: "We couldn't fetch teams from Firestore. Please refresh and try again.",
      });
    } finally {
      setIsLoadingTeams(false);
    }
  }, [toast]);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  const refreshGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    try {
      const snapshot = await getDocs(collection(db, "groups"));
      const data = snapshot.docs.map((groupDoc) => {
        const raw = groupDoc.data() as {
          name?: string;
          description?: string | null;
          teamIds?: string[];
          createdAt?: { toDate?: () => Date };
          updatedAt?: { toDate?: () => Date };
        };
        return {
          id: groupDoc.id,
          name: raw.name ?? "Unnamed group",
          description: raw.description ?? undefined,
          teamIds: raw.teamIds ?? [],
          createdAt: raw.createdAt?.toDate?.() ?? null,
          updatedAt: raw.updatedAt?.toDate?.() ?? null,
        } satisfies GroupSummary;
      });
      setGroups(data);
    } catch (error) {
      console.error("Failed to load groups", error);
      toast({
        variant: "destructive",
        title: "Failed to load groups",
        description: "We couldn't fetch existing groups. Please refresh and try again.",
      });
    } finally {
      setIsLoadingGroups(false);
    }
  }, [toast]);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  const sortedTeams = useMemo(
    () => teams.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );

  const teamLookup = useMemo(() => {
    const map = new Map<string, TeamOption>();
    teams.forEach((team) => map.set(team.id, team));
    return map;
  }, [teams]);

  const handleSubmit = async (values: GroupFormValues) => {
    try {
      const timestamp = serverTimestamp();
      await addDoc(collection(db, "groups"), {
        name: values.name,
        description: values.description ?? null,
        teamIds: values.teamIds,
        teamRefs: values.teamIds.map((teamId) => doc(db, "teams", teamId)),
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      toast({ title: "Group created", description: "Group has been saved successfully." });
      form.reset({ name: "", description: "", teamIds: [] });
      await refreshGroups();
    } catch (error) {
      console.error("Failed to create group", error);
      toast({
        variant: "destructive",
        title: "Failed to create group",
        description: "Something went wrong while saving the group. Please try again.",
      });
    }
  };

  const handleEdit = (group: GroupSummary) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      description: group.description ?? "",
      teamIds: group.teamIds,
    });
  };

  const handleDelete = (group: GroupSummary) => {
    void deleteGroup(group)
      .then(() => Promise.all([refreshGroups(), refreshTeams()]))
      .catch(() => {
        /* handled in deleteGroup */
      });
  };

  const handleMoveTeam = async (teamId: string, targetGroupId: string | null) => {
    setSavingTeamId(teamId);
    try {
      const teamRef = doc(db, "teams", teamId);
      const currentTeam = teams.find((team) => team.id === teamId);
      const currentGroupId = currentTeam?.groupId ?? null;

      if (currentGroupId && currentGroupId !== targetGroupId) {
        await updateDoc(doc(db, "groups", currentGroupId), {
          teamIds: arrayRemove(teamId),
          updatedAt: serverTimestamp(),
        });
      }

      if (targetGroupId) {
        await updateDoc(doc(db, "groups", targetGroupId), {
          teamIds: arrayUnion(teamId),
          updatedAt: serverTimestamp(),
        });
      }

      await setDoc(teamRef, { groupId: targetGroupId }, { merge: true });

      toast({ title: "Team reassigned", description: "The team has been moved." });
      await Promise.all([refreshGroups(), refreshTeams()]);
    } catch (error) {
      console.error("Failed to move team", error);
      toast({
        variant: "destructive",
        title: "Failed to move team",
        description: "Something went wrong while moving this team.",
      });
    } finally {
      setSavingTeamId(null);
    }
  };

  const availableGroupOptions = useMemo(
    () => [
      { id: "__none__", label: "No group" },
      ...groups.map((group) => ({ id: group.id, label: group.name })),
    ],
    [groups],
  );

  const selectedCount = form.watch("teamIds").length;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{editingGroup ? "Edit group" : "Create group"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group name</FormLabel>
                      <FormControl>
                        <Input placeholder="Group A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Short description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="teamIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select teams ({selectedCount})</FormLabel>
                    <FormControl>
                      <div className="border rounded-md">
                        <ScrollArea className="h-56">
                          <div className="flex flex-col gap-2 p-3">
                            {isLoadingTeams ? (
                              <p className="text-sm text-muted-foreground">Loading teams…</p>
                            ) : sortedTeams.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No teams available.</p>
                            ) : (
                              sortedTeams.map((team) => (
                                <label key={team.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={field.value.includes(team.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, team.id]);
                                      } else {
                                        field.onChange(field.value.filter((id) => id !== team.id));
                                      }
                                    }}
                                  />
                                  <span className="flex flex-col">
                                    <span>{team.name}</span>
                                    {team.collegeName && (
                                      <span className="text-xs text-muted-foreground">{team.collegeName}</span>
                                    )}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {editingGroup ? "Save changes" : "Create group"}
                </Button>
                {editingGroup && (
                  <Button type="button" variant="outline" onClick={() => setEditingGroup(null)}>
                    Cancel editing
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingGroups ? (
            <p className="text-sm text-muted-foreground">Loading groups…</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups created yet. Start by adding one above.</p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="rounded-md border p-4 space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{group.name}</h3>
                      {group.description ? (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(group)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(group)}
                        disabled={deletingGroupId === group.id}
                      >
                        {deletingGroupId === group.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {group.createdAt && <span>Created {group.createdAt.toLocaleDateString()}</span>}
                    {group.updatedAt && <span>Updated {group.updatedAt.toLocaleDateString()}</span>}
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  {group.teamIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No teams assigned yet.</p>
                  ) : (
                    group.teamIds.map((teamId) => {
                      const team = teamLookup.get(teamId);
                      if (!team) {
                        return null;
                      }

                      const currentValue = team.groupId ?? "__none__";

                      return (
                        <div key={teamId} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium">{team.name}</p>
                            {team.collegeName && (
                              <p className="text-xs text-muted-foreground">{team.collegeName}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Move to</span>
                            <Select
                              value={currentValue}
                              onValueChange={(value) =>
                                handleMoveTeam(teamId, value === "__none__" ? null : value)
                              }
                              disabled={savingTeamId === teamId}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Choose group" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableGroupOptions.map((option) => (
                                  <SelectItem
                                    key={option.id}
                                    value={option.id}
                                    disabled={option.id === group.id}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ungrouped teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingTeams ? (
            <p className="text-sm text-muted-foreground">Loading teams…</p>
          ) : (
            sortedTeams.filter((team) => !team.groupId).length === 0 ? (
              <p className="text-sm text-muted-foreground">All teams are assigned to groups.</p>
            ) : (
              sortedTeams
                .filter((team) => !team.groupId)
                .map((team) => (
                  <div key={team.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{team.name}</p>
                      {team.collegeName && (
                        <p className="text-xs text-muted-foreground">{team.collegeName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Assign to</span>
                      <Select
                        value="__none__"
                        onValueChange={(value) =>
                          handleMoveTeam(team.id, value === "__none__" ? null : value)
                        }
                        disabled={savingTeamId === team.id}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Choose group" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableGroupOptions
                            .filter((option) => option.id !== "__none__")
                            .map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGroupPage;
