import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Copy, AlertTriangle } from "lucide-react";

interface CopyWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceWeek: number;
  totalWeeks: number;
  onCopy: (sourceWeek: number, targetWeek: number) => Promise<void>;
  existingExerciseCounts: Record<number, number>;
}

const CopyWeekDialog = ({
  open,
  onOpenChange,
  sourceWeek,
  totalWeeks,
  onCopy,
  existingExerciseCounts,
}: CopyWeekDialogProps) => {
  const [targetWeek, setTargetWeek] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);

  const targetWeekNum = parseInt(targetWeek);
  const targetHasExercises = targetWeekNum && existingExerciseCounts[targetWeekNum] > 0;

  const handleCopy = async () => {
    if (!targetWeek) return;
    
    setIsCopying(true);
    try {
      await onCopy(sourceWeek, parseInt(targetWeek));
      onOpenChange(false);
      setTargetWeek("");
    } finally {
      setIsCopying(false);
    }
  };

  const availableWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)
    .filter(w => w !== sourceWeek);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Week {sourceWeek}
          </DialogTitle>
          <DialogDescription>
            Copy all exercises from Week {sourceWeek} to another week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Week</Label>
            <Select value={targetWeek} onValueChange={setTargetWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select target week" />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map(week => (
                  <SelectItem key={week} value={week.toString()}>
                    Week {week}
                    {existingExerciseCounts[week] > 0 && (
                      <span className="text-muted-foreground ml-2">
                        ({existingExerciseCounts[week]} exercises)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetHasExercises && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Week {targetWeek} already has {existingExerciseCounts[targetWeekNum]} exercises. 
                Copying will add to existing exercises, not replace them.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={!targetWeek || isCopying}
          >
            {isCopying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Copy Week
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CopyWeekDialog;
