import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import CollageHeadDashboard from "@/components/dashboard/CollageHeadDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";

const Dashboard = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case "admin":
        return <AdminDashboard />;
      case "collageHead":
        return <CollageHeadDashboard />;
      case "student":
        return <StudentDashboard />;
      default:
        return <p>Welcome! Your dashboard is being prepared.</p>;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;
