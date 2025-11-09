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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

const db = getFirestore(auth.app);

const blogSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  excerpt: z.string().min(20, "Excerpt must be at least 20 characters"),
  author: z.string().min(2, "Author is required"),
  category: z.string().min(2, "Category is required"),
  image: z
    .any()
    .refine((files) => files instanceof FileList && files.length > 0, "Cover image is required"),
});

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  imageUrl: string;
  createdAt?: Timestamp;
}

const AdminBlogManager = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof blogSchema>>({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      author: "",
      category: "",
      image: undefined,
    },
  });

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const postsQuery = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(postsQuery);
      const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as BlogPost) }));
      setPosts(data);
    } catch (error) {
      console.error("Failed to load blog posts", error);
      toast({
        variant: "destructive",
        title: "Failed to load blog posts",
        description: "Please check your Firestore permissions and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const onSubmit = async (values: z.infer<typeof blogSchema>) => {
    const files = values.image as FileList;
    const file = files?.[0];

    if (!file) {
      toast({ variant: "destructive", title: "Cover image required" });
      return;
    }

    try {
      const imageUrl = await uploadImageToCloudinary(file);
      await addDoc(collection(db, "blogPosts"), {
        title: values.title,
        excerpt: values.excerpt,
        author: values.author,
        category: values.category,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Blog post created", description: "Your blog post has been published." });
      setIsDialogOpen(false);
      form.reset();
      await fetchPosts();
    } catch (error) {
      console.error("Failed to create blog post", error);
      toast({
        variant: "destructive",
        title: "Failed to create blog post",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDelete = async (postId: string) => {
    setIsDeletingId(postId);
    try {
      await deleteDoc(doc(db, "blogPosts", postId));
      toast({ title: "Post deleted", description: "The blog post has been removed." });
      await fetchPosts();
    } catch (error) {
      console.error("Failed to delete post", error);
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: "Please try again later.",
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const orderedPosts = useMemo(() => {
    return posts.slice().sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  }, [posts]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage blog posts displayed on the public site.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Blog Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Blog Post</DialogTitle>
              <DialogDescription>Provide the article details below to publish to the public blog feed.</DialogDescription>
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
                        <Input placeholder="Enter post title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Short summary displayed on the listing" {...field} />
                      </FormControl>
                      <FormDescription>Use 1-2 sentences to encourage readers to click in.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Author</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Sarah Johnson" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., News" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover image</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(event) => field.onChange(event.target.files)}
                        />
                      </FormControl>
                      <FormDescription>Upload a high-quality image to feature on the blog listing.</FormDescription>
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
            <CardContent className="p-6 text-sm text-muted-foreground">Loading posts…</CardContent>
          </Card>
        ) : orderedPosts.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="p-6 text-sm text-muted-foreground">No blog posts yet. Create the first one above.</CardContent>
          </Card>
        ) : (
          orderedPosts.map((post) => (
            <Card key={post.id} className="flex flex-col">
              <CardHeader className="space-y-3">
                <div className="space-y-1">
                  <CardTitle className="line-clamp-2 text-lg">{post.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>By {post.author}</span>
                  <Badge variant="secondary">{post.category}</Badge>
                  {post.createdAt && (
                    <span>{format(post.createdAt.toDate(), "PPP")}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <a
                  className="text-sm text-primary underline-offset-4 hover:underline"
                  href={post.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View cover image
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeletingId === post.id}>
                      {isDeletingId === post.id ? (
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
                      <AlertDialogTitle>Delete blog post</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The blog post will be removed permanently.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(post.id)} className="bg-destructive text-destructive-foreground">
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

export default AdminBlogManager;
