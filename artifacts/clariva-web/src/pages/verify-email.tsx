import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Sparkles, CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function VerifyEmail() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? "";
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(searchString).get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    // Call the verification API
    fetch(`${apiUrl}/api/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");

          // Show success toast
          toast({
            title: "Email Verified!",
            description: "You can now log in to your account.",
          });

          // Redirect to login after 3 seconds
          setTimeout(() => {
            setLocation("/auth?tab=login");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      })
      .catch((error) => {
        setStatus("error");
        setMessage("Network error. Please try again.");
        console.error("Verification error:", error);
      });
  }, [searchString, setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            className="w-10 h-10 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">Clariva</span>
        </div>

        {/* Status Card */}
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-2">Verifying Your Email</h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to login page in 3 seconds...
              </p>
              <Button
                onClick={() => setLocation("/auth?tab=login")}
                className="mt-4"
              >
                Go to Login Now
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => setLocation("/auth?tab=register")}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Request New Verification Link
                </Button>
                <Button
                  onClick={() => setLocation("/auth?tab=login")}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Need help?{" "}
            <span className="text-primary font-medium hover:underline cursor-pointer">
              Contact Support
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
