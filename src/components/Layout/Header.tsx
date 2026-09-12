
interface HeaderProps {
  adminProfile: {
    name: string;
    avatarUrl: string;
    avatarColor: string;
  };
  setActiveTab: (tab: "dashboard" | "ride-requests" | "earnings" | "users" | "feedback" | "profile" | "create-driver" | "fare-settings") => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefreshedAt?: string;
}

export default function Header({
  adminProfile,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  onRefresh,
  isRefreshing = false,
  lastRefreshedAt,
}: HeaderProps) {
  return (
    <header className="bg-[#000C7D] text-white flex items-center justify-between px-6 py-3 shadow-md z-30 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Toggle Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh database records"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60 border border-white/10 shadow-xs"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={isRefreshing ? "animate-spin text-sky-300" : "text-sky-300"}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            {lastRefreshedAt && (
              <span className="hidden sm:inline text-[10px] font-normal text-sky-200/80 pl-1 border-l border-white/20">
                {lastRefreshedAt}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab("profile")}
          className="text-sm font-bold text-white hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-xl hover:bg-white/10 flex items-center gap-3"
        >
        <span>Admin Management</span>

        {/* Profile Picture */}
        <div className="relative shrink-0">
          {adminProfile.avatarUrl ? (
            <img
              src={adminProfile.avatarUrl}
              alt="Admin Avatar"
              className="w-[30px] h-[30px] rounded-full object-cover shadow-inner border-2 border-sky-300"
            />
          ) : (
            <svg width="30" height="30" viewBox="0 0 40 40" className="rounded-full shadow-inner border-2 border-sky-300">
              <circle cx="20" cy="20" r="18" fill={adminProfile.avatarColor || "#38bdf8"} />
              <mask id="mask-avatar-header" maskUnits="userSpaceOnUse" x="2" y="2" width="36" height="36">
                <circle cx="20" cy="20" r="18" fill="#FFFFFF" />
              </mask>
              <g mask="url(#mask-avatar-header)">
                <path d="M9 16C9 10 14 8 20 8C26 8 31 10 31 16C31 22 28 24 28 27C28 30 20 31 20 31C20 31 12 30 12 27C12 24 9 22 9 16Z" fill="#1e1b4b" />
                <circle cx="20" cy="19" r="7" fill="#fed7aa" />
                <path d="M14 15C16 13 18 13 20 14C22 13 24 13 26 15C26 15 24 11 20 11C16 11 14 15 14 15Z" fill="#1e1b4b" />
                <path d="M10 36C10 31 14 29 20 29C26 29 30 31 30 36H10Z" fill="#4f46e5" />
                <path d="M20 29V32" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          )}
        </div>

        {/* Dropdown Arrow */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      </div>
    </header>
  );
}
