import { Badge } from "@/components/ui/badge";

type FeatureTier = 'app_only' | 'remote' | 'hybrid' | 'in_person' | 'none';

const TIER_COLORS: Record<FeatureTier, "default" | "secondary" | "destructive" | "outline"> = {
  none: 'secondary',
  app_only: 'outline',
  remote: 'default',
  hybrid: 'default',
  in_person: 'default',
};

const TIER_LABELS: Record<FeatureTier, string> = {
  none: 'No Plan',
  app_only: 'App Only',
  remote: 'Remote',
  hybrid: 'Hybrid',
  in_person: 'In-Person',
};

const TIER_STYLES: Record<FeatureTier, string> = {
  none: '',
  app_only: 'border-blue-500 text-blue-700 dark:text-blue-400',
  remote: 'bg-blue-500 hover:bg-blue-600',
  hybrid: 'bg-purple-500 hover:bg-purple-600',
  in_person: 'bg-green-500 hover:bg-green-600',
};

interface TierBadgeProps {
  tier: string | null | undefined;
  className?: string;
  showLabel?: boolean;
}

export function TierBadge({ tier, className, showLabel = true }: TierBadgeProps) {
  const normalizedTier = (tier || 'none') as FeatureTier;
  const variant = TIER_COLORS[normalizedTier] || 'secondary';
  const label = TIER_LABELS[normalizedTier] || 'Unknown';
  const style = TIER_STYLES[normalizedTier] || '';

  return (
    <Badge 
      variant={variant} 
      className={`${style} ${className}`}
    >
      {showLabel ? label : null}
    </Badge>
  );
}
