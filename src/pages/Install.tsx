import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Download,
  Smartphone,
  Wifi,
  WifiOff,
  Zap,
  CheckCircle2,
  ArrowLeft,
  Share,
  Plus,
} from "lucide-react";

const Install = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const benefits = [
    {
      icon: WifiOff,
      title: "Works Offline",
      description: "Log workouts even without internet. Data syncs when you're back online.",
    },
    {
      icon: Zap,
      title: "Instant Loading",
      description: "App launches immediately from your home screen, no browser delay.",
    },
    {
      icon: Smartphone,
      title: "Full Screen Experience",
      description: "No browser bars - just your workout, like a native app.",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 py-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Install App</h1>
        </div>

        {/* App Preview Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-display">GC</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Golf Coach</h2>
                <p className="text-sm opacity-90">Performance Training</p>
              </div>
            </div>
          </div>
          <CardContent className="p-4">
            {isInstalled ? (
              <div className="flex items-center gap-3 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">App is installed!</span>
              </div>
            ) : isInstallable ? (
              <Button className="w-full" size="lg" onClick={promptInstall}>
                <Download className="h-5 w-5 mr-2" />
                Install App
              </Button>
            ) : isIOS ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  To install on iPhone/iPad:
                </p>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tap the Share button</p>
                    <Share className="h-5 w-5 text-muted-foreground mt-1" />
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tap "Add to Home Screen"</p>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                      <Plus className="h-4 w-4" />
                      <span className="text-xs">Add to Home Screen</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Visit this page in Chrome or Safari to install the app.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Why Install?</h3>
          {benefits.map((benefit) => (
            <Card key={benefit.title}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {benefit.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back Button */}
        <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
          Back to App
        </Button>
      </div>
    </div>
  );
};

export default Install;
