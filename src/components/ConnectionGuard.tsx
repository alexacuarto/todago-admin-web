import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

export default function ConnectionGuard({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(navigator.onLine);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | undefined;
    const check = async () => {
      if (inFlight) return;
      if (!navigator.onLine) { setConnected(false); return; }
      inFlight = true;
      setChecking(true);
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 6000);
      try {
        const { error } = await supabase.from("vehicle_types").select("id").limit(1).abortSignal(controller.signal);
        if (active) setConnected(!error);
      } catch {
        if (active) setConnected(false);
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        if (active) setChecking(false);
      }
    };
    const offline = () => setConnected(false);
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    void check();
    const timer = setInterval(visible, 10000);
    window.addEventListener("online", check);
    window.addEventListener("offline", offline);
    window.addEventListener("todago:retry-connection", check);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", offline);
      window.removeEventListener("todago:retry-connection", check);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  return <>
    <div inert={!connected}>{children}</div>
    {!connected && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="connection-title" aria-describedby="connection-description" className="w-full max-w-sm rounded-lg bg-white p-6 text-gray-900 shadow-xl">
        <h2 id="connection-title" className="text-lg font-semibold">Connection unavailable</h2>
        <p id="connection-description" className="mt-3 text-sm">Unable to connect to TODA Go. Check your internet connection and try again.</p>
        <button autoFocus disabled={checking} onClick={() => window.dispatchEvent(new Event("todago:retry-connection"))} className="mt-5 rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50">{checking ? "Checking..." : "Retry"}</button>
      </section>
    </div>}
  </>;
}
