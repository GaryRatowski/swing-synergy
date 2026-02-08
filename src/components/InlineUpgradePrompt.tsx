import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InlineUpgradePromptProps {
  feature: string;
  tierName: string;
  benefits: string[];
  className?: string;
}

export function InlineUpgradePrompt({ feature, tierName, benefits, className }: InlineUpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <Alert className={`bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 ${className}`}>
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary">
        Unlock {feature} with {tierName}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <ul className="list-disc list-inside text-sm text-muted-foreground mb-3 space-y-1">
          {benefits.map((benefit, idx) => (
            <li key={idx}>{benefit}</li>
          ))}
        </ul>
        <Button
          size="sm"
          onClick={() => navigate('/pricing')}
        >
          Upgrade Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}
