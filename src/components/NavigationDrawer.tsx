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
  Sun, 
  Moon, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  Globe
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
  theme,
  onToggleTheme,
  onOpenAi,
  onOpenRegister,
  drawerCash = 0,
}: NavigationDrawerProps) {
  const { profile, isAdmin, logout } = useAuth();
  const { language, setLanguage, shopTitle, t, themeConfig } = useSettings();

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
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto z-10">
        
        {/* Top Header */}
        <div>
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${themeConfig.gradient} flex items-center justify-center text-white font-black text-lg shadow-md`}>
                {shopTitle.charAt(0) || 'A'}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                  {shopTitle}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isAdmin 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                  }`}>
                    {isAdmin && <ShieldCheck className="w-3 h-3 inline mr-0.5" />}
                    {isAdmin ? 'ADMIN' : 'STAFF'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[130px]">
                    {profile?.name}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Cash Summary Widget */}
          <div className="p-3.5 mx-4 mt-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {t('အံဆွဲလက်ကျန်ငွေ', 'Cash on Hand')}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {drawerCash.toLocaleString()} <span className="text-xs font-semibold text-slate-400">MMK</span>
            </div>
          </div>

          {/* Counter Switch (Back to POS/Store) */}
          {activeAdminView !== null && (
            <div className="px-4 pt-3">
              <button
                onClick={handleReturnToCounter}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('← ကောင်တာ စာရင်းများသို့ ပြန်သွားမည်', '← Return to Counter POS')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          )}

          {/* Main Section: Management & Tools (Clean list without clutter) */}
          <div className="px-4 pt-4 pb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
              {t('စီမံခန့်ခွဲမှု အခန်းကဏ္ဍ', 'Admin Suite & Tools')}
            </span>

            <div className="space-y-1.5">
              {/* Executive Dashboard */}
              {isAdmin && (
                <button
                  onClick={() => handleAdminViewClick('executive')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'executive'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <span>{t('လုပ်ငန်းချုပ် စာရင်းနှင့် အမြတ်ငွေ', 'Executive Dashboard')}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              )}

              {/* Personal Wallet */}
              {isAdmin && (
                <button
                  onClick={() => handleAdminViewClick('wallet')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'wallet'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    <span>{t('ကိုယ်ပိုင် ပိုက်ဆံအိတ် စာရင်း', 'My Personal Wallet')}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              )}

              {/* Activity Audit Logs */}
              {isAdmin && (
                <button
                  onClick={() => handleAdminViewClick('audit_logs')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'audit_logs'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-4 h-4 text-blue-500" />
                    <span>{t('လုပ်ဆောင်ချက် မှတ်တမ်းများ', 'Activity Audit Logs')}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              )}

              {/* NEW Settings Tab (User Requested) */}
              <button
                onClick={() => handleAdminViewClick('settings')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeAdminView === 'settings'
                    ? 'bg-indigo-600 text-white font-black shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-purple-500" />
                  <span>{t('စနစ် အပြင်အဆင်နှင့် စိတ်ကြိုက်ပြောင်းလဲမှု', 'Settings & Preferences')}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              {/* Data Archive & Backup */}
              {isAdmin && (
                <button
                  onClick={() => handleAdminViewClick('archive')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'archive'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DatabaseBackup className="w-4 h-4 text-rose-500" />
                    <span>{t('ဒေတာ အရန်သိမ်းဆည်းမှု (Backup)', 'Data Archive & Backup')}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Utility Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-2">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Dark</span>
                </>
              )}
            </button>

            {/* Language Quick Switcher */}
            <button
              onClick={() => setLanguage(language === 'my' ? 'en' : 'my')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all"
              title="Change Language"
            >
              <Globe className="w-4 h-4 text-emerald-500" />
              <span>{language === 'my' ? '🇬🇧 English' : '🇲🇲 မြန်မာ'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {isAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRegister();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 py-1.5 px-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{t('+ ဝန်ထမ်းသစ်', '+ Staff')}</span>
              </button>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 py-1.5 px-2 ml-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('အကောင့်ထွက်မည်', 'Logout')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
