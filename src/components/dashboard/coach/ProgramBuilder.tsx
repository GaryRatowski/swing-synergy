import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Edit, Trash2, Calendar, Dumbbell, Clock, MoreVertical, Users } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/hooks/use-toast";
import AssignProgramDialog from "./AssignProgramDialog";
import ProgramDetailDialog from "./ProgramDetailDialog";
import CreateProgramDialog from "./CreateProgramDialog";
import DuplicateProgramDialog from "./DuplicateProgramDialog";
import BulkProgramAssignment from "./BulkProgramAssignment";

interface Program {
  id: string;
  name: string;
  description: string | null;
  training_phase: string | null;
  duration_weeks: number | null;
  session_type: string | null;
  is_template: boolean | null;
  exercise_count: number;
  assigned_clients: number;
}

const ProgramBuilder = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    program: Program;
    clientNames: string[];
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleProgramCreated = (programId: string) => {
    fetchPrograms();
    // Find the created program and open detail dialog
    const openNewProgram = async () => {
      const { data } = await supabase
        .from("programs")
        .select("*")
        .eq("id", programId)
        .single();
      
      if (data) {
        setSelectedProgram({
          ...data,
          exercise_count: 0,
          assigned_clients: 0,
        });
        setDetailDialogOpen(true);
      }
    };
    openNewProgram();
  };

  const handleOpenAssignDialog = (program: Program) => {
    setSelectedProgram(program);
    setAssignDialogOpen(true);
  };

  const handleOpenDuplicateDialog = (program: Program) => {
    setSelectedProgram(program);
    setDuplicateDialogOpen(true);
  };

  const handleProgramDuplicated = (newProgramId: string) => {
    fetchPrograms();
    // Optionally open the new program's detail dialog
    const openDuplicatedProgram = async () => {
      const { data } = await supabase
        .from("programs")
        .select("*")
        .eq("id", newProgramId)
        .single();
      
      if (data) {
        // Get exercise count for the new program
        const { count: exerciseCount } = await supabase
          .from("program_exercises")
          .select("*", { count: "exact", head: true })
          .eq("program_id", newProgramId);

        setSelectedProgram({
          ...data,
          exercise_count: exerciseCount || 0,
          assigned_clients: 0,
        });
        setDetailDialogOpen(true);
      }
    };
    openDuplicatedProgram();
  };

  const handleOpenDetailDialog = (program: Program) => {
    setSelectedProgram(program);
    setDetailDialogOpen(true);
  };

  const handleDeleteClick = async (program: Program) => {
    // Check for assigned clients
    const { data: assignments } = await supabase
      .from("client_programs")
      .select("profiles(full_name)")
      .eq("program_id", program.id)
      .eq("is_active", true);

    const clientNames = (assignments || [])
      .map((a: any) => a.profiles?.full_name)
      .filter(Boolean) as string[];

    setDeleteTarget({ program, clientNames });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    try {
      // Delete program exercises first
      await supabase
        .from("program_exercises")
        .delete()
        .eq("program_id", deleteTarget.program.id);

      // Deactivate client programs
      await supabase
        .from("client_programs")
        .update({ is_active: false })
        .eq("program_id", deleteTarget.program.id);

      // Delete the program
      const { error } = await supabase
        .from("programs")
        .delete()
        .eq("id", deleteTarget.program.id);

      if (error) throw error;

      toast({
        title: "Program deleted",
        description: `"${deleteTarget.program.name}" has been removed.`,
      });
      
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      fetchPrograms();
    } catch (error: any) {
      toast({
        title: "Error deleting program",
        description: error.message || "Failed to delete program",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setIsLoading(true);
    
    // Fetch programs with exercise count and assigned clients count
    const { data: programsData, error: programsError } = await supabase
      .from("programs")
      .select("*")
      .eq("is_template", true)
      .order("created_at", { ascending: false });

    if (programsError) {
      console.error("Error fetching programs:", programsError);
      setIsLoading(false);
      return;
    }

    // Fetch exercise counts for each program
    const programsWithCounts = await Promise.all(
      (programsData || []).map(async (program) => {
        const { count: exerciseCount } = await supabase
          .from("program_exercises")
          .select("*", { count: "exact", head: true })
          .eq("program_id", program.id);

        const { count: clientCount } = await supabase
          .from("client_programs")
          .select("*", { count: "exact", head: true })
          .eq("program_id", program.id)
          .eq("is_active", true);

        return {
          ...program,
          exercise_count: exerciseCount || 0,
          assigned_clients: clientCount || 0,
        };
      })
    );

    setPrograms(programsWithCounts);
    setIsLoading(false);
  };

  const getPhaseColor = (phase: string | null) => {
    switch (phase) {
      case "power": return "bg-accent/10 text-accent border-accent/20";
      case "strength": return "bg-primary/10 text-primary border-primary/20";
      case "mobility": return "bg-blue-100 text-blue-700 border-blue-200";
      case "maintenance": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-20 mb-2" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Program Templates</h3>
          <div className="flex gap-2">
            <BulkProgramAssignment
              trigger={
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Quick Assign
                </Button>
              }
            />
            <Button variant="outline" size="sm">View All Templates</Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {programs.map((program) => (
            <Card 
              key={program.id} 
              className="group hover:shadow-md transition-all hover:border-primary/30 cursor-pointer"
              onClick={() => handleOpenDetailDialog(program)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className={getPhaseColor(program.training_phase)}>
                    {program.training_phase || "general"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDetailDialog(program); }}>
                        <Edit className="h-4 w-4 mr-2" /> Edit Program
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDuplicateDialog(program); }}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDeleteClick(program); 
                        }} 
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-base mt-2">{program.name}</CardTitle>
                <CardDescription className="text-sm line-clamp-2">{program.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{program.duration_weeks || 1}w</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    <span>{program.exercise_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{program.session_type || "gym"}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {program.assigned_clients} athletes assigned
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handleOpenAssignDialog(program); }}
                  >
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Program Card */}
          <Card 
            className="border-dashed hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group"
            onClick={() => setCreateDialogOpen(true)}
          >
            <CardContent className="h-full flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">Create New Program</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Build a custom training program
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Clone Existing Program
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            View Schedule Calendar
          </Button>
          <Button variant="outline" size="sm">
            <Dumbbell className="h-4 w-4 mr-2" />
            Bulk Assign Programs
          </Button>
        </CardContent>
      </Card>

      {/* Assign Program Dialog */}
      {selectedProgram && (
        <AssignProgramDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          programId={selectedProgram.id}
          programName={selectedProgram.name}
          onAssigned={fetchPrograms}
        />
      )}

      {/* Program Detail Dialog */}
      {selectedProgram && (
        <ProgramDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          programId={selectedProgram.id}
          onUpdated={fetchPrograms}
        />
      )}

      {/* Create Program Dialog */}
      <CreateProgramDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleProgramCreated}
      />

      {/* Duplicate Program Dialog */}
      {selectedProgram && (
        <DuplicateProgramDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          programId={selectedProgram.id}
          programName={selectedProgram.name}
          onDuplicated={handleProgramDuplicated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        itemName={deleteTarget?.program.name || ""}
        itemType="Program"
        dependencyWarning={
          deleteTarget && deleteTarget.clientNames.length > 0
            ? `This program is assigned to ${deleteTarget.clientNames.length} client(s). Deleting it will remove their training program.`
            : undefined
        }
        affectedItems={deleteTarget?.clientNames}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ProgramBuilder;
