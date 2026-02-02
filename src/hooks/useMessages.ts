import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { MessageAttachment } from "@/hooks/useMessageAttachments";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface MessageWithAttachments extends Message {
  attachments?: MessageAttachment[];
}

export interface Conversation {
  contact: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

export function useMessages(currentProfileId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MessageWithAttachments[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all conversations (contacts with messages)
  const fetchConversations = useCallback(async () => {
    if (!currentProfileId) return;

    try {
      // Get all messages involving current user
      const { data: allMessages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${currentProfileId},receiver_id.eq.${currentProfileId}`)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      // Extract unique contact IDs
      const contactIds = new Set<string>();
      allMessages?.forEach((msg) => {
        if (msg.sender_id !== currentProfileId) contactIds.add(msg.sender_id);
        if (msg.receiver_id !== currentProfileId) contactIds.add(msg.receiver_id);
      });

      // Fetch contact profiles
      const { data: contacts, error: contactsError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", Array.from(contactIds));

      if (contactsError) throw contactsError;

      // Build conversations
      const convos: Conversation[] = (contacts || []).map((contact) => {
        const contactMessages = allMessages?.filter(
          (msg) => msg.sender_id === contact.id || msg.receiver_id === contact.id
        ) || [];
        
        const unreadCount = contactMessages.filter(
          (msg) => msg.sender_id === contact.id && !msg.read_at
        ).length;

        return {
          contact,
          lastMessage: contactMessages[0] || null,
          unreadCount,
        };
      });

      // Sort by last message time
      convos.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || "";
        const bTime = b.lastMessage?.created_at || "";
        return bTime.localeCompare(aTime);
      });

      setConversations(convos);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentProfileId]);

  // Fetch messages for a specific contact (works with externally-managed selected contact)
  const fetchMessagesForContact = useCallback(
    async (contactId: string | null) => {
      if (!currentProfileId || !contactId) {
        setMessages([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentProfileId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${currentProfileId})`
          )
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Fetch attachments for these messages
        const messageIds = (data || []).map((m) => m.id);
        let attachmentMap = new Map<string, MessageAttachment[]>();
        
        if (messageIds.length > 0) {
          const { data: attachments } = await supabase
            .from("message_attachments")
            .select("*")
            .in("message_id", messageIds);

          (attachments || []).forEach((att) => {
            const existing = attachmentMap.get(att.message_id) || [];
            existing.push(att as MessageAttachment);
            attachmentMap.set(att.message_id, existing);
          });
        }

        // Combine messages with attachments
        const messagesWithAttachments: MessageWithAttachments[] = (data || []).map((msg) => ({
          ...msg,
          attachments: attachmentMap.get(msg.id) || [],
        }));

        setMessages(messagesWithAttachments);

        // Mark received messages as read
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("sender_id", contactId)
          .eq("receiver_id", currentProfileId)
          .is("read_at", null);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    },
    [currentProfileId]
  );

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    await fetchMessagesForContact(selectedContactId);
  }, [fetchMessagesForContact, selectedContactId]);

  // Send a message - accepts receiverId to work with external state management
  const sendMessage = async (content: string, receiverId?: string) => {
    const targetReceiverId = receiverId || selectedContactId;
    if (!currentProfileId || !targetReceiverId || !content.trim()) return;

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: currentProfileId,
        receiver_id: targetReceiverId,
        content: content.trim(),
      });

      if (error) throw error;

      // Ensure UI updates immediately even if realtime is delayed
      await fetchConversations();
      if (targetReceiverId === selectedContactId) {
        await fetchMessagesForContact(targetReceiverId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!currentProfileId) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // If message is from/to current user
          if (
            newMessage.sender_id === currentProfileId ||
            newMessage.receiver_id === currentProfileId
          ) {
            // Update messages if in current conversation
            if (
              newMessage.sender_id === selectedContactId ||
              newMessage.receiver_id === selectedContactId
            ) {
              setMessages((prev) =>
                prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]
              );
              
              // Mark as read if we're the receiver and viewing
              if (newMessage.receiver_id === currentProfileId) {
                supabase
                  .from("messages")
                  .update({ read_at: new Date().toISOString() })
                  .eq("id", newMessage.id);
              }
            }
            
            // Refresh conversations list
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId, selectedContactId, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when contact changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    conversations,
    messages,
    selectedContactId,
    setSelectedContactId,
    sendMessage,
    isLoading,
    refetch: fetchConversations,
    refetchMessagesForContact: fetchMessagesForContact,
  };
}
