import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

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

function withTimeout<T>(promise: PromiseLike<T>, label: string, timeoutMs = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Check the internet connection and try again.`));
    }, timeoutMs);

    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timer));
  });
}

async function resultFromError(error: Error): Promise<AdminAccountActionResult> {
  if (error instanceof FunctionsHttpError) {
    const errorBody = await error.context.json().catch(() => null);
    return {
      success: false,
      error: errorBody?.error ?? errorBody?.message ?? error.message,
    };
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return { success: false, error: error.message };
  }

  return { success: false, error: error.message };
}

export async function createAdminAccount(
  params: CreateAdminParams,
): Promise<AdminAccountActionResult> {
  if (!params.fullName.trim() || !params.email.trim() || !params.password.trim()) {
    return { success: false, error: "Name, email, and password are required." };
  }

  const { data, error } = await withTimeout(supabase.functions.invoke("create-admin-account", {
    body: {
      ...params,
      phone: params.phone?.trim() || undefined,
    },
  }), "create admin account", 25000);

  if (error) return resultFromError(error);
  if (data?.success === false) {
    return { success: false, error: data.error ?? "Admin account creation failed." };
  }

  return {
    success: true,
    adminId: data?.adminId,
    adminName: data?.adminName ?? params.fullName,
  };
}

export async function setAdminAccountActive(
  adminId: string,
  isActive: boolean,
): Promise<AdminAccountActionResult> {
  const { data, error } = await withTimeout(supabase.functions.invoke("manage-admin-account", {
    body: { adminId, isActive },
  }), "update admin account status", 20000);

  if (error) return resultFromError(error);
  if (data?.success === false) {
    return { success: false, error: data.error ?? "Admin account update failed." };
  }

  return { success: true };
}

export async function updateAdminAccount(
  adminId: string,
  updates: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
  },
): Promise<AdminAccountActionResult> {
  if (!updates.fullName.trim() || !updates.email.trim()) {
    return { success: false, error: "Name and email are required." };
  }

  const { data, error } = await withTimeout(supabase.functions.invoke("manage-admin-account", {
    body: {
      adminId,
      fullName: updates.fullName,
      email: updates.email,
      phone: updates.phone,
      password: updates.password?.trim() || undefined,
    },
  }), "update admin account", 20000);

  if (error) return resultFromError(error);
  if (data?.success === false) {
    return { success: false, error: data.error ?? "Admin account update failed." };
  }

  return { success: true };
}

export async function deleteAdminAccount(
  adminId: string,
): Promise<AdminAccountActionResult> {
  const { data, error } = await withTimeout(supabase.functions.invoke("manage-admin-account", {
    body: { adminId, deleteAccount: true },
  }), "delete admin account", 20000);

  if (error) return resultFromError(error);
  if (data?.success === false) {
    return { success: false, error: data.error ?? "Admin account deletion failed." };
  }

  return { success: true };
}

export async function resetAdminPassword(
  adminId: string,
  password: string,
): Promise<AdminAccountActionResult> {
  if (password.trim().length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  const { data, error } = await withTimeout(supabase.functions.invoke("manage-admin-account", {
    body: { adminId, password },
  }), "reset admin password", 20000);

  if (error) return resultFromError(error);
  if (data?.success === false) {
    return { success: false, error: data.error ?? "Admin password reset failed." };
  }

  return { success: true };
}
