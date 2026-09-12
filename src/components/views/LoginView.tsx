import React, { useState } from "react";
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
            className={`${
              isLoading
                ? "bg-[#5b7af5]/70 cursor-not-allowed"
                : "bg-[#5b7af5] hover:bg-[#4f73f6] active:bg-blue-700 cursor-pointer"
            } text-white font-extrabold text-base py-4 px-6 rounded-2xl w-full shadow-md hover:shadow-lg transition-all mt-4`}
          >
            {isLoading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
