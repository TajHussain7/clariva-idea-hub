import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Globe,
  Lock,
  Loader2,
  Moon,
  Save,
  Shield,
  Sun,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  useChangePassword,
  useDeleteMe,
  useGetMe,
  useUpdateMe,
} from "@workspace/api-client-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { getUserInitials } from "@/lib/user";

const ACCEPTED_AVATAR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB

const profileSchema = z.object({
  name: z.string().min(2, "Display name must be at least 2 characters"),
  phone: z
    .string()
    .max(32, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(280, "Bio must be 280 characters or less")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Minimum 8 characters")
      .refine((val) => /[A-Z]/.test(val), "One uppercase letter required")
      .refine((val) => /[a-z]/.test(val), "One lowercase letter required")
      .refine((val) => /[0-9]/.test(val), "One number required")
      .refine(
        (val) => /[^A-Za-z0-9]/.test(val),
        "One special character required",
      ),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const deleteSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});

const languageOptions = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
];

const notificationDefaults = {
  weeklyDigest: false,
  analysisComplete: true,
};

type NotificationKey = keyof typeof notificationDefaults;

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
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-10 rounded-full transition-colors duration-200 shrink-0 ${
          checked ? "bg-primary" : "bg-muted"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        style={{ height: "22px" }}
      >
        <span
          className="absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform duration-200"
          style={{
            width: "18px",
            height: "18px",
            transform: checked ? "translateX(18px)" : "translateX(0)",
          }}
        />
      </button>
    </div>
  );
}

function PasswordInput({
  visible,
  onToggleVisible,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={`pr-10 ${className ?? ""}`}
        {...props}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function readError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function Settings() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme, setTheme } = useTheme();
  const updateMeMutation = useUpdateMe();
  const changePasswordMutation = useChangePassword();
  const deleteMeMutation = useDeleteMe();

  const [notifications, setNotifications] = useState(notificationDefaults);
  const [language, setLanguage] = useState("en-US");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      bio: "",
      avatarUrl: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const deleteForm = useForm<z.infer<typeof deleteSchema>>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { currentPassword: "" },
  });

  useEffect(() => {
    if (!user) return;

    profileForm.reset({
      name: user.name ?? "",
      phone: user.phone ?? "",
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl ?? "",
    });

    setNotifications({
      weeklyDigest:
        user.notifications?.weeklyDigest ?? notificationDefaults.weeklyDigest,
      analysisComplete:
        user.notifications?.analysisComplete ??
        notificationDefaults.analysisComplete,
    });

    setLanguage(user.language ?? "en-US");

    if (user.theme === "light" || user.theme === "dark") {
      setTheme(user.theme);
    }
  }, [profileForm, setTheme, user]);

  const userInitials = getUserInitials(profileForm.watch("name") || user?.name);
  const avatarUrl = profileForm.watch("avatarUrl") || user?.avatarUrl || "";

  const syncUser = (nextUser: NonNullable<typeof user>) => {
    queryClient.setQueryData(getGetMeQueryKey(), nextUser);
  };

  const handleProfileSave = profileForm.handleSubmit((values) => {
    updateMeMutation.mutate(
      {
        data: {
          name: values.name.trim(),
          phone: values.phone?.trim() ? values.phone.trim() : null,
          bio: values.bio?.trim() ? values.bio.trim() : null,
          avatarUrl: values.avatarUrl?.trim() ? values.avatarUrl.trim() : null,
        },
      },
      {
        onSuccess: (updatedUser) => {
          syncUser(updatedUser);
          toast({
            title: "Profile saved",
            description: "Your changes were saved immediately.",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Profile update failed",
            description: readError(
              error,
              "Could not save your profile changes.",
            ),
          });
        },
      },
    );
  });

  const handleAvatarFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError(null);

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Only PNG, JPG, WEBP, or GIF images are allowed.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be 3MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      profileForm.setValue("avatarUrl", dataUrl, { shouldDirty: true });
    };
    reader.onerror = () => {
      setAvatarError("Could not read the selected image. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleThemeToggle = () => {
    const currentTheme = theme;
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    updateMeMutation.mutate(
      { data: { theme: nextTheme } },
      {
        onSuccess: (updatedUser) => {
          syncUser(updatedUser);
        },
        onError: (error) => {
          setTheme(currentTheme);
          toast({
            variant: "destructive",
            title: "Theme update failed",
            description: readError(
              error,
              "Could not save your theme preference.",
            ),
          });
        },
      },
    );
  };

  const handleLanguageChange = (nextLanguage: string) => {
    const previousLanguage = language;
    setLanguage(nextLanguage);

    updateMeMutation.mutate(
      { data: { language: nextLanguage } },
      {
        onSuccess: (updatedUser) => {
          syncUser(updatedUser);
          toast({
            title: "Language updated",
            description: "Your preference was saved.",
          });
        },
        onError: (error) => {
          setLanguage(previousLanguage);
          toast({
            variant: "destructive",
            title: "Language update failed",
            description: readError(
              error,
              "Could not save your language preference.",
            ),
          });
        },
      },
    );
  };

  const handleToggleNotification = (key: NotificationKey, value: boolean) => {
    const previous = notifications;
    const nextNotifications = { ...previous, [key]: value };
    setNotifications(nextNotifications);

    updateMeMutation.mutate(
      { data: { notifications: nextNotifications } },
      {
        onSuccess: (updatedUser) => {
          syncUser(updatedUser);
        },
        onError: (error) => {
          setNotifications(previous);
          toast({
            variant: "destructive",
            title: "Notification update failed",
            description: readError(
              error,
              "Could not save notification settings.",
            ),
          });
        },
      },
    );
  };

  const handlePasswordChange = passwordForm.handleSubmit((values) => {
    changePasswordMutation.mutate(
      {
        data: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      },
      {
        onSuccess: () => {
          passwordForm.reset({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          toast({
            title: "Password updated",
            description: "Your password was changed successfully.",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Password update failed",
            description: readError(error, "Could not update your password."),
          });
        },
      },
    );
  });

  const handleDeleteAccount = deleteForm.handleSubmit((values) => {
    deleteMeMutation.mutate(
      { data: { currentPassword: values.currentPassword } },
      {
        onSuccess: () => {
          queryClient.clear();
          toast({
            title: "Account deleted",
            description: "Your account and related data were removed.",
          });
          setLocation("/auth");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Account deletion failed",
            description: readError(error, "Could not delete your account."),
          });
        },
      },
    );
  });

  const isProfileSaving = updateMeMutation.isPending;
  const isThemeSaving = updateMeMutation.isPending;
  const isPasswordSaving = changePasswordMutation.isPending;
  const isDeleteSaving = deleteMeMutation.isPending;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile, preferences, and account security.
        </p>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="border-b border-border pb-5">
          <SectionHeader
            icon={User}
            title="Profile"
            description="Update the profile details shown across the app."
          />
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16 ring-2 ring-primary/15">
                <AvatarImage
                  src={avatarUrl || undefined}
                  alt={user?.name || "User avatar"}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
                title="Upload a new photo"
                aria-label="Upload a new photo"
              >
                <Upload className="w-3 h-3" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.name || "Your profile"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "Signed-in account email"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 gap-2"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                Change Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">
                PNG, JPG, WEBP, or GIF. 3MB max.
              </p>
              {avatarError && (
                <p className="text-xs text-destructive mt-1">{avatarError}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Display Name
              </label>
              <Input
                {...profileForm.register("name")}
                placeholder="Your name"
                className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
              />
              {profileForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email Address
              </label>
              <Input
                value={user?.email || ""}
                readOnly
                className="h-10 bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Email changes are not supported from Settings.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phone Number
              </label>
              <Input
                {...profileForm.register("phone")}
                placeholder="(555) 123-4567"
                className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
              />
              {profileForm.formState.errors.phone && (
                <p className="text-xs text-destructive">
                  {profileForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bio
              </label>
              <textarea
                {...profileForm.register("bio")}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                placeholder="Tell us about yourself..."
              />
              {profileForm.formState.errors.bio && (
                <p className="text-xs text-destructive">
                  {profileForm.formState.errors.bio.message}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                className="gap-2"
                type="submit"
                disabled={isProfileSaving}
              >
                {isProfileSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="border-b border-border pb-5">
          <SectionHeader
            icon={Globe}
            title="Preferences"
            description="Control appearance and notification behavior."
          />
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Switch between light and dark mode.
              </p>
            </div>
            <button
              type="button"
              onClick={handleThemeToggle}
              disabled={isThemeSaving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted text-sm font-medium hover:bg-muted/70 transition-colors disabled:opacity-60"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-primary" />
                  Dark Mode
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Language</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Store your preferred interface language.
              </p>
            </div>
            <select
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <ToggleSwitch
            checked={notifications.weeklyDigest}
            onChange={(value) =>
              handleToggleNotification("weeklyDigest", value)
            }
            label="Weekly Digest Email"
            description="A curated summary of all AI insights, every Monday."
            disabled={updateMeMutation.isPending}
          />
          <ToggleSwitch
            checked={notifications.analysisComplete}
            onChange={(value) =>
              handleToggleNotification("analysisComplete", value)
            }
            label="Analysis Complete"
            description="Notify when an idea finishes AI analysis."
            disabled={updateMeMutation.isPending}
          />
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="border-b border-border pb-5">
          <SectionHeader
            icon={Lock}
            title="Security"
            description="Change your password with your current session."
          />
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Password
              </label>
              <PasswordInput
                visible={showCurrentPassword}
                onToggleVisible={() => setShowCurrentPassword((prev) => !prev)}
                {...passwordForm.register("currentPassword")}
                className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                New Password
              </label>
              <PasswordInput
                visible={showNewPassword}
                onToggleVisible={() => setShowNewPassword((prev) => !prev)}
                {...passwordForm.register("newPassword")}
                className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Confirm New Password
              </label>
              <PasswordInput
                visible={showConfirmPassword}
                onToggleVisible={() => setShowConfirmPassword((prev) => !prev)}
                {...passwordForm.register("confirmPassword")}
                className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                className="gap-2"
                type="submit"
                disabled={isPasswordSaving}
              >
                {isPasswordSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card border-destructive/20 shadow-sm">
        <CardHeader className="border-b border-border pb-5">
          <SectionHeader
            icon={Trash2}
            title="Danger Zone"
            description="Irreversible action. Confirm carefully before deleting your account."
          />
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleDeleteAccount} className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Password
              </label>
              <PasswordInput
                visible={showDeletePassword}
                onToggleVisible={() => setShowDeletePassword((prev) => !prev)}
                {...deleteForm.register("currentPassword")}
                className="h-10 bg-background border-border focus-visible:ring-destructive/30 focus-visible:border-destructive"
              />
              {deleteForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {deleteForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              This permanently deletes your account, ideas, analyses, and
              related content.
            </p>

            <div className="flex justify-end pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                type="submit"
                disabled={isDeleteSaving}
              >
                {isDeleteSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
