import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] gradient-hero overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-primary-foreground/20 blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative container mx-auto px-4 py-20 lg:py-32 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="animate-in-up mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-primary-foreground text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Now accepting new athletes
          </span>
        </div>

        {/* Main heading */}
        <h1 className="animate-in-up stagger-1 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-primary-foreground tracking-wide mb-6 max-w-5xl">
          UNLOCK YOUR
          <span className="block text-accent">GOLF POTENTIAL</span>
        </h1>

        {/* Subheading */}
        <p className="animate-in-up stagger-2 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mb-10 leading-relaxed">
          Elite golf performance coaching combining cutting-edge strength training, 
          mobility work, and speed development to transform your game.
        </p>

        {/* CTAs */}
        <div className="animate-in-up stagger-3 flex flex-col sm:flex-row gap-4 mb-16">
          <Button asChild size="lg" variant="accent" className="text-lg px-8 h-14">
            <Link to="/auth">
              Start Training
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="text-lg px-8 h-14 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/10">
            <a href="#programs">
              <Play className="mr-2 h-5 w-5" />
              View Programs
            </a>
          </Button>
        </div>

        {/* Stats */}
        <div className="animate-in-up stagger-4 grid grid-cols-3 gap-8 md:gap-16 pt-8 border-t border-primary-foreground/10">
          <div>
            <div className="font-display text-4xl md:text-5xl text-accent mb-1">50+</div>
            <div className="text-sm md:text-base text-primary-foreground/60">Active Athletes</div>
          </div>
          <div>
            <div className="font-display text-4xl md:text-5xl text-accent mb-1">15+</div>
            <div className="text-sm md:text-base text-primary-foreground/60">MPH Avg. Gain</div>
          </div>
          <div>
            <div className="font-display text-4xl md:text-5xl text-accent mb-1">200+</div>
            <div className="text-sm md:text-base text-primary-foreground/60">Golf Exercises</div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
