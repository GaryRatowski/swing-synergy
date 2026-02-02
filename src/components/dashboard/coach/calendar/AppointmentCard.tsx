import { DragEvent } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppointmentCardProps {
  id: string;
  title: string;
  clientName?: string;
  appointmentType: string;
  startTime: Date;
  endTime: Date;
  onClick?: () => void;
  onDragStart?: (e: DragEvent, id: string) => void;
  compact?: boolean;
}

const APPOINTMENT_COLORS: Record<string, string> = {
  training: "bg-primary/20 border-primary text-primary",
  assessment: "bg-blue-500/20 border-blue-500 text-blue-600",
  lesson: "bg-green-500/20 border-green-500 text-green-600",
  meeting: "bg-purple-500/20 border-purple-500 text-purple-600",
  other: "bg-muted border-muted-foreground text-muted-foreground",
};

const AppointmentCard = ({
  id,
  title,
  clientName,
  appointmentType,
  startTime,
  endTime,
  onClick,
  onDragStart,
  compact = false,
}: AppointmentCardProps) => {
  const colorClass = APPOINTMENT_COLORS[appointmentType] || APPOINTMENT_COLORS.other;
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("appointmentId", id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(e, id);
  };

  if (compact) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={onClick}
        className={cn(
          "px-2 py-1 rounded border-l-2 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity text-xs truncate select-none",
          colorClass
        )}
      >
        {title}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg border-l-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none",
        colorClass
      )}
    >
      <div className="flex items-start gap-2">
        {clientName && (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarFallback className="text-xs bg-background">
              {getInitials(clientName)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          <p className="text-xs opacity-75">
            {formatTime(startTime)} - {formatTime(endTime)}
          </p>
          {clientName && (
            <p className="text-xs opacity-75 truncate">{clientName}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
