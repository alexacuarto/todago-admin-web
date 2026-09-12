import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { exportToExcel } from "../../lib/exportUtils";

interface FareConfig {
  id: string;
  tripType: string;
  displayLabel: string;
  baseFare: number;
  includedKm: number;
  succeedingKmFare: number;
  studentDiscount: number;
  pwdDiscount: number;
  seniorCitizenDiscount: number;
  lastUpdated: string;
}

const DEFAULT_ONE_WAY: Omit<FareConfig, "id"> = {
  tripType: "one_way",
  displayLabel: "One Way Trip",
  baseFare: 25,
  includedKm: 1,
  succeedingKmFare: 2,
  studentDiscount: 20,
  pwdDiscount: 20,
  seniorCitizenDiscount: 20,
  lastUpdated: new Date().toLocaleString(),
};

const DEFAULT_ROUND_TRIP: Omit<FareConfig, "id"> = {
  tripType: "round_trip",
  displayLabel: "Special Trip",
  baseFare: 40,
  includedKm: 2,
  succeedingKmFare: 2,
  studentDiscount: 20,
  pwdDiscount: 20,
  seniorCitizenDiscount: 20,
  lastUpdated: new Date().toLocaleString(),
};

function mapDbRow(row: any): FareConfig {
  const rate = (field: string, percentage = false) => {
    if (row[field] == null) throw new Error(`Missing fare setting: ${field}`);
    const value = Number(row[field]);
    if (!Number.isFinite(value) || value < 0 || (percentage && value > 100))
      throw new Error(`Invalid fare setting: ${field}`);
    return value;
  };
  return {
    id: row.id,
    tripType: row.trip_type ?? "one_way",
    displayLabel: row.display_label ?? (row.trip_type === "round_trip" ? "Special Trip" : "One Way Trip"),
    baseFare: rate("base_fare"),
    includedKm: rate("included_km"),
    succeedingKmFare: rate("succeeding_km_fare"),
    studentDiscount: rate("student_discount", true),
    pwdDiscount: rate("pwd_discount", true),
    seniorCitizenDiscount: rate("senior_citizen_discount", true),
    lastUpdated: row.updated_at
      ? new Date(row.updated_at).toLocaleString()
      : new Date().toLocaleString(),
  };
}

export default function FareSettingsView() {
  const [oneWay, setOneWay] = useState<FareConfig>({ id: "", ...DEFAULT_ONE_WAY });
  const [roundTrip, setRoundTrip] = useState<FareConfig>({ id: "", ...DEFAULT_ROUND_TRIP });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [savingOneWay, setSavingOneWay] = useState(false);
  const [savingRoundTrip, setSavingRoundTrip] = useState(false);
  const [oneWayChangeMessage, setOneWayChangeMessage] = useState("");
  const [roundTripChangeMessage, setRoundTripChangeMessage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchFareSettings();
  }, []);

  const fetchFareSettings = async () => {
    setIsLoadingData(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("fare_configurations")
        .select("*")
        .eq("is_active", true)
        .order("trip_type", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        for (const row of data) {
          const config = mapDbRow(row);
          if (config.tripType === "one_way") {
            setOneWay(config);
            localStorage.setItem("toda_go_fare_oneway", JSON.stringify(config));
          } else if (config.tripType === "round_trip") {
            setRoundTrip(config);
            localStorage.setItem("toda_go_fare_roundtrip", JSON.stringify(config));
          }
        }
      } else {
        throw new Error("No active fare settings found in Supabase.");
      }
    } catch (err: any) {
      console.error("Error fetching fare settings:", err);
      setFetchError(err.message || "Failed to load fare settings");
    } finally {
      setIsLoadingData(false);
    }
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveFare = async (
    config: FareConfig,
    message: string,
    setSaving: (saving: boolean) => void,
    setter: (config: FareConfig) => void,
    setMessage: (msg: string) => void,
    cacheKey: string
  ) => {
    if (!message.trim()) {
      triggerToast("Error: Please add a fare change message before saving.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_fare_configuration_with_message", {
        p_trip_type: config.tripType,
        p_display_label: config.displayLabel,
        p_base_fare: config.baseFare,
        p_included_km: config.includedKm,
        p_succeeding_km_fare: config.succeedingKmFare,
        p_student_discount: config.studentDiscount,
        p_pwd_discount: config.pwdDiscount,
        p_senior_citizen_discount: config.seniorCitizenDiscount,
        p_message: message.trim(),
      });

      if (error) throw error;

      const { data: saved, error: readError } = await supabase
        .from("fare_configurations")
        .select("*")
        .eq("id", config.id)
        .single();

      if (readError) throw readError;
      const updated = mapDbRow(saved);
      setter(updated);
      localStorage.setItem(cacheKey, JSON.stringify(updated));
      setMessage("");
      triggerToast(`${config.displayLabel} pricing updated and notifications dispatched.`);
    } catch (err: any) {
      console.error("Error saving fare settings:", err);
      triggerToast(`Error: ${err.message || "Failed to save"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Tariff Display Name",
      "Trip Type Key",
      "Base Fare (PHP)",
      "Included Distance (KM)",
      "Succeeding Fare per KM (PHP)",
      "Student Discount (%)",
      "PWD Discount (%)",
      "Senior Citizen Discount (%)",
      "Last Updated",
    ];

    const rows = [
      [
        oneWay.displayLabel,
        oneWay.tripType,
        oneWay.baseFare,
        oneWay.includedKm,
        oneWay.succeedingKmFare,
        `${oneWay.studentDiscount}%`,
        `${oneWay.pwdDiscount}%`,
        `${oneWay.seniorCitizenDiscount}%`,
        oneWay.lastUpdated,
      ],
      [
        roundTrip.displayLabel,
        roundTrip.tripType,
        roundTrip.baseFare,
        roundTrip.includedKm,
        roundTrip.succeedingKmFare,
        `${roundTrip.studentDiscount}%`,
        `${roundTrip.pwdDiscount}%`,
        `${roundTrip.seniorCitizenDiscount}%`,
        roundTrip.lastUpdated,
      ],
    ];

    const dateStr = new Date().toISOString().split("T")[0];
    exportToExcel(`todago_fare_settings_${dateStr}`, headers, rows);
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent mb-4"></div>
        <p className="text-xs font-bold uppercase tracking-wider">Loading Fare Settings...</p>
      </div>
    );
  }

  if (fetchError || (!oneWay.id && !roundTrip.id)) {
    return (
      <div role="alert" className="p-6 text-rose-800">
        <p>{fetchError || "Fare settings are unavailable."}</p>
        <button onClick={fetchFareSettings} className="mt-3 rounded border px-4 py-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 px-6 py-3.5 rounded-xl shadow-xl font-bold flex items-center gap-3 border animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.startsWith("Error")
              ? "bg-rose-600 text-white border-rose-400"
              : "bg-[#111c80] text-white border-sky-400"
          }`}
        >
          <svg className="w-5 h-5 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            {toastMessage.startsWith("Error") ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            )}
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error banner */}
      {fetchError && (
        <div className="mb-2 p-4 bg-rose-100 border border-rose-200 text-rose-800 rounded-2xl text-sm font-semibold flex items-center justify-between">
          <span>⚠️ {fetchError} — Database values could not be loaded.</span>
          <button
            onClick={fetchFareSettings}
            className="px-4 py-1.5 bg-rose-200 hover:bg-rose-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#000C7D] tracking-tight">Adjust Fare Pricing</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Manage separate tariff configurations for regular One-Way trips and multi-stop Special Trips.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          title="Download CSV export of active fare settings"
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Two Column Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CARD 1: One Way Trip (Regular) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-8 flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-[#000C7D]">One Way Trip (Regular)</h2>
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-extrabold">
                Regular Booking Tariff
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Display Label</label>
                <input
                  type="text"
                  value={oneWay.displayLabel}
                  onChange={(e) => setOneWay({ ...oneWay, displayLabel: e.target.value })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Base Fare (₱)</label>
                <input
                  type="number"
                  value={oneWay.baseFare}
                  onChange={(e) => setOneWay({ ...oneWay, baseFare: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Included KM</label>
                <input
                  type="number"
                  step="0.5"
                  value={oneWay.includedKm}
                  onChange={(e) => setOneWay({ ...oneWay, includedKm: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Succeeding KM Fare (₱ / KM)</label>
                <input
                  type="number"
                  step="0.5"
                  value={oneWay.succeedingKmFare}
                  onChange={(e) => setOneWay({ ...oneWay, succeedingKmFare: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Student Discount (%)</label>
                <input
                  type="number"
                  value={oneWay.studentDiscount}
                  onChange={(e) => setOneWay({ ...oneWay, studentDiscount: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">PWD Discount (%)</label>
                <input
                  type="number"
                  value={oneWay.pwdDiscount}
                  onChange={(e) => setOneWay({ ...oneWay, pwdDiscount: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Senior Citizen Discount (%)</label>
                <input
                  type="number"
                  value={oneWay.seniorCitizenDiscount}
                  onChange={(e) => setOneWay({ ...oneWay, seniorCitizenDiscount: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Fare Change Notice Message</label>
                <textarea
                  value={oneWayChangeMessage}
                  onChange={(e) => setOneWayChangeMessage(e.target.value)}
                  rows={3}
                  placeholder="Explain why one-way fare changed. Broadcast to passenger and driver apps."
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#f5f9ff] px-8 py-5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Last updated: {oneWay.lastUpdated}</span>
            <button
              onClick={() =>
                handleSaveFare(
                  oneWay,
                  oneWayChangeMessage,
                  setSavingOneWay,
                  setOneWay,
                  setOneWayChangeMessage,
                  "toda_go_fare_oneway"
                )
              }
              disabled={savingOneWay}
              className="px-6 py-2.5 bg-[#111c80] hover:bg-[#1a28a3] disabled:bg-[#111c80]/70 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs hover:shadow-md flex items-center gap-2"
            >
              {savingOneWay ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                "Save One-Way Changes"
              )}
            </button>
          </div>
        </div>

        {/* CARD 2: Special Trip */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-8 flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-[#000C7D]">Special Trip</h2>
              <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-extrabold">
                Special Booking Tariff
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Display Label</label>
                <input
                  type="text"
                  value={roundTrip.displayLabel}
                  onChange={(e) => setRoundTrip({ ...roundTrip, displayLabel: e.target.value })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Base Fare (₱)</label>
                <input
                  type="number"
                  value={roundTrip.baseFare}
                  onChange={(e) => setRoundTrip({ ...roundTrip, baseFare: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Included KM per Stop</label>
                <input
                  type="number"
                  step="0.5"
                  value={roundTrip.includedKm}
                  onChange={(e) => setRoundTrip({ ...roundTrip, includedKm: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Succeeding KM Fare (₱ / KM)</label>
                <input
                  type="number"
                  step="0.5"
                  value={roundTrip.succeedingKmFare}
                  onChange={(e) => setRoundTrip({ ...roundTrip, succeedingKmFare: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Student Discount (%)</label>
                <input
                  type="number"
                  value={roundTrip.studentDiscount}
                  onChange={(e) => setRoundTrip({ ...roundTrip, studentDiscount: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">PWD Discount (%)</label>
                <input
                  type="number"
                  value={roundTrip.pwdDiscount}
                  onChange={(e) => setRoundTrip({ ...roundTrip, pwdDiscount: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Senior Citizen Discount (%)</label>
                <input
                  type="number"
                  value={roundTrip.seniorCitizenDiscount}
                  onChange={(e) => setRoundTrip({ ...roundTrip, seniorCitizenDiscount: Number(e.target.value) })}
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-extrabold text-[#000C7D] tracking-wider uppercase">Fare Change Notice Message</label>
                <textarea
                  value={roundTripChangeMessage}
                  onChange={(e) => setRoundTripChangeMessage(e.target.value)}
                  rows={3}
                  placeholder="Explain why special trip fare changed. Broadcast to passenger and driver apps."
                  className="w-full bg-white border border-[#c7dfff] hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3 text-sm font-bold text-[#172554] transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#f5f9ff] px-8 py-5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Last updated: {roundTrip.lastUpdated}</span>
            <button
              onClick={() =>
                handleSaveFare(
                  roundTrip,
                  roundTripChangeMessage,
                  setSavingRoundTrip,
                  setRoundTrip,
                  setRoundTripChangeMessage,
                  "toda_go_fare_roundtrip"
                )
              }
              disabled={savingRoundTrip}
              className="px-6 py-2.5 bg-[#111c80] hover:bg-[#1a28a3] disabled:bg-[#111c80]/70 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs hover:shadow-md flex items-center gap-2"
            >
              {savingRoundTrip ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                "Save Special Trip Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
