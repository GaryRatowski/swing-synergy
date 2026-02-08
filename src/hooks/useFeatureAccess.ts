import { useAuth } from "@/hooks/useAuth";

type FeatureTier = 'app_only' | 'remote' | 'hybrid' | 'in_person';

const TIER_HIERARCHY: Record<FeatureTier | 'none', number> = {
  none: 0,
  app_only: 1,
  remote: 2,
  hybrid: 3,
  in_person: 4
};

const TIER_NAMES: Record<FeatureTier | 'none', string> = {
  none: 'No Subscription',
  app_only: 'App Only',
  remote: 'Remote Coaching',
  hybrid: 'Hybrid Coaching',
  in_person: 'In-Person Training'
};

export function useFeatureAccess() {
  const { profile, isCoach, isLoading } = useAuth();

  const checkAccess = (requiredTier: FeatureTier): boolean => {
    // Coach has access to everything
    if (isCoach) return true;

    // Check if subscription is active
    const status = profile?.subscription_status;
    if (status !== 'active' && status !== 'trialing') {
      // Allow access if user has a valid tier set (for testing/manual assignment)
      if (!profile?.subscription_tier || profile.subscription_tier === 'none') {
        return false;
      }
    }

    const userTier = (profile?.subscription_tier || 'none') as FeatureTier | 'none';
    return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
  };

  const getRequiredUpgrade = (requiredTier: FeatureTier): FeatureTier | null => {
    const userTier = (profile?.subscription_tier || 'none') as FeatureTier | 'none';
    
    if (TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier]) {
      return null; // Already has access
    }

    return requiredTier;
  };

  const currentTier = (profile?.subscription_tier || 'none') as FeatureTier | 'none';

  return {
    currentTier,
    currentTierName: TIER_NAMES[currentTier],
    subscriptionStatus: profile?.subscription_status,
    isCoach,
    isLoading,
    checkAccess,
    getRequiredUpgrade,
    getTierName: (tier: FeatureTier | 'none') => TIER_NAMES[tier],
    // Convenience accessors for common features
    hasCustomProgramming: checkAccess('remote'),
    hasCoachMessaging: checkAccess('remote'),
    hasVideoAnalysis: checkAccess('remote'),
    hasInPersonSessions: checkAccess('hybrid'),
  };
}

export type { FeatureTier };
