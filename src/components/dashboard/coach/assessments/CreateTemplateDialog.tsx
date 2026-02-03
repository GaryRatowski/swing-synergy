import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ChecklistItemBase {
  name: string;
  type: "pass_fail" | "numeric" | "video" | "photo";
  instructions: string;
  unit?: string;
}

interface ChecklistItemWithId extends ChecklistItemBase {
  id: string;
}

interface AssessmentTemplateInput {
  id: string;
  name: string;
  description: string | null;
  checklist_items: ChecklistItemBase[];
  created_by: string;
}

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AssessmentTemplateInput | null;
}

const SortableItem = ({
  item,
  onUpdate,
  onDelete,
}: {
  item: ChecklistItemWithId;
  onUpdate: (id: string, updates: Partial<ChecklistItemWithId>) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Item Name</Label>
              <Input
                value={item.name}
                onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                placeholder="e.g., Pelvic Tilt Test"
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={item.type}
                onValueChange={(value) => onUpdate(item.id, { type: value as ChecklistItemWithId["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass_fail">Pass/Fail</SelectItem>
                  <SelectItem value="numeric">Numeric</SelectItem>
                  <SelectItem value="video">Video Upload</SelectItem>
                  <SelectItem value="photo">Photo Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {item.type === "numeric" && (
            <div>
              <Label className="text-xs">Unit (optional)</Label>
              <Input
                value={item.unit || ""}
                onChange={(e) => onUpdate(item.id, { unit: e.target.value })}
                placeholder="e.g., degrees, mph"
              />
            </div>
          )}
          <div>
            <Label className="text-xs">Instructions</Label>
            <Textarea
              value={item.instructions}
              onChange={(e) => onUpdate(item.id, { instructions: e.target.value })}
              placeholder="Describe how to perform this test..."
              rows={2}
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const CreateTemplateDialog = ({ open, onOpenChange, template }: CreateTemplateDialogProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ChecklistItemWithId[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setItems(
        template.checklist_items.map((item, idx) => ({
          ...item,
          id: (item as any).id || `item-${idx}`,
        }))
      );
    } else {
      setName("");
      setDescription("");
      setItems([]);
    }
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not authenticated");

      const cleanedItems = items.map(({ id, ...rest }) => rest);

      if (template) {
        const { error } = await supabase
          .from("assessment_templates")
          .update({
            name,
            description: description || null,
            checklist_items: cleanedItems,
          })
          .eq("id", template.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("assessment_templates")
          .insert({
            name,
            description: description || null,
            checklist_items: cleanedItems,
            created_by: profile.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-templates"] });
      toast.success(template ? "Template updated" : "Template created");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to save template");
      console.error(error);
    },
  });

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        name: "",
        type: "pass_fail",
        instructions: "",
      },
    ]);
  };

  const updateItem = (id: string, updates: Partial<ChecklistItemWithId>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const canSave = name.trim() && items.length > 0 && items.every((item) => item.name.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Assessment Template"}</DialogTitle>
          <DialogDescription>
            Build a reusable assessment template for mobility screens and performance testing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., TPI Mobility Screen"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this assessment..."
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Checklist Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  <p>No items yet. Add checklist items for your assessment.</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <SortableItem
                          key={item.id}
                          item={item}
                          onUpdate={updateItem}
                          onDelete={deleteItem}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : template ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateDialog;
