import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Calendar } from "lucide-react";

interface WeekDaySelectorProps {
  selectedWeek: number;
  selectedDay: number;
  totalWeeks: number;
  daysPerWeek: number;
  onWeekChange: (week: number) => void;
  onDayChange: (day: number) => void;
  onAddWeek: () => void;
  onRemoveWeek: () => void;
  onDaysPerWeekChange: (days: number) => void;
}

const WeekDaySelector = ({
  selectedWeek,
  selectedDay,
  totalWeeks,
  daysPerWeek,
  onWeekChange,
  onDayChange,
  onAddWeek,
  onRemoveWeek,
  onDaysPerWeekChange,
}: WeekDaySelectorProps) => {
  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        Program Structure
      </div>
      
      <div className="flex flex-wrap items-center gap-4">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Week:</Label>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
              <Button
                key={week}
                variant={selectedWeek === week ? "default" : "outline"}
                size="sm"
                className="h-7 w-8 text-xs"
                onClick={() => onWeekChange(week)}
              >
                {week}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onAddWeek}
              title="Add week"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {totalWeeks > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={onRemoveWeek}
                title="Remove last week"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Day Navigation */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Day:</Label>
          <div className="flex items-center gap-1">
            {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((day) => (
              <Button
                key={day}
                variant={selectedDay === day ? "default" : "outline"}
                size="sm"
                className="h-7 w-8 text-xs"
                onClick={() => onDayChange(day)}
              >
                {day}
              </Button>
            ))}
          </div>
        </div>

        {/* Days per week selector */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Days/Week:</Label>
          <Select
            value={daysPerWeek.toString()}
            onValueChange={(val) => onDaysPerWeekChange(parseInt(val))}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <SelectItem key={d} value={d.toString()}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Viewing: <span className="font-medium text-foreground">Week {selectedWeek}, Day {selectedDay}</span>
        {" • "}
        {totalWeeks} week{totalWeeks > 1 ? "s" : ""} × {daysPerWeek} day{daysPerWeek > 1 ? "s" : ""} = {totalWeeks * daysPerWeek} total sessions
      </div>
    </div>
  );
};

export default WeekDaySelector;
