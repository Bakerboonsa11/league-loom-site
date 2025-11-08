import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, TrendingUp, Star, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const featuredMatches = [
    {
      id: 1,
      homeTeam: "Stanford Cardinals",
      awayTeam: "MIT Engineers",
      time: "Today, 7:00 PM",
      status: "Live",
    },
    {
      id: 2,
      homeTeam: "Harvard Crimson",
      awayTeam: "Yale Bulldogs",
      time: "Tomorrow, 6:00 PM",
      status: "Upcoming",
    },
    {
      id: 3,
      homeTeam: "Berkeley Bears",
      awayTeam: "Princeton Tigers",
      time: "Friday, 8:00 PM",
      status: "Upcoming",
    },
  ];

  const stats = [
    { icon: Trophy, label: "Active Teams", value: "32" },
    { icon: Users, label: "Total Players", value: "480" },
    { icon: Calendar, label: "Matches Played", value: "156" },
    { icon: TrendingUp, label: "Season", value: "2024" },
  ];

  const testimonials = [
    {
      id: 1,
      name: "Bonsa",
      role: "Admin",
      content: "College League is an amazing platform for managing college esports. The admin dashboard is intuitive and powerful!",
      avatar: "/bonsa.jpg",
      rating: 5,
    },
    {
      id: 2,
      name: "Barni",
      role: "College Head - State University",
      content: "The team management features are top-notch. I can easily keep track of my college's teams and their performance.",
      avatar: "/barni.jpg",
      rating: 5,
    },
    {
      id: 4,
      name: "Naba",
      role: "Player - Tech University",
      content: "The game management system is very efficient. It's easy to find matches and track our progress.",
      avatar: "/naba.jpg",
      rating: 5,
    },
    {
      id: 5,
      name: "Kiya",
      role: "Student - University of Arts",
      content: "The platform's design is sleek and user-friendly. It makes navigating through matches and teams a breeze!",
      avatar: "/kiya.jpg",
      rating: 4,
    },
    {
      id: 6,
      name: "Tade",
      role: "Coach - National University",
      content: "As a coach, the ability to track team performance and manage rosters efficiently is invaluable. Highly recommended!",
      avatar: "/tade.jpg",
      rating: 5,
    },
  ];

  const galleryImages = [
    {
      id: 1,
      url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
      alt: "Championship Finals",
      caption: "Championship Finals 2024",
    },
    {
      id: 2,
      url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80",
      alt: "Team Celebration",
      caption: "Victory Celebration",
    },
    {
      id: 3,
      url: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=800&q=80",
      alt: "Intense Match",
      caption: "Intense Competition",
    },
    {
      id: 4,
      url: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&q=80",
      alt: "Player Focus",
      caption: "Player Focus",
    },
  ];

  const sponsors = [
    { name: "TechCorp", logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&q=80" },
    { name: "GameGear", logo: "https://images.unsplash.com/photo-1614332625556-2f61d6e3fce4?w=200&q=80" },
    { name: "StreamPro", logo: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=200&q=80" },
    { name: "EduTech", logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBanner})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-float">
              College League
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Where champions are made and legends are born
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link to="/matches">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow-primary">
                  View Matches
                </Button>
              </Link>
              <Link to="/standings">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  Standings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow-primary">
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Matches */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Featured Matches</h2>
            <p className="text-muted-foreground text-lg">Don't miss these exciting matchups</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {featuredMatches.map((match) => (
              <Card key={match.id} className="border-border hover:border-primary transition-colors bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{match.homeTeam}</span>
                    {match.status === "Live" && (
                      <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full animate-glow">
                        {match.status}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-center text-2xl font-bold text-muted-foreground">VS</p>
                  <p className="text-lg font-semibold">{match.awayTeam}</p>
                  <p className="text-sm text-muted-foreground">{match.time}</p>
                  <Button className="w-full" variant="outline">View Details</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Moments That Matter</h2>
            <p className="text-muted-foreground text-lg">Capturing the excitement of college league</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {galleryImages.map((image) => (
              <div key={image.id} className="group relative overflow-hidden rounded-lg aspect-square">
                <img 
                  src={image.url} 
                  alt={image.alt}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-semibold">{image.caption}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">What Players Say</h2>
            <p className="text-muted-foreground text-lg">Hear from our community members</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="relative overflow-hidden hover:shadow-glow-primary transition-shadow">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                    />
                    <div>
                      <h3 className="font-semibold">{testimonial.name}</h3>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{testimonial.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="py-16 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">Our Partners</h2>
            <p className="text-muted-foreground">Trusted by leading brands in esports and education</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto items-center">
            {sponsors.map((sponsor, index) => (
              <div 
                key={index} 
                className="flex items-center justify-center p-6 bg-background rounded-lg hover:shadow-lg transition-shadow grayscale hover:grayscale-0"
              >
                <img 
                  src={sponsor.logo} 
                  alt={sponsor.name}
                  className="w-full h-12 object-contain opacity-60 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6 bg-gradient-primary rounded-2xl p-12 shadow-glow-primary">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              Ready to Join the Competition?
            </h2>
            <p className="text-lg text-primary-foreground/90">
              Be part of the most exciting collegiate esports league. Register your team today!
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="shadow-lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/teams">
                <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  View Teams
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
