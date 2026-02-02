import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ClubheadSpeedChart from "./client/ClubheadSpeedChart";
import { 
  Home, 
  Dumbbell, 
  TrendingUp, 
  User, 
  MessageSquare, 
  LogOut,
  ChevronRight,
  Play,
  CheckCircle2,
  Circle,
  Flame,
  Target,
  Droplets
} from "lucide-react";

const ClientDashboard = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("today");

  // Mock data for today's workout
  const todayWorkout = {
    name: "Lower Body Power",
    phase: "Week 3, Day 2",
    exerciseCount: 6,
    estimatedTime: "45 min",
    completedExercises: 2,
    exercises: [
      { id: "1", name: "Kettlebell Swing", sets: "3x12", completed: true },
      { id: "2", name: "Goblet Squat", sets: "4x10", completed: true },
      { id: "3", name: "Single Leg RDL", sets: "3x8 each", completed: false },
      { id: "4", name: "Lateral Bounds", sets: "3x6 each", completed: false },
      { id: "5", name: "Pallof Press", sets: "3x12 each", completed: false },
      { id: "6", name: "Dead Bug", sets: "3x10 each", completed: false },
    ]
  };

  const habits = [
    { name: "Water", target: "8 glasses", current: 5, icon: Droplets },
    { name: "Sleep", target: "8 hours", current: 7, icon: Target },
    { name: "Stretch", target: "10 min", current: 0, icon: Flame },
  ];

  const stats = [
    { label: "Clubhead Speed", value: "112.4", unit: "mph", change: "+3.2 mph" },
    { label: "Handicap", value: "8.4", unit: "", change: "-1.2 strokes" },
    { label: "Workout Streak", value: "12", unit: "days", change: "Personal best!" },
  ];

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
          {/* Today's Workout Card */}
          <Card className="mb-6 overflow-hidden">
            <div className="gradient-primary p-6">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="secondary" className="mb-2 bg-primary-foreground/20 text-primary-foreground border-0">
                    {todayWorkout.phase}
                  </Badge>
                  <h2 className="text-2xl font-bold text-primary-foreground mb-1">
                    {todayWorkout.name}
                  </h2>
                  <p className="text-primary-foreground/70 text-sm">
                    {todayWorkout.exerciseCount} exercises • {todayWorkout.estimatedTime}
                  </p>
                </div>
                <Button variant="accent" size="lg" className="shadow-gold">
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </Button>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-primary-foreground/70 mb-2">
                  <span>Progress</span>
                  <span>{todayWorkout.completedExercises}/{todayWorkout.exerciseCount}</span>
                </div>
                <Progress 
                  value={(todayWorkout.completedExercises / todayWorkout.exerciseCount) * 100} 
                  className="h-2 bg-primary-foreground/20"
                />
              </div>
            </div>
            
            {/* Exercise List */}
            <CardContent className="p-4">
              <div className="space-y-2">
                {todayWorkout.exercises.map((exercise, index) => (
                  <div 
                    key={exercise.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      exercise.completed ? "bg-success/10" : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    {exercise.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${exercise.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {exercise.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{exercise.sets}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {stats.map((stat) => (
              <Card key={stat.label} className="text-center">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                    {stat.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.unit}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-success mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Habit Tracking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Today's Habits</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              {habits.map((habit) => (
                <div key={habit.name} className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-2">
                    <habit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium text-sm text-foreground">{habit.name}</p>
                  <p className="text-xs text-muted-foreground">{habit.current}/{habit.target}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Clubhead Speed Progress Chart */}
          <ClubheadSpeedChart />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden">
        <div className="flex items-center justify-around h-16">
          {[
            { name: "Today", icon: Home, tab: "today" },
            { name: "Workouts", icon: Dumbbell, tab: "workouts" },
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
