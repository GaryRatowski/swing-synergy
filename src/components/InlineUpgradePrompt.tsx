import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InlineUpgradePromptProps {
  feature: string;
  tierName: string;
  benefits: string[];
  className?: string;
  dismissible?: boolean;
  storageKey?: string;
}

export function InlineUpgradePrompt({ 
  feature, 
  tierName, 
  benefits, 
  className,
  dismissible = true,
  storageKey,
}: InlineUpgradePromptProps) {
  const navigate = useNavigate();
  
  // Check if already dismissed (persisted in sessionStorage)
  const dismissKey = storageKey || `upgrade_banner_${feature.toLowerCase().replace(/\s+/g, '_')}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem(dismissKey) === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(dismissKey, 'true');
  };

  if (isDismissed) return null;

  return (
    <Alert className={`relative bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 ${className}`}>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary pr-6">
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
