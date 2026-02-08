import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ChevronDown, Loader2, Trash2, MessageSquare } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface BulkClientActionsProps {
  clients: Client[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onRefresh: () => void;
  onMessageClients?: (clientIds: string[]) => void;
}

const BulkClientActions = ({
  clients,
  selectedIds,
  onSelectionChange,
  onRefresh,
  onMessageClients,
}: BulkClientActionsProps) => {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const selectedClients = clients.filter((c) => selectedIds.includes(c.id));

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .in("id", selectedIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.length} client${selectedIds.length > 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onSelectionChange([]);
      onRefresh();
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to delete clients");
      console.error(error);
    },
  });

  const toggleAll = () => {
    if (selectedIds.length === clients.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(clients.map((c) => c.id));
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length === clients.length}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm font-medium">
            {selectedIds.length} client{selectedIds.length > 1 ? "s" : ""} selected
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Bulk Actions
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {onMessageClients && (
              <DropdownMenuItem onClick={() => onMessageClients(selectedIds)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Message Selected
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectionChange([])}
        >
          Clear selection
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.length} Client{selectedIds.length > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete these clients and all their data including
              workout logs, assessments, and program assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="max-h-60 border rounded-md p-2">
            {selectedClients.map((client) => (
              <div key={client.id} className="flex items-center gap-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={client.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(client.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{client.full_name}</p>
                  <p className="text-xs text-muted-foreground">{client.email}</p>
                </div>
              </div>
            ))}
          </ScrollArea>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate()}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete {selectedIds.length} Client{selectedIds.length > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkClientActions;
