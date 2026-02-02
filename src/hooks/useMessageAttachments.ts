import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string | null;
}

export function useMessageAttachments() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadAttachment = async (
    file: File,
    userId: string,
    messageId: string
  ): Promise<MessageAttachment | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create unique file path: userId/messageId/filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${messageId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Create attachment record
      const { data: attachment, error: dbError } = await supabase
        .from("message_attachments")
        .insert({
          message_id: messageId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(100);
      return attachment;
    } catch (error) {
      console.error("Error uploading attachment:", error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("message-attachments")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
  };

  const fetchAttachmentsForMessages = async (
    messageIds: string[]
  ): Promise<Map<string, MessageAttachment[]>> => {
    if (messageIds.length === 0) return new Map();

    try {
      const { data, error } = await supabase
        .from("message_attachments")
        .select("*")
        .in("message_id", messageIds);

      if (error) throw error;

      // Group attachments by message_id
      const attachmentMap = new Map<string, MessageAttachment[]>();
      (data || []).forEach((attachment) => {
        const existing = attachmentMap.get(attachment.message_id) || [];
        existing.push(attachment);
        attachmentMap.set(attachment.message_id, existing);
      });

      return attachmentMap;
    } catch (error) {
      console.error("Error fetching attachments:", error);
      return new Map();
    }
  };

  const deleteAttachment = async (
    attachmentId: string,
    filePath: string
  ): Promise<boolean> => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("message-attachments")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("message_attachments")
        .delete()
        .eq("id", attachmentId);

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error("Error deleting attachment:", error);
      return false;
    }
  };

  return {
    uploadAttachment,
    getSignedUrl,
    fetchAttachmentsForMessages,
    deleteAttachment,
    isUploading,
    uploadProgress,
  };
}
