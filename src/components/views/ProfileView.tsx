import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

interface AdminProfile {
  name: string;
  email: string;
  status: string;
  password: string;
  avatarUrl: string;
  avatarColor: string;
  avatarSeed: string;
}

interface ProfileViewProps {
  adminProfile: AdminProfile;
  setAdminProfile: React.Dispatch<React.SetStateAction<AdminProfile>>;
  setActiveTab: (tab: "dashboard" | "ride-requests" | "earnings" | "users" | "feedback" | "profile" | "create-driver" | "fare-settings") => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setLoginEmail?: (email: string) => void;
  setLoginPassword?: (password: string) => void;
  setLoginError?: (err: string) => void;
}

export default function ProfileView({
  adminProfile,
  setAdminProfile,
  setActiveTab,
  setIsLoggedIn,
  setLoginEmail,
  setLoginPassword,
  setLoginError,
}: ProfileViewProps) {
  // Local sub-modal states
  const [showChangePasswordSubModal, setShowChangePasswordSubModal] = useState(false);
  const [showEditNameSubModal, setShowEditNameSubModal] = useState(false);
  const [showChangePictureSubModal, setShowChangePictureSubModal] = useState(false);

  const [currentProfilePasswordInput, setCurrentProfilePasswordInput] = useState("");
  const [newProfilePasswordInput, setNewProfilePasswordInput] = useState("");
  const [confirmProfilePasswordInput, setConfirmProfilePasswordInput] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newProfileNameInput, setNewProfileNameInput] = useState("");
  const [profileActionError, setProfileActionError] = useState("");
  const [isSavingProfileAction, setIsSavingProfileAction] = useState(false);

  const splitName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
    };
  };

  const saveAdminName = async () => {
    const trimmedName = newProfileNameInput.trim();
    if (!trimmedName) {
      setProfileActionError("Name cannot be empty.");
      return;
    }

    setIsSavingProfileAction(true);
    setProfileActionError("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No authenticated admin session found.");

      const { firstName, lastName } = splitName(trimmedName);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          first_name: firstName,
          last_name: lastName,
        })
        .eq("id", user.id);

      if (error) throw error;

      setAdminProfile((prev) => ({ ...prev, name: trimmedName }));
      setShowEditNameSubModal(false);
      alert("Administrator name updated.");
    } catch (err: any) {
      setProfileActionError(err.message || "Failed to update administrator name.");
    } finally {
      setIsSavingProfileAction(false);
    }
  };

  const saveAdminPassword = async () => {
    if (!currentProfilePasswordInput) {
      setProfileActionError("Current password is required.");
      return;
    }
    if (!newProfilePasswordInput) {
      setProfileActionError("New password cannot be empty.");
      return;
    }
    if (newProfilePasswordInput !== confirmProfilePasswordInput) {
      setProfileActionError("Passwords do not match.");
      return;
    }

    setIsSavingProfileAction(true);
    setProfileActionError("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user?.email) throw new Error("No authenticated admin email found.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentProfilePasswordInput,
      });
      if (signInError) throw new Error("Current password is incorrect.");

      const { error: updateError } = await supabase.auth.updateUser({
        password: newProfilePasswordInput,
      });
      if (updateError) throw updateError;

      setAdminProfile((prev) => ({ ...prev, password: "********" }));
      setShowChangePasswordSubModal(false);
      alert("Password updated successfully.");
    } catch (err: any) {
      setProfileActionError(err.message || "Failed to update password.");
    } finally {
      setIsSavingProfileAction(false);
    }
  };

  const saveAvatarUrl = async (avatarUrl: string) => {
    setIsSavingProfileAction(true);
    setProfileActionError("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No authenticated admin session found.");

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl || null })
        .eq("id", user.id);

      if (error) throw error;
      setAdminProfile((prev) => ({ ...prev, avatarUrl }));
    } catch (err: any) {
      setProfileActionError(err.message || "Failed to update profile picture.");
      throw err;
    } finally {
      setIsSavingProfileAction(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#f3f5fa] flex items-start justify-center p-4 py-12 overflow-y-auto z-40 transition-all">
      <div className="w-full max-w-lg flex flex-col items-center gap-4">
        {/* Header Title */}
        <h2 className="text-[#000C7D] text-3xl font-extrabold tracking-wide text-center">
          Profile
        </h2>

        {/* Main Rounded Card */}
        <div className="bg-white rounded-3xl shadow-xl w-full p-8 flex flex-col items-center gap-6 relative border border-blue-100">
          {/* Back Button / Close Icon */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Avatar Photo Frame */}
          <div className="relative flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full border-4 border-sky-300 shadow-inner overflow-hidden bg-sky-200 flex items-center justify-center">
              {adminProfile.avatarUrl ? (
                <img src={adminProfile.avatarUrl} className="w-full h-full object-cover" alt="Admin Avatar" />
              ) : (
                <svg viewBox="0 0 40 40" className="w-full h-full">
                  <circle cx="20" cy="20" r="18" fill={adminProfile.avatarColor || "#38bdf8"} />
                  <g>
                    <path
                      d="M9 16C9 10 14 8 20 8C26 8 31 10 31 16C31 22 28 24 28 27C28 30 20 31 20 31C20 31 12 30 12 27C12 24 9 22 9 16Z"
                      fill="#1e1b4b"
                    />
                    <circle cx="20" cy="19" r="7" fill="#fed7aa" />
                    <path
                      d="M14 15C16 13 18 13 20 14C22 13 24 13 26 15C26 15 24 11 20 11C16 11 14 15 14 15Z"
                      fill="#1e1b4b"
                    />
                    <path d="M10 36C10 31 14 29 20 29C26 29 30 31 30 36H10Z" fill="#4f46e5" />
                    <path d="M20 29V32" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
                  </g>
                </svg>
              )}
            </div>

            {/* Admin Name & Badge */}
            <h3 className="text-xl font-bold text-[#000C7D]">{adminProfile.name}</h3>
            <span className="px-4 py-0.5 bg-blue-100 text-blue-700 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-blue-200/50">
              Administrator
            </span>
          </div>

          {/* Information Rows */}
          <div className="w-full flex flex-col divide-y divide-slate-100">
            {/* Email Section */}
            <div className="py-4 flex flex-col gap-1 text-left">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Email</span>
              <span className="text-sm font-semibold text-slate-700">{adminProfile.email}</span>
            </div>

            {/* Password Section */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Password</span>
                <span className="text-sm font-bold text-slate-600">{"•".repeat(adminProfile.password.length)}</span>
              </div>
              <button
                onClick={() => {
                  setCurrentProfilePasswordInput("");
                  setNewProfilePasswordInput("");
                  setConfirmProfilePasswordInput("");
                  setProfileActionError("");
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                  setShowChangePasswordSubModal(true);
                }}
                className="px-5 py-1.5 border border-[#000C7D] hover:bg-sky-50 text-[#000C7D] text-xs font-bold rounded-full transition-colors cursor-pointer"
              >
                Change Password
              </button>
            </div>

            {/* Name Section */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Name</span>
                <span className="text-sm font-bold text-slate-700">{adminProfile.name}</span>
              </div>
              <button
                onClick={() => {
                  setNewProfileNameInput(adminProfile.name);
                  setProfileActionError("");
                  setShowEditNameSubModal(true);
                }}
                className="px-5 py-1.5 border border-[#000C7D] hover:bg-sky-50 text-[#000C7D] text-xs font-bold rounded-full transition-colors cursor-pointer"
              >
                Edit Name
              </button>
            </div>

            {/* Profile Picture Section */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Profile Picture</span>
                <span className="text-xs text-slate-400 font-semibold">Update your profile picture</span>
              </div>
              <button
                onClick={() => {
                  setShowChangePictureSubModal(true);
                }}
                className="px-5 py-1.5 border border-[#000C7D] hover:bg-sky-50 text-[#000C7D] text-xs font-bold rounded-full transition-colors cursor-pointer"
              >
                Change Picture
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={async () => {
              if (confirm("Are you sure you want to log out?")) {
                await supabase.auth.signOut();
                setIsLoggedIn(false);
                setActiveTab("dashboard");
                if (setLoginEmail) setLoginEmail("");
                if (setLoginPassword) setLoginPassword("");
                if (setLoginError) setLoginError("");
              }
            }}
            className="w-full bg-[#ef2b2b] hover:bg-red-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer text-center text-sm uppercase tracking-wider"
          >
            Logout
          </button>
        </div>
      </div>

      {/* CHANGE PASSWORD SUB-MODAL */}
      {showChangePasswordSubModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 p-6 flex flex-col gap-4">
            <h3 className="text-[#000C7D] font-bold text-lg">Change Admin Password</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Current Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    value={currentProfilePasswordInput}
                    onChange={(e) => setCurrentProfilePasswordInput(e.target.value)}
                    className="border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 text-[#000C7D] w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label="Toggle Current Password Visibility"
                  >
                    {!showCurrentPassword ? (
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
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">New Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newProfilePasswordInput}
                    onChange={(e) => setNewProfilePasswordInput(e.target.value)}
                    className="border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 text-[#000C7D] w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label="Toggle New Password Visibility"
                  >
                    {!showNewPassword ? (
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
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Confirm New Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmProfilePasswordInput}
                    onChange={(e) => setConfirmProfilePasswordInput(e.target.value)}
                    className="border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 text-[#000C7D] w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label="Toggle Confirm Password Visibility"
                  >
                    {!showConfirmPassword ? (
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
              {profileActionError && <p className="text-rose-500 text-xs font-bold text-center">{profileActionError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowChangePasswordSubModal(false)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAdminPassword}
                disabled={isSavingProfileAction}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSavingProfileAction ? "Saving..." : "Save Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT NAME SUB-MODAL */}
      {showEditNameSubModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 p-6 flex flex-col gap-4">
            <h3 className="text-[#000C7D] font-bold text-lg text-left">Edit Administrator Name</h3>
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">New Name</label>
              <input
                type="text"
                placeholder="Enter display name"
                value={newProfileNameInput}
                onChange={(e) => setNewProfileNameInput(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-hidden focus:border-blue-500 text-[#000C7D]"
              />
              {profileActionError && <p className="text-rose-500 text-xs font-bold text-center mt-2">{profileActionError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditNameSubModal(false)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAdminName}
                disabled={isSavingProfileAction}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSavingProfileAction ? "Saving..." : "Save Name"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PICTURE SUB-MODAL */}
      {showChangePictureSubModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 p-6 flex flex-col gap-4">
            <h3 className="text-[#000C7D] font-bold text-lg text-left">Change Profile Picture</h3>

            {/* Image Upload Area */}
            <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100/50 transition-all relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      try {
                        await saveAvatarUrl(reader.result as string);
                        alert("Profile picture uploaded successfully.");
                      } catch {
                        // Error text is shown in the modal.
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Upload profile picture"
              />
              <div className="w-16 h-16 rounded-full overflow-hidden bg-sky-100 flex items-center justify-center border border-slate-200 shadow-inner">
                {adminProfile.avatarUrl ? (
                  <img src={adminProfile.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-[#000C7D]">Click to upload a new picture</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, or GIF</p>
              </div>
            </div>

            {adminProfile.avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  saveAvatarUrl("")
                    .then(() => alert("Custom profile picture removed."))
                    .catch(() => undefined);
                }}
                disabled={isSavingProfileAction}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-rose-100 disabled:opacity-60"
              >
                Remove Custom Picture
              </button>
            )}

            <hr className="border-slate-100 my-1" />

            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Or Select Color Theme Accent</h4>
            <p className="text-[10px] text-slate-400 font-semibold mb-1 text-left">Reverts custom picture to show the default SVG styled avatar.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Sky Blue", color: "#38bdf8" },
                { name: "Coral Orange", color: "#f97316" },
                { name: "Emerald Green", color: "#10b981" },
                { name: "Indigo Purple", color: "#8b5cf6" },
              ].map((theme) => (
                <button
                  key={theme.color}
                  type="button"
                  onClick={() => {
                    setAdminProfile((prev) => ({ ...prev, avatarColor: theme.color, avatarUrl: "" }));
                    saveAvatarUrl("")
                      .then(() => {
                        setShowChangePictureSubModal(false);
                        alert(`Profile accent updated to ${theme.name}.`);
                      })
                      .catch(() => undefined);
                  }}
                  className={`border rounded-2xl p-3 flex flex-col items-center gap-2.5 transition-all hover:scale-[1.02] cursor-pointer ${
                    !adminProfile.avatarUrl && adminProfile.avatarColor === theme.color
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: theme.color }}
                  >
                    <svg width="18" height="18" viewBox="0 0 40 40" className="rounded-full">
                      <g>
                        <path d="M9 16C9 10 14 8 20 8C26 8 31 10 31 16C31 22 28 24 28 27C28 30 20 31 20 31C20 31 12 30 12 27C12 24 9 22 9 16Z" fill="#1e1b4b" />
                        <circle cx="20" cy="19" r="7" fill="#fed7aa" />
                        <path d="M14 15C16 13 18 13 20 14C22 13 24 13 26 15C26 15 24 11 20 11C16 11 14 15 14 15Z" fill="#1e1b4b" />
                        <path d="M10 36C10 31 14 29 20 29C26 29 30 31 30 36H10Z" fill="#4f46e5" />
                        <path d="M20 29V32" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
                      </g>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">{theme.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowChangePictureSubModal(false)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Close Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
