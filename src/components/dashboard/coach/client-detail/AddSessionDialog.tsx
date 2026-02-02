import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddSessionDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: () => void;
}

const SESSION_TYPES = [
  { value: "training", label: "Training Session" },
  { value: "assessment", label: "Assessment" },
  { value: "lesson", label: "Golf Lesson" },
  { value: "warmup", label: "Warm-up / Activation" },
  { value: "recovery", label: "Recovery Session" },
  { value: "competition", label: "Competition Prep" },
];

interface SessionTemplate {
  id: string;
  name: string;
  sessionType: string;
  duration: number;
  focusAreas: string[];
  exerciseSummary: string;
  notes: string;
}

const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: "power-development",
    name: "Power Development",
    sessionType: "training",
    duration: 60,
    focusAreas: ["power", "rotation", "stability"],
    exerciseSummary: "Med ball rotational throws 3x8, Box jumps 3x5, Band-resisted swings 3x10",
    notes: "Focus on explosive movements and rotational power for increased clubhead speed.",
  },
  {
    id: "mobility-flexibility",
    name: "Mobility & Flexibility",
    sessionType: "training",
    duration: 45,
    focusAreas: ["mobility", "recovery"],
    exerciseSummary: "Hip 90/90 stretches, T-spine rotations, Shoulder CARs, Hip flexor stretches",
    notes: "Improve range of motion and address common golf-related mobility restrictions.",
  },
  {
    id: "strength-foundation",
    name: "Strength Foundation",
    sessionType: "training",
    duration: 75,
    focusAreas: ["strength", "stability"],
    exerciseSummary: "Goblet squats 3x12, Romanian deadlifts 3x10, Push-ups 3x15, Rows 3x12",
    notes: "Build foundational strength to support golf performance and injury prevention.",
  },
  {
    id: "speed-training",
    name: "Speed Training",
    sessionType: "training",
    duration: 45,
    focusAreas: ["speed", "power"],
    exerciseSummary: "Overspeed protocol with SuperSpeed sticks, Light club swings, Reactive drills",
    notes: "Neuromuscular training to increase swing speed through overspeed methods.",
  },
  {
    id: "pre-round-warmup",
    name: "Pre-Round Warm-up",
    sessionType: "warmup",
    duration: 20,
    focusAreas: ["mobility", "stability"],
    exerciseSummary: "Dynamic stretches, Band activations, Progressive swing builds",
    notes: "Quick activation routine before play to optimize performance and reduce injury risk.",
  },
  {
    id: "recovery-session",
    name: "Recovery & Regeneration",
    sessionType: "recovery",
    duration: 30,
    focusAreas: ["recovery", "mobility"],
    exerciseSummary: "Foam rolling, Static stretching, Breathing exercises, Light movement",
    notes: "Active recovery to promote tissue health and reduce soreness after intense training.",
  },
  {
    id: "initial-assessment",
    name: "Initial Assessment",
    sessionType: "assessment",
    duration: 90,
    focusAreas: ["mobility", "strength", "stability"],
    exerciseSummary: "TPI screen, FMS tests, Swing analysis, Goal setting discussion",
    notes: "Comprehensive evaluation to establish baseline and create personalized training plan.",
  },
  {
    id: "competition-prep",
    name: "Competition Prep",
    sessionType: "competition",
    duration: 45,
    focusAreas: ["power", "speed", "stability"],
    exerciseSummary: "Light activation, Speed work, Mental preparation, Course strategy review",
    notes: "Pre-competition session to prime body and mind for optimal tournament performance.",
  },
];

const AddSessionDialog = ({ clientId, open, onOpenChange, onSessionCreated }: AddSessionDialogProps) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [sessionType, setSessionType] = useState("training");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const applyTemplate = (templateId: string) => {
    const template = SESSION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSessionType(template.sessionType);
      setDurationMinutes(template.duration.toString());
      // Create structured notes JSON matching SessionNotesDialog format
      const structuredNotes = {
        sessionType: template.sessionType,
        focusAreas: template.focusAreas,
        clientEnergy: 7,
        exerciseSummary: template.exerciseSummary,
        keyAchievements: "",
        areasToImprove: "",
        coachNotes: template.notes,
      };
      setNotes(JSON.stringify(structuredNotes));
      setSelectedTemplate(templateId);
    }
  };

  const clearTemplate = () => {
    setSelectedTemplate("");
    setSessionType("training");
    setDurationMinutes("");
    setNotes("");
  };

  const handleCreate = async () => {
    if (!date) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    
    // Check if notes is already JSON structured (from template)
    let finalNotes = notes;
    if (!notes.startsWith("{")) {
      // Plain text notes - wrap in simple structure
      const structuredNotes = {
        sessionType: sessionType,
        focusAreas: [],
        clientEnergy: 7,
        exerciseSummary: "",
        keyAchievements: "",
        areasToImprove: "",
        coachNotes: notes,
      };
      finalNotes = JSON.stringify(structuredNotes);
    }
    
    const { error } = await supabase.from("workout_logs").insert({
      client_id: clientId,
      workout_date: format(date, "yyyy-MM-dd"),
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      notes: finalNotes,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create session", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Session created successfully" });
      onSessionCreated();
      onOpenChange(false);
      // Reset form
      setDate(new Date());
      setSessionType("training");
      setDurationMinutes("");
      setNotes("");
      setSelectedTemplate("");
    }
    setIsCreating(false);
  };

  const selectedTemplateData = SESSION_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Quick Templates
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {SESSION_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplate === template.id ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-xs h-auto py-2 px-3"
                  onClick={() => applyTemplate(template.id)}
                >
                  {template.name}
                </Button>
              ))}
            </div>
            {selectedTemplate && (
              <Button variant="ghost" size="sm" onClick={clearTemplate} className="text-xs text-muted-foreground">
                Clear template
              </Button>
            )}
          </div>

          {/* Template Preview */}
          {selectedTemplateData && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium">{selectedTemplateData.name}</p>
              <p className="text-muted-foreground text-xs">{selectedTemplateData.notes}</p>
              <p className="text-xs"><span className="font-medium">Duration:</span> {selectedTemplateData.duration} min</p>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1.5">
            <Label>Session Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Session Type */}
          <div className="space-y-1.5">
            <Label>Session Type</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              placeholder="60"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          {/* Notes - only show if no template selected */}
          {!selectedTemplate && (
            <div className="space-y-1.5">
              <Label>Session Notes</Label>
              <Textarea
                placeholder="Add notes about this session..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24"
              />
            </div>
          )}

          <Button onClick={handleCreate} disabled={isCreating} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            {isCreating ? "Creating..." : "Create Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSessionDialog;
