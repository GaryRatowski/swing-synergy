import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(2, "Please enter your full name"),
  phone: z.string().optional(),
  goals: z.string().optional(),
  terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

type FormData = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  goals: string;
  terms: boolean;
};

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    goals: "",
    terms: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Fetch coach by invite code using secure RPC function
  const {
    data: coach,
    isLoading: coachLoading,
    error: coachError,
  } = useQuery({
    queryKey: ["publicCoach", inviteCode],
    queryFn: async () => {
      if (!inviteCode) throw new Error("Invalid invite link");

      // Use the secure RPC function that only exposes minimal coach data
      const { data, error } = await supabase
        .rpc("get_coach_by_invite_code", { code: inviteCode });

      if (error) {
        console.error("Error fetching coach:", error);
        throw new Error("Invalid or expired invite link");
      }

      if (!data || data.length === 0) {
        throw new Error("Invalid or expired invite link");
      }

      const coachData = data[0];
      
      if (!coachData.invite_link_enabled) {
        throw new Error("This invite link is no longer accepting signups");
      }

      return {
        id: coachData.id,
        full_name: coachData.full_name,
        avatar_url: null, // Avatar not exposed for security
        invite_link_enabled: coachData.invite_link_enabled,
      };
    },
    retry: false,
  });

  const signupMutation = useMutation({
    mutationFn: async () => {
      if (!coach) throw new Error("Coach not found");

      // Validate form
      const result = signupSchema.safeParse(formData);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        throw new Error("Please fix the form errors");
      }
      setValidationErrors({});

      // Check if pending profile exists with this email
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, status, coach_id")
        .eq("email", formData.email.toLowerCase())
        .eq("status", "pending")
        .single();

      // Create auth user
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          throw new Error("This email is already registered. Please log in instead.");
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // If pending profile exists, update it; otherwise the trigger will create one
      // The handle_new_user trigger will handle linking pending profiles
      // We just need to update the profile with additional info after signup
      
      // Wait a moment for the trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update the profile with additional info from the form
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          goals: formData.goals || null,
          coach_id: coach.id,
          onboarding_completed: false,
        })
        .eq("user_id", authData.user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        // Don't throw - the profile was created, just couldn't update
      }

      return authData;
    },
    onSuccess: () => {
      setSignupSuccess(true);
      toast.success("Account created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signupMutation.mutate();
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Loading state
  if (coachLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="w-20 h-20 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (coachError || !coach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              {(coachError as Error)?.message || "This invite link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle>Welcome Aboard!</CardTitle>
            <CardDescription>
              Your account has been created. Please check your email to verify your account, then log in to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button asChild className="w-full">
              <Link to="/auth">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4 ring-4 ring-primary/10">
            <AvatarImage src={coach.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {coach.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-xl">Join {coach.full_name}'s Coaching</CardTitle>
          <CardDescription>
            Create your account to start your fitness journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                placeholder="John Smith"
                className={validationErrors.full_name ? "border-destructive" : ""}
              />
              {validationErrors.full_name && (
                <p className="text-xs text-destructive mt-1">{validationErrors.full_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john@example.com"
                className={validationErrors.email ? "border-destructive" : ""}
              />
              {validationErrors.email && (
                <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="At least 6 characters"
                className={validationErrors.password ? "border-destructive" : ""}
              />
              {validationErrors.password && (
                <p className="text-xs text-destructive mt-1">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="goals">Your Goals (optional)</Label>
              <Textarea
                id="goals"
                placeholder="What are you hoping to achieve with coaching?"
                value={formData.goals}
                onChange={(e) => handleInputChange("goals", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.terms}
                onCheckedChange={(checked) => handleInputChange("terms", checked === true)}
                className={validationErrors.terms ? "border-destructive" : ""}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </Label>
            </div>
            {validationErrors.terms && (
              <p className="text-xs text-destructive">{validationErrors.terms}</p>
            )}

            {signupMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{(signupMutation.error as Error).message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={signupMutation.isPending}
              size="lg"
            >
              {signupMutation.isPending ? "Creating Account..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
