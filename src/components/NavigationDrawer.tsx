import React from 'react';
import { 
  X, 
  Wallet, 
  History, 
  Settings, 
  DatabaseBackup, 
  ShieldCheck, 
  UserPlus, 
  LogOut, 
  TrendingUp,
  LayoutGrid,
  ChevronRight,
  Store,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { MainTab } from './BottomNav';

export type AdminViewType = 'executive' | 'wallet' | 'audit_logs' | 'categories' | 'archive' | 'settings' | null;

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  activeAdminView: AdminViewType;
  onSelectAdminView: (view: AdminViewType) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAi: () => void;
  onOpenRegister: () => void;
  drawerCash?: number;
}

export function NavigationDrawer({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  activeAdminView,
  onSelectAdminView,
  onOpenRegister,
  drawerCash = 0,
}: NavigationDrawerProps) {
  const { profile, isAdmin, logout } = useAuth();
  const { shopTitle, t, themeConfig } = useSettings();

  if (!isOpen) return null;

  const handleAdminViewClick = (view: AdminViewType) => {
    onSelectAdminView(view);
    onClose();
  };

  const handleReturnToCounter = () => {
    onSelectAdminView(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Left Native Drawer Panel */}
      <div className="relative w-[84vw] max-w-xs sm:max-w-sm h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-left duration-250">
        
        {/* Top Header & Navigation Links */}
        <div>
          {/* Header Card */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${themeConfig.gradient} flex items-center justify-center text-white font-black text-lg shadow-md`}>
                {shopTitle.charAt(0) || 'A'}
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  {shopTitle}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isAdmin 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                  }`}>
                    {isAdmin && <ShieldCheck className="w-3 h-3 inline mr-0.5" />}
                    {isAdmin ? 'ADMIN' : 'STAFF'}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                    {profile?.name}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title={t('ပိတ်မည်', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Cash Summary Widget - ONLY VISIBLE TO ADMIN */}
          {isAdmin && (
            <div className="p-4 mx-4 mt-3 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-indigo-100 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  {t('ဆိုင်လက်ကျန်ငွေ စုစုပေါင်း', 'Shop Cash on Hand')}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {drawerCash.toLocaleString()} <span className="text-xs font-semibold text-slate-400">MMK</span>
              </div>
            </div>
          )}

          {/* Return to Counter Button */}
          {activeAdminView !== null && (
            <div className="px-4 pt-3">
              <button
                onClick={handleReturnToCounter}
                className="w-full min-h-[48px] flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 transition-all active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('← ကောင်တာ အရောင်း/ပြင်ဆင်မှုသို့', '← Back to Counter POS')}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
            </div>
          )}

          {/* Main Navigation Section */}
          <div className="px-4 pt-4 pb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2.5">
              {isAdmin ? t('အုပ်ချုပ်သူ ကဏ္ဍ (Admin Suite)', 'Admin Suite & Tools') : t('မီနူး ကဏ္ဍ (Main Menu)', 'Main Menu')}
            </span>

            <div className="space-y-2">
              {/* 1. Executive Dashboard (Admin only) - Dedicated Admin Portal */}
              {isAdmin && (
                <button
                  onClick={() => handleAdminViewClick('executive')}
                  className={`w-full min-h-[56px] flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-98 border ${
                    activeAdminView === 'executive'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 border-amber-400'
                      : 'text-slate-900 dark:text-white bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-400/50 dark:border-amber-600/40 hover:bg-amber-500/20 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                      <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <span className="block leading-tight text-slate-900 dark:text-white font-extrabold">
                        {t('📊 Admin Dashboard (လုပ်ငန်းချုပ်)', '📊 Admin Dashboard')}
                      </span>
                      <span className="block text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                        {t('လချုပ်အမြတ်၊ ငွေအံဆွဲ & စတော့တန်ဖိုး', 'Grand Net Profit & P&L')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                </button>
              )}

              {/* 2. Personal Wallet (Admin only) */}
              {isAdmin && (
                <button
                  onClick={() => handleAdminViewClick('wallet')}
                  className={`w-full min-h-[50px] flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-98 ${
                    activeAdminView === 'wallet'
                      ? 'bg-emerald-600 text-white font-black shadow-md'
                      : 'text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t('ကိုယ်ပိုင် ပိုက်ဆံအိတ် စာရင်း', 'My Personal Wallet')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                </button>
              )}

              {/* 3. Activity Audit Logs (Admin only) */}
              {isAdmin && (
                <button
                  onClick={() => handleAdminViewClick('audit_logs')}
                  className={`w-full min-h-[50px] flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-98 ${
                    activeAdminView === 'audit_logs'
                      ? 'bg-blue-600 text-white font-black shadow-md'
                      : 'text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <History className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{t('လုပ်ဆောင်ချက် မှတ်တမ်းများ', 'Activity Audit Logs')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                </button>
              )}

              {/* 4. Settings (Visible to All) */}
              <button
                onClick={() => handleAdminViewClick('settings')}
                className={`w-full min-h-[50px] flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-98 ${
                  activeAdminView === 'settings'
                    ? `${themeConfig.primaryBg} text-white font-black shadow-md`
                    : 'text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>{t('စနစ် အပြင်အဆင်နှင့် စိတ်ကြိုက်ပြောင်းလဲမှု', 'Settings & Preferences')}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
              </button>

              {/* 5. Data Archive & Backup (Admin only) */}
              {isAdmin && (
                <button
                  onClick={() => handleAdminViewClick('archive')}
                  className={`w-full min-h-[50px] flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-98 ${
                    activeAdminView === 'archive'
                      ? 'bg-rose-600 text-white font-black shadow-md'
                      : 'text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DatabaseBackup className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{t('ဒေတာ အရန်သိမ်းဆည်းမှု (Backup)', 'Data Archive & Backup')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                </button>
              )}

              {/* For Staff: Quick Return to counter */}
              {!isAdmin && activeAdminView === null && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-center">
                  <Store className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2 opacity-80" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {t('ကောင်တာ လုပ်ငန်းများ စနစ်တကျ လုပ်ဆောင်နိုင်ပါသည်', 'Counter POS & Service Ready')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                    {t('စတော့၊ စက်ပြင်၊ ငွေစာရင်းနှင့် အကြွေးများကို အောက်ခြေ Bar မှ ရွေးချယ်ပါ', 'Select tabs from bottom navigation bar')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Utility Controls (Clean & Minimal: Add Staff & Logout) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/80 dark:bg-slate-900/80">
          {isAdmin && (
            <button
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              className="w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 active:scale-98 transition-all"
            >
              <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t('+ ဝန်ထမ်းအကောင့်သစ် ဖွင့်မည်', '+ Add Staff Account')}</span>
            </button>
          )}

          <button
            onClick={logout}
            className="w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 hover:bg-rose-100 active:scale-98 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('အကောင့်ထွက်မည် (Logout)', 'Sign Out')}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
