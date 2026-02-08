import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle2,
  Circle,
  Info,
  AlertTriangle,
} from "lucide-react";
import ReportIssueDialog from "./ReportIssueDialog";

export interface ExerciseData {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
  coaching_cues: string | null;
  video_url: string | null;
  completed: boolean;
  hasFlag?: boolean;
  superset_group?: string | null;
}

export interface ExerciseLogData {
  exercise_id: string;
  sets_completed: number;
  reps_completed: string;
  weight_used: string;
  rpe: number | null;
  notes: string;
  logId?: string;
}

interface ExerciseCardProps {
  exercise: ExerciseData;
  isActive: boolean;
  logData: ExerciseLogData;
  onLogChange: (data: Partial<ExerciseLogData>) => void;
  onComplete: () => void;
  clientId: string;
  onFlagReported?: () => void;
}

const ExerciseCard = ({
  exercise,
  isActive,
  logData,
  onLogChange,
  onComplete,
  clientId,
  onFlagReported,
}: ExerciseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [showVideo, setShowVideo] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [hasReportedIssue, setHasReportedIssue] = useState(exercise.hasFlag || false);
  const [completedSets, setCompletedSets] = useState<boolean[]>(
    Array(exercise.sets).fill(false)
  );

  const handleSetToggle = (index: number) => {
    const newCompletedSets = [...completedSets];
    newCompletedSets[index] = !newCompletedSets[index];
    setCompletedSets(newCompletedSets);
    
    const setsCompleted = newCompletedSets.filter(Boolean).length;
    onLogChange({ sets_completed: setsCompleted });
  };

  const allSetsComplete = completedSets.every(Boolean);

  const handleMarkComplete = () => {
    // Mark all sets as complete
    const allComplete = Array(exercise.sets).fill(true);
    setCompletedSets(allComplete);
    onLogChange({ sets_completed: exercise.sets });
    onComplete();
  };

  return (
    <>
      <Card className={`transition-all ${isActive ? "ring-2 ring-primary" : ""} ${exercise.completed ? "opacity-60" : ""} ${hasReportedIssue ? "border-warning/50" : ""}`}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <div className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${exercise.completed ? "bg-success/5" : ""}`}>
              <div className="flex items-center gap-3">
                {exercise.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${exercise.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {exercise.name}
                    </h3>
                    {hasReportedIssue && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Issue
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {exercise.sets} sets × {exercise.reps} reps • {exercise.rest_seconds}s rest
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {exercise.video_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowVideo(true);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-4">
              {/* Coaching Cues */}
              {exercise.coaching_cues && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Coaching Cues</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {exercise.coaching_cues}
                  </p>
                </div>
              )}

              {/* Program Notes */}
              {exercise.notes && (
                <div className="text-sm text-muted-foreground italic">
                  Note: {exercise.notes}
                </div>
              )}

              {/* Set Tracking */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Sets</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: exercise.sets }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => handleSetToggle(i)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-medium transition-all ${
                        completedSets[i]
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight Input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Weight Used
                  </label>
                  <Input
                    placeholder="e.g., 135 lbs"
                    value={logData.weight_used}
                    onChange={(e) => onLogChange({ weight_used: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Reps Completed
                  </label>
                  <Input
                    placeholder={exercise.reps}
                    value={logData.reps_completed}
                    onChange={(e) => onLogChange({ reps_completed: e.target.value })}
                  />
                </div>
              </div>

              {/* RPE Selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  RPE (Rate of Perceived Exertion)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[6, 7, 8, 9, 10].map((rpe) => (
                    <button
                      key={rpe}
                      onClick={() => onLogChange({ rpe })}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        logData.rpe === rpe
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {rpe}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Notes
                </label>
                <Textarea
                  placeholder="How did this feel? Any adjustments needed?"
                  value={logData.notes}
                  onChange={(e) => onLogChange({ notes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Report Issue Button */}
                {!hasReportedIssue && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-warning"
                    onClick={() => setShowReportIssue(true)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Report Issue
                  </Button>
                )}

                {/* Complete Button */}
                {!exercise.completed && (
                  <Button 
                    className="flex-1" 
                    onClick={handleMarkComplete}
                    variant={allSetsComplete ? "default" : "outline"}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Video Modal */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{exercise.name}</DialogTitle>
          </DialogHeader>
          {exercise.video_url && (
            <div className="aspect-video">
              <iframe
                src={exercise.video_url}
                className="w-full h-full rounded-lg"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}
          {exercise.coaching_cues && (
            <div className="mt-4">
              <h4 className="font-medium text-foreground mb-2">Coaching Cues</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {exercise.coaching_cues}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Issue Dialog */}
      <ReportIssueDialog
        open={showReportIssue}
        onOpenChange={setShowReportIssue}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        exerciseLogId={logData.logId}
        clientId={clientId}
        onReported={() => {
          setHasReportedIssue(true);
          onFlagReported?.();
        }}
      />
    </>
  );
};

export default ExerciseCard;
