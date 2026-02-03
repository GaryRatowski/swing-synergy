import { useState, useEffect } from "react";
import { format, addDays, addWeeks } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  X,
  GripVertical,
  Loader2,
  Check,
  Dumbbell,
  ClipboardList,
  FileText,
} from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  body_part: string | null;
  exercise_type: string | null;
}

interface HomeworkExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: string;
  tempo: string;
  notes: string;
}

interface HomeworkAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

type FrequencyType = "daily" | "weekly_3x" | "weekly_2x" | "weekly_1x";

const frequencyOptions = [
  { value: "daily", label: "Daily", count: 7 },
  { value: "weekly_3x", label: "3x per week", count: 3 },
  { value: "weekly_2x", label: "2x per week", count: 2 },
  { value: "weekly_1x", label: "1x per week", count: 1 },
];

const HomeworkAssignmentDialog = ({
  open,
  onOpenChange,
  clientId,
  clientName,
}: HomeworkAssignmentDialogProps) => {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Details
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<FrequencyType>("daily");
  const [startDate, setStartDate] = useState<Date>(addDays(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(addWeeks(addDays(new Date(), 1), 4));
  const [instructions, setInstructions] = useState("");

  // Step 2: Exercises
  const [exercises, setExercises] = useState<HomeworkExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setName("");
      setFrequency("daily");
      setStartDate(addDays(new Date(), 1));
      setEndDate(addWeeks(addDays(new Date(), 1), 4));
      setInstructions("");
      setExercises([]);
      fetchAllExercises();
    }
  }, [open]);

  const fetchAllExercises = async () => {
    setLoadingExercises(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, body_part, exercise_type")
      .order("name");

    if (!error) {
      setAllExercises(data || []);
    }
    setLoadingExercises(false);
  };

  const filteredExercises = allExercises.filter((ex) => {
    if (exercises.some((e) => e.exercise.id === ex.id)) return false;
    if (searchQuery && !ex.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleAddExercise = (exercise: Exercise) => {
    const newExercise: HomeworkExercise = {
      id: crypto.randomUUID(),
      exercise,
      sets: 3,
      reps: "10",
      tempo: "",
      notes: "",
    };
    setExercises([...exercises, newExercise]);
    setSearchQuery("");
    setShowExercisePicker(false);
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const handleUpdateExercise = (id: string, field: keyof HomeworkExercise, value: string | number) => {
    setExercises(
      exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    const newExercises = [...exercises];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];
    setExercises(newExercises);
  };

  const canProceedStep1 = name.trim().length > 0;
  const canProceedStep2 = exercises.length > 0;

  const handleSubmit = async () => {
    if (!profile?.id) return;

    setSaving(true);

    try {
      // Create homework assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("homework_assignments")
        .insert({
          client_id: clientId,
          assigned_by: profile.id,
          name: name.trim(),
          frequency_type: frequency,
          frequency_count: frequencyOptions.find((f) => f.value === frequency)?.count || 7,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          instructions: instructions.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Create homework exercises
      const exerciseInserts = exercises.map((ex, index) => ({
        homework_assignment_id: assignment.id,
        exercise_id: ex.exercise.id,
        order_index: index,
        sets: ex.sets,
        reps: ex.reps,
        tempo: ex.tempo || null,
        notes: ex.notes || null,
      }));

      const { error: exercisesError } = await supabase
        .from("homework_exercises")
        .insert(exerciseInserts);

      if (exercisesError) throw exercisesError;

      toast({
        title: "Homework assigned",
        description: `"${name}" has been assigned to ${clientName}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating homework assignment:", error);
      toast({
        title: "Error",
        description: "Failed to create homework assignment",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "power": return "bg-accent/10 text-accent border-accent/20";
      case "strength": return "bg-primary/10 text-primary border-primary/20";
      case "mobility": return "bg-blue-100 text-blue-700 border-blue-200";
      case "plyometric": return "bg-orange-100 text-orange-700 border-orange-200";
      case "speed": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "stability": return "bg-purple-100 text-purple-700 border-purple-200";
      case "rotation": return "bg-pink-100 text-pink-700 border-pink-200";
      case "recovery": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle>Assign Homework to {clientName}</DialogTitle>
          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : step > s
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-1",
                      step > s ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <span className="text-xs text-muted-foreground">
              {step === 1 && "Assignment Details"}
              {step === 2 && "Add Exercises"}
              {step === 3 && "Review & Assign"}
            </span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {/* Step 1: Assignment Details */}
          {step === 1 && (
            <div className="space-y-4 pb-6">
              <div className="space-y-2">
                <Label htmlFor="name">Assignment Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Daily Hip Mobility"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as FrequencyType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM d") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM d") : "No end"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date <= startDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions for Client (optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Any notes or guidance for the client..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Add Exercises */}
          {step === 2 && (
            <div className="space-y-4 pb-6">
              {/* Exercise Search */}
              {showExercisePicker ? (
                <div className="border rounded-lg bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Add Exercise</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowExercisePicker(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9"
                      autoFocus
                    />
                  </div>
                  <div className="h-[180px] overflow-y-auto space-y-1">
                    {loadingExercises ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredExercises.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No matching exercises found
                      </div>
                    ) : (
                      filteredExercises.slice(0, 20).map((exercise) => (
                        <div
                          key={exercise.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-background cursor-pointer group"
                          onClick={() => handleAddExercise(exercise)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm truncate">{exercise.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {exercise.exercise_type && (
                              <Badge variant="outline" className={`text-xs ${getTypeColor(exercise.exercise_type)}`}>
                                {exercise.exercise_type}
                              </Badge>
                            )}
                            <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowExercisePicker(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              )}

              {/* Exercise List */}
              {exercises.length === 0 && !showExercisePicker ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Dumbbell className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Add at least one exercise to this homework assignment
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exercises.map((ex, index) => (
                    <Card key={ex.id} className="overflow-hidden">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => moveExercise(index, "up")}
                              disabled={index === 0}
                            >
                              <ChevronLeft className="h-3 w-3 rotate-90" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => moveExercise(index, "down")}
                              disabled={index === exercises.length - 1}
                            >
                              <ChevronRight className="h-3 w-3 rotate-90" />
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm truncate">
                                {ex.exercise.name}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveExercise(ex.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {ex.exercise.exercise_type && (
                              <Badge variant="outline" className={`text-xs mt-1 ${getTypeColor(ex.exercise.exercise_type)}`}>
                                {ex.exercise.exercise_type}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Sets</Label>
                            <Input
                              type="number"
                              min="1"
                              value={ex.sets}
                              onChange={(e) => handleUpdateExercise(ex.id, "sets", parseInt(e.target.value) || 1)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Reps</Label>
                            <Input
                              value={ex.reps}
                              onChange={(e) => handleUpdateExercise(ex.id, "reps", e.target.value)}
                              placeholder="10"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Tempo</Label>
                            <Input
                              value={ex.tempo}
                              onChange={(e) => handleUpdateExercise(ex.id, "tempo", e.target.value)}
                              placeholder="3-1-1"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Notes (optional)</Label>
                          <Input
                            value={ex.notes}
                            onChange={(e) => handleUpdateExercise(ex.id, "notes", e.target.value)}
                            placeholder="Coaching cues..."
                            className="h-8 text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {exercises.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {exercises.length} exercise{exercises.length > 1 ? "s" : ""} added
                </p>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4 pb-6">
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-4">
                  {/* Assignment Info */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {frequencyOptions.find((f) => f.value === frequency)?.label} •{" "}
                        {format(startDate, "MMM d, yyyy")}
                        {endDate && ` – ${format(endDate, "MMM d, yyyy")}`}
                      </p>
                    </div>
                  </div>

                  {/* Instructions */}
                  {instructions && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Instructions
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        {instructions}
                      </p>
                    </div>
                  )}

                  {/* Exercises */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                      Exercises ({exercises.length})
                    </div>
                    <div className="space-y-2 pl-6">
                      {exercises.map((ex, index) => (
                        <div key={ex.id} className="flex items-center justify-between text-sm">
                          <span>
                            {index + 1}. {ex.exercise.name}
                          </span>
                          <span className="text-muted-foreground">
                            {ex.sets} × {ex.reps}
                            {ex.tempo && ` @ ${ex.tempo}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground text-center">
                This homework will be assigned to <strong>{clientName}</strong> and will appear in their Today view.
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 pt-4 border-t flex-shrink-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving} className="bg-success hover:bg-success/90">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Assign to Client
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HomeworkAssignmentDialog;
