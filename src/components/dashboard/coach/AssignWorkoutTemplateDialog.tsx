import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface AssignWorkoutTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  coachId: string;
}

const AssignWorkoutTemplateDialog = ({ open, onOpenChange, templateId, templateName, coachId }: AssignWorkoutTemplateDialogProps) => {
  const { assignToProgram } = useWorkoutTemplates(coachId);
  const [programs, setPrograms] = useState<{ id: string; name: string; duration_weeks: number | null }[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [weekNumber, setWeekNumber] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPrograms();
      setSelectedProgram("");
      setSelectedDays([]);
      setWeekNumber("1");
    }
  }, [open]);

  const fetchPrograms = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("programs")
      .select("id, name, duration_weeks")
      .order("name");
    setPrograms(data || []);
    setIsLoading(false);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleAssign = async () => {
    if (!selectedProgram || selectedDays.length === 0) return;
    setIsSaving(true);

    let allSuccess = true;
    for (const day of selectedDays) {
      const success = await assignToProgram(templateId, selectedProgram, day, parseInt(weekNumber), coachId);
      if (!success) allSuccess = false;
    }

    setIsSaving(false);
    if (allSuccess) onOpenChange(false);
  };

  const selectedProgramData = programs.find((p) => p.id === selectedProgram);
  const maxWeeks = selectedProgramData?.duration_weeks || 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign "{templateName}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Program</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Week</Label>
            <Select value={weekNumber} onValueChange={setWeekNumber}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxWeeks }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Week {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="grid grid-cols-2 gap-2">
              {DAY_NAMES.map((name, i) => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-muted">
                  <Checkbox checked={selectedDays.includes(i)} onCheckedChange={() => toggleDay(i)} />
                  {name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedProgram || selectedDays.length === 0 || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign to {selectedDays.length} day{selectedDays.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignWorkoutTemplateDialog;
