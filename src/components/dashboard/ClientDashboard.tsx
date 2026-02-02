import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MessagingPanel from "@/components/messaging/MessagingPanel";
import TodayTab from "./client/TodayTab";
import WorkoutsTab from "./client/WorkoutsTab";
import ProgressTab from "./client/ProgressTab";
import ProfileTab from "./client/ProfileTab";
import WorkoutExecution from "./client/WorkoutExecution";
import ClientOnboarding from "./client/ClientOnboarding";
import { ExerciseData } from "./client/ExerciseCard";
import { 
  Home, 
  Dumbbell, 
  TrendingUp, 
  User, 
  MessageSquare, 
  LogOut,
  Library,
} from "lucide-react";
import ExerciseLibraryTab from "./client/ExerciseLibraryTab";

const ClientDashboard = () => {
  const { profile, signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState("today");
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<{
    exercises: ExerciseData[];
    programName: string;
    dayInfo: string;
  } | null>(null);

  // Check onboarding status from profile
  const needsOnboarding = profile && profile.onboarding_completed === false;

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingComplete(true);
  }, []);

  const handleStartWorkout = (exercises: ExerciseData[], programName: string, dayInfo: string) => {
    setActiveWorkout({ exercises, programName, dayInfo });
  };

  const handleWorkoutComplete = () => {
    setActiveWorkout(null);
  };

  // Get client ID from profile
  const clientId = profile?.id;

  // Show onboarding for new clients
  if (needsOnboarding && onboardingComplete !== true && user?.id) {
    return (
      <ClientOnboarding 
        userId={user.id} 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  // Show workout execution if active
  if (activeWorkout && clientId) {
    return (
      <WorkoutExecution
        clientId={clientId}
        exercises={activeWorkout.exercises}
        programName={activeWorkout.programName}
        dayInfo={activeWorkout.dayInfo}
        onClose={() => setActiveWorkout(null)}
        onComplete={handleWorkoutComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg text-foreground">Golf Performance</h1>
            <p className="text-xs text-muted-foreground">Welcome back, {profile?.full_name?.split(" ")[0]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-card border-r border-border pt-5 pb-4">
          <div className="flex items-center gap-3 px-4 mb-6">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <span className="font-display text-xl text-primary-foreground">GP</span>
            </div>
            <span className="font-bold text-lg text-foreground">Golf Performance</span>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {[
              { name: "Today", icon: Home, tab: "today" },
              { name: "Workouts", icon: Dumbbell, tab: "workouts" },
              { name: "Exercises", icon: Library, tab: "exercises" },
              { name: "Progress", icon: TrendingUp, tab: "progress" },
              { name: "Messages", icon: MessageSquare, tab: "messages" },
              { name: "Profile", icon: User, tab: "profile" },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.tab 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </button>
            ))}
          </nav>

          <div className="px-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-semibold text-primary">
                  {profile?.full_name?.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {activeTab === "messages" ? (
            <Card className="h-[calc(100vh-180px)] lg:h-[calc(100vh-100px)] overflow-hidden">
              <MessagingPanel className="h-full" />
            </Card>
          ) : activeTab === "today" && clientId ? (
            <TodayTab 
              clientId={clientId} 
              onStartWorkout={handleStartWorkout}
            />
          ) : activeTab === "workouts" && clientId ? (
            <WorkoutsTab clientId={clientId} />
          ) : activeTab === "exercises" ? (
            <ExerciseLibraryTab />
          ) : activeTab === "progress" && clientId ? (
            <ProgressTab clientId={clientId} />
          ) : activeTab === "profile" ? (
            <ProfileTab onSignOut={signOut} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden">
        <div className="flex items-center justify-around h-16">
          {[
            { name: "Today", icon: Home, tab: "today" },
            { name: "Workouts", icon: Dumbbell, tab: "workouts" },
            { name: "Exercises", icon: Library, tab: "exercises" },
            { name: "Progress", icon: TrendingUp, tab: "progress" },
            { name: "Messages", icon: MessageSquare, tab: "messages" },
            { name: "Profile", icon: User, tab: "profile" },
          ].map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center gap-1 p-2 ${
                activeTab === item.tab ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ClientDashboard;
