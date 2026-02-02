import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Plus, Minus, Droplets, Moon, Activity, Check } from "lucide-react";

interface HabitTrackerProps {
  clientId: string;
}

interface Habit {
  id: string;
  name: string;
  target_value: number | null;
  unit: string | null;
  is_active: boolean;
}

interface HabitLog {
  id: string;
  habit_id: string;
  value: number | null;
  completed: boolean;
  logged_date: string;
}

interface HabitWithProgress extends Habit {
  currentValue: number;
  logId: string | null;
  icon: React.ElementType;
}

const DEFAULT_HABITS = [
  { name: "Water", target_value: 8, unit: "glasses", icon: Droplets },
  { name: "Sleep", target_value: 8, unit: "hours", icon: Moon },
  { name: "Stretch", target_value: 10, unit: "min", icon: Activity },
];

const getHabitIcon = (name: string): React.ElementType => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes("water")) return Droplets;
  if (lowercaseName.includes("sleep")) return Moon;
  if (lowercaseName.includes("stretch") || lowercaseName.includes("mobility")) return Activity;
  return Activity;
};

const HabitTracker = ({ clientId }: HabitTrackerProps) => {
  const [habits, setHabits] = useState<HabitWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchHabits();
    }
  }, [clientId]);

  const fetchHabits = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Fetch user's habits
      const { data: habitsData, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (habitsError) throw habitsError;

      let userHabits = habitsData || [];

      // If no habits exist, create default ones
      if (userHabits.length === 0) {
        const defaultHabitsToCreate = DEFAULT_HABITS.map(h => ({
          client_id: clientId,
          name: h.name,
          target_value: h.target_value,
          unit: h.unit,
          is_active: true,
        }));

        const { data: createdHabits, error: createError } = await supabase
          .from("habits")
          .insert(defaultHabitsToCreate)
          .select();

        if (createError) throw createError;
        userHabits = createdHabits || [];
      }

      // Fetch today's logs for these habits
      const habitIds = userHabits.map(h => h.id);
      const { data: logsData, error: logsError } = await supabase
        .from("habit_logs")
        .select("*")
        .in("habit_id", habitIds)
        .eq("logged_date", today);

      if (logsError) throw logsError;

      // Merge habits with their logs
      const habitsWithProgress: HabitWithProgress[] = userHabits.map(habit => {
        const log = logsData?.find(l => l.habit_id === habit.id);
        return {
          ...habit,
          currentValue: log?.value || 0,
          logId: log?.id || null,
          icon: getHabitIcon(habit.name),
        };
      });

      setHabits(habitsWithProgress);
    } catch (error) {
      console.error("Error fetching habits:", error);
      toast({
        title: "Error",
        description: "Failed to load habits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateHabitValue = async (habitId: string, newValue: number) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const today = new Date().toISOString().split("T")[0];
    const completed = habit.target_value ? newValue >= habit.target_value : newValue > 0;

    try {
      if (habit.logId) {
        // Update existing log
        const { error } = await supabase
          .from("habit_logs")
          .update({ value: newValue, completed })
          .eq("id", habit.logId);

        if (error) throw error;
      } else {
        // Create new log
        const { data, error } = await supabase
          .from("habit_logs")
          .insert({
            habit_id: habitId,
            value: newValue,
            completed,
            logged_date: today,
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state with new log ID
        setHabits(prev => prev.map(h => 
          h.id === habitId ? { ...h, logId: data.id } : h
        ));
      }

      // Update local state
      setHabits(prev => prev.map(h => 
        h.id === habitId ? { ...h, currentValue: newValue } : h
      ));

      if (completed && habit.currentValue < (habit.target_value || 1)) {
        toast({
          title: "🎉 Habit Complete!",
          description: `You've reached your ${habit.name.toLowerCase()} goal!`,
        });
      }
    } catch (error) {
      console.error("Error updating habit:", error);
      toast({
        title: "Error",
        description: "Failed to update habit",
        variant: "destructive",
      });
    }
  };

  const incrementHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const newValue = habit.currentValue + 1;
    updateHabitValue(habitId, newValue);
  };

  const decrementHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || habit.currentValue <= 0) return;
    const newValue = habit.currentValue - 1;
    updateHabitValue(habitId, newValue);
  };

  const markComplete = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const targetValue = habit.target_value || 1;
    updateHabitValue(habitId, targetValue);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  if (habits.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Today's Habits</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        {habits.map((habit) => {
          const progress = habit.target_value 
            ? Math.min((habit.currentValue / habit.target_value) * 100, 100)
            : habit.currentValue > 0 ? 100 : 0;
          const isComplete = habit.target_value 
            ? habit.currentValue >= habit.target_value
            : habit.currentValue > 0;

          return (
            <div key={habit.id} className="text-center">
              {/* Circular Progress Indicator */}
              <div 
                className="relative w-16 h-16 mx-auto mb-2 cursor-pointer group"
                onClick={() => !isComplete && incrementHabit(habit.id)}
              >
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                    className={`transition-all duration-300 ${isComplete ? "text-success" : "text-primary"}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isComplete ? (
                    <Check className="h-6 w-6 text-success" />
                  ) : (
                    <habit.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  )}
                </div>
              </div>

              <p className="font-medium text-sm text-foreground">{habit.name}</p>
              <p className="text-xs text-muted-foreground mb-2">
                {habit.currentValue}/{habit.target_value || 1} {habit.unit}
              </p>

              {/* Quick Controls */}
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => decrementHabit(habit.id)}
                  disabled={habit.currentValue <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => incrementHabit(habit.id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default HabitTracker;
