import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  isLoading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading || internalLoading;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children && <div className="py-2">{children}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} autoFocus>
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: string;
  dependencyWarning?: string;
  affectedItems?: string[];
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  dependencyWarning,
  affectedItems,
  isLoading = false,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const hasWarning = !!dependencyWarning || (affectedItems && affectedItems.length > 0);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${itemType}?`}
      description={
        hasWarning
          ? dependencyWarning || `This ${itemType.toLowerCase()} has dependencies that will be affected.`
          : `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
      }
      confirmLabel={hasWarning ? "Delete Anyway" : "Delete"}
      variant="destructive"
      isLoading={isLoading}
      onConfirm={onConfirm}
    >
      {affectedItems && affectedItems.length > 0 && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 max-h-32 overflow-y-auto">
          <p className="text-xs font-medium text-destructive mb-2">
            Affected items ({affectedItems.length}):
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {affectedItems.slice(0, 5).map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
            {affectedItems.length > 5 && (
              <li className="text-muted-foreground">
                ...and {affectedItems.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </ConfirmDialog>
  );
}

export interface RemoveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  fromName: string;
  description?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function RemoveConfirmDialog({
  open,
  onOpenChange,
  itemName,
  fromName,
  description,
  isLoading = false,
  onConfirm,
}: RemoveConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${itemName}?`}
      description={
        description ||
        `Are you sure you want to remove "${itemName}" from "${fromName}"?`
      }
      confirmLabel="Remove"
      variant="destructive"
      isLoading={isLoading}
      onConfirm={onConfirm}
    />
  );
}
