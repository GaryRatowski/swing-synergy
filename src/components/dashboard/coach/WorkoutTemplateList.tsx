import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Search, MoreVertical, Edit, Copy, Trash2, Dumbbell, Calendar } from "lucide-react";
import { useWorkoutTemplates, WorkoutTemplate } from "@/hooks/useWorkoutTemplates";
import { useAuth } from "@/hooks/useAuth";
import WorkoutTemplateBuilder from "./WorkoutTemplateBuilder";
import AssignWorkoutTemplateDialog from "./AssignWorkoutTemplateDialog";

const CATEGORIES = ["all", "general", "upper_body", "lower_body", "full_body", "power", "mobility", "recovery", "speed"];

const WorkoutTemplateList = () => {
  const { profile } = useAuth();
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useWorkoutTemplates(profile?.id);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [assignTemplate, setAssignTemplate] = useState<WorkoutTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filtered = templates.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  const handleSave = async (name: string, description: string | null, category: string, exercises: any[]) => {
    setIsSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, name, description, category, exercises);
      } else {
        await createTemplate(name, description, category, exercises);
      }
    } finally {
      setIsSaving(false);
      setEditingTemplate(null);
    }
  };

  const handleEdit = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setBuilderOpen(true);
  };

  const handleDuplicate = async (template: WorkoutTemplate) => {
    await duplicateTemplate(template.id, `${template.name} (Copy)`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-4 w-2/3" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">Workout Templates</h3>
        <Button onClick={() => { setEditingTemplate(null); setBuilderOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((template) => (
          <Card key={template.id} className="group hover:shadow-md transition-all hover:border-primary/30 cursor-pointer" onClick={() => handleEdit(template)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="capitalize text-xs">{template.category?.replace(/_/g, " ") || "general"}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(template); }}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }}>
                      <Copy className="h-4 w-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAssignTemplate(template); }}>
                      <Calendar className="h-4 w-4 mr-2" /> Assign to Program
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteTarget(template); }} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="text-base mt-2">{template.name}</CardTitle>
              <CardDescription className="text-sm line-clamp-2">{template.description || "No description"}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Dumbbell className="h-3 w-3" />
                <span>{template.exercises.length} exercise{template.exercises.length !== 1 ? "s" : ""}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add card */}
        <Card className="border-dashed hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group" onClick={() => { setEditingTemplate(null); setBuilderOpen(true); }}>
          <CardContent className="h-full flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium text-foreground">New Workout Template</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">Build a reusable single-day workout</p>
          </CardContent>
        </Card>
      </div>

      {filtered.length === 0 && templates.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No templates match your search.</p>
      )}

      {/* Builder dialog */}
      <WorkoutTemplateBuilder
        open={builderOpen}
        onOpenChange={(open) => { setBuilderOpen(open); if (!open) setEditingTemplate(null); }}
        onSave={handleSave}
        editingTemplate={editingTemplate}
        isSaving={isSaving}
      />

      {/* Assign dialog */}
      {assignTemplate && profile?.id && (
        <AssignWorkoutTemplateDialog
          open={!!assignTemplate}
          onOpenChange={(open) => { if (!open) setAssignTemplate(null); }}
          templateId={assignTemplate.id}
          templateName={assignTemplate.name}
          coachId={profile.id}
        />
      )}

      {/* Delete dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        itemName={deleteTarget?.name || ""}
        itemType="Workout Template"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteTemplate(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

export default WorkoutTemplateList;
