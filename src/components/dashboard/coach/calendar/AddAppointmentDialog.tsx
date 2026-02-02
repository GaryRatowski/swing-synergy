import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Trash2 } from "lucide-react";
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
}

interface AddAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onSave: (data: {
    title: string;
    client_id: string | null;
    appointment_type: string;
    start_time: string;
    end_time: string;
    notes: string | null;
  }) => void;
  onDelete?: () => void;
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

    onSave({
      title: title.trim(),
      client_id: clientId || null,
      appointment_type: appointmentType,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No client</SelectItem>
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

        <DialogFooter className="flex justify-between">
          {editingAppointment && onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || !date}>
              {editingAppointment ? "Update" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAppointmentDialog;
