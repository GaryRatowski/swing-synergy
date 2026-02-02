import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Community",
    price: "$49",
    period: "/month",
    description: "Perfect for self-motivated golfers who want structured training.",
    features: [
      "Access to community forum",
      "Monthly program updates",
      "Exercise video library",
      "Basic progress tracking",
      "Group Q&A sessions"
    ],
    cta: "Join Community",
    highlighted: false
  },
  {
    name: "1-on-1 Coaching",
    price: "$299",
    period: "/month",
    description: "Personalized coaching for serious golfers ready to transform.",
    features: [
      "Everything in Community",
      "Custom periodized programs",
      "Weekly program adjustments",
      "Direct messaging with coach",
      "Video swing analysis",
      "TPI assessment & programming",
      "Priority exercise swap requests",
      "Monthly strategy calls"
    ],
    cta: "Get Started",
    highlighted: true
  },
  {
    name: "Single Program",
    price: "$149",
    period: "one-time",
    description: "One-off program purchase for specific training goals.",
    features: [
      "4-week structured program",
      "Exercise video demos",
      "Progress tracking",
      "Email support",
      "Program notes & cues"
    ],
    cta: "Buy Program",
    highlighted: false
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Pricing</span>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Invest in Your
            <span className="text-primary block">Game Today</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the coaching level that matches your goals and commitment.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted 
                  ? 'bg-primary text-primary-foreground shadow-xl scale-105 z-10' 
                  : 'bg-card border border-border hover:border-primary/30 hover:shadow-lg'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-2 ${plan.highlighted ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${plan.highlighted ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {plan.price}
                  </span>
                  <span className={plan.highlighted ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                    {plan.period}
                  </span>
                </div>
                <p className={`mt-2 text-sm ${plan.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-accent' : 'text-primary'}`} />
                    <span className={`text-sm ${plan.highlighted ? 'text-primary-foreground/90' : 'text-foreground'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button 
                asChild 
                className="w-full h-12"
                variant={plan.highlighted ? "accent" : "default"}
              >
                <Link to="/auth">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
