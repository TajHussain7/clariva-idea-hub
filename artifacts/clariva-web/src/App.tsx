import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import { useEffect } from "react";

import { Layout } from "@/components/layout";
import { Auth } from "@/pages/auth";
import { Dashboard } from "@/pages/dashboard";
import { Submit } from "@/pages/submit";
import { Results } from "@/pages/results";
import { Compare } from "@/pages/compare";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Home() {
  const { data: user, isLoading } = useGetMe();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        setLocation("/dashboard");
      } else {
        setLocation("/auth");
      }
    }
  }, [user, isLoading, setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/submit">
        <Layout><Submit /></Layout>
      </Route>
      <Route path="/ideas/:id">
        {(params) => <Layout><Results id={parseInt(params.id)} /></Layout>}
      </Route>
      <Route path="/compare">
        <Layout><Compare /></Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;