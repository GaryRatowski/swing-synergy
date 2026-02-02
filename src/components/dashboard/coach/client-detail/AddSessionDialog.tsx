import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddSessionDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: () => void;
}

const SESSION_TYPES = [
  { value: "training", label: "Training Session" },
  { value: "assessment", label: "Assessment" },
  { value: "consultation", label: "Consultation" },
  { value: "recovery", label: "Recovery Session" },
  { value: "remote", label: "Remote Check-in" },
];

const AddSessionDialog = ({ clientId, open, onOpenChange, onSessionCreated }: AddSessionDialogProps) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [sessionType, setSessionType] = useState("training");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!date) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    const { error } = await supabase.from("workout_logs").insert({
      client_id: clientId,
      workout_date: format(date, "yyyy-MM-dd"),
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      notes: notes ? `[${SESSION_TYPES.find(t => t.value === sessionType)?.label}] ${notes}` : `[${SESSION_TYPES.find(t => t.value === sessionType)?.label}]`,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create session", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Session created successfully" });
      onSessionCreated();
      onOpenChange(false);
      // Reset form
      setDate(new Date());
      setSessionType("training");
      setDurationMinutes("");
      setNotes("");
    }
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Date Picker */}
          <div className="space-y-1.5">
            <Label>Session Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Session Type */}
          <div className="space-y-1.5">
            <Label>Session Type</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              placeholder="60"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Session Notes</Label>
            <Textarea
              placeholder="Add notes about this session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24"
            />
          </div>

          <Button onClick={handleCreate} disabled={isCreating} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            {isCreating ? "Creating..." : "Create Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSessionDialog;
