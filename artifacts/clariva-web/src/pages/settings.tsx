import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ElementType,
} from "react";
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

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

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

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
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

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  error,
  visible,
  onToggleVisibility,
  autoComplete,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  visible: boolean;
  onToggleVisibility: () => void;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-10 bg-background border-border pr-10 focus-visible:ring-primary/30 focus-visible:border-primary"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
        >
          {visible ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function readError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read image file"));
      }
    };

    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
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
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const [language, setLanguage] = useState("en-US");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
    deletePassword: false,
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", phone: "", bio: "" },
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
    });
    setLanguage(user.language ?? "en-US");
    setAvatarPreview(user.avatarUrl ?? "");
    setAvatarFileName("");
    setAvatarError(null);

    if (user.theme === "light" || user.theme === "dark") {
      setTheme(user.theme);
    }
  }, [profileForm, setTheme, user]);

  const userInitials = getUserInitials(profileForm.watch("name") || user?.name);

  const syncUser = (nextUser: NonNullable<typeof user>) => {
    queryClient.setQueryData(getGetMeQueryKey(), nextUser);
  };

  const openAvatarPicker = () => {
    avatarFileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const extension = getFileExtension(file.name);
    if (
      !ALLOWED_AVATAR_EXTENSIONS.includes(extension) ||
      !ALLOWED_AVATAR_MIME_TYPES.includes(file.type)
    ) {
      setAvatarError("Please choose a JPG, PNG, WEBP, or GIF image.");
      toast({
        variant: "destructive",
        title: "Invalid image type",
        description: "Choose a JPG, PNG, WEBP, or GIF file.",
      });
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setAvatarError("Image must be 2 MB or smaller.");
      toast({
        variant: "destructive",
        title: "Image too large",
        description: "Choose an image that is 2 MB or smaller.",
      });
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setAvatarPreview(dataUrl);
      setAvatarFileName(file.name);
      setAvatarError(null);
    } catch {
      setAvatarError("Could not read the selected image.");
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Could not read the selected image.",
      });
    }
  };

  const handleProfileSave = profileForm.handleSubmit((values) => {
    const previousAvatar = user?.avatarUrl ?? "";

    updateMeMutation.mutate(
      {
        data: {
          name: values.name.trim(),
          phone: values.phone?.trim() ? values.phone.trim() : null,
          bio: values.bio?.trim() ? values.bio.trim() : null,
          avatarUrl: avatarPreview || null,
        },
      },
      {
        onSuccess: (updatedUser) => {
          syncUser(updatedUser);
          profileForm.reset({
            name: updatedUser.name ?? "",
            phone: updatedUser.phone ?? "",
            bio: updatedUser.bio ?? "",
          });
          setAvatarPreview(updatedUser.avatarUrl ?? "");
          setAvatarFileName("");
          setAvatarError(null);
          toast({
            title: "Profile updated",
            description: "Your changes were saved immediately.",
          });
        },
        onError: (error) => {
          setAvatarPreview(previousAvatar);
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
            title: "Profile deleted",
            description: "Your account and related data were removed.",
          });
          setLocation("/auth");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Profile deletion failed",
            description: readError(error, "Could not delete your account."),
          });
        },
      },
    );
  });

  const isProfileSaving = updateMeMutation.isPending;
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
            <Avatar className="h-16 w-16 ring-2 ring-primary/15 shrink-0">
              <AvatarImage
                src={avatarPreview || undefined}
                alt={user?.name || "User avatar"}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.name || "Your profile"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || "Signed-in account email"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="gap-2"
                    onClick={openAvatarPicker}
                  >
                    <Upload className="w-4 h-4" />
                    Choose Avatar
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP, or GIF up to 2 MB
                  </span>
                </div>
                {avatarFileName && (
                  <p className="text-xs text-muted-foreground truncate">
                    Selected: {avatarFileName}
                  </p>
                )}
                {avatarError && (
                  <p className="text-xs text-destructive">{avatarError}</p>
                )}
              </div>
            </div>
          </div>

          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            className="hidden"
            onChange={handleAvatarFileChange}
          />

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
                Update Profile
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
            description="Control appearance and language settings."
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

          <div className="flex items-center justify-between gap-4 py-3">
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
            <PasswordField
              label="Current Password"
              placeholder="Enter current password"
              value={passwordForm.watch("currentPassword")}
              onChange={(value) =>
                passwordForm.setValue("currentPassword", value, {
                  shouldValidate: true,
                })
              }
              error={passwordForm.formState.errors.currentPassword?.message}
              visible={passwordVisibility.currentPassword}
              onToggleVisibility={() =>
                setPasswordVisibility((prev) => ({
                  ...prev,
                  currentPassword: !prev.currentPassword,
                }))
              }
              autoComplete="current-password"
            />

            <PasswordField
              label="New Password"
              placeholder="Create a new password"
              value={passwordForm.watch("newPassword")}
              onChange={(value) =>
                passwordForm.setValue("newPassword", value, {
                  shouldValidate: true,
                })
              }
              error={passwordForm.formState.errors.newPassword?.message}
              visible={passwordVisibility.newPassword}
              onToggleVisibility={() =>
                setPasswordVisibility((prev) => ({
                  ...prev,
                  newPassword: !prev.newPassword,
                }))
              }
              autoComplete="new-password"
            />

            <PasswordField
              label="Confirm New Password"
              placeholder="Re-enter the new password"
              value={passwordForm.watch("confirmPassword")}
              onChange={(value) =>
                passwordForm.setValue("confirmPassword", value, {
                  shouldValidate: true,
                })
              }
              error={passwordForm.formState.errors.confirmPassword?.message}
              visible={passwordVisibility.confirmPassword}
              onToggleVisibility={() =>
                setPasswordVisibility((prev) => ({
                  ...prev,
                  confirmPassword: !prev.confirmPassword,
                }))
              }
              autoComplete="new-password"
            />

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
            description="Irreversible action. Confirm carefully before deleting your profile."
          />
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleDeleteAccount} className="space-y-4 max-w-xl">
            <PasswordField
              label="Current Password"
              placeholder="Enter current password"
              value={deleteForm.watch("currentPassword")}
              onChange={(value) =>
                deleteForm.setValue("currentPassword", value, {
                  shouldValidate: true,
                })
              }
              error={deleteForm.formState.errors.currentPassword?.message}
              visible={passwordVisibility.deletePassword}
              onToggleVisibility={() =>
                setPasswordVisibility((prev) => ({
                  ...prev,
                  deletePassword: !prev.deletePassword,
                }))
              }
              autoComplete="current-password"
            />

            <p className="text-xs text-muted-foreground">
              This permanently deletes your profile, ideas, analyses, and
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
                Delete Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
