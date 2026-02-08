import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TierBadge } from "@/components/TierBadge";
import { Search, MessageSquare, TrendingUp, Calendar, MoreVertical, Trash2, Users } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
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
import { toast } from "sonner";
import ClientDetailView from "./ClientDetailView";
import BulkClientActions from "./BulkClientActions";
import BulkProgramAssignment from "./BulkProgramAssignment";

interface Client {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  membership_type: string | null;
  handicap: number | null;
  onboarding_completed: boolean | null;
  status: string | null;
  subscription_tier: string | null;
}

interface ClientRosterProps {
  onMessageClient?: (clientId: string) => void;
}

const ClientRoster = ({ onMessageClient }: ClientRosterProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, membership_type, handicap, onboarding_completed, status, subscription_tier")
      .eq("role", "client")
      .order("full_name");

    if (error) {
      console.error("Error fetching clients:", error);
    } else {
      setClients(data || []);
    }
    setIsLoading(false);
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", clientToDelete.id);

    if (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    } else {
      toast.success(`${clientToDelete.full_name} has been removed`);
      setClients(clients.filter(c => c.id !== clientToDelete.id));
    }
    
    setIsDeleting(false);
    setClientToDelete(null);
  };

  const filteredClients = clients.filter(client => 
    client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMembershipLabel = (type: string | null) => {
    switch (type) {
      case "individual_coaching": return "1-on-1";
      case "community": return "Community";
      case "program_only": return "Program";
      default: return "Unknown";
    }
  };

  const getMembershipVariant = (type: string | null): "default" | "secondary" | "outline" => {
    switch (type) {
      case "individual_coaching": return "default";
      case "community": return "secondary";
      default: return "outline";
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedClientIds([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search clients..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">All ({clients.length})</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">1-on-1 (3)</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Community (1)</Badge>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            variant={selectMode ? "secondary" : "outline"}
            size="sm"
            onClick={toggleSelectMode}
          >
            <Users className="h-4 w-4 mr-2" />
            {selectMode ? "Cancel" : "Select"}
          </Button>
          <BulkProgramAssignment />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectMode && (
        <BulkClientActions
          clients={clients}
          selectedIds={selectedClientIds}
          onSelectionChange={setSelectedClientIds}
          onRefresh={fetchClients}
          onMessageClients={(ids) => {
            // Message first selected client for now
            if (ids.length > 0 && onMessageClient) {
              onMessageClient(ids[0]);
            }
          }}
        />
      )}

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Card 
            key={client.id} 
            className={`hover:shadow-md transition-shadow cursor-pointer group ${
              client.status === "pending" ? "opacity-75 border-dashed" : ""
            } ${selectedClientIds.includes(client.id) ? "ring-2 ring-primary" : ""}`}
            onClick={() => selectMode && toggleClientSelection(client.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectMode && (
                    <Checkbox
                      checked={selectedClientIds.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <Avatar className="h-12 w-12 border-2 border-primary/10">
                    <AvatarImage src={client.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(client.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{client.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewDetails(client)}>
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onMessageClient?.(client.id)}>
                      Send Message
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setClientToDelete(client)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant={getMembershipVariant(client.membership_type)}>
                  {getMembershipLabel(client.membership_type)}
                </Badge>
                <TierBadge tier={client.subscription_tier} />
                {client.status === "pending" && (
                  <Badge variant="outline" className="border-warning text-warning bg-warning/10">
                    Pending
                  </Badge>
                )}
                {client.status === "active" && !client.onboarding_completed && (
                  <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                    Onboarding
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Handicap: {client.handicap ?? "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Week 3 of 8</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessageClient?.(client.id);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message
                </Button>
                <Button size="sm" className="flex-1" onClick={() => handleViewDetails(client)}>
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ClientDetailView 
        client={selectedClient}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{clientToDelete?.full_name}</strong>? 
              This will permanently remove all their data including workout logs, assessments, 
              and program assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Loading clients...</p>
        </div>
      )}

      {!isLoading && clients.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No clients yet. Clients will appear here once they sign up and are assigned to you.</p>
        </div>
      )}

      {!isLoading && filteredClients.length === 0 && clients.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No clients found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default ClientRoster;
