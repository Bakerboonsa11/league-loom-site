import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_POSTS = [
  {
    id: 1,
    title: "Season 2024 Kickoff: What to Expect",
    excerpt: "Get ready for the most exciting college league season yet! We break down the teams, players, and predictions for the upcoming matches.",
    author: "Sarah Johnson",
    date: "2024-03-15",
    category: "News",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
  },
  {
    id: 2,
    title: "Top 10 Moments from Last Season",
    excerpt: "Relive the most incredible plays, upsets, and memorable moments that defined our previous season.",
    author: "Mike Chen",
    date: "2024-03-10",
    category: "Highlights",
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80",
  },
  {
    id: 3,
    title: "Player Spotlight: Rising Stars",
    excerpt: "Meet the breakout players who are making waves in the college league this season.",
    author: "Emily Rodriguez",
    date: "2024-03-05",
    category: "Players",
    image: "https://images.unsplash.com/photo-1552667466-07770ae110d0?w=800&q=80",
  },
  {
    id: 4,
    title: "Behind the Scenes: Team Preparation",
    excerpt: "An exclusive look at how teams train and prepare for the intense competition of college league matches.",
    author: "David Kim",
    date: "2024-02-28",
    category: "Features",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
  },
  {
    id: 5,
    title: "Tournament Format Changes Announced",
    excerpt: "Learn about the new tournament structure and what it means for teams and fans this season.",
    author: "Sarah Johnson",
    date: "2024-02-20",
    category: "News",
    image: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80",
  },
  {
    id: 6,
    title: "Fan Zone: Best Viewing Parties",
    excerpt: "Discover the top spots to watch college league matches with fellow fans and enjoy the ultimate viewing experience.",
    author: "Mike Chen",
    date: "2024-02-15",
    category: "Community",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
  },
];

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  const categories = ["All", "News", "Highlights", "Players", "Features", "Community"];
  
  const filteredPosts = selectedCategory === "All" 
    ? MOCK_POSTS 
    : MOCK_POSTS.filter(post => post.category === selectedCategory);

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

          {/* Blog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="group hover:shadow-glow-primary transition-all duration-300 overflow-hidden">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <Badge className="absolute top-4 right-4 bg-primary">
                    {post.category}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{post.date}</span>
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
        </div>
      </main>
    </div>
  );
};

export default Blog;
