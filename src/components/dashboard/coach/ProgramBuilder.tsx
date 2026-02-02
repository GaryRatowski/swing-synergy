import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Copy, Edit, Trash2, Calendar, Dumbbell, Clock, MoreVertical } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface Program {
  id: string;
  name: string;
  description: string;
  training_phase: string;
  duration_weeks: number;
  session_type: string;
  is_template: boolean;
  exercise_count: number;
  assigned_clients: number;
}

const mockPrograms: Program[] = [
  { 
    id: "1", 
    name: "Pre-Season Power Phase", 
    description: "Build explosive power for increased clubhead speed", 
    training_phase: "power", 
    duration_weeks: 4, 
    session_type: "gym", 
    is_template: true,
    exercise_count: 24,
    assigned_clients: 8
  },
  { 
    id: "2", 
    name: "In-Season Maintenance", 
    description: "Maintain strength and mobility during competitive season", 
    training_phase: "maintenance", 
    duration_weeks: 8, 
    session_type: "gym", 
    is_template: true,
    exercise_count: 18,
    assigned_clients: 15
  },
  { 
    id: "3", 
    name: "Mobility Focus - TPI Screen", 
    description: "Address mobility limitations identified in TPI assessment", 
    training_phase: "mobility", 
    duration_weeks: 6, 
    session_type: "at-home", 
    is_template: true,
    exercise_count: 32,
    assigned_clients: 12
  },
  { 
    id: "4", 
    name: "Off-Season Strength Block", 
    description: "Build foundational strength for power development", 
    training_phase: "strength", 
    duration_weeks: 6, 
    session_type: "gym", 
    is_template: true,
    exercise_count: 28,
    assigned_clients: 5
  },
];

const ProgramBuilder = () => {
  const [programs, setPrograms] = useState<Program[]>(mockPrograms);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "power": return "bg-accent/10 text-accent border-accent/20";
      case "strength": return "bg-primary/10 text-primary border-primary/20";
      case "mobility": return "bg-blue-100 text-blue-700 border-blue-200";
      case "maintenance": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Program Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Program Templates</h3>
          <Button variant="outline" size="sm">View All Templates</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {programs.map((program) => (
            <Card key={program.id} className="group hover:shadow-md transition-all hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className={getPhaseColor(program.training_phase)}>
                    {program.training_phase}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit Program</DropdownMenuItem>
                      <DropdownMenuItem><Copy className="h-4 w-4 mr-2" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-base mt-2">{program.name}</CardTitle>
                <CardDescription className="text-sm line-clamp-2">{program.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{program.duration_weeks}w</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    <span>{program.exercise_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{program.session_type}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {program.assigned_clients} athletes assigned
                  </span>
                  <Button size="sm" variant="outline">
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Program Card */}
          <Card className="border-dashed hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group">
            <CardContent className="h-full flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">Create New Program</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Build a custom training program
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Clone Existing Program
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            View Schedule Calendar
          </Button>
          <Button variant="outline" size="sm">
            <Dumbbell className="h-4 w-4 mr-2" />
            Bulk Assign Programs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramBuilder;
