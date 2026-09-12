import { supabase } from "./supabase";

export interface AdminProfile {
  id: string;
  full_name: string;
  email: string | null;
  role: "admin";
  avatar_url: string | null;
  avatar_color: string | null;
  is_active: boolean;
  is_primary_admin: boolean;
}

export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url, avatar_color, is_active, is_primary_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || data.role !== "admin" || data.is_active !== true) {
    await supabase.auth.signOut();
    return null;
  }

  return data as AdminProfile;
}

export async function updateCurrentAdminProfile(updates: {
  fullName?: string;
  avatarUrl?: string | null;
  avatarColor?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be logged in to update your profile.");

  const profileUpdates: Record<string, string | null> = {};
  if (updates.fullName !== undefined) profileUpdates.full_name = updates.fullName.trim();
  if (updates.avatarUrl !== undefined) profileUpdates.avatar_url = updates.avatarUrl;
  if (updates.avatarColor !== undefined) profileUpdates.avatar_color = updates.avatarColor;

  if (Object.keys(profileUpdates).length === 0) return;

  const { error } = await supabase
    .from("profiles")
    .update(profileUpdates)
    .eq("id", user.id);

  if (error) throw error;
}

export async function updateCurrentAdminPassword(currentPassword: string, newPassword: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) throw new Error("You must be logged in to update your password.");

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) throw new Error("Current password is incorrect.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function loginAdmin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const profile = await getCurrentAdminProfile();
  if (!profile) {
    throw new Error("Only active administrator accounts can access the Admin Dashboard.");
  }

  return profile;
}

export async function logoutAdmin() {
  await supabase.auth.signOut();
}
