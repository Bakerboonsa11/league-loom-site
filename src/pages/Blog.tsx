import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFirestore, collection, getDocs, orderBy, query, type Timestamp } from "firebase/firestore";
import { auth } from "@/firebase";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  imageUrl?: string;
  createdAt?: Timestamp;
}

const FALLBACK_IMAGE = "https://res.cloudinary.com/dg2kyhuh0/image/upload/v1731000000/league-loom/blog-placeholder.jpg";

const db = getFirestore(auth.app);

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const postsQuery = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(postsQuery);
        const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<BlogPost, "id">) }));
        setPosts(data);
      } catch (err) {
        console.error("Failed to load blog posts", err);
        setError("Failed to load blog posts. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPosts();
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(posts.map((post) => post.category).filter(Boolean));
    return ["All", ...Array.from(uniqueCategories)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "All") {
      return posts;
    }
    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  const renderPublishedDate = (post: BlogPost) => {
    if (post.createdAt?.toDate) {
      return post.createdAt.toDate().toLocaleDateString();
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              League Blog
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stay updated with the latest news, highlights, and stories from the college league
            </p>
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-12">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className="transition-all"
                >
                  {category}
                </Button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading stories…</div>
          ) : error ? (
            <div className="text-center text-destructive">{error}</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center text-muted-foreground">No stories available for this category yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="group hover:shadow-glow-primary transition-all duration-300 overflow-hidden">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={post.imageUrl || FALLBACK_IMAGE}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {post.category && (
                      <Badge className="absolute top-4 right-4 bg-primary">{post.category}</Badge>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">{post.title}</CardTitle>
                    <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{post.author || "League Media"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{renderPublishedDate(post)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" className="w-full group">
                      Read More
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
