import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer id="about" className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <span className="font-display text-xl text-accent-foreground">GP</span>
              </div>
              <span className="font-bold text-lg">Golf Performance</span>
            </div>
            <p className="text-primary-foreground/70 max-w-sm leading-relaxed">
              Elite golf performance coaching combining cutting-edge strength training, 
              mobility work, and speed development to transform your game.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm">
                  Pricing
                </a>
              </li>
              <li>
                <Link to="/auth" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2">
              <li className="text-primary-foreground/70 text-sm">
                hello@golfperformance.com
              </li>
              <li className="text-primary-foreground/70 text-sm">
                Follow us on social media
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-primary-foreground/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/50 text-sm">
            © {new Date().getFullYear()} Golf Performance. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-primary-foreground/50 hover:text-primary-foreground text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-primary-foreground/50 hover:text-primary-foreground text-sm">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
