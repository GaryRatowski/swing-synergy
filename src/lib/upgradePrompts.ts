export type UpgradeTier = 'remote' | 'hybrid' | 'in_person';

export interface UpgradePromptConfig {
  feature: string;
  requiredTier: UpgradeTier;
  benefits: string[];
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
}

export const TIER_INFO: Record<UpgradeTier, {
  name: string;
  price: number;
  tagline: string;
  priceLabel: string;
}> = {
  remote: {
    name: 'Remote Coaching',
    price: 75,
    tagline: 'Custom programming with expert guidance',
    priceLabel: '/month'
  },
  hybrid: {
    name: 'Hybrid Coaching',
    price: 200,
    tagline: 'Best of online and in-person training',
    priceLabel: '/month'
  },
  in_person: {
    name: 'In-Person Training',
    price: 100,
    tagline: 'Premium 1-on-1 sessions',
    priceLabel: '/hour'
  }
};

export const UPGRADE_PROMPTS: Record<string, UpgradePromptConfig> = {
  customProgramming: {
    feature: 'Custom Programming',
    requiredTier: 'remote',
    benefits: [
      'Programs designed specifically for YOUR goals',
      'Weekly updates based on your progress',
      'Exercises tailored to your strengths and weaknesses',
      'Periodization to prevent plateaus',
      'Direct messaging with your coach'
    ],
    testimonial: {
      quote: "Custom programming took my game to the next level. I've gained 15 yards off the tee in 8 weeks.",
      author: "Mike R.",
      role: "Remote Coaching Client"
    }
  },

  coachMessaging: {
    feature: 'Coach Messaging',
    requiredTier: 'remote',
    benefits: [
      'Ask questions and get expert answers',
      '24-hour response time',
      'Form checks and technique feedback',
      'Accountability and motivation',
      'Monthly video check-in calls'
    ],
    testimonial: {
      quote: "Having direct access to my coach makes all the difference. Questions get answered immediately.",
      author: "Sarah K.",
      role: "Hybrid Coaching Client"
    }
  },

  videoAnalysis: {
    feature: 'Video Analysis',
    requiredTier: 'remote',
    benefits: [
      'Upload swing videos for review',
      'Side-by-side comparison with pros',
      'Detailed feedback on mechanics',
      'Track improvements over time',
      'Slow-motion playback tools'
    ],
    testimonial: {
      quote: "Video analysis helped me fix my slice in 3 weeks. Seeing the difference is incredible.",
      author: "Tom L.",
      role: "Remote Coaching Client"
    }
  },

  inPersonSessions: {
    feature: 'In-Person Sessions',
    requiredTier: 'hybrid',
    benefits: [
      '2 in-person training sessions per month',
      'Hands-on form corrections',
      'Advanced equipment and assessments',
      'Real-time feedback and adjustments',
      'Everything from Remote Coaching included'
    ],
    testimonial: {
      quote: "The hybrid model is perfect. Online programming keeps me on track, in-person sessions dial it in.",
      author: "Jennifer P.",
      role: "Hybrid Coaching Client"
    }
  }
};
