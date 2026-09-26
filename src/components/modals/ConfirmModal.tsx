import React from "react";

export type ConfirmVariant = "danger" | "warning" | "primary" | "info" | "success";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode | string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-rose-100 text-rose-600 border border-rose-200",
          btnColor: "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 focus:ring-rose-300",
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
        };
      case "warning":
        return {
          iconBg: "bg-amber-100 text-amber-600 border border-amber-200",
          btnColor: "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200 focus:ring-amber-300",
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        };
      case "info":
        return {
          iconBg: "bg-sky-100 text-sky-600 border border-sky-200",
          btnColor: "bg-[#000C7D] hover:bg-[#00095a] text-white shadow-md shadow-blue-200 focus:ring-blue-300",
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          ),
        };
      case "success":
        return {
          iconBg: "bg-emerald-100 text-emerald-600 border border-emerald-200",
          btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 focus:ring-emerald-300",
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        };
      case "primary":
      default:
        return {
          iconBg: "bg-blue-100 text-[#000C7D] border border-blue-200",
          btnColor: "bg-[#000C7D] hover:bg-[#00095a] text-white shadow-md shadow-blue-900/20 focus:ring-blue-300",
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transition-all scale-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${style.iconBg}`}>
            {style.icon}
          </div>
          <div className="flex-1">
            <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-800 tracking-tight">
              {title}
            </h3>
            <div className="mt-2 text-sm text-slate-600 leading-relaxed font-normal">
              {message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              await onConfirm();
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2 ${style.btnColor} disabled:opacity-50`}
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
