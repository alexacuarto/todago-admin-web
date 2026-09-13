interface SidebarProps {
  activeTab: "dashboard" | "ride-requests" | "earnings" | "users" | "feedback" | "profile" | "create-driver" | "fare-settings";
  setActiveTab: (tab: "dashboard" | "ride-requests" | "earnings" | "users" | "feedback" | "profile" | "create-driver" | "fare-settings") => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  usersSubTab: "drivers" | "passengers" | "requests" | "admins";
  setUsersSubTab: (subTab: "drivers" | "passengers" | "requests" | "admins") => void;
  pendingRequestsCount?: number;
  openFeedbackCount?: number;
  newUsersCount?: number;
  pendingDriversCount?: number;
  pendingPassengersCount?: number;
  pendingChangeRequestsCount?: number;
  adminsCount?: number;
}

type AdminNavTab = SidebarProps["activeTab"];

export default function Sidebar({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  usersSubTab,
  setUsersSubTab,
  pendingRequestsCount = 0,
  openFeedbackCount = 0,
  newUsersCount = 0,
  pendingDriversCount = 0,
  pendingPassengersCount = 0,
  pendingChangeRequestsCount = 0,
  adminsCount = 0,
}: SidebarProps) {
  const getTabClass = (tab: AdminNavTab) => {
    const isActive = activeTab === tab;
    if (isActive) {
      return "flex items-center gap-3 px-5 py-3 font-extrabold text-white bg-[#000C7D] border-y-2 border-r-2 border-l-[6px] border-[#000C7D] shadow-sm transition-all text-left w-full cursor-pointer";
    }
    return "flex items-center gap-3 px-5 py-3 font-bold text-[#000C7D] border-l-4 border-transparent hover:bg-white/40 transition-all text-left w-full cursor-pointer";
  };

  const goTo = (tab: AdminNavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const goToUsers = (subTab: "drivers" | "passengers" | "requests" | "admins") => {
    setActiveTab("users");
    setUsersSubTab(subTab);
    setMobileMenuOpen(false);
  };

  const getUsersSubClass = (subTab: "drivers" | "passengers" | "requests" | "admins") =>
    `w-full text-left pl-14 pr-4 py-2 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${activeTab === "users" && usersSubTab === subTab
      ? "text-[#000C7D] bg-white/70"
      : "text-slate-600 hover:text-[#000C7D] hover:bg-white/40"
    }`;

  return (
    <>
      <aside
        className={`
          bg-[#d2f4ff] w-64 h-full flex flex-col shrink-0 transition-transform duration-300 z-20
          absolute inset-y-0 left-0 md:relative md:inset-auto md:translate-x-0
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shadow-lg md:shadow-none
        `}
      >
        <div className="p-4 flex justify-center bg-transparent">
          <img src="/branding/toda_go_logo_dark.png" alt="TodaGo" className="w-[140px] h-auto object-contain" />
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-hidden">
          <button onClick={() => goTo("dashboard")} className={getTabClass("dashboard")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button onClick={() => goTo("create-driver")} className={getTabClass("create-driver")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="17" y1="11" x2="23" y2="11" />
            </svg>
            <span>Create Driver</span>
          </button>

          <button onClick={() => goTo("ride-requests")} className={getTabClass("ride-requests")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="flex-1">Ride Requests</span>
            {pendingRequestsCount > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${activeTab === "ride-requests" ? "bg-rose-400 text-white" : "bg-rose-500 text-white shadow-xs"
                }`}>
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button onClick={() => goTo("earnings")} className={getTabClass("earnings")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3h5.5a4.5 4.5 0 0 1 0 9H8" />
              <line x1="8" y1="3" x2="8" y2="21" />
              <line x1="5" y1="7" x2="19" y2="7" />
              <line x1="5" y1="10" x2="19" y2="10" />
            </svg>
            <span>Earnings</span>
          </button>

          <button onClick={() => goTo("fare-settings")} className={getTabClass("fare-settings")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
            <span>Fare Settings</span>
          </button>

          <button onClick={() => goTo("feedback")} className={getTabClass("feedback")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
              <path d="M8 9h8M8 13h5" />
            </svg>
            <span className="flex-1">Feedback</span>
            {openFeedbackCount > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${activeTab === "feedback" ? "bg-amber-400 text-slate-900" : "bg-amber-500 text-white shadow-xs"
                }`}>
                {openFeedbackCount}
              </span>
            )}
          </button>

          <button onClick={() => goToUsers("drivers")} className={getTabClass("users")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="flex-1">Users Management</span>
            {newUsersCount > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${activeTab === "users" ? "bg-sky-400 text-slate-900" : "bg-[#000C7D] text-white border border-[#000C7D]/20 shadow-xs"
                }`}>
                {newUsersCount}
              </span>
            )}
          </button>
          <div className="flex flex-col">
            <button onClick={() => goToUsers("drivers")} className={getUsersSubClass("drivers")}>
              <span>Drivers</span>
              {pendingDriversCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-blue-100 text-[#000C7D] border border-blue-200">
                  {pendingDriversCount}
                </span>
              )}
            </button>
            <button onClick={() => goToUsers("passengers")} className={getUsersSubClass("passengers")}>
              <span>Passengers</span>
              {pendingPassengersCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-blue-100 text-[#000C7D] border border-blue-200">
                  {pendingPassengersCount}
                </span>
              )}
            </button>
            <button onClick={() => goToUsers("requests")} className={getUsersSubClass("requests")}>
              <span>Change Requests</span>
              {pendingChangeRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-[#000C7D] text-white shadow-xs">
                  {pendingChangeRequestsCount}
                </span>
              )}
            </button>
            {/* <button onClick={() => goToUsers("admins")} className={getUsersSubClass("admins")}>
              <span>Admin Accounts</span>
              {adminsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-full bg-blue-100 text-[#000C7D] border border-blue-200">
                  {adminsCount}
                </span>
              )}
            </button> */}
          </div>
        </nav>
      </aside>

      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden absolute inset-0 bg-black/40 backdrop-blur-xs z-10"
        />
      )}
    </>
  );
}
