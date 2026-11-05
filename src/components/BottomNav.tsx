import React from 'react';
import { Package, Wrench, Wallet, BookOpen, Bot } from 'lucide-react';

import { useSettings } from '../context/SettingsContext';

export type MainTab = 'inventory' | 'repair' | 'finance' | 'debt';

interface BottomNavProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onOpenAi: () => void;
  isAiListening?: boolean;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  onOpenAi,
  isAiListening = false,
}: BottomNavProps) {
  const { t, themeConfig } = useSettings();

  const navItems: { id: MainTab; label: string; icon: React.ElementType }[] = [
    { id: 'inventory', label: t('စတော့', 'Stock'), icon: Package },
    { id: 'repair', label: t('စက်ပြင်', 'Repair'), icon: Wrench },
    { id: 'finance', label: t('ငွေစာရင်း', 'Finance'), icon: Wallet },
    { id: 'debt', label: t('အကြွေး', 'Debts'), icon: BookOpen },
  ];

  return (
    <>
      {/* Floating AI Action Button in Thumb Zone */}
      <button
        onClick={onOpenAi}
        className={`fixed right-4 bottom-20 z-40 w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all active:scale-90 ${
          isAiListening
            ? 'bg-rose-600 shadow-rose-600/40 animate-pulse'
            : `bg-gradient-to-tr ${themeConfig.gradient} shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5`
        }`}
        title="AI Smart Input & Voice"
        aria-label="AI Voice Assistant"
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-full overflow-hidden bg-white/98 dark:bg-slate-900/98 sm:backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors">
        <div className="max-w-md mx-auto grid grid-cols-4 h-16 items-center px-1 sm:px-2 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] gap-1 transition-all relative ${
                  isActive
                    ? `${themeConfig.primaryText} font-bold`
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {isActive && (
                    <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${themeConfig.primaryBg} rounded-full`} />
                  )}
                </div>
                <span className="text-[11px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
