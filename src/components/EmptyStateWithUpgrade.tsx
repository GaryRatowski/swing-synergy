import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Sparkles } from 'lucide-react';

interface EmptyStateWithUpgradeProps {
  icon: ReactNode;
  title: string;
  description: string;
  requiredTier: string;
  onUpgrade: () => void;
  className?: string;
}

export function EmptyStateWithUpgrade({
  icon,
  title,
  description,
  requiredTier,
  onUpgrade,
  className,
}: EmptyStateWithUpgradeProps) {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="relative mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {icon}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
            <Lock className="h-3 w-3 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
        <Button onClick={onUpgrade}>
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade to {requiredTier}
        </Button>
      </CardContent>
    </Card>
  );
}
