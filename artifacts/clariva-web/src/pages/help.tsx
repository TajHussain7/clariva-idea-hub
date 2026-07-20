import {
  HelpCircle,
  Sparkles,
  Lightbulb,
  Users,
  Globe,
  Trophy,
  BarChart2,
  GitCompare,
  Mail,
  MessageCircle,
  Github,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  TrendingUp,
  Settings,
  BookOpen,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  steps,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  steps?: string[];
}) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardHeader>
      {steps && steps.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function Help() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl pb-16">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Help Center
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Everything you need to know about Clariva
            </p>
          </div>
        </div>
      </div>

      {/* System Purpose */}
      <section className="mb-10">
        <SectionHeader
          icon={Sparkles}
          title="What is Clariva?"
          description="Your AI-powered innovation platform"
        />
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-base text-foreground leading-relaxed mb-4">
              Clariva is an intelligent idea management platform that helps
              individuals and teams transform their creative concepts into
              actionable insights. Powered by advanced AI analysis, Clariva
              evaluates your ideas across multiple dimensions including
              uniqueness, feasibility, impact, and innovation potential.
            </p>
            <p className="text-base text-foreground leading-relaxed">
              Whether you're an entrepreneur, product manager, researcher, or
              creative professional, Clariva provides the tools you need to
              validate, refine, and share your ideas with a community of
              innovators.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Quick Start Tour */}
      <section className="mb-10">
        <SectionHeader
          icon={Play}
          title="Quick Start Tour"
          description="Get started with Clariva in minutes"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-emerald-600">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">
                Submit Your Idea
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Navigate to "My Ideas" and click "New Idea" to submit your
                concept with a title, domain, and detailed description.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-600">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">
                AI Analysis
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Our AI engine analyzes your idea, providing scores, insights,
                and actionable recommendations within seconds.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-violet-600">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">
                Review Insights
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Explore detailed analysis including scores, strengths,
                weaknesses, risks, and tech stack recommendations.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-amber-600">4</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">
                Share & Collaborate
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Publish your idea to the Public Feed to receive votes, comments,
                and collaboration offers from the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="mb-10">
        <SectionHeader
          icon={BookOpen}
          title="Main Features"
          description="Explore everything Clariva has to offer"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FeatureCard
            icon={Lightbulb}
            title="My Ideas"
            description="Your personal idea workspace where all your submitted concepts are stored and managed."
            steps={[
              'Click "New Idea" button to submit a new concept',
              "Fill in title, domain (e.g., Technology, Healthcare, Education), and detailed description",
              "Submit and wait for AI analysis to complete",
              "View results with comprehensive scores and insights",
              "Publish to Public Feed to get community feedback",
            ]}
          />

          <FeatureCard
            icon={BarChart2}
            title="AI Insights"
            description="Powerful AI-driven analysis that evaluates your ideas across multiple dimensions."
            steps={[
              "Uniqueness Score: How original your idea is",
              "Feasibility Score: How realistic implementation is",
              "Impact Score: Potential market and social impact",
              "Innovation Score: Level of creative advancement",
              "Market context, tech stack suggestions, and GitHub projects",
            ]}
          />

          <FeatureCard
            icon={Globe}
            title="Public Feed"
            description="Community platform where you can discover, vote on, and collaborate on ideas."
            steps={[
              "Browse trending and recent ideas from the community",
              "Search ideas by keywords using AI-powered search",
              "Vote on ideas you find interesting or valuable",
              "Comment and discuss ideas with other users",
              "Send collaboration offers to idea owners",
              "View detailed AI analysis for published ideas",
            ]}
          />

          <FeatureCard
            icon={GitCompare}
            title="Compare Ideas"
            description="Side-by-side comparison tool to evaluate multiple ideas simultaneously."
            steps={[
              "Select two or more ideas from your collection",
              "View scores, strengths, and weaknesses side by side",
              "Compare market context and tech recommendations",
              "Make informed decisions about which ideas to pursue",
            ]}
          />

          <FeatureCard
            icon={Users}
            title="Teams"
            description="Collaborate with others in dedicated team workspaces."
            steps={[
              "Create a team or join existing teams via invitation",
              "Share ideas exclusively with team members",
              "Participate in team discussions and brainstorming",
              "Track team presence and active members",
              "Collaborate on team-specific challenges and projects",
            ]}
          />

          <FeatureCard
            icon={Trophy}
            title="Weekly Challenge"
            description="Participate in themed challenges to test your creativity and win recognition."
            steps={[
              "Check the current active challenge and theme",
              "Submit ideas specifically for the challenge",
              "Community votes determine the winner",
              "Automatic winner selection at the end of each week",
              "Earn recognition and build your reputation",
            ]}
          />

          <FeatureCard
            icon={TrendingUp}
            title="Dashboard"
            description="Your personalized overview with key metrics and recent activity."
            steps={[
              "View total ideas submitted and analyzed",
              "Track votes and engagement on your public ideas",
              "Monitor active collaborations and offers",
              "See recent activity and notifications at a glance",
            ]}
          />

          <FeatureCard
            icon={Settings}
            title="Settings"
            description="Customize your profile, preferences, and account security."
            steps={[
              "Update profile picture, name, and bio",
              "Change password and manage security",
              "Choose between light and dark themes",
              "Configure notification preferences",
              "Select your preferred language",
            ]}
          />
        </div>
      </section>

      {/* How to Use Key Features */}
      <section className="mb-10">
        <SectionHeader
          icon={Zap}
          title="How to Use Key Features"
          description="Step-by-step guides for common tasks"
        />
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                How to Submit and Analyze an Idea
              </h3>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Navigate to{" "}
                  <span className="font-medium text-foreground">
                    "My Ideas"
                  </span>{" "}
                  from the sidebar
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Click the{" "}
                  <span className="font-medium text-foreground">
                    "New Idea"
                  </span>{" "}
                  button in the top navigation
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>Enter a clear, descriptive title for your idea</p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Select the most relevant domain (Technology, Healthcare,
                  Education, etc.)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Write a detailed description explaining your idea, problem it
                  solves, and potential impact
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Click{" "}
                  <span className="font-medium text-foreground">
                    "Submit for Analysis"
                  </span>{" "}
                  and wait for AI processing
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Review your results including scores, insights, and
                  recommendations
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                How to Search and Collaborate on Public Feed
              </h3>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Go to{" "}
                  <span className="font-medium text-foreground">
                    "Public Feed"
                  </span>{" "}
                  from the sidebar
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Use the search bar below the tabs to find ideas by keywords
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  The AI will analyze your query and return the most relevant
                  ideas
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>Click the vote button to upvote ideas you find valuable</p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Click{" "}
                  <span className="font-medium text-foreground">
                    "Collaborate"
                  </span>{" "}
                  to send an offer to the idea owner
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Write a message explaining how you'd like to help or
                  collaborate
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Track your offers in the{" "}
                  <span className="font-medium text-foreground">
                    "Collaboration / Offers"
                  </span>{" "}
                  tab
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-violet-500" />
                How to Manage Your Profile
              </h3>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Click your profile icon in the top-right corner to go to
                  Settings
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Upload a profile picture by clicking the upload icon on your
                  avatar
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>Update your display name, bio, and contact information</p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Switch between light and dark themes based on your preference
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Configure notification settings for weekly digests and
                  analysis updates
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>Change your password in the security section when needed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact & Support */}
      <section>
        <SectionHeader
          icon={MessageCircle}
          title="Contact & Support"
          description="Get help when you need it"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card hover:border-primary/30 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">
                Email Support
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Get help from our support team
              </p>
              <a
                href="mailto:tajamalkhan720@gmail.com"
                className="text-sm font-medium text-primary hover:underline"
              >
                support@clariva.com
              </a>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/30 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Github className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">
                GitHub
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Report bugs or request features
              </p>
              <a
                href="https://github.com/TajHussain7/clariva-idea-hub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                github.com/clariva
              </a>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/30 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">
                Documentation
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Detailed guides and API docs
              </p>
              <a
                href="https://github.com/TajHussain7/clariva-idea-hub/blob/develop/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                docs.clariva.com
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border">
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-semibold text-foreground">
              Need immediate assistance?
            </span>{" "}
            Our support team typically responds within 24 hours on business
            days. For urgent issues, please use the email contact above.
          </p>
        </div>
      </section>
    </div>
  );
}
