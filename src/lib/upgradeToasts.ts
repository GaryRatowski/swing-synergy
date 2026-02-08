import { toast } from 'sonner';

export function showUpgradeToast(feature: string, tierName: string) {
  // Only show once per session to avoid annoyance
  const shownKey = `upgrade_toast_${feature.toLowerCase().replace(/\s+/g, '_')}`;
  if (sessionStorage.getItem(shownKey)) {
    return;
  }
  
  toast.info(`Want ${feature}? Upgrade to ${tierName}`, {
    action: {
      label: 'View Plans',
      onClick: () => {
        window.location.href = '/pricing';
      },
    },
    duration: 5000,
  });
  
  sessionStorage.setItem(shownKey, 'true');
}

export function showFeatureLockedToast(feature: string) {
  toast.error(`${feature} is locked`, {
    description: 'Upgrade your plan to access this feature',
    action: {
      label: 'Upgrade',
      onClick: () => {
        window.location.href = '/pricing';
      },
    },
    duration: 4000,
  });
}
