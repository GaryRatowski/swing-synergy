import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WorkoutTemplateExercise {
  id?: string;
  exercise_id: string;
  name: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  tempo: string | null;
  notes: string | null;
  superset_group: string | null;
  body_part?: string | null;
  exercise_type?: string | null;
}

export interface WorkoutTemplate {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
  updated_at: string;
  exercises: WorkoutTemplateExercise[];
}

export const useWorkoutTemplates = (coachId?: string) => {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!coachId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching workout templates:", error);
      setIsLoading(false);
      return;
    }

    // Fetch exercises for each template
    const withExercises = await Promise.all(
      (data || []).map(async (template) => {
        const { data: exData } = await supabase
          .from("workout_template_exercises")
          .select(`
            id, exercise_id, order_index, sets, reps, rest_seconds, tempo, notes, superset_group,
            exercise:exercises (name, body_part, exercise_type)
          `)
          .eq("template_id", template.id)
          .order("order_index", { ascending: true });

        const exercises: WorkoutTemplateExercise[] = (exData || []).map((e: any) => ({
          id: e.id,
          exercise_id: e.exercise_id,
          name: e.exercise?.name || "Unknown",
          order_index: e.order_index,
          sets: e.sets,
          reps: e.reps,
          rest_seconds: e.rest_seconds,
          tempo: e.tempo,
          notes: e.notes,
          superset_group: e.superset_group,
          body_part: e.exercise?.body_part,
          exercise_type: e.exercise?.exercise_type,
        }));

        return { ...template, exercises } as WorkoutTemplate;
      })
    );

    setTemplates(withExercises);
    setIsLoading(false);
  }, [coachId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (
    name: string,
    description: string | null,
    category: string,
    exercises: Omit<WorkoutTemplateExercise, "id" | "name">[]
  ) => {
    if (!coachId) return null;

    const { data: template, error } = await supabase
      .from("workout_templates")
      .insert({ coach_id: coachId, name, description, category })
      .select()
      .single();

    if (error || !template) {
      toast({ title: "Error creating template", description: error?.message, variant: "destructive" });
      return null;
    }

    if (exercises.length > 0) {
      const { error: exError } = await supabase
        .from("workout_template_exercises")
        .insert(
          exercises.map((ex) => ({
            template_id: template.id,
            exercise_id: ex.exercise_id,
            order_index: ex.order_index,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds,
            tempo: ex.tempo,
            notes: ex.notes,
            superset_group: ex.superset_group,
          }))
        );

      if (exError) {
        toast({ title: "Error adding exercises", description: exError.message, variant: "destructive" });
      }
    }

    toast({ title: "Template created", description: `"${name}" saved successfully.` });
    fetchTemplates();
    return template.id;
  };

  const updateTemplate = async (
    templateId: string,
    name: string,
    description: string | null,
    category: string,
    exercises: Omit<WorkoutTemplateExercise, "id" | "name">[]
  ) => {
    const { error } = await supabase
      .from("workout_templates")
      .update({ name, description, category })
      .eq("id", templateId);

    if (error) {
      toast({ title: "Error updating template", description: error.message, variant: "destructive" });
      return;
    }

    // Replace exercises
    await supabase.from("workout_template_exercises").delete().eq("template_id", templateId);

    if (exercises.length > 0) {
      await supabase.from("workout_template_exercises").insert(
        exercises.map((ex) => ({
          template_id: templateId,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo,
          notes: ex.notes,
          superset_group: ex.superset_group,
        }))
      );
    }

    toast({ title: "Template updated", description: `"${name}" saved.` });
    fetchTemplates();
  };

  const deleteTemplate = async (templateId: string) => {
    const { error } = await supabase.from("workout_templates").delete().eq("id", templateId);
    if (error) {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Template deleted" });
    fetchTemplates();
  };

  const duplicateTemplate = async (templateId: string, newName: string) => {
    const source = templates.find((t) => t.id === templateId);
    if (!source) return;

    const newId = await createTemplate(
      newName,
      source.description,
      source.category,
      source.exercises.map((ex, i) => ({
        exercise_id: ex.exercise_id,
        order_index: i,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        tempo: ex.tempo,
        notes: ex.notes,
        superset_group: ex.superset_group,
      }))
    );
    return newId;
  };

  const assignToProgram = async (
    templateId: string,
    programId: string,
    dayOfWeek: number,
    weekNumber: number,
    assignedBy: string
  ) => {
    const { error } = await supabase.from("program_workout_assignments").insert({
      template_id: templateId,
      program_id: programId,
      day_of_week: dayOfWeek,
      week_number: weekNumber,
      assigned_by: assignedBy,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already assigned", description: "This template is already assigned to that day.", variant: "destructive" });
      } else {
        toast({ title: "Error assigning template", description: error.message, variant: "destructive" });
      }
      return false;
    }

    toast({ title: "Workout assigned", description: "Template assigned to program day." });
    return true;
  };

  return {
    templates,
    isLoading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    assignToProgram,
  };
};
