import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Users, CalendarIcon, Loader2 } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Program {
  id: string;
  name: string;
  duration_weeks: number | null;
  exercise_count?: number;
}

interface BulkProgramAssignmentProps {
  trigger?: React.ReactNode;
}

const BulkProgramAssignment = ({ trigger }: BulkProgramAssignmentProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());

  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["coach-clients", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("role", "client")
        .eq("coach_id", profile?.id)
        .order("full_name");

      if (error) throw error;
      return data as Client[];
    },
    enabled: open && !!profile?.id,
  });

  const { data: programs, isLoading: loadingPrograms } = useQuery({
    queryKey: ["coach-programs", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, duration_weeks")
        .eq("coach_id", profile?.id)
        .order("name");

      if (error) throw error;
      return data as Program[];
    },
    enabled: open && !!profile?.id,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Not authenticated");

      const assignments = selectedClients.map((clientId) => ({
        client_id: clientId,
        program_id: selectedProgramId,
        assigned_by: profile.id,
        start_date: format(startDate, "yyyy-MM-dd"),
        is_active: true,
        current_week: 1,
        current_day: 1,
      }));

      const { error } = await supabase.from("client_programs").insert(assignments);
      if (error) throw error;
    },
    onSuccess: () => {
      const assignedNames = clients
        ?.filter((c) => selectedClients.includes(c.id))
        .map((c) => c.full_name) || [];
      const nameList = assignedNames.length <= 3
        ? assignedNames.join(", ")
        : `${assignedNames.slice(0, 3).join(", ")} and ${assignedNames.length - 3} more`;
      toast.success(`Program assigned to: ${nameList}`);
      queryClient.invalidateQueries({ queryKey: ["client-programs"] });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to assign program");
      console.error(error);
    },
  });

  const resetForm = () => {
    setSelectedClients([]);
    setSelectedProgramId("");
    setStartDate(new Date());
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const toggleClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAll = () => setSelectedClients(clients?.map((c) => c.id) || []);
  const clearAll = () => setSelectedClients([]);

  const selectedProgram = programs?.find((p) => p.id === selectedProgramId);
  const canSubmit = selectedClients.length > 0 && selectedProgramId;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Bulk Assign Program
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Program to Multiple Clients</DialogTitle>
          <DialogDescription>
            Select clients and a program to assign in bulk.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-6 py-4">
          {/* Step 1: Select clients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Clients ({selectedClients.length} selected)</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear
                </Button>
              </div>
            </div>

            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !clients?.length ? (
              <Card className="p-6 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No clients found</p>
              </Card>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-1">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => toggleClient(client.id)}
                    >
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={() => toggleClient(client.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={client.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(client.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {client.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {client.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Step 2: Select program */}
          <div className="space-y-3">
            <Label>Program to Assign</Label>
            {loadingPrograms ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading programs...
              </div>
            ) : (
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                      {program.duration_weeks && (
                        <span className="text-muted-foreground ml-1">
                          ({program.duration_weeks} weeks)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Step 3: Start date */}
          <div className="space-y-3">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Summary */}
          {selectedClients.length > 0 && selectedProgram && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm">
                Assigning <strong>{selectedProgram.name}</strong> to{" "}
                <strong>{selectedClients.length} client{selectedClients.length > 1 ? "s" : ""}</strong>{" "}
                starting <strong>{format(startDate, "MMM d, yyyy")}</strong>
              </p>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!canSubmit || assignMutation.isPending}
          >
            {assignMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Assign to {selectedClients.length} Client{selectedClients.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkProgramAssignment;
