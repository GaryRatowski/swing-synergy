import { useMemo, useState, DragEvent } from "react";
import { format, isSameDay, setHours, setMinutes } from "date-fns";
import AppointmentCard from "./AppointmentCard";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  title: string;
  client_id: string | null;
  client_name?: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface DayViewProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  onAppointmentDrop: (appointmentId: string, newDate: Date, newHour: number) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const DayView = ({
  date,
  appointments,
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentDrop,
}: DayViewProps) => {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const dayAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.start_time);
      return isSameDay(aptDate, date);
    });
  }, [appointments, date]);

  const getAppointmentPosition = (apt: Appointment) => {
    const start = new Date(apt.start_time);
    const end = new Date(apt.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - 6) * 60; // 60px per hour, starting from 6 AM
    const height = (endHour - startHour) * 60;
    return { top, height: Math.max(height, 30) };
  };

  const handleDragOver = (e: DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSlot(hour);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: DragEvent, hour: number) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData("appointmentId");
    if (appointmentId) {
      onAppointmentDrop(appointmentId, date, hour);
    }
    setDragOverSlot(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center py-3 border-b border-border">
        <p className="text-lg font-semibold text-foreground">
          {format(date, "EEEE, MMMM d")}
        </p>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="relative min-h-[960px]">
          {/* Hour lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-border/50 flex"
              style={{ top: (hour - 6) * 60 }}
            >
              <div className="w-16 pr-2 text-xs text-muted-foreground text-right -mt-2 flex-shrink-0">
                {format(setHours(setMinutes(new Date(), 0), hour), "h a")}
              </div>
              <div
                className={cn(
                  "flex-1 h-[60px] cursor-pointer transition-colors",
                  dragOverSlot === hour 
                    ? "bg-primary/20 border-2 border-dashed border-primary" 
                    : "hover:bg-muted/30"
                )}
                onClick={() => onTimeSlotClick(date, hour)}
                onDragOver={(e) => handleDragOver(e, hour)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, hour)}
              />
            </div>
          ))}

          {/* Appointments */}
          <div className="absolute left-16 right-4 top-0 pointer-events-none">
            {dayAppointments.map((apt) => {
              const { top, height } = getAppointmentPosition(apt);
              return (
                <div
                  key={apt.id}
                  className="absolute left-0 right-0 px-1 pointer-events-auto"
                  style={{ top, height }}
                >
                  <AppointmentCard
                    id={apt.id}
                    title={apt.title}
                    clientName={apt.client_name}
                    appointmentType={apt.appointment_type}
                    startTime={new Date(apt.start_time)}
                    endTime={new Date(apt.end_time)}
                    onClick={() => onAppointmentClick(apt)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
