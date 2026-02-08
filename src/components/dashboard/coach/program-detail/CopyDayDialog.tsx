import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy } from "lucide-react";

interface CopyDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceWeek: number;
  sourceDay: number;
  totalWeeks: number;
  daysPerWeek: number;
  onCopy: (targetWeek: number, targetDay: number) => Promise<void>;
}

const CopyDayDialog = ({
  open,
  onOpenChange,
  sourceWeek,
  sourceDay,
  totalWeeks,
  daysPerWeek,
  onCopy,
}: CopyDayDialogProps) => {
  const [targetWeek, setTargetWeek] = useState(sourceWeek);
  const [targetDay, setTargetDay] = useState(sourceDay === daysPerWeek ? 1 : sourceDay + 1);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (targetWeek === sourceWeek && targetDay === sourceDay) {
      return;
    }
    
    setIsCopying(true);
    try {
      await onCopy(targetWeek, targetDay);
      onOpenChange(false);
    } finally {
      setIsCopying(false);
    }
  };

  const isSameDay = targetWeek === sourceWeek && targetDay === sourceDay;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Day
          </DialogTitle>
          <DialogDescription>
            Copy all exercises from Week {sourceWeek}, Day {sourceDay} to another day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Week</Label>
              <Select
                value={targetWeek.toString()}
                onValueChange={(val) => setTargetWeek(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Day</Label>
              <Select
                value={targetDay.toString()}
                onValueChange={(val) => setTargetDay(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isSameDay && (
            <p className="text-sm text-destructive">
              Please select a different day to copy to.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={isCopying || isSameDay}
          >
            {isCopying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Exercises
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CopyDayDialog;
