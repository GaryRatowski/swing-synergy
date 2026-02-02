import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import {
  Activity,
  Target,
  Flag,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Dumbbell,
} from "lucide-react";

interface ClientOnboardingProps {
  userId: string;
  onComplete: () => void;
}

interface OnboardingData {
  fitness_level: string | null;
  golf_experience: string | null;
  handicap: number | null;
  goals: string | null;
  injury_history: string | null;
}

const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner", description: "New to fitness or returning after a long break" },
  { value: "intermediate", label: "Intermediate", description: "Regular exercise 2-3x per week" },
  { value: "advanced", label: "Advanced", description: "Consistent training 4+ times per week" },
  { value: "elite", label: "Elite", description: "Competitive athlete or professional" },
];

const GOLF_EXPERIENCE = [
  { value: "beginner", label: "Beginner", description: "0-2 years playing" },
  { value: "intermediate", label: "Intermediate", description: "3-5 years playing" },
  { value: "experienced", label: "Experienced", description: "5-10 years playing" },
  { value: "advanced", label: "Advanced", description: "10+ years playing" },
];

const ClientOnboarding = ({ userId, onComplete }: ClientOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    fitness_level: null,
    golf_experience: null,
    handicap: null,
    goals: null,
    injury_history: null,
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          fitness_level: data.fitness_level,
          golf_experience: data.golf_experience,
          handicap: data.handicap,
          goals: data.goals,
          injury_history: data.injury_history,
          onboarding_completed: true,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your profile is all set up. Let's get started!",
      });

      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!data.fitness_level;
      case 2:
        return !!data.golf_experience;
      case 3:
        return true; // Optional step
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center mb-4">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome to Golf Performance</CardTitle>
          <CardDescription>
            Let's set up your profile so your coach can create the perfect program for you.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step 1: Fitness Level */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">What's your current fitness level?</h3>
              </div>
              <div className="grid gap-3">
                {FITNESS_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setData({ ...data, fitness_level: level.value })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      data.fitness_level === level.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{level.label}</p>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                      {data.fitness_level === level.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Golf Experience */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Flag className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">How long have you been playing golf?</h3>
              </div>
              <div className="grid gap-3">
                {GOLF_EXPERIENCE.map((exp) => (
                  <button
                    key={exp.value}
                    onClick={() => setData({ ...data, golf_experience: exp.value })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      data.golf_experience === exp.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{exp.label}</p>
                        <p className="text-sm text-muted-foreground">{exp.description}</p>
                      </div>
                      {data.golf_experience === exp.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Current Handicap (optional)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 12.5 or +2.0"
                  value={data.handicap ?? ""}
                  onChange={(e) => setData({ ...data, handicap: e.target.value ? parseFloat(e.target.value) : null })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use + for plus handicaps (e.g., +2.5)
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">What are your goals?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tell us what you want to achieve. This helps your coach tailor your program.
              </p>
              <Textarea
                placeholder="e.g., Increase clubhead speed, improve flexibility, lower my handicap, prevent injuries..."
                value={data.goals || ""}
                onChange={(e) => setData({ ...data, goals: e.target.value || null })}
                rows={5}
                className="resize-none"
              />
            </div>
          )}

          {/* Step 4: Injury History */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Any injuries or limitations?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                This is important for your safety. Let us know about any current or past injuries.
              </p>
              <Textarea
                placeholder="e.g., Lower back pain, shoulder surgery in 2022, knee issues..."
                value={data.injury_history || ""}
                onChange={(e) => setData({ ...data, injury_history: e.target.value || null })}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you have no injuries or limitations to report.
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            
            {step < totalSteps ? (
              <Button 
                onClick={handleNext} 
                disabled={!canProceed()}
                className="flex-1"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleComplete} 
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? "Saving..." : "Get Started"}
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Skip option for optional steps */}
          {(step === 3 || step === 4) && (
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={step === 4 ? handleComplete : handleNext}
              disabled={isSaving}
            >
              Skip for now
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientOnboarding;
