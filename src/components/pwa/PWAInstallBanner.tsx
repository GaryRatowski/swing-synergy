import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone } from "lucide-react";

const PWAInstallBanner = () => {
  const { isInstallable, showInstallBanner, promptInstall, dismissBanner } = usePWAInstall();

  // Only show if installable and banner should be shown
  if (!showInstallBanner || !isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="bg-primary text-primary-foreground shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Smartphone className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Install Golf Coach</p>
              <p className="text-xs opacity-90 mt-0.5">
                Add to your home screen for offline access and a faster experience.
              </p>
              
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  onClick={promptInstall}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={dismissBanner}
                >
                  Not Now
                </Button>
              </div>
            </div>
            
            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0 h-8 w-8 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={dismissBanner}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallBanner;
