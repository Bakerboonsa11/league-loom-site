import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Play, Clock, Eye, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_VLOGS = [
  {
    id: 1,
    title: "Championship Finals Recap - Epic Moments",
    description: "Watch the most thrilling moments from the championship finals including game-winning plays and emotional celebrations.",
    thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80",
    duration: "12:45",
    views: "45.2K",
    likes: "3.2K",
    category: "Highlights",
    uploadDate: "2024-03-18",
  },
  {
    id: 2,
    title: "Pre-Season Training Camp Documentary",
    description: "An exclusive behind-the-scenes look at how teams prepare for the upcoming season with intense training sessions.",
    thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80",
    duration: "25:30",
    views: "28.5K",
    likes: "2.1K",
    category: "Documentary",
    uploadDate: "2024-03-15",
  },
  {
    id: 3,
    title: "Player Interview: Rising Stars of 2024",
    description: "Sit down with the breakout players who are taking the league by storm this season.",
    thumbnail: "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=800&q=80",
    duration: "18:20",
    views: "32.8K",
    likes: "2.8K",
    category: "Interview",
    uploadDate: "2024-03-12",
  },
  {
    id: 4,
    title: "Week 5 Match Highlights - Top 10 Plays",
    description: "The best plays, clutch moments, and incredible teamwork from week 5 of the season.",
    thumbnail: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    duration: "8:15",
    views: "52.1K",
    likes: "4.5K",
    category: "Highlights",
    uploadDate: "2024-03-10",
  },
  {
    id: 5,
    title: "Tactical Analysis: Winning Strategies",
    description: "Expert breakdown of the strategies and tactics used by championship-winning teams.",
    thumbnail: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80",
    duration: "20:45",
    views: "19.7K",
    likes: "1.8K",
    category: "Analysis",
    uploadDate: "2024-03-08",
  },
  {
    id: 6,
    title: "Fan Reactions: Most Intense Match of the Season",
    description: "Capture the raw emotions and reactions from fans during the most nail-biting match yet.",
    thumbnail: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
    duration: "10:30",
    views: "38.4K",
    likes: "3.6K",
    category: "Community",
    uploadDate: "2024-03-05",
  },
];

const Vlog = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  const categories = ["All", "Highlights", "Interview", "Documentary", "Analysis", "Community"];
  
  const filteredVlogs = selectedCategory === "All" 
    ? MOCK_VLOGS 
    : MOCK_VLOGS.filter(vlog => vlog.category === selectedCategory);

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

          {/* Category Filter */}
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

          {/* Vlog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVlogs.map((vlog) => (
              <Card key={vlog.id} className="group hover:shadow-glow-primary transition-all duration-300 overflow-hidden">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={vlog.thumbnail} 
                    alt={vlog.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-glow-primary">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                  <Badge className="absolute top-4 right-4 bg-primary">
                    {vlog.category}
                  </Badge>
                  <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 rounded text-sm text-white flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {vlog.duration}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                    {vlog.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {vlog.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{vlog.views}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{vlog.likes}</span>
                      </div>
                    </div>
                    <span className="text-xs">{vlog.uploadDate}</span>
                  </div>
                  <Button variant="default" className="w-full group">
                    Watch Now
                    <Play className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Vlog;
