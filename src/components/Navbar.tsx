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
  const [showRegModal, setShowRegModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-15 flex items-center justify-between gap-3">
          
          {/* Zone 1: Brand Wordmark & Mode Switch */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Drawer Menu Button */}
            <button
              onClick={onOpenDrawer}
              className="p-2 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
              title="မီနူး အံဆွဲ ဖွင့်မည်"
              aria-label="Open Menu Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button 
              onClick={onResetToCounter}
              className="flex items-center gap-2 text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                A
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                  Mobile <span className="text-indigo-600 dark:text-indigo-400">ANSWER</span>
                </span>
                <span className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                  {activeAdminView ? `Admin / ${activeAdminView.toUpperCase()}` : 'POS & Service'}
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Cash On Hand Indicator (Desktop & Mobile Compact) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-indigo-50 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-700/60 text-xs">
              <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline text-slate-500 text-[11px] font-medium">အံဆွဲလက်ကျန်:</span>
              <span className="font-black text-indigo-950 dark:text-white">
                {drawerCash.toLocaleString()} <span className="text-[10px] text-slate-400">Ks</span>
              </span>
            </div>

            {activeAdminView && (
              <button
                onClick={onResetToCounter}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 hover:bg-amber-200 transition-colors"
              >
                ← ကောင်တာသို့ ပြန်သွားမည်
              </button>
            )}
          </div>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAi}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-sm shadow-indigo-500/20 active:scale-95 transition-all"
              title="AI Smart Assistant"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Smart</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Theme ပြောင်းရန်"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Profile Avatar / Drawer Trigger */}
            <button
              onClick={onOpenDrawer}
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                isAdmin
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300/40'
              }`}
              title="Drawer Menu ဖွင့်မည်"
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
