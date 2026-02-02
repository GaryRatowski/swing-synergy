import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Play, Edit, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Exercise {
  id: string;
  name: string;
  body_part: string;
  description: string;
  difficulty: string;
  equipment_needed: string;
  exercise_type: string;
  video_url: string | null;
}

// Mock data based on uploaded CSV
const mockExercises: Exercise[] = [
  { id: "1", name: "Kettlebell Swing", body_part: "Glutes", description: "Hip power exercise. Hinge at hips, swing kettlebell between legs, then explosively drive hips forward.", difficulty: "intermediate", equipment_needed: "Kettlebell", exercise_type: "power", video_url: null },
  { id: "2", name: "Single Leg RDL", body_part: "Glutes", description: "Hip hinge pattern for glute strength and balance. Stand on one leg, hinge at hip.", difficulty: "intermediate", equipment_needed: "Dumbbell", exercise_type: "strength", video_url: null },
  { id: "3", name: "Lateral Bounds", body_part: "Legs", description: "Lateral power and deceleration. Jump laterally from one leg to the other.", difficulty: "advanced", equipment_needed: "None", exercise_type: "plyometric", video_url: null },
  { id: "4", name: "Split Squat", body_part: "Legs", description: "Lower body strength and stability. Staggered stance, lower back knee toward ground.", difficulty: "intermediate", equipment_needed: "Dumbbells (optional)", exercise_type: "strength", video_url: null },
  { id: "5", name: "Pallof Press", body_part: "Core", description: "Anti-rotation core exercise. Stand perpendicular to cable, press hands forward.", difficulty: "intermediate", equipment_needed: "Cable machine or resistance band", exercise_type: "strength", video_url: null },
  { id: "6", name: "Thoracic Spine Rotation", body_part: "Back", description: "Improve rotational mobility in the thoracic spine. Quadruped position.", difficulty: "beginner", equipment_needed: "None", exercise_type: "mobility", video_url: null },
  { id: "7", name: "Dead Bug", body_part: "Core", description: "Core stability exercise. Lie on back, arms extended up, knees at 90 degrees.", difficulty: "beginner", equipment_needed: "None", exercise_type: "strength", video_url: null },
  { id: "8", name: "Med Ball Rotational Throw", body_part: "Core", description: "Explosive rotation mimicking the golf swing. Stand sideways to wall.", difficulty: "advanced", equipment_needed: "Medicine ball", exercise_type: "power", video_url: null },
];

const ExerciseLibrary = () => {
  const [exercises, setExercises] = useState<Exercise[]>(mockExercises);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exercise.body_part.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || exercise.exercise_type === categoryFilter;
    const matchesDifficulty = difficultyFilter === "all" || exercise.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-success/10 text-success border-success/20";
      case "intermediate": return "bg-warning/10 text-warning border-warning/20";
      case "advanced": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case "power": return "bg-accent/10 text-accent border-accent/20";
      case "strength": return "bg-primary/10 text-primary border-primary/20";
      case "mobility": return "bg-blue-100 text-blue-700 border-blue-200";
      case "plyometric": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "";
    }
  };

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
    </div>
  );
};

export default ExerciseLibrary;
