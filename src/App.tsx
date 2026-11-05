import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { BottomNav, MainTab } from './components/BottomNav';
import { AuthView } from './components/auth/AuthView';
import { InventoryTab } from './components/inventory/InventoryTab';
import { RepairTab } from './components/repair/RepairTab';
import { FinanceTab } from './components/finance/FinanceTab';
import { DebtTab } from './components/debt/DebtTab';
import { AiModal } from './components/ai/AiModal';
import { NavigationDrawer, AdminViewType } from './components/NavigationDrawer';
import { ExecutiveDashboard } from './components/admin/ExecutiveDashboard';
import { PersonalWallet } from './components/admin/PersonalWallet';
import { AuditLogsView } from './components/admin/AuditLogsView';
import { CategorySettingsView } from './components/admin/CategorySettingsView';
import { DataArchiveControl } from './components/admin/DataArchiveControl';
import { RegisterModal } from './components/auth/RegisterModal';
import { db, collection, onSnapshot } from './lib/firebase';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>('inventory');
  const [activeAdminView, setActiveAdminView] = useState<AdminViewType>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [drawerCash, setDrawerCash] = useState<number>(0);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Sync theme with HTML class and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Realtime Drawer Cash on Hand calculation (Shop Income - Shop Expense)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'transactions'), (snap) => {
      let cin = 0;
      let cout = 0;
      snap.forEach((d) => {
        const item = d.data();
        if (item.voided) return;
        if (item.group === 'Personal') return; // strictly isolate personal wallet
        const amt = Number(item.amount) || 0;
        if (item.type === 'ဝင်ငွေ') cin += amt;
        else if (item.type === 'ထွက်ငွေ') cout += amt;
      });
      setDrawerCash(cin - cout);
    });

    return () => unsub();
  }, [user]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <span className="text-xs font-bold text-slate-500 tracking-wide">
          Mobile ANSWER Pro ကို ဖွင့်နေပါသည်...
        </span>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-indigo-500/20 selection:text-indigo-700">
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAi={() => setIsAiOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        activeAdminView={activeAdminView}
        onResetToCounter={() => setActiveAdminView(null)}
        drawerCash={drawerCash}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto overflow-x-hidden">
        {/* If an Admin Executive View is active and user is admin */}
        {isAdmin && activeAdminView === 'executive' && <ExecutiveDashboard />}
        {isAdmin && activeAdminView === 'wallet' && <PersonalWallet />}
        {isAdmin && activeAdminView === 'audit_logs' && <AuditLogsView />}
        {isAdmin && activeAdminView === 'categories' && <CategorySettingsView />}
        {isAdmin && activeAdminView === 'archive' && <DataArchiveControl />}

        {/* Counter Shop Views */}
        {activeAdminView === null && (
          <>
            {activeTab === 'inventory' && <InventoryTab />}
            {activeTab === 'repair' && <RepairTab />}
            {activeTab === 'finance' && <FinanceTab />}
            {activeTab === 'debt' && <DebtTab />}
          </>
        )}
      </main>

      {/* Floating Bottom Nav for fast counter navigation */}
      {activeAdminView === null && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAi={() => setIsAiOpen(true)}
        />
      )}

      {/* Slide Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeAdminView={activeAdminView}
        onSelectAdminView={setActiveAdminView}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAi={() => setIsAiOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        drawerCash={drawerCash}
      />

      <AiModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />

      {isRegisterOpen && (
        <RegisterModal onClose={() => setIsRegisterOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
