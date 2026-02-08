import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Skeleton } from "@/components/ui/skeleton";

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

const faqs = [
  {
    question: "Can I switch plans anytime?",
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, your new rate will apply at the next billing cycle.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "We offer a 7-day free trial on our Remote Coaching plan so you can experience personalized programming before committing. No credit card required to start.",
  },
  {
    question: "What's included in in-person sessions?",
    answer:
      "In-person sessions include hands-on coaching, real-time movement corrections, TPI assessments, and access to professional training equipment. Sessions are 60 minutes each.",
  },
  {
    question: "Can I pause my subscription?",
    answer:
      "Yes, you can pause your subscription for up to 30 days if you need a break. Your progress and data will be saved, and you can resume anytime.",
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

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

  const handleGetStarted = async (plan: SubscriptionPlan) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate(`/auth?plan=${plan.tier_key}`);
      return;
    }

    // For now, redirect to dashboard - Stripe checkout will be added later
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4">
              Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Choose Your
              <span className="text-primary block">Training Path</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From self-guided workouts to premium 1-on-1 coaching, find the
              plan that fits your goals and budget.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-16 lg:pb-24">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="relative">
                    <CardHeader>
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-24 mt-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((j) => (
                          <Skeleton key={j} className="h-4 w-full" />
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {plans?.map((plan) => {
                  const features = Array.isArray(plan.features)
                    ? plan.features
                    : [];
                  const isPopular = plan.tier_key === "remote";
                  const isInPerson = plan.tier_key === "in_person";

                  return (
                    <Card
                      key={plan.id}
                      className={`relative flex flex-col transition-all duration-300 hover:shadow-lg ${
                        isPopular
                          ? "border-primary shadow-md scale-105 z-10"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground shadow-md">
                            <Zap className="w-3 h-3 mr-1" />
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription className="min-h-[40px]">
                          {plan.description}
                        </CardDescription>
                        <div className="pt-4">
                          <span className="text-4xl font-bold text-foreground">
                            ${plan.monthly_price}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            {isInPerson ? "/hour" : "/month"}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1">
                        <ul className="space-y-3">
                          {features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-foreground">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>

                      <CardFooter className="pt-4">
                        <Button
                          className="w-full"
                          variant={isPopular ? "default" : "outline"}
                          onClick={() => handleGetStarted(plan)}
                        >
                          {isInPerson ? "Contact to Book" : "Get Started"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              Frequently Asked Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {faqs.map((faq, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center bg-primary rounded-2xl p-8 lg:p-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Transform Your Golf Game?
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Join golfers who are hitting it longer and scoring lower with
                professional coaching.
              </p>
              <Button
                size="lg"
                variant="accent"
                onClick={() => plans && handleGetStarted(plans[1])}
              >
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
