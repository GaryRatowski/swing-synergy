import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CheckinField, useCheckinTemplates } from "@/hooks/useCheckinTemplates";
import { Trash2, Plus, Loader2 } from "lucide-react";

interface CheckinTemplateBuilderProps {
  programId: string;
  coachId: string;
  existingTemplate?: {
    id: string;
    name: string;
    description: string;
    fields: CheckinField[];
  };
  onClose: () => void;
  onSaved: () => void;
}

export const CheckinTemplateBuilder = ({
  programId,
  coachId,
  existingTemplate,
  onClose,
  onSaved,
}: CheckinTemplateBuilderProps) => {
  const { createTemplate, updateTemplate } = useCheckinTemplates(programId);
  const isEditing = !!existingTemplate;

  const [templateName, setTemplateName] = useState(existingTemplate?.name || "");
  const [templateDescription, setTemplateDescription] = useState(existingTemplate?.description || "");
  const [fields, setFields] = useState<CheckinField[]>(existingTemplate?.fields || []);
  const [isSaving, setIsSaving] = useState(false);

  // Field form state
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
      placeholder: fieldPlaceholder || undefined,
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
    if (!templateName || fields.length === 0) return;

    setIsSaving(true);
    try {
      if (isEditing && existingTemplate) {
        await updateTemplate.mutateAsync({
          id: existingTemplate.id,
          name: templateName,
          description: templateDescription || undefined,
          fields,
        });
      } else {
        await createTemplate.mutateAsync({
          name: templateName,
          description: templateDescription || null,
          created_by: coachId,
          fields,
        });
      }
      onSaved();
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
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

        {/* Fields */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Form Fields</h4>

          {fields.length > 0 && (
            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-sm">{field.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {field.type === "yes_no" ? "Yes/No" : field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                      {field.required ? " • Required" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => editField(field)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeField(field.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add field form */}
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label htmlFor="field-label" className="text-xs">Field Label</Label>
                <Input
                  id="field-label"
                  placeholder="e.g., How is your recovery?"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="field-type" className="text-xs">Type</Label>
                  <Select value={fieldType} onValueChange={(v: any) => setFieldType(v)}>
                    <SelectTrigger id="field-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Short Text</SelectItem>
                      <SelectItem value="textarea">Long Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="scale">1-10 Scale</SelectItem>
                      <SelectItem value="yes_no">Yes / No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fieldType === "scale" && (
                  <div>
                    <Label htmlFor="scale-max" className="text-xs">Scale Max</Label>
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
              {fieldType !== "scale" && fieldType !== "yes_no" && (
                <div>
                  <Label htmlFor="field-placeholder" className="text-xs">Placeholder (optional)</Label>
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
                <Label htmlFor="field-required" className="font-normal text-xs">Required field</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={addOrUpdateField} disabled={!fieldLabel}>
                  {editingFieldId ? "Update Field" : "Add Field"}
                </Button>
                {editingFieldId && (
                  <Button type="button" size="sm" variant="outline" onClick={resetFieldForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={saveTemplate} disabled={isSaving || !templateName || fields.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
