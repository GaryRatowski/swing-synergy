import { Activity, BarChart3, Calendar, Dumbbell, MessageSquare, Target, TrendingUp, Users, Video } from "lucide-react";

const features = [
  {
    icon: Dumbbell,
    title: "Custom Programs",
    description: "Periodized training plans tailored to your golf-specific needs with 200+ exercises."
  },
  {
    icon: TrendingUp,
    title: "Speed Tracking",
    description: "Monitor clubhead speed progress with detailed analytics and benchmarks."
  },
  {
    icon: Activity,
    title: "TPI Assessments",
    description: "Comprehensive mobility screenings to identify and fix swing limitations."
  },
  {
    icon: Video,
    title: "Video Analysis",
    description: "Upload swing videos for form checks and side-by-side comparisons."
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Flexible workout scheduling that fits your practice and play schedule."
  },
  {
    icon: MessageSquare,
    title: "Direct Coaching",
    description: "1-on-1 messaging with your coach for form checks and questions."
  },
  {
    icon: Target,
    title: "Habit Tracking",
    description: "Track hydration, sleep, and recovery habits for optimal performance."
  },
  {
    icon: BarChart3,
    title: "Progress Dashboard",
    description: "Visual progress tracking with photos, metrics, and achievement badges."
  },
  {
    icon: Users,
    title: "Community Access",
    description: "Connect with fellow athletes, share wins, and stay motivated."
  }
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-secondary/50">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Platform Features</span>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Everything You Need to
            <span className="text-primary block">Dominate the Course</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            A comprehensive platform designed specifically for serious golfers looking to gain a competitive edge.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:shadow-gold transition-shadow">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
