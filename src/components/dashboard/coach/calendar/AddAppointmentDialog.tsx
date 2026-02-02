import { useState, useEffect } from "react";
import { format, addWeeks } from "date-fns";
import { CalendarIcon, Clock, Trash2, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  full_name: string;
}

interface Appointment {
  id: string;
  title: string;
  client_id: string | null;
  appointment_type: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  recurrence_type?: string | null;
  recurrence_end_date?: string | null;
  parent_appointment_id?: string | null;
}

interface AppointmentData {
  title: string;
  client_id: string | null;
  appointment_type: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  recurrence_type: string | null;
  recurrence_end_date: string | null;
}

interface AddAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onSave: (data: AppointmentData) => void;
  onDelete?: () => void;
  onDeleteSeries?: () => void;
  initialDate?: Date;
  initialHour?: number;
  editingAppointment?: Appointment | null;
}

const APPOINTMENT_TYPES = [
  { value: "training", label: "Training Session" },
  { value: "assessment", label: "Assessment" },
  { value: "lesson", label: "Golf Lesson" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

const RECURRENCE_WEEKS = [
  { value: "4", label: "4 weeks" },
  { value: "8", label: "8 weeks" },
  { value: "12", label: "12 weeks" },
  { value: "16", label: "16 weeks" },
  { value: "24", label: "24 weeks" },
];

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minutes = (i % 2) * 30;
  return {
    value: `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
    label: format(new Date().setHours(hour, minutes), "h:mm a"),
  };
});

const AddAppointmentDialog = ({
  open,
  onOpenChange,
  clients,
  onSave,
  onDelete,
  onDeleteSeries,
  initialDate,
  initialHour,
  editingAppointment,
}: AddAppointmentDialogProps) => {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState("training");
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState("12");

  const isPartOfSeries = editingAppointment?.parent_appointment_id || editingAppointment?.recurrence_type;

  useEffect(() => {
    if (editingAppointment) {
      setTitle(editingAppointment.title);
      setClientId(editingAppointment.client_id || "");
      setAppointmentType(editingAppointment.appointment_type);
      const start = new Date(editingAppointment.start_time);
      const end = new Date(editingAppointment.end_time);
      setDate(start);
      setStartTime(format(start, "HH:mm"));
      setEndTime(format(end, "HH:mm"));
      setNotes(editingAppointment.notes || "");
      setIsRecurring(false); // Don't show recurrence when editing
    } else {
      setTitle("");
      setClientId("");
      setAppointmentType("training");
      setDate(initialDate || new Date());
      if (initialHour !== undefined) {
        setStartTime(`${initialHour.toString().padStart(2, "0")}:00`);
        setEndTime(`${(initialHour + 1).toString().padStart(2, "0")}:00`);
      } else {
        setStartTime("09:00");
        setEndTime("10:00");
      }
      setNotes("");
      setIsRecurring(false);
      setRecurrenceWeeks("12");
    }
  }, [editingAppointment, initialDate, initialHour, open]);

  const handleSave = () => {
    if (!date || !title.trim()) return;

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMin, 0, 0);

    const recurrenceEndDate = isRecurring && !editingAppointment
      ? format(addWeeks(date, parseInt(recurrenceWeeks)), "yyyy-MM-dd")
      : null;

    onSave({
      title: title.trim(),
      client_id: clientId || null,
      appointment_type: appointmentType,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      notes: notes.trim() || null,
      recurrence_type: isRecurring && !editingAppointment ? "weekly" : null,
      recurrence_end_date: recurrenceEndDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAppointment ? "Edit Appointment" : "Add Appointment"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Appointment title"
            />
          </div>

          {/* Client */}
          <div className="grid gap-2">
            <Label>Client (optional)</Label>
            <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
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
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurrence - only show when creating new */}
          {!editingAppointment && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="recurring" className="font-medium">
                    Repeat weekly
                  </Label>
                </div>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>
              
              {isRecurring && (
                <div className="grid gap-2 pt-2">
                  <Label className="text-sm text-muted-foreground">Duration</Label>
                  <Select value={recurrenceWeeks} onValueChange={setRecurrenceWeeks}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_WEEKS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Creates {recurrenceWeeks} appointments every {date ? format(date, "EEEE") : "week"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Series indicator when editing */}
          {editingAppointment && isPartOfSeries && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
              <Repeat className="h-4 w-4 text-primary" />
              <span>This appointment is part of a recurring series</span>
            </div>
          )}

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {editingAppointment && (
            <div className="flex gap-2 mr-auto">
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              {onDeleteSeries && isPartOfSeries && (
                <Button variant="outline" size="sm" onClick={onDeleteSeries} className="text-destructive hover:text-destructive">
                  Delete Series
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || !date}>
              {editingAppointment ? "Update" : isRecurring ? `Create ${recurrenceWeeks} Sessions` : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAppointmentDialog;
