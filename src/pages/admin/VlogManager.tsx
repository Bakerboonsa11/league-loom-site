import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth } from "@/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, PlayCircle, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const db = getFirestore(auth.app);

const vlogSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(2, "Category is required"),
  videoUrl: z.string().url("Please provide a valid video URL"),
  thumbnail: z
    .any()
    .refine((files) => files instanceof FileList && files.length > 0, "Thumbnail image is required"),
});

interface VlogPost {
  id: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt?: Timestamp;
}

const AdminVlogManager = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [vlogs, setVlogs] = useState<VlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof vlogSchema>>({
    resolver: zodResolver(vlogSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      videoUrl: "",
      thumbnail: undefined,
    },
  });

  const fetchVlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const vlogsQuery = query(collection(db, "vlogs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(vlogsQuery);
      const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as VlogPost) }));
      setVlogs(data);
    } catch (error) {
      console.error("Failed to load vlogs", error);
      toast({
        variant: "destructive",
        title: "Failed to load vlogs",
        description: "Please check your Firestore permissions and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchVlogs();
  }, [fetchVlogs]);

  const onSubmit = async (values: z.infer<typeof vlogSchema>) => {
    const files = values.thumbnail as FileList;
    const file = files?.[0];

    if (!file) {
      toast({ variant: "destructive", title: "Thumbnail image required" });
      return;
    }

    try {
      const thumbnailUrl = await uploadImageToCloudinary(file);
      await addDoc(collection(db, "vlogs"), {
        title: values.title,
        description: values.description,
        category: values.category,
        videoUrl: values.videoUrl,
        thumbnailUrl,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Vlog published", description: "Your vlog entry has been added." });
      setIsDialogOpen(false);
      form.reset();
      await fetchVlogs();
    } catch (error) {
      console.error("Failed to create vlog", error);
      toast({
        variant: "destructive",
        title: "Failed to create vlog",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDelete = async (vlogId: string) => {
    setIsDeletingId(vlogId);
    try {
      await deleteDoc(doc(db, "vlogs", vlogId));
      toast({ title: "Vlog deleted", description: "The vlog entry has been removed." });
      await fetchVlogs();
    } catch (error) {
      console.error("Failed to delete vlog", error);
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: "Please try again later.",
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const orderedVlogs = useMemo(() => {
    return vlogs.slice().sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  }, [vlogs]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vlog Management</h1>
          <p className="text-sm text-muted-foreground">Share new videos and keep the community up to date.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Vlog Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Vlog Entry</DialogTitle>
              <DialogDescription>Fill out the vlog details and upload a thumbnail to publish to the video feed.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vlog title" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Brief overview of this vlog" {...field} />
                      </FormControl>
                      <FormDescription>Use 1-2 paragraphs to describe what viewers can expect.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Highlights" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://" {...field} />
                        </FormControl>
                        <FormDescription>Paste a streaming link (YouTube, Vimeo, etc.).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail image</FormLabel>
                      <FormControl>
                        <Input type="file" accept="image/*" onChange={(event) => field.onChange(event.target.files)} />
                      </FormControl>
                      <FormDescription>This image is displayed as the vlog cover.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publish
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading vlogs…</CardContent>
          </Card>
        ) : orderedVlogs.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="p-6 text-sm text-muted-foreground">No vlogs yet. Create the first one above.</CardContent>
          </Card>
        ) : (
          orderedVlogs.map((vlog) => (
            <Card key={vlog.id} className="flex flex-col">
              <CardHeader className="space-y-3">
                <div className="space-y-1">
                  <CardTitle className="line-clamp-2 text-lg">{vlog.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{vlog.description}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{vlog.category}</Badge>
                  {vlog.createdAt && <span>{format(vlog.createdAt.toDate(), "PPP")}</span>}
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <a
                  className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                  href={vlog.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PlayCircle className="h-4 w-4" />
                  Watch video
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeletingId === vlog.id}>
                      {isDeletingId === vlog.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete vlog entry</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The vlog entry will be removed permanently.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(vlog.id)} className="bg-destructive text-destructive-foreground">
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminVlogManager;
