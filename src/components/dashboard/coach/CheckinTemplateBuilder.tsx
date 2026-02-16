import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckinField } from "@/hooks/useCheckinTemplates";
import { Trash2, Plus, Loader2 } from "lucide-react";

interface CheckinTemplateBuilderProps {
  programId: string;
  coachId: string;
  onTemplateCreated?: () => void;
}

export const CheckinTemplateBuilder = ({
  programId,
  coachId,
  onTemplateCreated,
}: CheckinTemplateBuilderProps) => {
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [fields, setFields] = useState<CheckinField[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Field dialog state
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<CheckinField["type"]>("text");
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldPlaceholder, setFieldPlaceholder] = useState("");
  const [fieldScaleMax, setFieldScaleMax] = useState("10");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const addOrUpdateField = () => {
    if (!fieldLabel) return;

    const newField: CheckinField = {
      id: editingFieldId || `field-${Date.now()}`,
      label: fieldLabel,
      type: fieldType,
      required: fieldRequired,
      placeholder: fieldPlaceholder,
      scale_max: fieldType === "scale" ? parseInt(fieldScaleMax) : undefined,
    };

    if (editingFieldId) {
      setFields(fields.map((f) => (f.id === editingFieldId ? newField : f)));
    } else {
      setFields([...fields, newField]);
    }

    resetFieldForm();
  };

  const resetFieldForm = () => {
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(true);
    setFieldPlaceholder("");
    setFieldScaleMax("10");
    setEditingFieldId(null);
  };

  const editField = (field: CheckinField) => {
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldPlaceholder(field.placeholder || "");
    setFieldScaleMax(String(field.scale_max || 10));
    setEditingFieldId(field.id);
  };

  const removeField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const saveTemplate = async () => {
    if (!templateName || fields.length === 0) {
      alert("Template name and at least one field are required");
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Call useCheckinTemplates.createTemplate mutation
      // For now, just close the dialog
      setIsOpen(false);
      setTemplateName("");
      setTemplateDescription("");
      setFields([]);
      onTemplateCreated?.();
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Check-in Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Weekly Check-in Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Weekly Recovery Check-in"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="template-desc">Description (optional)</Label>
              <Textarea
                id="template-desc"
                placeholder="Brief description for clients"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Fields Builder */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-3">Form Fields</h4>

              {/* Field List */}
              {fields.length > 0 && (
                <div className="space-y-2 mb-4">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between p-3 border rounded-md bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-sm">{field.label}</p>
                        <p className="text-xs text-gray-500">
                          {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                          {field.required ? " • Required" : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => editField(field)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Field Form */}
              <Card className="bg-gray-50 border-dashed">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="field-label">Field Label</Label>
                    <Input
                      id="field-label"
                      placeholder="e.g., How is your recovery?"
                      value={fieldLabel}
                      onChange={(e) => setFieldLabel(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="field-type">Field Type</Label>
                      <Select value={fieldType} onValueChange={(v: any) => setFieldType(v)}>
                        <SelectTrigger id="field-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short Text</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="scale">1-10 Scale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {fieldType === "scale" && (
                      <div>
                        <Label htmlFor="scale-max">Scale Max</Label>
                        <Input
                          id="scale-max"
                          type="number"
                          min="5"
                          max="100"
                          value={fieldScaleMax}
                          onChange={(e) => setFieldScaleMax(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {fieldType !== "scale" && (
                    <div>
                      <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
                      <Input
                        id="field-placeholder"
                        placeholder="Help text for the client"
                        value={fieldPlaceholder}
                        onChange={(e) => setFieldPlaceholder(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="field-required"
                      checked={fieldRequired}
                      onCheckedChange={(checked) => setFieldRequired(!!checked)}
                    />
                    <Label htmlFor="field-required" className="font-normal">
                      Required field
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={addOrUpdateField}
                      disabled={!fieldLabel}
                    >
                      {editingFieldId ? "Update Field" : "Add Field"}
                    </Button>
                    {editingFieldId && (
                      <Button type="button" variant="outline" onClick={resetFieldForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={isSaving || !templateName}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
