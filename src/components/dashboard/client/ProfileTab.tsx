import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  Target,
  Activity,
  Flag,
  AlertTriangle,
  Save,
  LogOut,
} from "lucide-react";

interface ProfileTabProps {
  onSignOut: () => void;
}

interface ProfileData {
  full_name: string;
  email: string;
  phone: string | null;
  goals: string | null;
  fitness_level: string | null;
  golf_experience: string | null;
  injury_history: string | null;
  handicap: number | null;
}

const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "elite", label: "Elite/Professional" },
];

const GOLF_EXPERIENCE = [
  { value: "beginner", label: "Beginner (0-2 years)" },
  { value: "intermediate", label: "Intermediate (3-5 years)" },
  { value: "experienced", label: "Experienced (5-10 years)" },
  { value: "advanced", label: "Advanced (10+ years)" },
];

const ProfileTab = ({ onSignOut }: ProfileTabProps) => {
  const { profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (authProfile) {
      setProfile({
        full_name: authProfile.full_name || "",
        email: authProfile.email || "",
        phone: authProfile.phone,
        goals: authProfile.goals,
        fitness_level: authProfile.fitness_level,
        golf_experience: authProfile.golf_experience,
        injury_history: authProfile.injury_history,
        handicap: authProfile.handicap,
      });
      setIsLoading(false);
    }
  }, [authProfile]);

  const handleChange = (field: keyof ProfileData, value: string | number | null) => {
    if (!profile) return;
    setProfile(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!profile || !authProfile?.user_id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          goals: profile.goals,
          fitness_level: profile.fitness_level,
          golf_experience: profile.golf_experience,
          injury_history: profile.injury_history,
          handicap: profile.handicap,
        })
        .eq("user_id", authProfile.user_id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Profile Not Found</h3>
          <p className="text-muted-foreground">Unable to load your profile.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {profile.full_name?.split(" ").map(n => n[0]).join("") || "?"}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{profile.full_name}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Full Name
            </label>
            <Input
              value={profile.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </label>
            <Input
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </label>
            <Input
              value={profile.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value || null)}
              placeholder="Your phone number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Fitness & Golf */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Fitness & Golf
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Fitness Level
            </label>
            <Select
              value={profile.fitness_level || ""}
              onValueChange={(value) => handleChange("fitness_level", value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your fitness level" />
              </SelectTrigger>
              <SelectContent>
                {FITNESS_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Golf Experience
            </label>
            <Select
              value={profile.golf_experience || ""}
              onValueChange={(value) => handleChange("golf_experience", value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your golf experience" />
              </SelectTrigger>
              <SelectContent>
                {GOLF_EXPERIENCE.map((exp) => (
                  <SelectItem key={exp.value} value={exp.value}>
                    {exp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Handicap
            </label>
            <Input
              type="number"
              step="0.1"
              value={profile.handicap ?? ""}
              onChange={(e) => handleChange("handicap", e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Your golf handicap"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use + prefix for plus handicaps (e.g., +2.5)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Goals & Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Goals & Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Your Goals
            </label>
            <Textarea
              value={profile.goals || ""}
              onChange={(e) => handleChange("goals", e.target.value || null)}
              placeholder="What are your fitness and golf goals?"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Injury History
            </label>
            <Textarea
              value={profile.injury_history || ""}
              onChange={(e) => handleChange("injury_history", e.target.value || null)}
              placeholder="Any injuries or physical limitations your coach should know about?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-20 lg:bottom-4 bg-background/95 backdrop-blur p-4 -mx-4 border-t border-border">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      {/* Sign Out */}
      <Card>
        <CardContent className="p-4">
          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileTab;
