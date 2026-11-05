import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  LogOut, 
  UserPlus, 
  ShieldCheck, 
  User as UserIcon,
  Sparkles,
  Menu,
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { RegisterModal } from './auth/RegisterModal';
import { AdminViewType } from './NavigationDrawer';

interface NavbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAi: () => void;
  onOpenDrawer: () => void;
  activeAdminView: AdminViewType;
  onResetToCounter: () => void;
  drawerCash?: number;
}

export function Navbar({ 
  theme, 
  onToggleTheme, 
  onOpenAi, 
  onOpenDrawer,
  activeAdminView,
  onResetToCounter,
  drawerCash = 0
}: NavbarProps) {
  const { profile, isAdmin, logout } = useAuth();
  const { shopTitle, t, themeConfig } = useSettings();
  const [showRegModal, setShowRegModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full overflow-hidden bg-white/98 dark:bg-slate-900/98 sm:backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-3 w-full">
          
          {/* Zone 1: Brand Wordmark & Mode Switch */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
            {/* Drawer Menu Button */}
            <button
              onClick={onOpenDrawer}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
              title={t('မီနူး အံဆွဲ ဖွင့်မည်', 'Open Drawer Menu')}
              aria-label="Open Menu Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button 
              onClick={onResetToCounter}
              className="flex items-center gap-1.5 sm:gap-2 text-left group"
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr ${themeConfig.gradient} flex items-center justify-center text-white font-black text-xs sm:text-base shadow-sm group-hover:scale-105 transition-transform`}>
                {shopTitle.charAt(0) || 'A'}
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                  {shopTitle}
                </span>
                <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                  {activeAdminView 
                    ? (activeAdminView === 'settings' ? t('စနစ် အပြင်အဆင်', 'SETTINGS') : `Admin / ${activeAdminView.toUpperCase()}`) 
                    : t('ကောင်တာ အရောင်း & စက်ပြင်', 'POS & Service')}
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Cash On Hand Indicator (ADMIN ONLY - HIDDEN FROM STAFF) */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 shrink min-w-0">
              <div className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl bg-indigo-50 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700/60 text-xs">
                <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="hidden md:inline text-slate-500 text-[11px] font-medium">အံဆွဲ:</span>
                <span className="font-black text-indigo-950 dark:text-white truncate">
                  {drawerCash.toLocaleString()} <span className="text-[9px] text-slate-400">Ks</span>
                </span>
              </div>

              {activeAdminView && (
                <button
                  onClick={onResetToCounter}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 hover:bg-amber-200 transition-colors"
                >
                  ← ကောင်တာ
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">
                {t('ကောင်တာ အရောင်း/စက်ပြင်', 'Counter POS')}
              </span>
            </div>
          )}

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAi}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r ${themeConfig.gradient} rounded-xl shadow-sm active:scale-95 transition-all`}
              title="AI Smart Assistant"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Smart</span>
            </button>

            {/* Profile Avatar / Drawer Trigger */}
            <button
              onClick={onOpenDrawer}
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-transform active:scale-95 ${
                isAdmin
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 shadow-xs'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300/40 shadow-xs'
              }`}
              title={t('မီနူး ဖွင့်မည်', 'Open Menu')}
            >
              {profile?.name?.slice(0, 1) || 'U'}
            </button>
          </div>
        </div>
      </header>

      {showRegModal && (
        <RegisterModal onClose={() => setShowRegModal(false)} />
      )}
    </>
  );
}
