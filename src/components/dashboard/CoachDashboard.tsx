import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachStats } from "@/hooks/useCoachStats";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  Users, 
  Dumbbell, 
  Calendar, 
  CalendarDays,
  MessageSquare, 
  BarChart3, 
  LogOut,
  Plus,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  Sun,
  RefreshCw,
  Settings,
  BookOpen
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
import { AnalyticsTab } from "./coach/AnalyticsTab";
import { InviteLinkSettings } from "./coach/InviteLinkSettings";
import WorkoutTemplateList from "./coach/WorkoutTemplateList";

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const navItems = [
  { label: "Today", value: "today", icon: Sun },
  { label: "Calendar", value: "calendar", icon: CalendarDays },
  { label: "Clients", value: "clients", icon: Users },
  { label: "Flags", value: "flags", icon: AlertTriangle, hasBadge: true },
  { label: "Exercises", value: "exercises", icon: Dumbbell },
  { label: "Programs", value: "programs", icon: Calendar },
  { label: "Templates", value: "templates", icon: BookOpen },
  { label: "Assessments", value: "assessments", icon: ClipboardList },
  { label: "Messages", value: "messages", icon: MessageSquare },
  { label: "Analytics", value: "analytics", icon: BarChart3 },
];

interface CoachSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingFlagsCount: number;
  profile: { full_name: string } | null;
  signOut: () => void;
}

const CoachSidebar = ({ activeTab, setActiveTab, pendingFlagsCount, profile, signOut }: CoachSidebarProps) => {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = (value: string) => {
    setActiveTab(value);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <span className="font-display text-sm text-primary-foreground">GP</span>
          </div>
          <span className="font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Golf Performance
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="px-2 py-2">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.value}>
              <SidebarMenuButton
                isActive={activeTab === item.value}
                onClick={() => handleNavClick(item.value)}
                tooltip={item.label}
              >
                <item.icon className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                {item.hasBadge && pendingFlagsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center text-xs group-data-[collapsible=icon]:hidden"
                  >
                    {pendingFlagsCount}
                  </Badge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === "settings"}
              onClick={() => handleNavClick("settings")}
              tooltip="Settings"
            >
              <Settings className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign Out">
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

const CoachDashboard = () => {
  const { profile, signOut } = useAuth();
  const isMobile = useIsMobile();
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

  const getPageTitle = () => {
    const item = navItems.find(i => i.value === activeTab);
    if (item) return item.label;
    if (activeTab === "settings") return "Settings";
    return "Dashboard";
  };

  const renderActionButton = () => {
    switch (activeTab) {
      case "clients":
        return (
          <Button onClick={() => setShowAddClient(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        );
      case "exercises":
        return (
          <Button onClick={() => setShowAddExercise(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        );
      case "programs":
        return (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Program
          </Button>
        );
      case "messages":
        return (
          <Button onClick={() => setShowNewConversation(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <CoachSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingFlagsCount={pendingFlagsCount}
        profile={profile}
        signOut={signOut}
      />
      <SidebarInset>
        {/* Header */}
        <header className="border-b border-border bg-card sticky top-0 z-40">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="font-semibold text-foreground">{getPageTitle()}</h1>
                {!isMobile && (
                  <p className="text-xs text-muted-foreground">Welcome back, {profile?.full_name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
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
              {renderActionButton()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat) => (
                <Card key={stat.label} className="gradient-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        {stat.isLoading ? (
                          <Skeleton className="h-8 w-16 mt-1" />
                        ) : (
                          <p className="text-2xl font-bold text-foreground mt-1">
                            {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={coachStats.refetchAll}
                          disabled={coachStats.isLoading}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${coachStats.isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <div className="p-2 rounded-lg bg-primary/10">
                          <stat.icon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
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

              <TabsContent value="templates" className="mt-0">
                <WorkoutTemplateList />
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
                {profile?.id && (
                  <AnalyticsTab 
                    coachId={profile.id}
                    onMessageClient={(clientId) => {
                      setSelectedContactId(clientId);
                      setActiveTab("messages");
                    }}
                    onViewClient={(clientId) => {
                      setSelectedClientId(clientId);
                      setActiveTab("clients");
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">Manage your coaching practice settings</p>
                  </div>
                  {profile?.id && (
                    <InviteLinkSettings
                      coachId={profile.id}
                      inviteCode={(profile as { invite_code?: string }).invite_code || null}
                      inviteLinkEnabled={(profile as { invite_link_enabled?: boolean }).invite_link_enabled ?? true}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>

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
    </SidebarProvider>
  );
};

export default CoachDashboard;
