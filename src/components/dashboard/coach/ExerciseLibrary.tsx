import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Play, Edit, Trash2, Loader2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import AddExerciseDialog from "./AddExerciseDialog";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

interface ExerciseLibraryProps {
  showAddDialog?: boolean;
  onAddDialogChange?: (open: boolean) => void;
}

const ExerciseLibrary = ({ showAddDialog: externalShowAddDialog, onAddDialogChange }: ExerciseLibraryProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [internalShowAddDialog, setInternalShowAddDialog] = useState(false);
  
  const showAddDialog = externalShowAddDialog ?? internalShowAddDialog;
  const setShowAddDialog = onAddDialogChange ?? setInternalShowAddDialog;

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching exercises:", error);
    } else {
      setExercises(data || []);
    }
    setIsLoading(false);
  };

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (exercise.body_part?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === "all" || exercise.exercise_type === categoryFilter;
    const matchesDifficulty = difficultyFilter === "all" || exercise.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "beginner": return "bg-success/10 text-success border-success/20";
      case "intermediate": return "bg-warning/10 text-warning border-warning/20";
      case "advanced": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryColor = (type: string | null) => {
    switch (type) {
      case "power": return "bg-accent/10 text-accent border-accent/20";
      case "strength": return "bg-primary/10 text-primary border-primary/20";
      case "mobility": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "plyometric": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "speed": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "stability": return "bg-teal-500/10 text-teal-600 border-teal-500/20";
      case "rotation": return "bg-pink-500/10 text-pink-600 border-pink-500/20";
      case "recovery": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading exercises...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search exercises..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="power">Power</SelectItem>
            <SelectItem value="strength">Strength</SelectItem>
            <SelectItem value="mobility">Mobility</SelectItem>
            <SelectItem value="plyometric">Plyometric</SelectItem>
            <SelectItem value="speed">Speed</SelectItem>
            <SelectItem value="stability">Stability</SelectItem>
            <SelectItem value="rotation">Rotation</SelectItem>
            <SelectItem value="recovery">Recovery</SelectItem>
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="group hover:shadow-md transition-shadow">
            <div className="aspect-video bg-muted relative rounded-t-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                <div className="text-center">
                  <Play className="h-12 w-12 text-primary/30 mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">Video Demo</p>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2 line-clamp-1">{exercise.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{exercise.description}</p>
              
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge variant="outline" className={getCategoryColor(exercise.exercise_type)}>
                  {exercise.exercise_type}
                </Badge>
                <Badge variant="outline" className={getDifficultyColor(exercise.difficulty)}>
                  {exercise.difficulty}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{exercise.body_part}</span>
                <span>{exercise.equipment_needed}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No exercises found matching your filters.</p>
        </div>
      )}

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
        <p>Showing {filteredExercises.length} of {exercises.length} exercises</p>
        <Button variant="link" className="text-primary">
          Import from CSV
        </Button>
      </div>

      <AddExerciseDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onExerciseAdded={fetchExercises}
      />
    </div>
  );
};

export { ExerciseLibrary };
export default ExerciseLibrary;
