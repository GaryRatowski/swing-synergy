import { ReactNode } from 'react';
import { useFeatureAccess, FeatureTier } from '@/hooks/useFeatureAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  requiredTier: FeatureTier;
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ requiredTier, feature, children, fallback }: FeatureGateProps) {
  const { checkAccess, getTierName } = useFeatureAccess();
  const navigate = useNavigate();

  const hasAccess = checkAccess(requiredTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">Upgrade to Unlock {feature}</CardTitle>
        <CardDescription>
          This feature requires {getTierName(requiredTier)} or higher
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center pb-6">
        <Button onClick={() => navigate('/pricing')}>
          Upgrade Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
