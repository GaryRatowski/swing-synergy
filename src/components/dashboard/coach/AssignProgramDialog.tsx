import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  already_assigned: boolean;
}

interface AssignProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
  onAssigned: () => void;
}

const AssignProgramDialog = ({ 
  open, 
  onOpenChange, 
  programId, 
  programName,
  onAssigned 
}: AssignProgramDialogProps) => {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && profile?.id) {
      fetchClients();
    }
  }, [open, profile?.id, programId]);

  const fetchClients = async () => {
    setIsLoading(true);
    setSelectedClients([]);

    // Fetch all clients assigned to this coach (include pending status too)
    const { data: clientsData, error: clientsError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("role", "client")
      .eq("coach_id", profile?.id)
      .order("full_name");

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      setIsLoading(false);
      return;
    }

    // Check which clients already have this program assigned
    const { data: existingAssignments } = await supabase
      .from("client_programs")
      .select("client_id")
      .eq("program_id", programId)
      .eq("is_active", true);

    const assignedClientIds = new Set(existingAssignments?.map(a => a.client_id) || []);

    const clientsWithStatus = (clientsData || []).map(client => ({
      ...client,
      already_assigned: assignedClientIds.has(client.id),
    }));

    setClients(clientsWithStatus);
    setIsLoading(false);
  };

  const handleToggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    const unassignedClients = clients.filter(c => !c.already_assigned);
    if (selectedClients.length === unassignedClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(unassignedClients.map(c => c.id));
    }
  };

  const handleAssign = async () => {
    if (selectedClients.length === 0) {
      toast.error("Please select at least one client");
      return;
    }

    setIsSubmitting(true);

    const assignments = selectedClients.map(clientId => ({
      client_id: clientId,
      program_id: programId,
      assigned_by: profile?.id,
      start_date: new Date().toISOString().split('T')[0],
      is_active: true,
    }));

    const { error } = await supabase
      .from("client_programs")
      .insert(assignments);

    setIsSubmitting(false);

    if (error) {
      console.error("Error assigning program:", error);
      toast.error("Failed to assign program");
      return;
    }

    toast.success(`Program assigned to ${selectedClients.length} client${selectedClients.length > 1 ? 's' : ''}`);
    onOpenChange(false);
    onAssigned();
  };

  const unassignedClients = clients.filter(c => !c.already_assigned);
  const assignedClients = clients.filter(c => c.already_assigned);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Program</DialogTitle>
          <DialogDescription>
            Select clients to assign "{programName}" to.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No clients found</p>
            <p className="text-xs text-muted-foreground mt-1">Add clients to your roster first</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unassignedClients.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedClients.length} of {unassignedClients.length} selected
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedClients.length === unassignedClients.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            )}

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {unassignedClients.length > 0 && (
                  <>
                    {unassignedClients.map(client => (
                      <div
                        key={client.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleToggleClient(client.id)}
                      >
                        <Checkbox
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() => handleToggleClient(client.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {client.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {assignedClients.length > 0 && (
                  <>
                    <div className="pt-4 pb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Already Assigned
                      </p>
                    </div>
                    {assignedClients.map(client => (
                      <div
                        key={client.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 opacity-60"
                      >
                        <Checkbox checked disabled />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {client.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={isSubmitting || selectedClients.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign to {selectedClients.length || ""} Client{selectedClients.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignProgramDialog;
