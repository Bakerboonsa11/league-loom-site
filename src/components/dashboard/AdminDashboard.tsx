import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from "react-router-dom";
import { Users, Gamepad2, BarChart3, Video, FileText, Shield, User, UserCheck, Eye } from "lucide-react";
import { motion } from "framer-motion";

const data = [
  { name: 'Jan', users: 400 },
  { name: 'Feb', users: 300 },
  { name: 'Mar', users: 600 },
  { name: 'Apr', users: 800 },
  { name: 'May', users: 500 },
  { name: 'Jun', users: 700 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const AdminDashboard = () => {
  const quickActions = [
    { to: "/admin/users", icon: <Users className="h-5 w-5" />, label: "Users" },
    { to: "/admin/games", icon: <Gamepad2 className="h-5 w-5" />, label: "Games" },
    { to: "/admin/table-rank", icon: <BarChart3 className="h-5 w-5" />, label: "Table Rank" },
    { to: "/vlog", icon: <Video className="h-5 w-5" />, label: "Vlog" },
    { to: "/blog", icon: <FileText className="h-5 w-5" />, label: "Blog" },
    { to: "/admin/teams", icon: <Shield className="h-5 w-5" />, label: "Teams" },
    { to: "/profile", icon: <User className="h-5 w-5" />, label: "Profile" },
    { to: "/admin/player-selection", icon: <UserCheck className="h-5 w-5" />, label: "Player Selection" },
    { to: "/admin/view-selections", icon: <Eye className="h-5 w-5" />, label: "View Selections" },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Colleges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">56</div>
            <p className="text-xs text-muted-foreground">+12 from last year</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {quickActions.map((action) => (
            <motion.div key={action.label} variants={itemVariants}>
              <Link to={action.to}>
                <Button
                  variant="outline"
                  className="w-full h-28 flex flex-col gap-2 justify-center items-center
                             transition-all duration-300 ease-in-out
                             hover:scale-105 hover:bg-primary/10 hover:text-primary"
                >
                  {action.icon}
                  <span className="text-sm font-semibold">{action.label}</span>
                </Button>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>New Users per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="users" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
};

export default AdminDashboard;
