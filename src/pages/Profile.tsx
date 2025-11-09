import { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { useAuth } from "@/contexts/AuthContext";

const ProfilePage = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, updateProfileData, changePassword } = useAuth();
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const initials = user?.name
    ?.split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("") ?? "U";

  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    try {
      setIsUploading(true);
      const secureUrl = await uploadImageToCloudinary(file);
      await updateProfileData({ photoUrl: secureUrl });
      toast({ title: "Profile photo updated" });
    } catch (error) {
      console.error("Failed to upload profile photo", error);
      toast({
        title: "Failed to update photo",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please confirm your new password.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated" });
    } catch (error) {
      console.error("Failed to change password", error);
      const message =
        error instanceof Error && "code" in error
          ? (error as { code: string; message: string }).code === "auth/invalid-credential"
            ? "Current password is incorrect."
            : (error as { message: string }).message
          : "Please verify your current password and try again.";
      toast({
        title: "Failed to change password",
        description: message,
        variant: "destructive",
      });
      setCurrentPassword("");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading user profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center gap-6">
          <Avatar className="h-20 w-20 border border-border">
            {user.photoUrl ? (
              <AvatarImage src={user.photoUrl} alt={user.name} />
            ) : (
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a square image (minimum 256x256px recommended). The image will be stored on Cloudinary.
            </p>
            <div className="flex gap-3">
              <Button type="button" onClick={handleSelectPhoto} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload new photo"}
              </Button>
              {user.photoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateProfileData({ photoUrl: "" })}
                  disabled={isUploading}
                >
                  Remove photo
                </Button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Name:</span> {user.name}</p>
          <p><span className="font-medium text-foreground">Email:</span> {user.email}</p>
          <p><span className="font-medium text-foreground">Role:</span> {user.role}</p>
          <p><span className="font-medium text-foreground">Student ID:</span> {user.userId}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordChange}>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
