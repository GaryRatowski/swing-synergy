import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, ArrowRight, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TIER_INFO, type UpgradeTier } from '@/lib/upgradePrompts';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  requiredTier: UpgradeTier;
  benefits: string[];
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
}

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  requiredTier,
  benefits,
  testimonial,
}: UpgradeModalProps) {
  const navigate = useNavigate();
  const tierDetails = TIER_INFO[requiredTier];

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Unlock {feature}</DialogTitle>
          <DialogDescription>
            Upgrade to {tierDetails.name} to access this feature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pricing */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {tierDetails.tagline}
            </p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold">${tierDetails.price}</span>
              <span className="text-muted-foreground">
                {tierDetails.priceLabel}
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <p className="text-sm font-medium">What you'll get:</p>
            <ul className="space-y-2">
              {benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonial */}
          {testimonial && (
            <div className="relative rounded-lg bg-muted/50 p-4">
              <Quote className="absolute top-2 left-2 h-4 w-4 text-muted-foreground/50" />
              <p className="text-sm italic pl-4">"{testimonial.quote}"</p>
              <p className="text-xs text-muted-foreground mt-2 pl-4">
                — {testimonial.author}, {testimonial.role}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleUpgrade} className="w-full" size="lg">
            Upgrade to {tierDetails.name}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
