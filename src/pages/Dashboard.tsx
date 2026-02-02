import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import CoachDashboard from "@/components/dashboard/CoachDashboard";
import ClientDashboard from "@/components/dashboard/ClientDashboard";

const Dashboard = () => {
  const { user, profile, isLoading, isCoach } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Route to appropriate dashboard based on role
  if (isCoach) {
    return <CoachDashboard />;
  }

  return <ClientDashboard />;
};

export default Dashboard;
