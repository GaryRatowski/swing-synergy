import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface DuplicateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
  onDuplicated: (newProgramId: string) => void;
}

const DuplicateProgramDialog = ({
  open,
  onOpenChange,
  programId,
  programName,
  onDuplicated,
}: DuplicateProgramDialogProps) => {
  const { profile } = useAuth();
  const [newName, setNewName] = useState(`${programName} (Copy)`);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!newName.trim() || !profile?.id) {
      toast.error("Please enter a program name");
      return;
    }

    setIsDuplicating(true);

    try {
      // Step 1: Get the original program details
      const { data: originalProgram, error: programError } = await supabase
        .from("programs")
        .select("*")
        .eq("id", programId)
        .single();

      if (programError || !originalProgram) {
        throw new Error("Failed to fetch original program");
      }

      // Step 2: Create the new program
      const { data: newProgram, error: insertError } = await supabase
        .from("programs")
        .insert({
          name: newName.trim(),
          description: originalProgram.description,
          training_phase: originalProgram.training_phase,
          duration_weeks: originalProgram.duration_weeks,
          session_type: originalProgram.session_type,
          is_template: originalProgram.is_template,
          coach_id: profile.id,
        })
        .select()
        .single();

      if (insertError || !newProgram) {
        throw new Error("Failed to create new program");
      }

      // Step 3: Get all exercises from the original program
      const { data: originalExercises, error: exercisesError } = await supabase
        .from("program_exercises")
        .select("*")
        .eq("program_id", programId)
        .order("order_index");

      if (exercisesError) {
        throw new Error("Failed to fetch program exercises");
      }

      // Step 4: Copy all exercises to the new program
      if (originalExercises && originalExercises.length > 0) {
        const newExercises = originalExercises.map((ex) => ({
          program_id: newProgram.id,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          superset_group: ex.superset_group,
          notes: ex.notes,
          tempo: ex.tempo,
          target_rpe: ex.target_rpe,
          week_number: ex.week_number,
          day_number: ex.day_number,
        }));

        const { error: copyError } = await supabase
          .from("program_exercises")
          .insert(newExercises);

        if (copyError) {
          // Rollback: delete the newly created program
          await supabase.from("programs").delete().eq("id", newProgram.id);
          throw new Error("Failed to copy exercises");
        }
      }

      toast.success("Program duplicated successfully");
      onOpenChange(false);
      onDuplicated(newProgram.id);
    } catch (error: any) {
      console.error("Duplication error:", error);
      toast.error(error.message || "Failed to duplicate program");
    } finally {
      setIsDuplicating(false);
    }
  };

  // Reset name when dialog opens with new program
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setNewName(`${programName} (Copy)`);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Program
          </DialogTitle>
          <DialogDescription>
            Create a copy of "{programName}" with all its exercises.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newName">New Program Name</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter program name"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDuplicating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={!newName.trim() || isDuplicating}
          >
            {isDuplicating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Program
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateProgramDialog;
