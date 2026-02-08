import { Button } from "@/components/ui/button";
import { Check, Zap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPlan {
  id: string;
  tier_key: string;
  name: string;
  description: string | null;
  monthly_price: number;
  stripe_price_id: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export function Pricing() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Invest in Your
            <span className="text-primary block">Game Today</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the coaching level that matches your goals and commitment.
          </p>
        </div>

        {/* Pricing cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl p-8 bg-card border border-border">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-10 w-24 mb-4" />
                <Skeleton className="h-4 w-full mb-6" />
                <div className="space-y-3 mb-8">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans?.map((plan) => {
              const features = Array.isArray(plan.features) ? plan.features : [];
              const isPopular = plan.tier_key === "remote";
              const isInPerson = plan.tier_key === "in_person";

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-8 transition-all duration-300 ${
                    isPopular
                      ? "bg-primary text-primary-foreground shadow-xl scale-105 z-10"
                      : "bg-card border border-border hover:border-primary/30 hover:shadow-lg"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="px-4 py-1 bg-accent text-accent-foreground">
                        <Zap className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3
                      className={`text-xl font-bold mb-2 ${
                        isPopular ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-4xl font-bold ${
                          isPopular ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        ${plan.monthly_price}
                      </span>
                      <span
                        className={
                          isPopular
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }
                      >
                        {isInPerson ? "/hour" : "/month"}
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-sm ${
                        isPopular
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check
                          className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                            isPopular ? "text-accent" : "text-primary"
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            isPopular
                              ? "text-primary-foreground/90"
                              : "text-foreground"
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="w-full h-12"
                    variant={isPopular ? "accent" : "default"}
                  >
                    <Link to="/auth">
                      {isInPerson ? "Contact to Book" : "Get Started"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* View all plans link */}
        <div className="text-center mt-12">
          <Button asChild variant="ghost" size="lg">
            <Link to="/pricing">
              View Full Pricing Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
