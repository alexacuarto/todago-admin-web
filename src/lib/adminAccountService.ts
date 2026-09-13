import { supabase } from "./supabase";
import { AdminAccount } from "../types";

export interface CreateAdminParams {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AdminAccountActionResult {
  success: boolean;
  error?: string;
  adminId?: string;
  adminName?: string;
}

/**
 * Fetch all administrator accounts from public.profiles.
 */
export async function fetchAdminAccounts(): Promise<AdminAccount[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, full_name, email, phone_number, created_at, updated_at, role")
      .eq("role", "admin")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching admin accounts:", error);
      throw error;
    }

    if (!data || data.length === 0) return [];

    // The earliest created admin account is designated as the primary admin
    const firstAdminId = data[0]?.id;

    return data.map((row: any, index: number) => {
      const name =
        row.full_name?.trim() ||
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
        row.email?.split("@")[0] ||
        "Admin";

      const createdAtDate = row.created_at
        ? new Date(row.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "-";

      return {
        id: row.id,
        name,
        email: row.email || "",
        phone: row.phone_number || "",
        status: "Active" as const,
        isPrimaryAdmin: row.id === firstAdminId || index === 0,
        createdAt: createdAtDate,
      };
    });
  } catch (err: any) {
    console.error("fetchAdminAccounts exception:", err);
    return [];
  }
}

/**
 * Creates a new administrator account using the secure create_admin_account RPC.
 */
export async function createAdminAccount(
  params: CreateAdminParams,
): Promise<AdminAccountActionResult> {
  const cleanName = params.fullName.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPass = params.password.trim();
  const cleanPhone = params.phone?.trim() || null;

  if (!cleanName || !cleanEmail || !cleanPass) {
    return { success: false, error: "Name, email, and password are required." };
  }

  if (cleanPass.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  const nameParts = cleanName.split(/\s+/);
  const firstName = nameParts[0] || "Admin";
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    const { data, error } = await supabase.rpc("create_admin_account", {
      p_email: cleanEmail,
      p_password: cleanPass,
      p_first_name: firstName,
      p_last_name: lastName,
      p_phone: cleanPhone,
    });

    if (error) {
      console.error("create_admin_account RPC error:", error);
      return { success: false, error: error.message || "Failed to create administrator." };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Administrator account creation failed." };
    }

    return {
      success: true,
      adminId: data.user_id,
      adminName: data.full_name || cleanName,
    };
  } catch (err: any) {
    console.error("createAdminAccount exception:", err);
    return { success: false, error: err.message || "Unexpected error during admin creation." };
  }
}

/**
 * Updates an administrator profile and optionally resets the password.
 */
export async function updateAdminAccount(
  adminId: string,
  updates: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
  },
): Promise<AdminAccountActionResult> {
  const cleanName = updates.fullName.trim();
  const cleanEmail = updates.email.trim().toLowerCase();
  const cleanPhone = updates.phone.trim() || null;

  if (!cleanName || !cleanEmail) {
    return { success: false, error: "Name and email are required." };
  }

  const nameParts = cleanName.split(/\s+/);
  const firstName = nameParts[0] || "Admin";
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    // 1. Update profile row
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        full_name: cleanName,
        email: cleanEmail,
        phone_number: cleanPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", adminId);

    if (profileError) {
      console.error("Failed to update admin profile:", profileError);
      return { success: false, error: profileError.message };
    }

    // 2. Reset password if provided
    if (updates.password && updates.password.trim()) {
      if (updates.password.trim().length < 8) {
        return { success: false, error: "New password must be at least 8 characters." };
      }

      const { data: passData, error: passError } = await supabase.rpc("reset_admin_password", {
        p_admin_id: adminId,
        p_new_password: updates.password.trim(),
      });

      if (passError) {
        console.error("reset_admin_password RPC error:", passError);
        return { success: false, error: passError.message };
      }

      if (!passData?.success) {
        return { success: false, error: passData?.error || "Failed to update admin password." };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("updateAdminAccount exception:", err);
    return { success: false, error: err.message || "Unexpected error updating admin." };
  }
}

/**
 * Deletes an administrator account via delete_admin_account RPC.
 */
export async function deleteAdminAccount(
  adminId: string,
): Promise<AdminAccountActionResult> {
  try {
    const { data, error } = await supabase.rpc("delete_admin_account", {
      p_admin_id: adminId,
    });

    if (error) {
      console.error("delete_admin_account RPC error:", error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Failed to delete admin account." };
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteAdminAccount exception:", err);
    return { success: false, error: err.message || "Unexpected error deleting admin account." };
  }
}

/**
 * Resets an admin's password via reset_admin_password RPC.
 */
export async function resetAdminPassword(
  adminId: string,
  password: string,
): Promise<AdminAccountActionResult> {
  if (password.trim().length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  try {
    const { data, error } = await supabase.rpc("reset_admin_password", {
      p_admin_id: adminId,
      p_new_password: password.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Failed to reset password." };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unexpected error resetting password." };
  }
}
