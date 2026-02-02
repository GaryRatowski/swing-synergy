import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (programId: string) => void;
}

const CreateProgramDialog = ({ 
  open, 
  onOpenChange, 
  onCreated 
}: CreateProgramDialogProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    training_phase: "",
    duration_weeks: 4,
    session_type: "",
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Program name is required");
      return;
    }

    setIsCreating(true);

    // Get current user's profile to set as coach_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to create a program");
      setIsCreating(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      toast.error("Profile not found");
      setIsCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from("programs")
      .insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        training_phase: formData.training_phase || null,
        duration_weeks: formData.duration_weeks,
        session_type: formData.session_type || null,
        is_template: true,
        coach_id: profile.id,
      })
      .select()
      .single();

    setIsCreating(false);

    if (error) {
      console.error("Error creating program:", error);
      toast.error("Failed to create program");
      return;
    }

    toast.success("Program created successfully");
    
    // Reset form
    setFormData({
      name: "",
      description: "",
      training_phase: "",
      duration_weeks: 4,
      session_type: "",
    });
    
    onOpenChange(false);
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Program</DialogTitle>
          <DialogDescription>
            Set up your program details. You can add exercises after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Program Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Power Phase Week 1-4"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the program..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phase">Training Phase</Label>
              <Select
                value={formData.training_phase}
                onValueChange={(value) => setFormData(prev => ({ ...prev, training_phase: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="power">Power</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="mobility">Mobility</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_type">Session Type</Label>
              <Select
                value={formData.session_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, session_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="at-home">At Home</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (weeks)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={52}
              value={formData.duration_weeks}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Program
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProgramDialog;
