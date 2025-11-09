import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Play, Clock, Eye, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collection, getDocs, getFirestore, orderBy, query, type Timestamp } from "firebase/firestore";
import { auth } from "@/firebase";

interface VlogEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: string;
  views?: string;
  likes?: string;
  createdAt?: Timestamp;
}

const FALLBACK_THUMBNAIL = "https://res.cloudinary.com/dg2kyhuh0/image/upload/v1731000000/league-loom/vlog-placeholder.jpg";

const db = getFirestore(auth.app);

const Vlog = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [vlogs, setVlogs] = useState<VlogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVlogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const vlogsQuery = query(collection(db, "vlogs"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(vlogsQuery);
        const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<VlogEntry, "id">) }));
        setVlogs(data);
      } catch (err) {
        console.error("Failed to load vlogs", err);
        setError("Failed to load vlogs. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchVlogs();
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(vlogs.map((vlog) => vlog.category).filter(Boolean));
    return ["All", ...Array.from(uniqueCategories)];
  }, [vlogs]);

  const filteredVlogs = useMemo(() => {
    if (selectedCategory === "All") {
      return vlogs;
    }
    return vlogs.filter((vlog) => vlog.category === selectedCategory);
  }, [vlogs, selectedCategory]);

  const renderUploadDate = (vlog: VlogEntry) => {
    if (vlog.createdAt?.toDate) {
      return vlog.createdAt.toDate().toLocaleDateString();
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
              League Vlogs
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Watch exclusive video content, highlights, and behind-the-scenes footage from the college league
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
            <div className="text-center text-muted-foreground">Loading videos…</div>
          ) : error ? (
            <div className="text-center text-destructive">{error}</div>
          ) : filteredVlogs.length === 0 ? (
            <div className="text-center text-muted-foreground">No videos available for this category yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVlogs.map((vlog) => (
                <Card key={vlog.id} className="group hover:shadow-glow-primary transition-all duration-300 overflow-hidden">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={vlog.thumbnailUrl || FALLBACK_THUMBNAIL}
                      alt={vlog.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-glow-primary">
                        <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                    {vlog.category && <Badge className="absolute top-4 right-4 bg-primary">{vlog.category}</Badge>}
                    {(vlog.duration || vlog.views || vlog.likes) && (
                      <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 rounded text-sm text-white flex items-center gap-2">
                        {vlog.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {vlog.duration}
                          </span>
                        )}
                        {vlog.views && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {vlog.views}
                          </span>
                        )}
                        {vlog.likes && (
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {vlog.likes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">{vlog.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{vlog.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {vlog.views && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {vlog.views}
                          </span>
                        )}
                        {vlog.likes && (
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {vlog.likes}
                          </span>
                        )}
                      </div>
                      <span className="text-xs">{renderUploadDate(vlog)}</span>
                    </div>
                    <Button asChild variant="default" className="w-full group">
                      <a href={vlog.videoUrl} target="_blank" rel="noopener noreferrer">
                        Watch Now
                        <Play className="w-4 h-4 ml-2" />
                      </a>
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

export default Vlog;
