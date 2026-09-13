import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface LoginViewProps {
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  loginError: string;
  setLoginError: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  setIsLoggedIn: (val: boolean) => void;
}

export default function LoginView({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  setLoginError,
  showPassword,
  setShowPassword,
  setIsLoggedIn,
}: LoginViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password complexity checks
  const hasLower = /[a-z]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^a-zA-Z0-9]/.test(newPassword);
  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasLower && hasUpper && hasNumber && hasSymbol && hasMinLength;
  const isOtpValid = otpCode.trim().length >= 6;
  const canSubmitReset = isPasswordValid && passwordsMatch && isOtpValid && !isForgotLoading;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your admin email.");
      return;
    }
    setForgotError("");
    setForgotSuccess("");
    setIsForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
      if (error) {
        setForgotError(error.message || "Failed to send reset code.");
        return;
      }
      setForgotSuccess("Verification code sent to your email!");
      setForgotStep(2);
      setResendCooldown(60);
    } catch (err: any) {
      setForgotError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isForgotLoading) return;
    setForgotError("");
    setForgotSuccess("");
    setIsForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
      if (error) {
        setForgotError(error.message || "Failed to resend reset code.");
        return;
      }
      setForgotSuccess("A new verification code has been sent!");
      setResendCooldown(60);
    } catch (err: any) {
      setForgotError(err?.message || "Failed to resend code.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setForgotError("Please enter the verification code.");
      return;
    }
    if (!isPasswordValid) {
      setForgotError("Password must be at least 8 characters and include a lowercase letter, uppercase letter, number, and special symbol.");
      return;
    }
    if (!passwordsMatch) {
      setForgotError("Passwords do not match.");
      return;
    }

    setIsForgotLoading(true);
    try {
      // 1. Verify OTP with recovery type
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: otpCode.trim(),
        type: "recovery",
      });

      if (verifyError || !data?.user) {
        setForgotError(verifyError?.message || "Invalid or expired verification code.");
        return;
      }

      // 2. Validate user role is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        setForgotError("Unauthorized. This account is not an administrator.");
        return;
      }

      // 3. Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setForgotError(updateError.message || "Failed to update password.");
        return;
      }

      // 4. Sign out so user logs in cleanly with new credentials
      await supabase.auth.signOut();

      alert("Admin password updated successfully! Please log in with your new password.");
      setShowForgotModal(false);
      setLoginEmail(forgotEmail.trim());
      setLoginPassword("");
      setForgotStep(1);
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setForgotError(err?.message || "Failed to reset password.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter both email and password.");
      return;
    }
    if (!loginEmail.includes("@")) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setLoginError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message.includes("Invalid login credentials")) {
          setLoginError("Invalid credentials. Please check your email and password.");
        } else if (error.message.includes("Email not confirmed")) {
          setLoginError("Email not confirmed. Please verify your email first.");
        } else {
          setLoginError(error.message || "Authentication failed. Please try again.");
        }
        return;
      }

      // Only navigate to dashboard if we have a valid session and user
      if (data?.session && data?.user) {
        setIsLoggedIn(true);
      } else {
        setLoginError("Login failed. No valid session returned.");
      }
    } catch (err: any) {
      setLoginError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f3f8fc] p-4 text-center select-none font-sans">
      <div className="flex flex-col items-center w-full max-w-sm mt-4">
        {/* Uploaded Logo */}
        <img src="/branding/toda_go_logo_dark.png" alt="Tricycle Icon" className="w-56 h-auto object-contain mt-10 mb-5" />

        {/* App Description */}
        <p className="text-[#2b4bb5] text-sm tracking-wide mt-1">
          Booking App
        </p>

        {/* Welcome Headers */}
        <h2 className="text-[#000C7D] font-extrabold text-[28px] tracking-tight mt-10 mb-1">
          Welcome Admin
        </h2>
        <p className="text-[#000C7D]/80 text-sm font-medium mb-8">
          Log in to your admin account
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5" autoComplete="off">
          {/* Email Field */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[#000C7D] text-sm font-medium self-start pl-1">
              Email
            </label>
            <div className="bg-[#000C7D] text-white rounded-2xl flex items-center px-4 py-3.5 w-full transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 mr-3 shrink-0">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="email"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
                  if (loginError) setLoginError("");
                }}
                className="bg-transparent border-none outline-none text-white placeholder-white/50 text-sm font-semibold w-full"
                style={{ backgroundColor: "transparent", color: "white" }}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[#000C7D] text-sm font-medium self-start pl-1">
              Password
            </label>
            <div className="bg-[#000C7D] text-white rounded-2xl flex items-center px-4 py-3.5 w-full transition-all relative">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 mr-3 shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (loginError) setLoginError("");
                }}
                className="bg-transparent border-none outline-none text-white placeholder-white/50 text-sm font-semibold w-full pr-10"
                style={{ backgroundColor: "transparent", color: "white" }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-white/70 hover:text-white transition-colors cursor-pointer"
                aria-label="Toggle Password Visibility"
              >
                {!showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          {/* <div className="flex justify-end w-full -mt-2">
            <button
              type="button"
              onClick={() => {
                setForgotEmail(loginEmail);
                setForgotError("");
                setForgotSuccess("");
                setForgotStep(1);
                setShowForgotModal(true);
              }}
              className="text-xs font-semibold text-[#000C7D] hover:underline cursor-pointer"
            >
              Forgot Password?
            </button>
          </div> */}

          {/* Error Message */}
          {loginError && (
            <p className="text-rose-600 text-xs font-bold text-center">
              {loginError}
            </p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`${isLoading
                ? "bg-[#5b7af5]/70 cursor-not-allowed"
                : "bg-[#5b7af5] hover:bg-[#4f73f6] active:bg-blue-700 cursor-pointer"
              } text-white font-extrabold text-base py-4 px-6 rounded-2xl w-full shadow-md hover:shadow-lg transition-all mt-4`}
          >
            {isLoading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-100">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#000C7D] flex items-center justify-center font-black">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-[#000C7D]">Reset Admin Password</h3>
                <p className="text-xs text-slate-400 font-semibold">
                  {forgotStep === 1 ? "Enter your email to receive a verification code" : "Verify code & set new password"}
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
                {forgotSuccess}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500">Admin Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@todago.ph"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D] focus:ring-1 focus:ring-[#000C7D]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#000C7D] text-xs font-bold text-white hover:bg-blue-900 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isForgotLoading ? "Sending Code..." : "Send Verification Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500">Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Enter code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-widest font-black text-[#000C7D] outline-hidden focus:border-[#000C7D] focus:ring-1 focus:ring-[#000C7D]"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">Check your inbox at <b>{forgotEmail}</b></p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D] focus:ring-1 focus:ring-[#000C7D]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#000C7D] outline-hidden focus:border-[#000C7D] focus:ring-1 focus:ring-[#000C7D]"
                  />
                </div>

                {/* Real-time Password Requirements Checklist */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 flex flex-col gap-2 text-xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Password Requirements:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                    <span className={`flex items-center gap-1.5 transition-colors ${hasLower ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${hasLower ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{hasLower ? "✓" : "○"}</span>
                      Lowercase (a-z)
                    </span>
                    <span className={`flex items-center gap-1.5 transition-colors ${hasUpper ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${hasUpper ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{hasUpper ? "✓" : "○"}</span>
                      Uppercase (A-Z)
                    </span>
                    <span className={`flex items-center gap-1.5 transition-colors ${hasNumber ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${hasNumber ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{hasNumber ? "✓" : "○"}</span>
                      Number (0-9)
                    </span>
                    <span className={`flex items-center gap-1.5 transition-colors ${hasSymbol ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${hasSymbol ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{hasSymbol ? "✓" : "○"}</span>
                      Symbol (!@#$...)
                    </span>
                    <span className={`flex items-center gap-1.5 transition-colors ${hasMinLength ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${hasMinLength ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{hasMinLength ? "✓" : "○"}</span>
                      Min. 8 characters
                    </span>
                    <span className={`flex items-center gap-1.5 transition-colors ${passwordsMatch ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${passwordsMatch ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{passwordsMatch ? "✓" : "○"}</span>
                      Passwords match
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isForgotLoading}
                    onClick={handleResendOtp}
                    className="text-xs font-bold text-[#000C7D] hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>

                <div className="flex justify-end gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError("");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmitReset}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${canSubmitReset
                        ? "bg-[#000C7D] text-white hover:bg-blue-900 shadow-sm cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60"
                      }`}
                  >
                    {isForgotLoading ? "Verifying..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
