import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Activity, AlertTriangle, Trophy } from "lucide-react";
import HomeworkComplianceSection from "./HomeworkComplianceSection";

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

interface OverviewTabProps {
  client: Client;
}

const OverviewTab = ({ client }: OverviewTabProps) => {
  return (
    <div className="space-y-4">
      {/* Homework Compliance */}
      <HomeworkComplianceSection clientId={client.id} />

      {/* Goals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {client.goals || "No goals specified yet"}
          </p>
        </CardContent>
      </Card>

      {/* Fitness Level & Golf Experience */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Fitness Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground capitalize">
              {client.fitness_level || "Not specified"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Golf Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground capitalize">
              {client.golf_experience || "Not specified"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Injury History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Injury History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {client.injury_history || "No injuries reported"}
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {client.handicap ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">Handicap</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">—</p>
              <p className="text-xs text-muted-foreground">Workouts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">—</p>
              <p className="text-xs text-muted-foreground">Week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
