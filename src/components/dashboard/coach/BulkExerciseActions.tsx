import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronDown, Loader2, Trash2, Tag, Dumbbell } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

const EXERCISE_TYPES = [
  "power",
  "strength",
  "mobility",
  "plyometric",
  "speed",
  "stability",
  "rotation",
  "recovery",
] as const;

const BODY_PARTS = [
  "Full Body",
  "Core",
  "Lower Body",
  "Upper Body",
  "Hips",
  "Shoulders",
  "Glutes",
  "Back",
  "Chest",
  "Arms",
  "Legs",
];

interface BulkExerciseActionsProps {
  exercises: Exercise[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onRefresh: () => void;
}

const BulkExerciseActions = ({
  exercises,
  selectedIds,
  onSelectionChange,
  onRefresh,
}: BulkExerciseActionsProps) => {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showBodyPartDialog, setShowBodyPartDialog] = useState(false);
  const [newCategory, setNewCategory] = useState<string>("");
  const [newBodyPart, setNewBodyPart] = useState<string>("");

  const selectedExercises = exercises.filter((e) => selectedIds.includes(e.id));

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("exercises")
        .delete()
        .in("id", selectedIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.length} exercise${selectedIds.length > 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onSelectionChange([]);
      onRefresh();
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to delete exercises");
      console.error(error);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      const { error } = await supabase
        .from("exercises")
        .update({ [field]: value })
        .in("id", selectedIds);
      if (error) throw error;
    },
    onSuccess: (_, { field }) => {
      const fieldLabel = field === "exercise_type" ? "category" : "body part";
      toast.success(`Updated ${fieldLabel} for ${selectedIds.length} exercise${selectedIds.length > 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onSelectionChange([]);
      onRefresh();
      setShowCategoryDialog(false);
      setShowBodyPartDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update exercises");
      console.error(error);
    },
  });

  const toggleAll = () => {
    if (selectedIds.length === exercises.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(exercises.map((e) => e.id));
    }
  };

  if (selectedIds.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={exercises.length > 0 && selectedIds.length === exercises.length}
          onCheckedChange={toggleAll}
        />
        <span className="text-sm text-muted-foreground">Select all</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length === exercises.length}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Bulk Actions
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setShowCategoryDialog(true)}>
              <Tag className="mr-2 h-4 w-4" />
              Change Category
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowBodyPartDialog(true)}>
              <Dumbbell className="mr-2 h-4 w-4" />
              Change Body Part
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectionChange([])}
        >
          Clear selection
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.length} Exercise{selectedIds.length > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete these exercises. If they're used in programs,
              they will be removed from those programs as well.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="max-h-40 border rounded-md p-2">
            {selectedExercises.map((ex) => (
              <div key={ex.id} className="text-sm py-1">
                {ex.name}
              </div>
            ))}
          </ScrollArea>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate()}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete {selectedIds.length} Exercise{selectedIds.length > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Category</DialogTitle>
            <DialogDescription>
              Update category for {selectedIds.length} exercise{selectedIds.length > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                bulkUpdateMutation.mutate({ field: "exercise_type", value: newCategory })
              }
              disabled={!newCategory || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update {selectedIds.length} Exercise{selectedIds.length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Body Part Dialog */}
      <Dialog open={showBodyPartDialog} onOpenChange={setShowBodyPartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Body Part</DialogTitle>
            <DialogDescription>
              Update body part for {selectedIds.length} exercise{selectedIds.length > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Body Part</Label>
              <Select value={newBodyPart} onValueChange={setNewBodyPart}>
                <SelectTrigger>
                  <SelectValue placeholder="Select body part" />
                </SelectTrigger>
                <SelectContent>
                  {BODY_PARTS.map((part) => (
                    <SelectItem key={part} value={part}>
                      {part}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBodyPartDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                bulkUpdateMutation.mutate({ field: "body_part", value: newBodyPart })
              }
              disabled={!newBodyPart || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update {selectedIds.length} Exercise{selectedIds.length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkExerciseActions;
