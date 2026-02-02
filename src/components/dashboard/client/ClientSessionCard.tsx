import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Trophy,
  AlertCircle,
  MessageSquare,
  Dumbbell,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface SessionNotes {
  sessionType?: string;
  focusAreas?: string[];
  clientEnergy?: number;
  exerciseSummary?: string;
  keyAchievements?: string;
  areasToImprove?: string;
  coachNotes?: string;
}

interface ClientSessionCardProps {
  id: string;
  workoutDate: string;
  durationMinutes: number | null;
  overallRpe: number | null;
  notes: string | null;
  programName?: string | null;
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  training: "Training",
  assessment: "Assessment",
  lesson: "Lesson",
  warmup: "Warm-up",
  recovery: "Recovery",
  competition: "Competition",
};

const FOCUS_AREA_LABELS: Record<string, string> = {
  power: "Power",
  mobility: "Mobility",
  strength: "Strength",
  speed: "Speed",
  stability: "Stability",
  rotation: "Rotation",
  recovery: "Recovery",
  plyometric: "Plyometric",
};

const ClientSessionCard = ({
  workoutDate,
  durationMinutes,
  overallRpe,
  notes,
  programName,
}: ClientSessionCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse structured notes if available
  let parsedNotes: SessionNotes | null = null;
  try {
    if (notes) {
      parsedNotes = JSON.parse(notes);
    }
  } catch {
    // Notes is plain text, not JSON
  }

  const sessionType = parsedNotes?.sessionType || "training";
  const hasDetails = parsedNotes && (
    parsedNotes.exerciseSummary ||
    parsedNotes.keyAchievements ||
    parsedNotes.areasToImprove ||
    parsedNotes.coachNotes
  );

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">
                    {programName || SESSION_TYPE_LABELS[sessionType] || "Session"}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {SESSION_TYPE_LABELS[sessionType] || sessionType}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(parseISO(workoutDate), "MMM d, yyyy")}
                  </span>
                  {durationMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {durationMinutes} min
                    </span>
                  )}
                </div>
                
                {/* Focus areas */}
                {parsedNotes?.focusAreas && parsedNotes.focusAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {parsedNotes.focusAreas.map((area) => (
                      <Badge key={area} variant="secondary" className="text-xs">
                        {FOCUS_AREA_LABELS[area] || area}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {overallRpe && (
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">RPE</span>
                  <p className="text-sm font-medium">{overallRpe}/10</p>
                </div>
              )}
              {parsedNotes?.clientEnergy && (
                <div className="text-right">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Energy
                  </span>
                  <p className="text-sm font-medium">{parsedNotes.clientEnergy}/10</p>
                </div>
              )}
              {hasDetails && (
                <CollapsibleTrigger className="p-1.5 hover:bg-muted rounded-md transition-colors">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* Expandable details */}
          <CollapsibleContent>
            {hasDetails && (
              <div className="mt-4 pt-4 border-t space-y-4">
                {parsedNotes?.exerciseSummary && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-primary" />
                      Exercise Summary
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                      {parsedNotes.exerciseSummary}
                    </p>
                  </div>
                )}
                
                {parsedNotes?.keyAchievements && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-success" />
                      Key Achievements
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                      {parsedNotes.keyAchievements}
                    </p>
                  </div>
                )}
                
                {parsedNotes?.areasToImprove && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      Areas to Improve
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                      {parsedNotes.areasToImprove}
                    </p>
                  </div>
                )}
                
                {parsedNotes?.coachNotes && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Coach Notes
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                      {parsedNotes.coachNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Plain text notes fallback */}
            {!parsedNotes && notes && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Notes
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                  {notes}
                </p>
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

export default ClientSessionCard;
