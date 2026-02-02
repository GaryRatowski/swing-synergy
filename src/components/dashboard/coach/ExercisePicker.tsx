import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, X, Loader2 } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  body_part: string | null;
  exercise_type: string | null;
}

interface ExercisePickerProps {
  onAdd: (exercise: Exercise) => void;
  onClose: () => void;
  existingExerciseIds: string[];
}

const ExercisePicker = ({ onAdd, onClose, existingExerciseIds }: ExercisePickerProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bodyPartFilter, setBodyPartFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, body_part, exercise_type")
      .order("name");

    if (error) {
      console.error("Error fetching exercises:", error);
    } else {
      setExercises(data || []);
    }
    setIsLoading(false);
  };

  const filteredExercises = exercises.filter(ex => {
    // Exclude already added exercises
    if (existingExerciseIds.includes(ex.id)) return false;
    
    // Search filter
    if (searchQuery && !ex.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Body part filter
    if (bodyPartFilter !== "all" && ex.body_part !== bodyPartFilter) {
      return false;
    }
    
    // Type filter
    if (typeFilter !== "all" && ex.exercise_type !== typeFilter) {
      return false;
    }
    
    return true;
  });

  // Get unique body parts and types for filters
  const bodyParts = [...new Set(exercises.map(ex => ex.body_part).filter(Boolean))].sort();
  const exerciseTypes = [...new Set(exercises.map(ex => ex.exercise_type).filter(Boolean))].sort();

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "power": return "bg-accent/10 text-accent border-accent/20";
      case "strength": return "bg-primary/10 text-primary border-primary/20";
      case "mobility": return "bg-blue-100 text-blue-700 border-blue-200";
      case "plyometric": return "bg-orange-100 text-orange-700 border-orange-200";
      case "speed": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "stability": return "bg-purple-100 text-purple-700 border-purple-200";
      case "rotation": return "bg-pink-100 text-pink-700 border-pink-200";
      case "recovery": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="border rounded-lg bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Add Exercises</h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={bodyPartFilter} onValueChange={setBodyPartFilter}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Body Part" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parts</SelectItem>
            {bodyParts.map(part => (
              <SelectItem key={part} value={part!}>{part}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {exerciseTypes.map(type => (
              <SelectItem key={type} value={type!}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-[200px] overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {existingExerciseIds.length === exercises.length 
              ? "All exercises have been added" 
              : "No matching exercises found"}
          </div>
        ) : (
          filteredExercises.map(exercise => (
            <div
              key={exercise.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-background cursor-pointer group"
              onClick={() => onAdd(exercise)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">{exercise.name}</span>
                {exercise.body_part && (
                  <span className="text-xs text-muted-foreground">• {exercise.body_part}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {exercise.exercise_type && (
                  <Badge variant="outline" className={`text-xs ${getTypeColor(exercise.exercise_type)}`}>
                    {exercise.exercise_type}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExercisePicker;
