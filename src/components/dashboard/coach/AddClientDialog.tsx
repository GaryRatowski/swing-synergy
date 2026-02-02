import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mail, UserPlus, Copy, Check } from "lucide-react";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded?: () => void;
}

const AddClientDialog = ({ open, onOpenChange, onClientAdded }: AddClientDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [membershipType, setMembershipType] = useState("individual_coaching");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const signupUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/auth?signup=true` 
    : "";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(signupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Signup link copied!" });
  };

  const handleInvite = async () => {
    if (!email.trim() || !fullName.trim() || !profile?.id) return;

    setIsSubmitting(true);
    
    // Check if a profile with this email already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, coach_id, status")
      .eq("email", email.toLowerCase())
      .single();

    if (existingProfile) {
      if (existingProfile.coach_id) {
        toast({
          title: "Client already assigned",
          description: "This client is already assigned to a coach.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Assign existing unassigned client to this coach
      const { error } = await supabase
        .from("profiles")
        .update({ 
          coach_id: profile.id,
          membership_type: membershipType as "individual_coaching" | "community" | "program_only"
        })
        .eq("id", existingProfile.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to assign client.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Client assigned!",
          description: `${fullName} has been added to your roster.`,
        });
        onClientAdded?.();
        onOpenChange(false);
        resetForm();
      }
    } else {
      // Create a pending profile for this client
      const { error } = await supabase
        .from("profiles")
        .insert({
          email: email.toLowerCase(),
          full_name: fullName,
          coach_id: profile.id,
          membership_type: membershipType as "individual_coaching" | "community" | "program_only",
          status: "pending",
          role: "client"
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add client. " + error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Client added!",
          description: `${fullName} has been added as pending. Share the signup link with them.`,
        });
        handleCopyLink();
        onClientAdded?.();
        onOpenChange(false);
        resetForm();
      }
    }

    setIsSubmitting(false);
  };

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setMembershipType("individual_coaching");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Client
          </DialogTitle>
          <DialogDescription>
            Add a client to your roster or invite them to sign up.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label>Membership Type</Label>
            <Select value={membershipType} onValueChange={setMembershipType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual_coaching">1-on-1 Coaching</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="program_only">Program Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <p className="text-sm text-muted-foreground">
              <Mail className="h-4 w-4 inline mr-2" />
              Share this signup link with your client:
            </p>
            <div className="flex gap-2">
              <Input 
                value={signupUrl} 
                readOnly 
                className="text-xs bg-background"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvite} 
            disabled={!email.trim() || !fullName.trim() || isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
