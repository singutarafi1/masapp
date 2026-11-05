import React from 'react';
import { 
  X, 
  LayoutDashboard, 
  Wallet, 
  History, 
  SlidersHorizontal, 
  DatabaseBackup, 
  Store, 
  ShieldCheck, 
  UserPlus, 
  LogOut, 
  Sun, 
  Moon, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MainTab } from './BottomNav';

export type AdminViewType = 'executive' | 'wallet' | 'audit_logs' | 'categories' | 'archive' | null;

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

  if (!isOpen) return null;

  const handleTabClick = (tab: MainTab) => {
    onSelectAdminView(null);
    onSelectTab(tab);
    onClose();
  };

  const handleAdminViewClick = (view: AdminViewType) => {
    onSelectAdminView(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto z-10">
        
        {/* Top Header */}
        <div>
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20">
                A
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                  Mobile ANSWER Pro
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isAdmin 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                  }`}>
                    {isAdmin && <ShieldCheck className="w-3 h-3 inline mr-0.5" />}
                    {isAdmin ? 'ADMIN' : 'STAFF'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">
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

          {/* Quick Cash Summary Widget in Drawer */}
          <div className="p-4 mx-4 mt-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-slate-800/60 dark:to-slate-800/30 border border-indigo-100/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                အံဆွဲလက်ကျန်ငွေ (Cash on Hand)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xl font-black text-indigo-950 dark:text-white tracking-tight">
              {drawerCash.toLocaleString()} <span className="text-xs font-semibold text-slate-500">MMK</span>
            </div>
          </div>

          {/* Section: Shop Counter Operations */}
          <div className="px-4 pt-5 pb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
              ကောင်တာ လုပ်ငန်းစဥ်များ (Counter)
            </span>
            <div className="space-y-1">
              <button
                onClick={() => handleTabClick('inventory')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeAdminView === null && activeTab === 'inventory'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 opacity-80" />
                  <span>စတော့နှင့် အရောင်း (Inventory & POS)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleTabClick('repair')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeAdminView === null && activeTab === 'repair'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 opacity-80" />
                  <span>စက်ပြင်လက်ခံ & ဘောက်ချာ (Repairs VR)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleTabClick('finance')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeAdminView === null && activeTab === 'finance'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 opacity-80" />
                  <span>ဝင်/ထွက် ငွေစာရင်း (Daily Ledger)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => handleTabClick('debt')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeAdminView === null && activeTab === 'debt'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 opacity-80" />
                  <span>ဖောက်သည် အကြွေးစာရင်း (Debts)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </div>

          {/* Section: Admin Executive Suite (Role Gated) */}
          {isAdmin && (
            <div className="px-4 pt-4 pb-2 border-t border-slate-100 dark:border-slate-800/80 mt-2">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider px-2 block mb-2 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                အုပ်ချုပ်သူ အခန်းကဏ္ဍ (Admin Suite)
              </span>

              <div className="space-y-1">
                <button
                  onClick={() => handleAdminViewClick('executive')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'executive'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    <span>Executive Dashboard (အမြတ် & ရင်းနှီးငွေ)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => handleAdminViewClick('wallet')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'wallet'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    <span>My Personal Wallet (ကိုယ်ပိုင်အိတ်ကပ်)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => handleAdminViewClick('audit_logs')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'audit_logs'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-4 h-4 text-blue-500" />
                    <span>Activity Audit Logs (လုပ်ဆောင်ချက်မှတ်တမ်း)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => handleAdminViewClick('categories')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'categories'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-purple-500" />
                    <span>အမျိုးအစား စီမံခန့်ခွဲမှု (Categories)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>

                <button
                  onClick={() => handleAdminViewClick('archive')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAdminView === 'archive'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DatabaseBackup className="w-4 h-4 text-rose-500" />
                    <span>Data Archive & CSV Backup (လုံခြုံရေး)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Utility Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-2">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Smart AI Trigger */}
            <button
              onClick={() => {
                onClose();
                onOpenAi();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm shadow-indigo-600/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Assistant</span>
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
                <span>ဝန်ထမ်းအကောင့်သစ်</span>
              </button>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 py-1.5 px-2 ml-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>အကောင့်ထွက်မည်</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
