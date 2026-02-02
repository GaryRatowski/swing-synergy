import { useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  setHours,
  setMinutes,
  isToday,
} from "date-fns";
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

interface WeekViewProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const WeekView = ({
  date,
  appointments,
  onAppointmentClick,
  onTimeSlotClick,
}: WeekViewProps) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const appointmentsByDay = useMemo(() => {
    const byDay: Record<string, Appointment[]> = {};
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      byDay[key] = appointments.filter((apt) =>
        isSameDay(new Date(apt.start_time), day)
      );
    });
    return byDay;
  }, [appointments, weekDays]);

  const getAppointmentPosition = (apt: Appointment) => {
    const start = new Date(apt.start_time);
    const end = new Date(apt.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - 6) * 48; // 48px per hour
    const height = (endHour - startHour) * 48;
    return { top, height: Math.max(height, 24) };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with day names */}
      <div className="flex border-b border-border">
        <div className="w-14 flex-shrink-0" /> {/* Spacer for time column */}
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex-1 text-center py-2 border-l border-border",
              isToday(day) && "bg-primary/10"
            )}
          >
            <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
            <p
              className={cn(
                "text-lg font-semibold",
                isToday(day) ? "text-primary" : "text-foreground"
              )}
            >
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="relative min-h-[768px]">
          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full flex border-t border-border/50"
              style={{ top: (hour - 6) * 48 }}
            >
              <div className="w-14 pr-2 text-xs text-muted-foreground text-right -mt-2 flex-shrink-0">
                {format(setHours(setMinutes(new Date(), 0), hour), "h a")}
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex-1 h-[48px] border-l border-border/50 cursor-pointer hover:bg-muted/30 transition-colors",
                    isToday(day) && "bg-primary/5"
                  )}
                  onClick={() => onTimeSlotClick(day, hour)}
                />
              ))}
            </div>
          ))}

          {/* Appointments overlay */}
          <div className="absolute top-0 left-14 right-0 flex">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayApts = appointmentsByDay[key] || [];
              return (
                <div key={key} className="flex-1 relative border-l border-transparent">
                  {dayApts.map((apt) => {
                    const { top, height } = getAppointmentPosition(apt);
                    return (
                      <div
                        key={apt.id}
                        className="absolute left-0.5 right-0.5"
                        style={{ top, height }}
                      >
                        <AppointmentCard
                          title={apt.title}
                          clientName={apt.client_name}
                          appointmentType={apt.appointment_type}
                          startTime={new Date(apt.start_time)}
                          endTime={new Date(apt.end_time)}
                          onClick={() => onAppointmentClick(apt)}
                          compact
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekView;
