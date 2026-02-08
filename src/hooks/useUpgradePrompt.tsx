import { useState, useCallback, ReactNode } from 'react';
import { UpgradeModal } from '@/components/UpgradeModal';
import { type UpgradePromptConfig } from '@/lib/upgradePrompts';

export function useUpgradePrompt() {
  const [config, setConfig] = useState<UpgradePromptConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showUpgradePrompt = useCallback((upgradeConfig: UpgradePromptConfig) => {
    setConfig(upgradeConfig);
    setIsOpen(true);
  }, []);

  const closePrompt = useCallback(() => {
    setIsOpen(false);
    // Delay clearing config to allow modal close animation
    setTimeout(() => setConfig(null), 200);
  }, []);

  const UpgradePromptModal: ReactNode = config ? (
    <UpgradeModal
      isOpen={isOpen}
      onClose={closePrompt}
      feature={config.feature}
      requiredTier={config.requiredTier}
      benefits={config.benefits}
      testimonial={config.testimonial}
    />
  ) : null;

  return {
    showUpgradePrompt,
    closePrompt,
    isOpen,
    UpgradePromptModal,
  };
}
