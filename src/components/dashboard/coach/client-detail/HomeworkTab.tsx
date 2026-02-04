import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Archive, Copy, MoreVertical, BookOpen, ArchiveRestore } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface HomeworkAssignment {
  id: string;
  name: string;
  frequency_type: string;
  frequency_count: number | null;
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  is_active: boolean;
  created_at: string;
}

interface HomeworkExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number | null;
  reps: string | null;
  tempo: string | null;
  notes: string | null;
  exercises?: {
    name: string;
  };
}

interface HomeworkTabProps {
  clientId: string;
}

const HomeworkTab = ({ clientId }: HomeworkTabProps) => {
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Record<string, HomeworkExercise[]>>({});
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<HomeworkAssignment | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    frequency_type: "daily",
    instructions: "",
  });

  useEffect(() => {
    fetchAssignments();
  }, [clientId, showArchived]);

  const fetchAssignments = async () => {
    setLoading(true);
    
    let query = supabase
      .from("homework_assignments")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    
    if (!showArchived) {
      query = query.eq("is_active", true);
    }
    
    const { data } = await query;
    
    if (data) {
      setAssignments(data);
      
      // Fetch exercises for each assignment
      const map: Record<string, HomeworkExercise[]> = {};
      for (const assignment of data) {
        const { data: exercises } = await supabase
          .from("homework_exercises")
          .select(`
            *,
            exercises (name)
          `)
          .eq("homework_assignment_id", assignment.id)
          .order("order_index");
        
        map[assignment.id] = exercises || [];
      }
      setExerciseMap(map);
    }
    
    setLoading(false);
  };

  const handleArchive = async (assignment: HomeworkAssignment) => {
    const newStatus = !assignment.is_active;
    const { error } = await supabase
      .from("homework_assignments")
      .update({ is_active: newStatus })
      .eq("id", assignment.id);
    
    if (error) {
      toast.error("Failed to update assignment");
    } else {
      toast.success(newStatus ? "Assignment restored" : "Assignment archived");
      fetchAssignments();
    }
  };

  const handleDuplicate = async (assignment: HomeworkAssignment) => {
    // Create new assignment
    const { data: newAssignment, error: assignmentError } = await supabase
      .from("homework_assignments")
      .insert({
        client_id: clientId,
        assigned_by: assignment.id, // This will be set properly from context
        name: `${assignment.name} (Copy)`,
        frequency_type: assignment.frequency_type,
        frequency_count: assignment.frequency_count,
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: null,
        instructions: assignment.instructions,
        is_active: true,
      })
      .select()
      .single();
    
    if (assignmentError || !newAssignment) {
      toast.error("Failed to duplicate assignment");
      return;
    }
    
    // Copy exercises
    const exercises = exerciseMap[assignment.id] || [];
    if (exercises.length > 0) {
      const exerciseInserts = exercises.map(ex => ({
        homework_assignment_id: newAssignment.id,
        exercise_id: ex.exercise_id,
        order_index: ex.order_index,
        sets: ex.sets,
        reps: ex.reps,
        tempo: ex.tempo,
        notes: ex.notes,
      }));
      
      await supabase.from("homework_exercises").insert(exerciseInserts);
    }
    
    toast.success("Assignment duplicated");
    fetchAssignments();
  };

  const handleEdit = (assignment: HomeworkAssignment) => {
    setEditingAssignment(assignment);
    setEditForm({
      name: assignment.name,
      frequency_type: assignment.frequency_type,
      instructions: assignment.instructions || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAssignment) return;
    
    const { error } = await supabase
      .from("homework_assignments")
      .update({
        name: editForm.name,
        frequency_type: editForm.frequency_type,
        instructions: editForm.instructions || null,
      })
      .eq("id", editingAssignment.id);
    
    if (error) {
      toast.error("Failed to update assignment");
    } else {
      toast.success("Assignment updated");
      setEditingAssignment(null);
      fetchAssignments();
    }
  };

  const getFrequencyLabel = (type: string, count: number | null) => {
    switch (type) {
      case "daily": return "Daily";
      case "weekly_3x": return "3x/week";
      case "weekly_2x": return "2x/week";
      case "weekly_1x": return "1x/week";
      case "custom": return `${count}x/week`;
      default: return type;
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading assignments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {showArchived ? "All Assignments" : "Active Assignments"}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? "Hide Archived" : "Show Archived"}
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No homework assignments yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const exercises = exerciseMap[assignment.id] || [];
            
            return (
              <Card key={assignment.id} className={!assignment.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{assignment.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getFrequencyLabel(assignment.frequency_type, assignment.frequency_count)}
                        </Badge>
                        {!assignment.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Archived
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Started {format(new Date(assignment.start_date), "MMM d, yyyy")}
                        {assignment.end_date && (
                          <> · Ends {format(new Date(assignment.end_date), "MMM d, yyyy")}</>
                        )}
                      </div>
                      
                      {assignment.instructions && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {assignment.instructions}
                        </p>
                      )}
                      
                      {exercises.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}:
                          {" "}
                          {exercises.slice(0, 3).map(ex => ex.exercises?.name).filter(Boolean).join(", ")}
                          {exercises.length > 3 && ` +${exercises.length - 3} more`}
                        </div>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(assignment)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(assignment)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(assignment)}>
                          {assignment.is_active ? (
                            <>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </>
                          ) : (
                            <>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Restore
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAssignment} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assignment Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={editForm.frequency_type}
                onValueChange={(value) => setEditForm({ ...editForm, frequency_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly_3x">3x/week</SelectItem>
                  <SelectItem value="weekly_2x">2x/week</SelectItem>
                  <SelectItem value="weekly_1x">1x/week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea
                value={editForm.instructions}
                onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAssignment(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeworkTab;
