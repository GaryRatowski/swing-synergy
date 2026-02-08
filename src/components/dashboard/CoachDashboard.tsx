import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachStats } from "@/hooks/useCoachStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Dumbbell, 
  Calendar, 
  CalendarDays,
  MessageSquare, 
  BarChart3, 
  LogOut,
  Plus,
  TrendingUp,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  Sun,
  RefreshCw
} from "lucide-react";
import CoachTodayView from "./coach/CoachTodayView";
import ClientRoster from "./coach/ClientRoster";
import ExerciseLibrary from "./coach/ExerciseLibrary";
import ProgramBuilder from "./coach/ProgramBuilder";
import CoachCalendar from "./coach/CoachCalendar";
import MessagingPanel from "@/components/messaging/MessagingPanel";
import StartConversationDialog from "@/components/messaging/StartConversationDialog";
import AddClientDialog from "./coach/AddClientDialog";
import AddAppointmentDialog from "./coach/calendar/AddAppointmentDialog";
import AssessmentTemplateList from "./coach/assessments/AssessmentTemplateList";
import FlaggedExercisesQueue from "./coach/FlaggedExercisesQueue";
import { GlobalSearch } from "./coach/GlobalSearch";

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const CoachDashboard = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("today");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [pendingFlagsCount, setPendingFlagsCount] = useState(0);
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [todayRefreshKey, setTodayRefreshKey] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  
  const coachStats = useCoachStats(profile?.id);

  // Fetch pending flags count
  useEffect(() => {
    const fetchPendingFlagsCount = async () => {
      const { count } = await supabase
        .from("exercise_flags")
        .select("*", { count: "exact", head: true })
        .is("reviewed_by", null);
      
      setPendingFlagsCount(count || 0);
    };

    fetchPendingFlagsCount();
    
    // Subscribe to changes
    const channel = supabase
      .channel("exercise_flags_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exercise_flags" },
        () => fetchPendingFlagsCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch clients for AddAppointmentDialog
  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "client");
      setClients(data || []);
    };
    fetchClients();
  }, []);

  const stats = [
    { 
      label: "Active Clients", 
      value: coachStats.activeClients.value, 
      icon: Users, 
      isLoading: coachStats.activeClients.isLoading 
    },
    { 
      label: "Programs Active", 
      value: coachStats.activePrograms.value, 
      icon: Calendar, 
      isLoading: coachStats.activePrograms.isLoading 
    },
    { 
      label: "Exercises", 
      value: coachStats.totalExercises.value, 
      icon: Dumbbell, 
      isLoading: coachStats.totalExercises.isLoading 
    },
    { 
      label: "Completion Rate", 
      value: coachStats.completionRate.value !== null 
        ? `${coachStats.completionRate.value}%` 
        : "—", 
      icon: CheckCircle2, 
      isLoading: coachStats.completionRate.isLoading,
      isPercentage: true 
    },
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
              <GlobalSearch
                onSelectClient={(clientId) => {
                  setSelectedClientId(clientId);
                  setActiveTab("clients");
                }}
                onSelectExercise={(exerciseId) => {
                  setSelectedExerciseId(exerciseId);
                  setActiveTab("exercises");
                }}
                onSelectProgram={(programId) => {
                  setSelectedProgramId(programId);
                  setActiveTab("programs");
                }}
              />
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
                    {stat.isLoading ? (
                      <Skeleton className="h-9 w-20 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={coachStats.refetchAll}
                      disabled={coachStats.isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${coachStats.isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-9 w-auto">
              <TabsTrigger value="today" className="gap-2">
                <Sun className="h-4 w-4" />
                <span className="hidden sm:inline">Today</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clients</span>
              </TabsTrigger>
              <TabsTrigger value="flags" className="gap-2 relative">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Flags</span>
                {pendingFlagsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingFlagsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="exercises" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                <span className="hidden sm:inline">Exercises</span>
              </TabsTrigger>
              <TabsTrigger value="programs" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Programs</span>
              </TabsTrigger>
              <TabsTrigger value="assessments" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Assessments</span>
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

          <TabsContent value="today" className="mt-0">
            <CoachTodayView
              key={todayRefreshKey}
              onViewCalendar={() => setActiveTab("calendar")}
              onAddAppointment={() => setShowAddAppointment(true)}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CoachCalendar />
          </TabsContent>

          <TabsContent value="clients" className="mt-0">
            <ClientRoster 
              onMessageClient={(clientId) => {
                setSelectedContactId(clientId);
                setActiveTab("messages");
              }}
            />
          </TabsContent>

          <TabsContent value="flags" className="mt-0">
            <FlaggedExercisesQueue />
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

          <TabsContent value="assessments" className="mt-0">
            <AssessmentTemplateList />
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

      <AddAppointmentDialog
        open={showAddAppointment}
        onOpenChange={setShowAddAppointment}
        clients={clients}
        onSave={async (data) => {
          if (!profile?.id) return;
          
          // Save the appointment to database
          const { error } = await supabase
            .from("coach_appointments")
            .insert({
              coach_id: profile.id,
              title: data.title,
              client_id: data.client_id,
              appointment_type: data.appointment_type,
              start_time: data.start_time,
              end_time: data.end_time,
              notes: data.notes,
            });

          if (!error) {
            setShowAddAppointment(false);
            // Refresh Today view by incrementing key
            setTodayRefreshKey((k) => k + 1);
            setActiveTab("today");
          }
        }}
        initialDate={new Date()}
        initialHour={9}
        editingAppointment={null}
      />
    </div>
  );
};

export default CoachDashboard;
