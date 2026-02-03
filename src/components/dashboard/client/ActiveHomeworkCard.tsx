import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Play,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

export interface HomeworkExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  tempo: string | null;
  notes: string | null;
  video_url: string | null;
  coaching_cues: string | null;
}

export interface HomeworkAssignment {
  id: string;
  name: string;
  frequency_type: string;
  frequency_count: number | null;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  exercises: HomeworkExercise[];
  completedThisWeek: number;
  targetThisWeek: number;
}

interface ActiveHomeworkCardProps {
  assignment: HomeworkAssignment;
  onStartWorkout: (assignment: HomeworkAssignment) => void;
}

const getFrequencyText = (type: string, count: number | null): string => {
  switch (type) {
    case "daily":
      return "Complete daily";
    case "weekly_3x":
      return "Complete 3 times this week";
    case "weekly_2x":
      return "Complete 2 times this week";
    case "weekly_1x":
      return "Complete once this week";
    case "custom":
      return `Complete ${count || 1} times this week`;
    default:
      return "Complete as prescribed";
  }
};

const getTargetForWeek = (type: string, count: number | null): number => {
  switch (type) {
    case "daily":
      return 7;
    case "weekly_3x":
      return 3;
    case "weekly_2x":
      return 2;
    case "weekly_1x":
      return 1;
    case "custom":
      return count || 1;
    default:
      return 1;
  }
};

const ActiveHomeworkCard = ({ assignment, onStartWorkout }: ActiveHomeworkCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const target = assignment.targetThisWeek;
  const completed = assignment.completedThisWeek;
  const progressPercent = target > 0 ? Math.min((completed / target) * 100, 100) : 0;
  const isTargetMet = completed >= target;

  return (
    <Card className="border-accent/50 bg-gradient-to-br from-accent/5 to-transparent overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-accent/20 text-accent border-0 text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Homework
              </Badge>
              {isTargetMet && (
                <Badge variant="secondary" className="bg-success/20 text-success border-0 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg text-foreground truncate">
              {assignment.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {getFrequencyText(assignment.frequency_type, assignment.frequency_count)}
            </p>
          </div>
          <Button
            variant={isTargetMet ? "outline" : "accent"}
            size="sm"
            onClick={() => onStartWorkout(assignment)}
            className={isTargetMet ? "" : "shadow-gold"}
          >
            <Play className="h-4 w-4 mr-1" />
            Log
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">This week</span>
            <span className={`font-medium ${isTargetMet ? "text-success" : "text-foreground"}`}>
              {completed}/{target} completed
            </span>
          </div>
          <Progress
            value={progressPercent}
            className={`h-2 ${isTargetMet ? "[&>div]:bg-success" : "[&>div]:bg-accent"}`}
          />
        </div>

        {/* Instructions */}
        {assignment.instructions && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {assignment.instructions}
          </p>
        )}

        {/* Expandable Exercises */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-sm text-muted-foreground">
                {assignment.exercises.length} exercise{assignment.exercises.length !== 1 ? "s" : ""}
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {assignment.exercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
              >
                <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {exercise.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {exercise.sets} x {exercise.reps}
                    {exercise.tempo && ` @ ${exercise.tempo}`}
                  </p>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export { getTargetForWeek };
export default ActiveHomeworkCard;
