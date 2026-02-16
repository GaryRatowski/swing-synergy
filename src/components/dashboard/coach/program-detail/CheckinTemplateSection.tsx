import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCheckinTemplates, CheckinField } from "@/hooks/useCheckinTemplates";
import { CheckinTemplateBuilder } from "../CheckinTemplateBuilder";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClipboardCheck, Pencil, Trash2, Plus, Loader2 } from "lucide-react";

interface CheckinTemplateSectionProps {
  programId: string;
  coachId: string;
}

const CheckinTemplateSection = ({ programId, coachId }: CheckinTemplateSectionProps) => {
  const { activeTemplate, isLoading, updateTemplate, createTemplate } = useCheckinTemplates(programId);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const parsedFields: CheckinField[] = activeTemplate
    ? (() => {
        try {
          return typeof activeTemplate.fields === "string"
            ? JSON.parse(activeTemplate.fields)
            : activeTemplate.fields;
        } catch {
          return [];
        }
      })()
    : [];

  const handleRemove = async () => {
    if (!activeTemplate) return;
    await updateTemplate.mutateAsync({
      id: activeTemplate.id,
      is_active: false,
    });
    setShowRemoveConfirm(false);
  };

  const handleTemplateCreated = () => {
    setShowBuilder(false);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Weekly Check-in Template
          </h3>
          <p className="text-sm text-muted-foreground">
            Clients assigned to this program will see this check-in on their Today tab.
          </p>
        </div>
      </div>

      {activeTemplate ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{activeTemplate.name}</CardTitle>
                {activeTemplate.description && (
                  <CardDescription>{activeTemplate.description}</CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true);
                    setShowBuilder(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRemoveConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fields ({parsedFields.length})
              </p>
              <div className="grid gap-2">
                {parsedFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                  >
                    <span className="font-medium">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {field.type === "yes_no" ? "Yes/No" : field.type}
                      </Badge>
                      {field.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No check-in template for this program yet. Create one to collect weekly feedback from clients.
            </p>
            <Button onClick={() => { setIsEditing(false); setShowBuilder(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Check-in Template
            </Button>
          </CardContent>
        </Card>
      )}

      {showBuilder && (
        <CheckinTemplateBuilder
          programId={programId}
          coachId={coachId}
          existingTemplate={isEditing && activeTemplate ? {
            id: activeTemplate.id,
            name: activeTemplate.name,
            description: activeTemplate.description || "",
            fields: parsedFields,
          } : undefined}
          onClose={() => { setShowBuilder(false); setIsEditing(false); }}
          onSaved={handleTemplateCreated}
        />
      )}

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove Check-in Template?"
        description="Are you sure? Clients will no longer see this check-in. The template data will be preserved but deactivated."
        confirmLabel="Remove"
        variant="destructive"
        isLoading={updateTemplate.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
};

export default CheckinTemplateSection;
