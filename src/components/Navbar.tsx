import React, { useState } from 'react';
import { 
  Sparkles,
  Menu,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
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
  onOpenAi, 
  onOpenDrawer,
  activeAdminView,
  onResetToCounter,
}: NavbarProps) {
  const { profile, isAdmin } = useAuth();
  const { shopTitle, t, themeConfig } = useSettings();
  const { confirmAction, setOnlineLoading, showToast } = useToast();
  const [showRegModal, setShowRegModal] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const handleOnlineReload = async () => {
    const ok = await confirmAction({
      title: '☁️ Online Data Reload',
      message: 'အွန်လိုင်းဆာဗာမှ နောက်ဆုံးရ စာရင်းအချက်အလက်များကို ပြန်လည်ဆွဲယူ (Reload) လုပ်မည်မှာ သေချာပါသလား?',
      confirmText: 'Reload လုပ်မည်',
      cancelText: 'မလုပ်တော့ပါ',
      danger: false,
    });
    if (!ok) return;

    setIsReloading(true);
    setOnlineLoading('☁️ အွန်လိုင်းစာရင်းများ အသစ်ပြန်လည်ချိတ်ဆက်နေပါသည်...');
    showToast('အွန်လိုင်းဒေတာများ ပြန်လည်ဆွဲယူနေပါသည်...', 'info');
    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.AndroidApp?.reloadApp === 'function') {
        window.AndroidApp.reloadApp();
      } else {
        window.location.reload();
      }
    }, 450);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full overflow-hidden bg-white/98 dark:bg-slate-900/98 sm:backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-3 w-full">
          
          {/* Zone 1: Brand Wordmark & Mode Switch */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
            {/* Drawer Menu Button */}
            <button
              onClick={onOpenDrawer}
              className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
              title={t('မီနူး အံဆွဲ ဖွင့်မည်', 'Open Drawer Menu')}
              aria-label="Open Menu Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button 
              onClick={onResetToCounter}
              className="flex items-center gap-1.5 sm:gap-2 text-left group min-w-0"
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr ${themeConfig.gradient} flex items-center justify-center text-white font-black text-xs sm:text-base shadow-sm shrink-0`}>
                {shopTitle.charAt(0) || 'A'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white leading-none truncate max-w-[125px] sm:max-w-none">
                  {shopTitle}
                </span>
                <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5 truncate">
                  {activeAdminView 
                    ? (activeAdminView === 'settings' ? t('စနစ် အပြင်အဆင်', 'SETTINGS') : `Admin / ${activeAdminView.toUpperCase()}`) 
                    : t('ကောင်တာ အရောင်း & စက်ပြင်', 'POS & Service')}
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Status */}
          <div className="flex items-center gap-1.5 shrink min-w-0">
            {activeAdminView ? (
              <button
                onClick={onResetToCounter}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 hover:bg-amber-200 transition-colors"
              >
                ← {t('ကောင်တာသို့', 'Counter')}
              </button>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 hidden md:inline">
                {t('ကောင်တာ အရောင်း & စက်ပြင်', 'Counter POS & Service')}
              </span>
            )}
          </div>

          {/* Zone 3: Actions (Online Reload + AI Smart + Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Online Reload Button */}
            <button
              type="button"
              onClick={handleOnlineReload}
              disabled={isReloading}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all"
              title="အွန်လိုင်းဒေတာ ပြန်လည်ဆွဲယူရန် (Online Reload)"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isReloading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline sm:inline">Reload</span>
            </button>

            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAi}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-white bg-gradient-to-r ${themeConfig.gradient} rounded-xl shadow-sm active:scale-95 transition-all`}
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
