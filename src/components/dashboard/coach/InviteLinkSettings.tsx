import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, RefreshCw, Link as LinkIcon, Users, CheckCircle2 } from "lucide-react";

interface InviteLinkSettingsProps {
  coachId: string;
  inviteCode: string | null;
  inviteLinkEnabled: boolean | null;
  onUpdate?: () => void;
}

export function InviteLinkSettings({
  coachId,
  inviteCode,
  inviteLinkEnabled,
  onUpdate,
}: InviteLinkSettingsProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const inviteUrl = inviteCode
    ? `${window.location.origin}/join/${inviteCode}`
    : null;

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("profiles")
        .update({ invite_link_enabled: enabled })
        .eq("id", coachId);

      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      toast.success(enabled ? "Invite link enabled" : "Invite link disabled");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to update invite link settings");
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      // Generate new invite code
      const newCode = Math.random().toString(36).substring(2, 10);

      const { error } = await supabase
        .from("profiles")
        .update({ invite_code: newCode })
        .eq("id", coachId);

      if (error) throw error;
      return newCode;
    },
    onSuccess: () => {
      toast.success("New invite link generated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      onUpdate?.();
    },
    onError: () => {
      toast.error("Failed to generate new invite link");
    },
  });

  const handleCopy = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (!inviteCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Client Invite Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Client Invite Link
        </CardTitle>
        <CardDescription>
          Share this link with potential clients to let them sign up and automatically join your
          roster
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite Link Input */}
        <div className="space-y-2">
          <Label>Your Invite Link</Label>
          <div className="flex items-center gap-2">
            <Input
              value={inviteUrl || ""}
              readOnly
              className="font-mono text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              size="icon"
              variant={copied ? "default" : "outline"}
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Invite Link</Label>
            <p className="text-sm text-muted-foreground">
              When disabled, this link will not accept new signups
            </p>
          </div>
          <Switch
            checked={inviteLinkEnabled ?? true}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            disabled={toggleMutation.isPending}
          />
        </div>

        {/* Regenerate Link */}
        <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Generate New Link</Label>
            <p className="text-sm text-muted-foreground">
              Creates a new invite code. The old link will stop working.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
          >
            {regenerateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        </div>

        {/* Usage Tips */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">How it works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Share your invite link with potential clients</li>
            <li>• They can sign up with any email address</li>
            <li>• New clients are automatically added to your roster</li>
            <li>• You'll be notified when a new client joins</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
