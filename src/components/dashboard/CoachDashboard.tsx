import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Dumbbell, 
  Calendar, 
  CalendarDays,
  MessageSquare, 
  BarChart3, 
  LogOut,
  Plus,
  Search,
  TrendingUp,
  CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ClientRoster from "./coach/ClientRoster";
import ExerciseLibrary from "./coach/ExerciseLibrary";
import ProgramBuilder from "./coach/ProgramBuilder";
import CoachCalendar from "./coach/CoachCalendar";
import MessagingPanel from "@/components/messaging/MessagingPanel";
import StartConversationDialog from "@/components/messaging/StartConversationDialog";
import AddClientDialog from "./coach/AddClientDialog";

const CoachDashboard = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("clients");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const stats = [
    { label: "Active Clients", value: "42", icon: Users, change: "+3 this month" },
    { label: "Programs Active", value: "28", icon: Calendar, change: "12 templates" },
    { label: "Exercises", value: "187", icon: Dumbbell, change: "15 new this week" },
    { label: "Completion Rate", value: "87%", icon: CheckCircle2, change: "+5% vs last month" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <span className="font-display text-xl text-primary-foreground">GP</span>
              </div>
              <div>
                <h1 className="font-semibold text-foreground">Coach Dashboard</h1>
                <p className="text-xs text-muted-foreground">Welcome back, {profile?.full_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search clients, exercises..." 
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="gradient-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-6 w-auto">
              <TabsTrigger value="clients" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clients</span>
              </TabsTrigger>
              <TabsTrigger value="exercises" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                <span className="hidden sm:inline">Exercises</span>
              </TabsTrigger>
              <TabsTrigger value="programs" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Programs</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Messages</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === "clients" && (
              <Button onClick={() => setShowAddClient(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            )}
            {activeTab === "exercises" && (
              <Button onClick={() => setShowAddExercise(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            )}
            {activeTab === "programs" && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Program
              </Button>
            )}
            {activeTab === "messages" && (
              <Button onClick={() => setShowNewConversation(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            )}
          </div>

          <TabsContent value="clients" className="mt-0">
            <ClientRoster 
              onMessageClient={(clientId) => {
                setSelectedContactId(clientId);
                setActiveTab("messages");
              }}
            />
          </TabsContent>

          <TabsContent value="exercises" className="mt-0">
            <ExerciseLibrary 
              showAddDialog={showAddExercise}
              onAddDialogChange={setShowAddExercise}
            />
          </TabsContent>

          <TabsContent value="programs" className="mt-0">
            <ProgramBuilder />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CoachCalendar />
          </TabsContent>

          <TabsContent value="messages" className="mt-0">
            <Card className="h-[600px] overflow-hidden">
              <MessagingPanel 
                className="h-full" 
                externalSelectedContactId={selectedContactId}
                onExternalContactChange={setSelectedContactId}
              />
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>Client progress and program effectiveness insights</CardDescription>
              </CardHeader>
              <CardContent className="h-96 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics coming soon</p>
                  <p className="text-sm">Track client retention, program completion, and performance gains</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <StartConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onSelectContact={(contactId) => {
          setSelectedContactId(contactId);
          setActiveTab("messages");
        }}
      />

      <AddClientDialog
        open={showAddClient}
        onOpenChange={setShowAddClient}
      />
    </div>
  );
};

export default CoachDashboard;
