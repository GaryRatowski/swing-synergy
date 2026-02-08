import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, BarChart3, FileText, Calendar, ClipboardList, Play, Video, BookOpen, TrendingUp } from "lucide-react";
import OverviewTab from "./client-detail/OverviewTab";
import MetricsTab from "./client-detail/MetricsTab";
import DocumentsTab from "./client-detail/DocumentsTab";
import VideosTab from "./client-detail/VideosTab";
import TrainingCalendarTab from "./client-detail/TrainingCalendarTab";
import HomeworkTab from "./client-detail/HomeworkTab";
import AssessmentHistoryTab from "./assessments/AssessmentHistoryTab";
import RunAssessmentWizard from "./assessments/RunAssessmentWizard";
import ProgressReportsTab from "./client-detail/ProgressReportsTab";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  membership_type: string | null;
  handicap: number | null;
  onboarding_completed: boolean;
  goals?: string | null;
  injury_history?: string | null;
  fitness_level?: string | null;
  golf_experience?: string | null;
}

interface ClientDetailViewProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClientDetailView = ({ client, open, onOpenChange }: ClientDetailViewProps) => {
  const [showAssessmentWizard, setShowAssessmentWizard] = useState(false);
  const { profile } = useAuth();
  
  if (!client) return null;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const getMembershipLabel = (type: string | null) => {
    switch (type) {
      case "individual_coaching": return "1-on-1 Coaching";
      case "community": return "Community";
      case "program_only": return "Program Only";
      default: return "Unknown";
    }
  };

  const getMembershipVariant = (type: string | null): "default" | "secondary" | "outline" => {
    switch (type) {
      case "individual_coaching": return "default";
      case "community": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={client.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(client.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{client.full_name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{client.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getMembershipVariant(client.membership_type)}>
                  {getMembershipLabel(client.membership_type)}
                </Badge>
                {client.handicap && (
                  <Badge variant="outline">Handicap: {client.handicap}</Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="w-full grid grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="homework" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Homework</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-1.5">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="assessments" className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Assessments</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab client={client} />
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <MetricsTab clientId={client.id} clientName={client.full_name} />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <ProgressReportsTab clientId={client.id} coachId={profile?.id || ""} />
          </TabsContent>

          <TabsContent value="homework" className="mt-4">
            <HomeworkTab clientId={client.id} />
          </TabsContent>

          <TabsContent value="videos" className="mt-4">
            <VideosTab clientId={client.id} isCoach={true} />
          </TabsContent>

          <TabsContent value="assessments" className="mt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowAssessmentWizard(true)}>
                <Play className="h-4 w-4 mr-2" />
                Start Assessment
              </Button>
            </div>
            <AssessmentHistoryTab clientId={client.id} />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <DocumentsTab clientId={client.id} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <TrainingCalendarTab clientId={client.id} />
          </TabsContent>
        </Tabs>

        <RunAssessmentWizard
          open={showAssessmentWizard}
          onOpenChange={setShowAssessmentWizard}
          clientId={client.id}
          clientName={client.full_name}
        />
      </SheetContent>
    </Sheet>
  );
};

export default ClientDetailView;
