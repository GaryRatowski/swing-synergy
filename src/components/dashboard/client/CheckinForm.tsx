import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CheckinTemplate, CheckinField } from "@/hooks/useCheckinTemplates";
import { useCheckinSubmissions } from "@/hooks/useCheckinSubmissions";
import { Loader2 } from "lucide-react";

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
  const { submitCheckin } = useCheckinSubmissions(template.id);

  const fields: CheckinField[] = Array.isArray(template.fields)
    ? (template.fields as CheckinField[])
    : [];

  const handleInputChange = (fieldId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const missingRequired = fields.filter(
      (f) => f.required && !responses[f.id]
    );
    if (missingRequired.length > 0) {
      alert(
        `Please fill in required fields: ${missingRequired.map((f) => f.label).join(", ")}`
      );
      return;
    }

    await submitCheckin.mutateAsync({
      responses,
      coachId,
    });

    setResponses({});
    onSubmitSuccess?.();
  };

  const renderField = (field: CheckinField) => {
    const value = responses[field.id] ?? "";

    switch (field.type) {
      case "text":
        return (
          <Input
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );

      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            rows={4}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );

      case "scale":
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Low</span>
              <span className="font-semibold">{value || "-"}</span>
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

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        {template.description && (
          <CardDescription>{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label className={field.required ? "after:content-['*'] after:text-red-500" : ""}>
                {field.label}
              </Label>
              {renderField(field)}
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
