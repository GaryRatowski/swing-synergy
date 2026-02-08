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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, GripVertical, ChevronDown, Link2 } from "lucide-react";
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
import { ConditionConfig, ScoringFormula, ScoringThresholds } from "@/lib/assessmentScoring";

interface ChecklistItemBase {
  name: string;
  type: "pass_fail" | "numeric" | "video" | "photo";
  instructions: string;
  unit?: string;
  condition?: ConditionConfig | null;
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
  scoring_formula?: ScoringFormula;
  scoring_thresholds?: ScoringThresholds;
}

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AssessmentTemplateInput | null;
}

const SortableItem = ({
  item,
  index,
  allItems,
  onUpdate,
  onDelete,
}: {
  item: ChecklistItemWithId;
  index: number;
  allItems: ChecklistItemWithId[];
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
  const [isConditionOpen, setIsConditionOpen] = useState(!!item.condition);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const previousItems = allItems.slice(0, index);
  const hasCondition = !!item.condition;

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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">q{index}</span>
            {hasCondition && (
              <span className="flex items-center gap-1 text-primary">
                <Link2 className="h-3 w-3" />
                Conditional
              </span>
            )}
          </div>
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

          {/* Conditional Logic */}
          {index > 0 && (
            <Collapsible open={isConditionOpen} onOpenChange={setIsConditionOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Conditional Display
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isConditionOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Show this question only when a previous question has a specific answer.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <Label className="text-xs whitespace-nowrap">Show if</Label>
                  <Select
                    value={item.condition?.parentIndex?.toString() || ""}
                    onValueChange={(val) =>
                      onUpdate(item.id, {
                        condition: {
                          parentIndex: parseInt(val),
                          type: item.condition?.type || "equals",
                          value: item.condition?.value || "",
                        },
                      })
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Question..." />
                    </SelectTrigger>
                    <SelectContent>
                      {previousItems.map((prev, i) => (
                        <SelectItem key={prev.id} value={i.toString()}>
                          q{i}: {prev.name.slice(0, 20) || "Untitled"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={item.condition?.type || "equals"}
                    onValueChange={(val) =>
                      onUpdate(item.id, {
                        condition: {
                          ...item.condition!,
                          type: val as ConditionConfig["type"],
                        },
                      })
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">equals</SelectItem>
                      <SelectItem value="not_equals">not equals</SelectItem>
                      <SelectItem value="greater_than">greater than</SelectItem>
                      <SelectItem value="less_than">less than</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-[100px]"
                    placeholder="Value..."
                    value={item.condition?.value || ""}
                    onChange={(e) =>
                      onUpdate(item.id, {
                        condition: {
                          ...item.condition!,
                          value: e.target.value,
                        },
                      })
                    }
                  />
                  {item.condition && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdate(item.id, { condition: null })}
                      className="text-destructive hover:text-destructive"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
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
  const [scoringFormula, setScoringFormula] = useState<ScoringFormula>({});
  const [scoringThresholds, setScoringThresholds] = useState<ScoringThresholds>({
    poor: 40,
    fair: 60,
    good: 80,
  });
  const [activeTab, setActiveTab] = useState("items");

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
      setScoringFormula(template.scoring_formula || {});
      setScoringThresholds(
        template.scoring_thresholds || { poor: 40, fair: 60, good: 80 }
      );
    } else {
      setName("");
      setDescription("");
      setItems([]);
      setScoringFormula({});
      setScoringThresholds({ poor: 40, fair: 60, good: 80 });
    }
    setActiveTab("items");
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
            checklist_items: cleanedItems as unknown as any,
            scoring_formula: scoringFormula as unknown as any,
            scoring_thresholds: scoringThresholds as unknown as any,
          })
          .eq("id", template.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("assessment_templates")
          .insert({
            name,
            description: description || null,
            checklist_items: cleanedItems as unknown as any,
            created_by: profile.id,
            scoring_formula: scoringFormula as unknown as any,
            scoring_thresholds: scoringThresholds as unknown as any,
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Assessment Template"}</DialogTitle>
          <DialogDescription>
            Build a reusable assessment template with conditional logic and auto-scoring.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 w-full max-w-[300px]">
            <TabsTrigger value="items">Questions</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-6 py-2">
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
                          {items.map((item, index) => (
                            <SortableItem
                              key={item.id}
                              item={item}
                              index={index}
                              allItems={items}
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
          </TabsContent>

          <TabsContent value="scoring" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-6 py-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Formulas</CardTitle>
                    <CardDescription>
                      Define how scores are calculated. Use q0, q1, q2... to reference questions by index.
                      Pass=3 points, Fail=0 points.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Total Score</Label>
                      <Input
                        placeholder="e.g., sum(q0, q1, q2, q3)"
                        value={scoringFormula.total || ""}
                        onChange={(e) => setScoringFormula({ ...scoringFormula, total: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Functions: sum(), avg(), min(), max(), count(), percent()
                      </p>
                    </div>
                    <div>
                      <Label>Mobility Score (optional)</Label>
                      <Input
                        placeholder="e.g., avg(q0, q1, q2)"
                        value={scoringFormula.mobility || ""}
                        onChange={(e) => setScoringFormula({ ...scoringFormula, mobility: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Strength Score (optional)</Label>
                      <Input
                        placeholder="e.g., sum(q3, q4)"
                        value={scoringFormula.strength || ""}
                        onChange={(e) => setScoringFormula({ ...scoringFormula, strength: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Thresholds</CardTitle>
                    <CardDescription>
                      Define score ranges for interpretations (for percentage or 0-100 scales).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs">Needs Work (below)</Label>
                        <Input
                          type="number"
                          value={scoringThresholds.poor}
                          onChange={(e) =>
                            setScoringThresholds({ ...scoringThresholds, poor: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Fair (below)</Label>
                        <Input
                          type="number"
                          value={scoringThresholds.fair}
                          onChange={(e) =>
                            setScoringThresholds({ ...scoringThresholds, fair: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Good (below)</Label>
                        <Input
                          type="number"
                          value={scoringThresholds.good}
                          onChange={(e) =>
                            setScoringThresholds({ ...scoringThresholds, good: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Scores at or above "Good" threshold = Excellent
                    </p>
                  </CardContent>
                </Card>

                {items.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Question Reference</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {items.map((item, i) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">q{i}</code>
                            <span className="text-muted-foreground truncate">{item.name || "Untitled"}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

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
