import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckinTemplate, CheckinField } from "@/hooks/useCheckinTemplates";
import { useCheckinSubmissions } from "@/hooks/useCheckinSubmissions";
import { Loader2, ClipboardCheck } from "lucide-react";

interface CheckinFormProps {
  template: CheckinTemplate;
  coachId: string;
  onSubmitSuccess?: () => void;
}

export const CheckinForm = ({
  template,
  coachId,
  onSubmitSuccess,
}: CheckinFormProps) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { submitCheckin } = useCheckinSubmissions(template.id);

  const fields: CheckinField[] = Array.isArray(template.fields)
    ? (template.fields as CheckinField[])
    : (() => {
        try {
          return typeof template.fields === "string" ? JSON.parse(template.fields) : [];
        } catch {
          return [];
        }
      })();

  const handleInputChange = (fieldId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required) {
        const val = responses[f.id];
        if (val === undefined || val === null || val === "") {
          errors[f.id] = `${f.label} is required`;
        }
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await submitCheckin.mutateAsync({ responses, coachId });
    setResponses({});
    setValidationErrors({});
    onSubmitSuccess?.();
  };

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No check-in assigned yet. Your coach will set one up for you.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderField = (field: CheckinField) => {
    const value = responses[field.id] ?? "";
    const hasError = !!validationErrors[field.id];

    switch (field.type) {
      case "text":
        return (
          <Input
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={hasError ? "border-destructive" : ""}
          />
        );

      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            rows={3}
            className={hasError ? "border-destructive" : ""}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={hasError ? "border-destructive" : ""}
          />
        );

      case "scale":
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Low</span>
              <span className="font-semibold text-foreground">{value || "-"}</span>
              <span>High</span>
            </div>
            <Slider
              value={[value ? parseInt(value) : 0]}
              onValueChange={(val) => handleInputChange(field.id, val[0])}
              min={0}
              max={field.scale_max || 10}
              step={1}
              className="w-full"
            />
          </div>
        );

      case "yes_no":
        return (
          <RadioGroup
            value={value ? String(value) : ""}
            onValueChange={(v) => handleInputChange(field.id, v)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id={`${field.id}-yes`} />
              <Label htmlFor={`${field.id}-yes`} className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id={`${field.id}-no`} />
              <Label htmlFor={`${field.id}-no`} className="font-normal">No</Label>
            </div>
          </RadioGroup>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{template.name}</CardTitle>
        {template.description && (
          <CardDescription>{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label className={field.required ? "after:content-['*'] after:text-destructive after:ml-0.5" : ""}>
                {field.label}
              </Label>
              {renderField(field)}
              {validationErrors[field.id] && (
                <p className="text-xs text-destructive">{validationErrors[field.id]}</p>
              )}
            </div>
          ))}

          <Button
            type="submit"
            disabled={submitCheckin.isPending}
            className="w-full"
          >
            {submitCheckin.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Check-in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
