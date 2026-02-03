import { useState, useEffect } from "react";
import { format, addDays, subDays, addWeeks, subWeeks, isBefore, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DayView from "./calendar/DayView";
import WeekView from "./calendar/WeekView";
import AddAppointmentDialog from "./calendar/AddAppointmentDialog";
import SessionLoggingSheet from "./calendar/SessionLoggingSheet";

interface Appointment {
  id: string;
  title: string;
  client_id: string | null;
  client_name?: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  recurrence_type?: string | null;
  recurrence_end_date?: string | null;
  parent_appointment_id?: string | null;
}

interface Client {
  id: string;
  full_name: string;
}

const CoachCalendar = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"day" | "week">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number | undefined>();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch appointments
  useEffect(() => {
    if (!profile?.id) return;

    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from("coach_appointments")
        .select("*")
        .eq("coach_id", profile.id);

      if (error) {
        console.error("Error fetching appointments:", error);
        return;
      }

      // Fetch client names for appointments
      const clientIds = [...new Set(data?.filter(a => a.client_id).map(a => a.client_id))];
      let clientMap: Record<string, string> = {};
      
      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", clientIds);
        
        clientMap = (clientData || []).reduce((acc, c) => {
          acc[c.id] = c.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      setAppointments(
        (data || []).map((apt) => ({
          ...apt,
          client_name: apt.client_id ? clientMap[apt.client_id] : undefined,
        }))
      );
      setLoading(false);
    };

    fetchAppointments();
  }, [profile?.id]);

  // Fetch clients
  useEffect(() => {
    if (!profile?.id) return;

    const fetchClients = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "client");

      if (error) {
        console.error("Error fetching clients:", error);
        return;
      }

      setClients(data || []);
    };

    fetchClients();
  }, [profile?.id]);

  const handleNavigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(new Date());
    } else if (view === "day") {
      setCurrentDate(direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1));
    } else {
      setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setEditingAppointment(null);
    setDialogOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    // Open session logging sheet for appointments with clients
    if (appointment.client_id) {
      setSelectedAppointment(appointment);
      setSessionSheetOpen(true);
    } else {
      // For non-client appointments, open the edit dialog
      setEditingAppointment(appointment);
      setSelectedDate(undefined);
      setSelectedHour(undefined);
      setDialogOpen(true);
    }
  };

  const handleEditAppointment = () => {
    if (selectedAppointment) {
      setEditingAppointment(selectedAppointment);
      setSelectedDate(undefined);
      setSelectedHour(undefined);
      setSessionSheetOpen(false);
      setDialogOpen(true);
    }
  };

  const handleSave = async (data: {
    title: string;
    client_id: string | null;
    appointment_type: string;
    start_time: string;
    end_time: string;
    notes: string | null;
    recurrence_type: string | null;
    recurrence_end_date: string | null;
  }) => {
    if (!profile?.id) return;

    if (editingAppointment) {
      // Update existing - only update this single appointment
      const { error } = await supabase
        .from("coach_appointments")
        .update({
          title: data.title,
          client_id: data.client_id,
          appointment_type: data.appointment_type,
          start_time: data.start_time,
          end_time: data.end_time,
          notes: data.notes,
        })
        .eq("id", editingAppointment.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update appointment",
          variant: "destructive",
        });
        return;
      }

      const clientName = data.client_id
        ? clients.find((c) => c.id === data.client_id)?.full_name
        : undefined;

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === editingAppointment.id
            ? { ...apt, ...data, client_name: clientName }
            : apt
        )
      );

      toast({ title: "Appointment updated" });
    } else {
      // Create new appointment(s)
      const clientName = data.client_id
        ? clients.find((c) => c.id === data.client_id)?.full_name
        : undefined;

      if (data.recurrence_type === "weekly" && data.recurrence_end_date) {
        // Create recurring appointments
        const appointmentsToCreate: any[] = [];
        const startDate = new Date(data.start_time);
        const endDate = parseISO(data.recurrence_end_date);
        
        let currentStart = new Date(data.start_time);
        let currentEnd = new Date(data.end_time);
        let weekIndex = 0;

        while (isBefore(currentStart, endDate)) {
          appointmentsToCreate.push({
            coach_id: profile.id,
            title: data.title,
            client_id: data.client_id,
            appointment_type: data.appointment_type,
            start_time: currentStart.toISOString(),
            end_time: currentEnd.toISOString(),
            notes: data.notes,
            recurrence_type: weekIndex === 0 ? "weekly" : null,
            recurrence_end_date: weekIndex === 0 ? data.recurrence_end_date : null,
          });

          currentStart = addWeeks(new Date(data.start_time), ++weekIndex);
          currentEnd = addWeeks(new Date(data.end_time), weekIndex);
        }

        const { data: newApts, error } = await supabase
          .from("coach_appointments")
          .insert(appointmentsToCreate)
          .select();

        if (error) {
          toast({
            title: "Error",
            description: "Failed to create recurring appointments",
            variant: "destructive",
          });
          return;
        }

        // Link child appointments to parent
        const parentId = newApts[0].id;
        if (newApts.length > 1) {
          const childIds = newApts.slice(1).map(a => a.id);
          await supabase
            .from("coach_appointments")
            .update({ parent_appointment_id: parentId })
            .in("id", childIds);
        }

        setAppointments((prev) => [
          ...prev,
          ...newApts.map((apt, idx) => ({
            ...apt,
            client_name: clientName,
            parent_appointment_id: idx > 0 ? parentId : null,
          })),
        ]);

        toast({ title: `Created ${newApts.length} recurring appointments` });
      } else {
        // Create single appointment
        const { data: newApt, error } = await supabase
          .from("coach_appointments")
          .insert({
            coach_id: profile.id,
            title: data.title,
            client_id: data.client_id,
            appointment_type: data.appointment_type,
            start_time: data.start_time,
            end_time: data.end_time,
            notes: data.notes,
          })
          .select()
          .single();

        if (error) {
          toast({
            title: "Error",
            description: "Failed to create appointment",
            variant: "destructive",
          });
          return;
        }

        setAppointments((prev) => [
          ...prev,
          { ...newApt, client_name: clientName },
        ]);

        toast({ title: "Appointment created" });
      }
    }

    setDialogOpen(false);
    setEditingAppointment(null);
  };

  const handleDelete = async () => {
    if (!editingAppointment) return;

    const { error } = await supabase
      .from("coach_appointments")
      .delete()
      .eq("id", editingAppointment.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive",
      });
      return;
    }

    setAppointments((prev) => prev.filter((apt) => apt.id !== editingAppointment.id));
    setDialogOpen(false);
    setEditingAppointment(null);
    toast({ title: "Appointment deleted" });
  };

  const handleDeleteSeries = async () => {
    if (!editingAppointment) return;

    // Find the parent ID (either this appointment is parent or has a parent)
    const parentId = editingAppointment.recurrence_type 
      ? editingAppointment.id 
      : editingAppointment.parent_appointment_id;

    if (!parentId) {
      // Fallback to single delete
      handleDelete();
      return;
    }

    // Delete parent and all children
    const { error: deleteChildrenError } = await supabase
      .from("coach_appointments")
      .delete()
      .eq("parent_appointment_id", parentId);

    const { error: deleteParentError } = await supabase
      .from("coach_appointments")
      .delete()
      .eq("id", parentId);

    if (deleteChildrenError || deleteParentError) {
      toast({
        title: "Error",
        description: "Failed to delete appointment series",
        variant: "destructive",
      });
      return;
    }

    setAppointments((prev) => 
      prev.filter((apt) => 
        apt.id !== parentId && apt.parent_appointment_id !== parentId
      )
    );
    setDialogOpen(false);
    setEditingAppointment(null);
    toast({ title: "Appointment series deleted" });
  };

  const handleAppointmentDrop = async (appointmentId: string, newDate: Date, newHour: number) => {
    const appointment = appointments.find((apt) => apt.id === appointmentId);
    if (!appointment) return;

    // Calculate the duration of the original appointment
    const originalStart = new Date(appointment.start_time);
    const originalEnd = new Date(appointment.end_time);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    // Create new start and end times
    const newStart = new Date(newDate);
    newStart.setHours(newHour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const { error } = await supabase
      .from("coach_appointments")
      .update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      })
      .eq("id", appointmentId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reschedule appointment",
        variant: "destructive",
      });
      return;
    }

    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, start_time: newStart.toISOString(), end_time: newEnd.toISOString() }
          : apt
      )
    );

    toast({ title: "Appointment rescheduled" });
  };

  return (
    <Card className="flex flex-col h-[700px]">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleNavigate("today")}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleNavigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleNavigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold ml-2">
            {format(currentDate, view === "day" ? "MMMM d, yyyy" : "MMMM yyyy")}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as "day" | "week")}
          >
            <ToggleGroupItem value="day" size="sm">
              Day
            </ToggleGroupItem>
            <ToggleGroupItem value="week" size="sm">
              Week
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            size="sm"
            onClick={() => {
              setSelectedDate(currentDate);
              setSelectedHour(9);
              setEditingAppointment(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading...
          </div>
        ) : view === "day" ? (
          <DayView
            date={currentDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
            onAppointmentDrop={handleAppointmentDrop}
          />
        ) : (
          <WeekView
            date={currentDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
            onAppointmentDrop={handleAppointmentDrop}
          />
        )}
      </div>

      {/* Add/Edit Dialog */}
      <AddAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients}
        onSave={handleSave}
        onDelete={editingAppointment ? handleDelete : undefined}
        onDeleteSeries={editingAppointment ? handleDeleteSeries : undefined}
        initialDate={selectedDate}
        initialHour={selectedHour}
        editingAppointment={editingAppointment}
      />

      {/* Session Logging Sheet */}
      <SessionLoggingSheet
        open={sessionSheetOpen}
        onOpenChange={setSessionSheetOpen}
        appointment={selectedAppointment}
      />
    </Card>
  );
};

export default CoachCalendar;
