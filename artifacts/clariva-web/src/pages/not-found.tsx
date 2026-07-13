import { Link } from "wouter";
import { BarChart2, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {/* Decorative blob */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
      />

      {/* Logo */}
      <div className="flex items-center gap-2 mb-12 relative z-10">
        <div
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: "hsl(var(--primary))" }}
        >
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-xl font-black tracking-tight">Clariva</span>
      </div>

      {/* Error code */}
      <div className="relative z-10">
        <p className="text-[120px] font-black leading-none tracking-tighter text-foreground/[0.06] select-none">
          404
        </p>
        <div className="-mt-14">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="sm" className="gap-2">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
