import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  ExternalLink,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format } from "date-fns";

const TIER_LABELS: Record<string, string> = {
  none: "No Active Subscription",
  app_only: "App Access Only",
  remote: "Remote Coaching",
  hybrid: "Hybrid Coaching",
  in_person: "In-Person Training"
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trialing: "outline",
  past_due: "destructive",
  canceled: "secondary",
  inactive: "secondary",
  paid: "default",
  pending: "outline",
  failed: "destructive"
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <CheckCircle2 className="h-3 w-3" />,
  paid: <CheckCircle2 className="h-3 w-3" />,
  trialing: <Clock className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  past_due: <AlertCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  canceled: <XCircle className="h-3 w-3" />,
  inactive: <XCircle className="h-3 w-3" />
};

const Billing = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: paymentHistory, isLoading: paymentsLoading } = useQuery({
    queryKey: ["paymentHistory", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const { data: subscriptionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["subscriptionHistory", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from("subscription_history")
        .select("*")
        .eq("user_id", profile.id)
        .order("changed_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const handleManageSubscription = () => {
    // TODO: This will open Stripe Customer Portal when integrated
    alert("Stripe Customer Portal will open here once payment integration is complete.");
  };

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and payment methods</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Current Subscription */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-foreground">
                  {TIER_LABELS[profile?.subscription_tier || "none"]}
                </p>
                <p className="text-lg text-muted-foreground">
                  {profile?.monthly_rate ? `$${profile.monthly_rate}/month` : "Free"}
                </p>
              </div>
              <Badge 
                variant={STATUS_VARIANTS[profile?.subscription_status || "inactive"]}
                className="self-start sm:self-center flex items-center gap-1 capitalize"
              >
                {STATUS_ICONS[profile?.subscription_status || "inactive"]}
                {profile?.subscription_status || "inactive"}
              </Badge>
            </div>

            {profile?.subscription_status === "active" && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Started</p>
                    <p className="font-medium">
                      {profile.subscription_start_date 
                        ? format(new Date(profile.subscription_start_date), "MMM d, yyyy")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Billing Date</p>
                    <p className="font-medium">
                      {profile.subscription_end_date
                        ? format(new Date(profile.subscription_end_date), "MMM d, yyyy")
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </>
            )}

            {profile?.subscription_status === "trialing" && profile.trial_end_date && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Trial ends {format(new Date(profile.trial_end_date), "MMM d, yyyy")}</span>
                </div>
              </>
            )}

            {profile?.subscription_status === "past_due" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your payment failed. Please update your payment method to continue service.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {profile?.subscription_tier && profile.subscription_tier !== "none" ? (
                <>
                  <Button variant="outline" onClick={handleManageSubscription}>
                    Manage Subscription
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                  <Button onClick={handleUpgrade}>
                    Upgrade Plan
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button onClick={handleUpgrade} size="lg">
                  Choose a Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>Your recent payments and invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : paymentHistory && paymentHistory.length > 0 ? (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {TIER_LABELS[payment.subscription_tier || "none"]}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={STATUS_VARIANTS[payment.status || "pending"]}
                            className="flex items-center gap-1 w-fit capitalize"
                          >
                            {STATUS_ICONS[payment.status || "pending"]}
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.stripe_invoice_id && (
                            <Button variant="ghost" size="sm">
                              View
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payment history yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Subscription History
            </CardTitle>
            <CardDescription>Changes to your subscription over time</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : subscriptionHistory && subscriptionHistory.length > 0 ? (
              <div className="space-y-4">
                {subscriptionHistory.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-start justify-between py-3 border-b last:border-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.reason || "Subscription change"}</span>
                        {event.new_tier && (
                          <Badge variant="outline" className="text-xs">
                            {TIER_LABELS[event.new_tier]}
                          </Badge>
                        )}
                      </div>
                      {event.previous_tier && event.new_tier && event.previous_tier !== event.new_tier && (
                        <p className="text-sm text-muted-foreground">
                          Changed from {TIER_LABELS[event.previous_tier]} to {TIER_LABELS[event.new_tier]}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(event.changed_at), "MMM d, yyyy")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No subscription history yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancel Subscription */}
        {profile?.subscription_tier && 
         profile.subscription_tier !== "none" && 
         profile.subscription_status === "active" && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Cancel Subscription</CardTitle>
              <CardDescription>
                Canceling will turn off automatic renewal. You'll retain access until{" "}
                {profile.subscription_end_date 
                  ? format(new Date(profile.subscription_end_date), "MMM d, yyyy")
                  : "the end of your billing period"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Billing;
