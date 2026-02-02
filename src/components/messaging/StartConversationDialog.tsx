import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, MessageSquare } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface StartConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contactId: string) => void;
}

const StartConversationDialog = ({
  open,
  onOpenChange,
  onSelectContact,
}: StartConversationDialogProps) => {
  const { profile, isCoach } = useAuth();
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!open || !profile) return;

    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        let query = supabase.from("profiles").select("*").neq("id", profile.id);

        // Coaches can message any client, clients can only message their coach
        if (isCoach) {
          query = query.eq("role", "client");
        } else {
          // Clients can message coaches
          query = query.eq("role", "coach");
        }

        const { data, error } = await query;
        if (error) throw error;
        setContacts(data || []);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [open, profile, isCoach]);

  const filteredContacts = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleSelect = (contactId: string) => {
    onSelectContact(contactId);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            {isCoach
              ? "Select a client to message"
              : "Select a coach to message"}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-72">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No contacts found"
                  : isCoach
                  ? "No clients available"
                  : "No coaches available"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(contact.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {contact.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.email}
                    </p>
                  </div>
                  {contact.membership_type && (
                    <Badge variant="secondary" className="flex-shrink-0">
                      {contact.membership_type.replace("_", " ")}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StartConversationDialog;
