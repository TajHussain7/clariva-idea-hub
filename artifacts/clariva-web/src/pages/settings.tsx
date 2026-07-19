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

    if (user) {
      queryClient.setQueryData(getGetMeQueryKey(), {
        ...user,
        theme: nextTheme,
      });
    }

    updateMeMutation.mutate(
      { data: { theme: nextTheme } },
      {
        onSuccess: (updatedUser) => {
          syncUser(updatedUser);
        },
        onError: (error) => {
          setTheme(currentTheme);
          if (user) {
            queryClient.setQueryData(getGetMeQueryKey(), user);
          }
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl pb-24">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile information, security preferences, and interface
          theme.
        </p>
      </div>

      {/* ---- Row 1: Profile Info + Theme ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Profile Info (left, wider) */}
        <Card className="lg:col-span-3 bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={User}
                title="Profile Info"
                description="Update the profile details shown across the app."
              />
              <button
                type="button"
                onClick={handleProfileSave}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Edit Profile
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {/* Avatar row */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-14 w-14 ring-2 ring-primary/15">
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
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
                  title="Upload a new photo"
                >
                  <Upload className="w-2.5 h-2.5" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {user?.name || "Your profile"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || ""}
                </p>
                {avatarError && (
                  <p className="text-xs text-destructive mt-0.5">
                    {avatarError}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              {/* First Name + Last Name side-by-side (use full name field split visually) */}
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
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Biography
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
            </form>
          </CardContent>
        </Card>

        {/* Theme (right, narrower) */}
        <Card className="lg:col-span-2 bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <SectionHeader
              icon={Globe}
              title="Theme"
              description="Choose between a light focused environment or a high-contrast dark mode."
            />
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* Theme box selectors */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => theme !== "light" && handleThemeToggle()}
                disabled={isThemeSaving}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === "light"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Sun
                  className={`w-6 h-6 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-sm font-semibold ${theme === "light" ? "text-primary" : "text-muted-foreground"}`}
                >
                  Light
                </span>
              </button>
              <button
                type="button"
                onClick={() => theme !== "dark" && handleThemeToggle()}
                disabled={isThemeSaving}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === "dark"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Moon
                  className={`w-6 h-6 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-sm font-semibold ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`}
                >
                  Dark
                </span>
              </button>
            </div>

            {/* Language */}
            <div className="pt-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notifications */}
            <div className="border-t border-border pt-4 space-y-1">
              <ToggleSwitch
                checked={notifications.weeklyDigest}
                onChange={(v) => handleToggleNotification("weeklyDigest", v)}
                label="Weekly Digest Email"
                description="A curated summary of all AI insights, every Monday."
                disabled={updateMeMutation.isPending}
              />
              <ToggleSwitch
                checked={notifications.analysisComplete}
                onChange={(v) =>
                  handleToggleNotification("analysisComplete", v)
                }
                label="Analysis Complete"
                description="Notify when an idea finishes AI analysis."
                disabled={updateMeMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Row 2: Change Password (full width) ---- */}
      <Card className="bg-card border-border shadow-sm mb-6">
        <CardHeader className="border-b border-border pb-4">
          <SectionHeader
            icon={Lock}
            title="Change Password"
            description="Update your credentials. You'll need your current password."
          />
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handlePasswordChange}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Password
                </label>
                <PasswordInput
                  visible={showCurrentPassword}
                  onToggleVisible={() => setShowCurrentPassword((p) => !p)}
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
                  onToggleVisible={() => setShowNewPassword((p) => !p)}
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
                  onToggleVisible={() => setShowConfirmPassword((p) => !p)}
                  {...passwordForm.register("confirmPassword")}
                  className="h-10 bg-background border-border focus-visible:ring-primary/30 focus-visible:border-primary"
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => passwordForm.reset()}
              >
                Discard
              </Button>
              <Button
                size="sm"
                type="submit"
                className="gap-2"
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

      {/* ---- Row 3: Danger Zone ---- */}
      <div>
        {/* Danger Zone */}
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h3 className="text-base font-bold text-destructive">
                Danger Zone
              </h3>
            </div>
            <p className="text-sm text-destructive/80 mb-1">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <form onSubmit={handleDeleteAccount} className="mt-4 space-y-3">
              <PasswordInput
                visible={showDeletePassword}
                onToggleVisible={() => setShowDeletePassword((p) => !p)}
                {...deleteForm.register("currentPassword")}
                placeholder="Confirm your password"
                className="h-10 bg-background border-destructive/30 focus-visible:ring-destructive/30 focus-visible:border-destructive"
              />
              {deleteForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {deleteForm.formState.errors.currentPassword.message}
                </p>
              )}
              <Button
                variant="destructive"
                size="sm"
                type="submit"
                className="gap-2"
                disabled={isDeleteSaving}
              >
                {isDeleteSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ---- Floating Save All Changes button ---- */}
      <div className="fixed bottom-6 right-8 z-50">
        <Button
          size="sm"
          className="gap-2 shadow-lg px-5 py-2.5 text-sm"
          onClick={handleProfileSave}
          disabled={isProfileSaving}
        >
          {isProfileSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
