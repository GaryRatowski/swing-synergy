import { useState, useRef, useEffect, forwardRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMessages, Conversation } from "@/hooks/useMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  ArrowLeft, 
  Search,
  MessageSquare,
  Loader2
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface MessagingPanelProps {
  className?: string;
  externalSelectedContactId?: string | null;
  onExternalContactChange?: (contactId: string | null) => void;
}

const MessagingPanel = ({ 
  className, 
  externalSelectedContactId,
  onExternalContactChange 
}: MessagingPanelProps) => {
  const { profile } = useAuth();
  const {
    conversations,
    messages,
    selectedContactId: internalSelectedContactId,
    setSelectedContactId: setInternalSelectedContactId,
    sendMessage,
    refetchMessagesForContact,
    isLoading,
  } = useMessages(profile?.id);

  // Use external state if provided, otherwise internal
  const selectedContactId = externalSelectedContactId !== undefined 
    ? externalSelectedContactId 
    : internalSelectedContactId;
  
  const setSelectedContactId = onExternalContactChange ?? setInternalSelectedContactId;

  // Keep the hook's internal selection in sync when the parent controls selection.
  // This ensures realtime filters + internal fetches behave correctly.
  useEffect(() => {
    if (externalSelectedContactId !== undefined) {
      setInternalSelectedContactId(externalSelectedContactId);
    }
  }, [externalSelectedContactId, setInternalSelectedContactId]);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find(
    (c) => c.contact.id === selectedContactId
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending || !selectedContactId) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage, selectedContactId);
      // Force an immediate refresh so the sent message shows even if realtime is delayed.
      await refetchMessagesForContact(selectedContactId);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
    return format(date, "MMM d, h:mm a");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const filteredConversations = conversations.filter((c) =>
    c.contact.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Conversation list view
  if (!selectedContactId) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground/70">
                Messages with your coach or clients will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((convo) => (
                <ConversationItem
                  key={convo.contact.id}
                  conversation={convo}
                  currentUserId={profile?.id || ""}
                  onClick={() => setSelectedContactId(convo.contact.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Chat view
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedContactId(null)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={selectedConversation?.contact.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(selectedConversation?.contact.full_name || "?")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {selectedConversation?.contact.full_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {selectedConversation?.contact.role === "coach" ? "Coach" : "Client"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === profile?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatMessageTime(message.created_at || "")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Conversation list item component
interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onClick: () => void;
}

const ConversationItem = forwardRef<HTMLButtonElement, ConversationItemProps>(
  ({
    conversation,
    currentUserId,
    onClick,
  }: ConversationItemProps, ref) => {
  const { contact, lastMessage, unreadCount } = conversation;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatLastMessageTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const getLastMessagePreview = () => {
    if (!lastMessage) return "No messages yet";
    const prefix = lastMessage.sender_id === currentUserId ? "You: " : "";
    const content = lastMessage.content;
    return `${prefix}${content.length > 40 ? content.slice(0, 40) + "..." : content}`;
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={contact.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {getInitials(contact.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground truncate">
            {contact.full_name}
          </p>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatLastMessageTime(lastMessage?.created_at || null)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-muted-foreground truncate">
            {getLastMessagePreview()}
          </p>
          {unreadCount > 0 && (
            <Badge className="ml-2 flex-shrink-0 bg-primary text-primary-foreground">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
  }
);

ConversationItem.displayName = "ConversationItem";


export default MessagingPanel;
