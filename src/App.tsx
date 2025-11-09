import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Teams from "./pages/Teams";
import Matches from "./pages/Matches";
import Standings from "./pages/Standings";
import Blog from "./pages/Blog";
import Vlog from "./pages/Vlog";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import UsersPage from "./pages/admin/Users";
import ProfilePage from "./pages/Profile";
import DashboardLayout from "./components/DashboardLayout";
import AdminTeamsPage from "./pages/admin/Teams";
import AdminGamesPage from "./pages/admin/Games";
import PlayerSelectionPage from "./pages/admin/PlayerSelection";
import ViewSelectionsPage from "./pages/admin/ViewSelections";
import TableRankPage from "./pages/admin/TableRank";
import AdminGroupPage from "./pages/admin/group";
import AdminBlogManager from "./pages/admin/BlogManager";
import AdminVlogManager from "./pages/admin/VlogManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/vlog" element={<Vlog />} />
        <Route path="/auth" element={<Auth />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/teams" element={<AdminTeamsPage />} />
            <Route path="/admin/games" element={<AdminGamesPage />} />
            <Route path="/admin/player-selection" element={<PlayerSelectionPage />} />
            <Route path="/admin/view-selections" element={<ViewSelectionsPage />} />
            <Route path="/admin/table-rank" element={<TableRankPage />} />
            <Route path="/admin/group" element={<AdminGroupPage />} />
            <Route path="/admin/blog" element={<AdminBlogManager />} />
            <Route path="/admin/vlog" element={<AdminVlogManager />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
