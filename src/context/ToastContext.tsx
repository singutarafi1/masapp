import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  RefreshCw,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { useBackHandler } from '../lib/backNavigation';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

export interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  confirmAction: (options: ConfirmOptions | string) => Promise<boolean>;
  promptAction: (options: PromptOptions | string) => Promise<string | null>;
  runWithLoading: <T>(
    arg1: (() => Promise<T>) | string,
    arg2?: string | (() => Promise<T>)
  ) => Promise<T>;
  setOnlineLoading: (text: string | null) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [onlineLoadingText, setOnlineLoadingText] = useState<string | null>(null);

  // Confirm Alarm Modal State
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const confirmResolverRef = useRef<((val: boolean) => void) | null>(null);

  // Prompt Modal State
  const [promptState, setPromptState] = useState<PromptOptions | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const promptResolverRef = useRef<((val: string | null) => void) | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const confirmAction = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === 'string'
        ? {
            title: 'အတည်ပြုချက် (Confirmation)',
            message: options,
            confirmText: 'အတည်ပြုမည်',
            cancelText: 'မလုပ်တော့ပါ',
            danger: true,
            variant: 'danger',
          }
        : {
            title: options.title || 'အတည်ပြုချက် (Confirmation)',
            message: options.message,
            confirmText: options.confirmText || 'အတည်ပြုမည်',
            cancelText: options.cancelText || 'မလုပ်တော့ပါ',
            danger: options.danger ?? (options.variant === 'danger' || !options.variant),
            variant: options.variant || (options.danger === false ? 'info' : 'danger'),
          };

    setConfirmState(opts);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  const handleCloseConfirm = useCallback((result: boolean) => {
    setConfirmState(null);
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  }, []);

  const promptAction = useCallback((options: PromptOptions | string): Promise<string | null> => {
    const opts: PromptOptions =
      typeof options === 'string'
        ? {
            title: options,
            placeholder: 'ရိုက်ထည့်ပါ...',
            confirmText: 'ထည့်သွင်းမည်',
            cancelText: 'မလုပ်တော့ပါ',
          }
        : {
            title: options.title,
            message: options.message,
            placeholder: options.placeholder || 'ရိုက်ထည့်ပါ...',
            defaultValue: options.defaultValue || '',
            confirmText: options.confirmText || 'ထည့်သွင်းမည်',
            cancelText: options.cancelText || 'မလုပ်တော့ပါ',
          };

    setPromptInput(opts.defaultValue || '');
    setPromptState(opts);
    return new Promise<string | null>((resolve) => {
      promptResolverRef.current = resolve;
    });
  }, []);

  const handleClosePrompt = useCallback((result: string | null) => {
    setPromptState(null);
    if (promptResolverRef.current) {
      promptResolverRef.current(result);
      promptResolverRef.current = null;
    }
  }, []);

  const runWithLoading = useCallback(
    async <T,>(
      arg1: (() => Promise<T>) | string,
      arg2?: string | (() => Promise<T>)
    ): Promise<T> => {
      const fn = typeof arg1 === 'function' ? arg1 : (arg2 as () => Promise<T>);
      const text =
        typeof arg1 === 'string'
          ? arg1
          : typeof arg2 === 'string'
          ? arg2
          : 'အွန်လိုင်းဆာဗာနှင့် ချိတ်ဆက်ဆောင်ရွက်နေပါသည်...';

      setOnlineLoadingText(text);
      try {
        return await fn();
      } finally {
        setOnlineLoadingText(null);
      }
    },
    []
  );

  // Hardware Back Key integration for Confirm & Prompt modals
  useBackHandler(confirmState !== null, () => handleCloseConfirm(false));
  useBackHandler(promptState !== null, () => handleClosePrompt(null));

  return (
    <ToastContext.Provider
      value={{
        showToast,
        confirmAction,
        promptAction,
        runWithLoading,
        setOnlineLoading: setOnlineLoadingText,
      }}
    >
      {children}

      {/* 1. TOAST NOTIFICATIONS */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-[92vw] max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold transition-all transform animate-in fade-in slide-in-from-top-4 duration-200 border ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20'
                : toast.type === 'warning'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20'
                : 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
              <span className="leading-snug break-words">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-full hover:bg-black/10 transition-colors shrink-0"
              aria-label="Close toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* 2. IN-APP ALARM / CONFIRMATION BOX (Sketchware WebView Safe) */}
      {confirmState && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmState.danger
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400'
                }`}
              >
                {confirmState.danger ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-base text-slate-900 dark:text-white leading-snug">
                  {confirmState.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleCloseConfirm(false)}
                className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold active:scale-95 transition-all"
              >
                {confirmState.cancelText || 'မလုပ်တော့ပါ'}
              </button>
              <button
                type="button"
                onClick={() => handleCloseConfirm(true)}
                className={`flex-1 min-h-[46px] py-2.5 px-4 rounded-xl text-white text-xs sm:text-sm font-black shadow-md active:scale-95 transition-all ${
                  confirmState.danger
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                }`}
              >
                {confirmState.confirmText || 'အတည်ပြုမည်'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. IN-APP INPUT PROMPT BOX (Sketchware WebView Safe) */}
      {promptState && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleClosePrompt(promptInput.trim() || null);
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {promptState.title}
              </h3>
              {promptState.message && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {promptState.message}
                </p>
              )}
            </div>

            <input
              type="text"
              autoFocus
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder={promptState.placeholder}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleClosePrompt(null)}
                className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold active:scale-95 transition-all"
              >
                {promptState.cancelText || 'မလုပ်တော့ပါ'}
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black shadow-md shadow-indigo-600/25 active:scale-95 transition-all"
              >
                {promptState.confirmText || 'ထည့်သွင်းမည်'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. ONLINE ACTION LOADING OVERLAY */}
      {onlineLoadingText && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 shadow-2xl flex flex-col items-center gap-3 max-w-xs text-center">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                {onlineLoadingText}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 block">
                အွန်လိုင်းဆာဗာနှင့် ချိတ်ဆက်ဆောင်ရွက်နေပါသည်...
              </span>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
