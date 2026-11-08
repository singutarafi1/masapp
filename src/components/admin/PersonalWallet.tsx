import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Minus,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Edit2,
  Clock,
  PieChart,
  X
} from 'lucide-react';
import { db, collection, onSnapshot, query, where } from '../../lib/firebase';
import { TransactionItem } from '../../types';
import { addPersonalTransaction, adminMasterDeleteTransaction, adminMasterEditTransaction, getCategorySettings } from '../../lib/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { parseAnyDate, formatDetailedTime, getLocalDateString } from '../../lib/dateUtils';
import { useBackHandler } from '../../lib/backNavigation';

interface DayWalletSummary {
  inc: number;
  exp: number;
  net: number;
  logs: TransactionItem[];
}

const CAT_COLORS = [
  'bg-indigo-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-purple-500',
];

export function PersonalWallet() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { t } = useSettings();

  const [personalTx, setPersonalTx] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter
  const [typeFilter, setTypeFilter] = useState<'all' | 'ဝင်ငွေ' | 'ထွက်ငွေ'>('all');
  const [subGroupFilter, setSubGroupFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Active day drilldown view (matching FinanceTab)
  const [activeDayDate, setActiveDayDate] = useState<string | null>(null);

  // Modal state for new personal entry
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [formType, setFormType] = useState<'ဝင်ငွေ' | 'ထွက်ငွေ'>('ထွက်ငွေ');
  const [formSubGroup, setFormSubGroup] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Personal Entry Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);
  const [editFormType, setEditFormType] = useState<'ဝင်ငွေ' | 'ထွက်ငွေ'>('ထွက်ငွေ');
  const [editFormSubGroup, setEditFormSubGroup] = useState<string>('');
  const [editFormName, setEditFormName] = useState<string>('');
  const [editFormAmount, setEditFormAmount] = useState<string>('');
  const [editFormDate, setEditFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Step-by-step Hardware Back Key integration for Sketchware WebView
  useBackHandler(activeDayDate !== null, () => setActiveDayDate(null));
  useBackHandler(isAddSheetOpen, () => setIsAddSheetOpen(false));
  useBackHandler(showEditModal, () => setShowEditModal(false));

  useEffect(() => {
    // Load categories
    getCategorySettings().then((cfg) => {
      const pCats = cfg.personal || ['အစားအသောက်', 'အဝတ်အထည်', 'ကျန်းမာရေး', 'အလှူအတန်း', 'လစာ', 'အခြား'];
      setCategories(pCats);
      if (pCats.length > 0) setFormSubGroup(pCats[0]);
    });

    // Listen to personal transactions
    const q = query(collection(db, 'transactions'), where('group', '==', 'Personal'));
    const unsub = onSnapshot(q, (snap) => {
      const list: TransactionItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as TransactionItem));

      // Sort by date desc
      list.sort((a, b) => {
        const ta = parseAnyDate(a.date || a.exactDate).getTime();
        const tb = parseAnyDate(b.date || b.exactDate).getTime();
        return tb - ta;
      });

      setPersonalTx(list);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // All-time Totals
  let totalIn = 0;
  let totalOut = 0;
  personalTx.forEach((tx) => {
    if (tx.voided) return;
    const a = Number(tx.amount) || 0;
    if (tx.type === 'ဝင်ငွေ') totalIn += a;
    else if (tx.type === 'ထွက်ငွေ') totalOut += a;
  });
  const balance = totalIn - totalOut;

  // Month-filtered base list (before type/category filter) for accurate Monthly KPI & Category Breakdown
  const monthTxList = useMemo(() => {
    return personalTx.filter((tx) => {
      if (tx.voided) return false;
      if (selectedMonth) {
        const d = parseAnyDate(tx.date || tx.exactDate);
        if (!isNaN(d.getTime())) {
          const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (mStr !== selectedMonth) return false;
        }
      }
      return true;
    });
  }, [personalTx, selectedMonth]);

  // Period KPIs & Category Breakdown
  const periodStats = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catMap: Record<string, number> = {};

    monthTxList.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'ဝင်ငွေ') {
        inc += amt;
      } else {
        exp += amt;
        const cat = tx.subGroup || 'အထွေထွေ';
        catMap[cat] = (catMap[cat] || 0) + amt;
      }
    });

    const catBreakdown = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: exp > 0 ? Math.round((amount / exp) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      inc,
      exp,
      net: inc - exp,
      catBreakdown,
    };
  }, [monthTxList]);

  // Filtered list by type, subGroup and month
  const filteredList = useMemo(() => {
    return monthTxList.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (subGroupFilter !== 'all' && tx.subGroup !== subGroupFilter) return false;
      return true;
    });
  }, [monthTxList, typeFilter, subGroupFilter]);

  // Group by local date string (YYYY-MM-DD) like FinanceTab
  const groupedDays = useMemo(() => {
    const days: Record<string, DayWalletSummary> = {};

    filteredList.forEach((tx) => {
      const d = parseAnyDate(tx.date || tx.exactDate);
      const dStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : 'Unknown';

      if (!days[dStr]) {
        days[dStr] = { inc: 0, exp: 0, net: 0, logs: [] };
      }

      const dayObj = days[dStr];
      const amt = Number(tx.amount) || 0;

      if (!tx.voided) {
        if (tx.type === 'ဝင်ငွေ') {
          dayObj.inc += amt;
        } else {
          dayObj.exp += amt;
        }
      }
      dayObj.logs.push(tx);
    });

    Object.values(days).forEach((day) => {
      day.net = day.inc - day.exp;
    });

    return days;
  }, [filteredList]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) {
      showToast('ငွေပမာဏ မှန်ကန်စွာ ထည့်ပါ', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const parts = formDate.split('-').map(Number);
      const txDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

      await addPersonalTransaction({
        type: formType,
        amount: amt,
        subGroup: formSubGroup || 'အထွေထွေ',
        name: formName || (formType === 'ဝင်ငွေ' ? 'ပုဂ္ဂိုလ်ရေး ဝင်ငွေ' : 'ပုဂ္ဂိုလ်ရေး သုံးစွဲငွေ'),
        date: txDate,
        actorName: profile?.name || 'Admin',
      });

      showToast('ကိုယ်ပိုင် ငွေစာရင်း ထည့်သွင်းပြီးပါပြီ', 'success');
      setIsAddSheetOpen(false);
      setFormAmount('');
      setFormName('');
    } catch (err: any) {
      showToast(err.message || 'စာရင်းသွင်းမရပါ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePersonalTx = async (tx: TransactionItem) => {
    if (!window.confirm(`ဤ "${tx.name}" (${Number(tx.amount).toLocaleString()} MMK) စာရင်းကို ဖျက်မည်မှာ သေချာပါသလား?`)) {
      return;
    }
    try {
      await adminMasterDeleteTransaction(tx, profile?.name || 'Admin');
      showToast('စာရင်းဖျက်သိမ်းပြီးပါပြီ', 'success');
    } catch (err: any) {
      showToast(err.message || 'ဖျက်၍မရပါ', 'error');
    }
  };

  const handleOpenEditPersonalTx = (tx: TransactionItem) => {
    setEditingTx(tx);
    setEditFormType(tx.type as 'ဝင်ငွေ' | 'ထွက်ငွေ');
    setEditFormSubGroup(tx.subGroup || (categories[0] || 'အထွေထွေ'));
    setEditFormName(tx.name);
    setEditFormAmount(String(tx.amount));
    const d = parseAnyDate(tx.date || tx.exactDate);
    setEditFormDate(!isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : getLocalDateString());
    setShowEditModal(true);
  };

  const handleSaveEditPersonalTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const amt = parseFloat(editFormAmount);
    if (!amt || amt <= 0) {
      showToast('ငွေပမာဏ မှန်ကန်စွာ ထည့်ပါ', 'error');
      return;
    }
    setIsEditSubmitting(true);
    try {
      const parts = editFormDate.split('-').map(Number);
      const txDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

      await adminMasterEditTransaction(
        editingTx.id,
        {
          name: editFormName.trim() || (editFormType === 'ဝင်ငွေ' ? 'ပုဂ္ဂိုလ်ရေး ဝင်ငွေ' : 'ပုဂ္ဂိုလ်ရေး သုံးစွဲငွေ'),
          amount: amt,
          type: editFormType,
          group: 'Personal',
          date: txDate,
        },
        profile?.name || 'Admin'
      );

      showToast('ကိုယ်ပိုင် ငွေစာရင်း ပြင်ဆင်ပြီးပါပြီ', 'success');
      setShowEditModal(false);
    } catch (err: any) {
      showToast(err.message || 'ပြင်ဆင်၍မရပါ', 'error');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in pb-36 px-3.5 sm:px-6 max-w-5xl mx-auto pt-3">
      
      {/* SMART MOBILE-FIT PERSONAL WALLET DASHBOARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5">
        {/* Top Row: All-Time Vault Balance + Dual Quick Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">{t('ကိုယ်ပိုင် အိတ်ကပ် လက်ကျန်', 'Personal Wallet Balance')}</span>
            </div>
            <div
              className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums mt-0.5 truncate ${
                balance >= 0
                  ? 'text-slate-900 dark:text-white'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {balance.toLocaleString()} <span className="text-xs font-bold text-slate-400">Ks</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setFormType('ဝင်ငွေ');
                setIsAddSheetOpen(true);
              }}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ဝင်ငွေ</span>
            </button>
            <button
              onClick={() => {
                setFormType('ထွက်ငွေ');
                setIsAddSheetOpen(true);
              }}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>သုံးစရိတ်</span>
            </button>
          </div>
        </div>

        {/* Period 3-Column KPI Strip (Selected Month or All-Time) */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 min-w-0">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block truncate">
              {selectedMonth ? `${selectedMonth} ဝင်ငွေ` : 'စုစုပေါင်း ဝင်ငွေ'}
            </span>
            <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums block truncate mt-0.5">
              +{periodStats.inc.toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50 min-w-0">
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block truncate">
              {selectedMonth ? `${selectedMonth} သုံးစရိတ်` : 'စုစုပေါင်း သုံးစရိတ်'}
            </span>
            <span className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 tabular-nums block truncate mt-0.5">
              -{periodStats.exp.toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              ကာလ အသားတင်
            </span>
            <span
              className={`text-xs sm:text-sm font-black tabular-nums block truncate mt-0.5 ${
                periodStats.net >= 0
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {periodStats.net >= 0 ? '+' : ''}
              {periodStats.net.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Category Spending Visual Breakdown Bar (when there is expense in selected period) */}
        {periodStats.catBreakdown.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                <span>သုံးစရိတ် အမျိုးအစား ခွဲခြမ်းစိတ်ဖြာမှု</span>
              </span>
              {subGroupFilter !== 'all' && (
                <button
                  onClick={() => setSubGroupFilter('all')}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  အားလုံးပြန်ပြရန်
                </button>
              )}
            </div>

            {/* Proportional Multi-Segment Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              {periodStats.catBreakdown.map((item, idx) => (
                <div
                  key={item.name}
                  style={{ width: `${Math.max(item.pct, 3)}%` }}
                  className={`${CAT_COLORS[idx % CAT_COLORS.length]} h-full first:rounded-l-full last:rounded-r-full transition-all`}
                  title={`${item.name}: ${item.amount.toLocaleString()} Ks (${item.pct}%)`}
                />
              ))}
            </div>

            {/* Interactive Category Filter Chips with Spend & % */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {periodStats.catBreakdown.map((item, idx) => {
                const isSelected = subGroupFilter === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() =>
                      setSubGroupFilter(isSelected ? 'all' : item.name)
                    }
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all tabular-nums ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                        : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        CAT_COLORS[idx % CAT_COLORS.length]
                      }`}
                    />
                    <span>{item.name}</span>
                    <span className="opacity-75">{item.pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Compact Filter Toolbar (Month & Type) */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-h-[40px]"
          />
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth('')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white min-h-[40px]"
              title="လအားလုံး ကြည့်ရန်"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type Filter Segmented Control */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg transition-all ${
              typeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500'
            }`}
          >
            အားလုံး
          </button>
          <button
            onClick={() => setTypeFilter('ဝင်ငွေ')}
            className={`px-2.5 py-1.5 rounded-lg transition-all ${
              typeFilter === 'ဝင်ငွေ'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-500'
            }`}
          >
            ဝင်ငွေ
          </button>
          <button
            onClick={() => setTypeFilter('ထွက်ငွေ')}
            className={`px-2.5 py-1.5 rounded-lg transition-all ${
              typeFilter === 'ထွက်ငွေ'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-500'
            }`}
          >
            သုံးစရိတ်
          </button>
        </div>
      </div>

      {/* DAILY GROUPED TRANSACTIONS LIST (COMPACT DATE CARDS MATCHING FINANCETAB) */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            {t('ကိုယ်ပိုင် ငွေစာရင်းများ ဆွဲယူနေပါသည်...', 'Loading personal records...')}
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            {t('ဤရွေးချယ်မှုအတွက် ကိုယ်ပိုင်ငွေစာရင်း မှတ်တမ်း မရှိပါ', 'No personal records found for this period')}
          </div>
        ) : (
          sortedDates.map((dateStr) => {
            const day = groupedDays[dateStr];
            const isPositive = day.net >= 0;

            return (
              <div 
                key={dateStr}
                onClick={() => setActiveDayDate(dateStr)}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-sm transition-all active:scale-[0.99] flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                      📅 {dateStr}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      · {day.logs.length} စာရင်း
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                      +{day.inc.toLocaleString()}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                      -{day.exp.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm sm:text-base font-black tabular-nums ${
                      isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}{day.net.toLocaleString()} Ks
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FULLSCREEN DAY DETAIL VIEW (MATCHING FINANCETAB) */}
      {activeDayDate && (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setActiveDayDate(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 py-1.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              📅 {activeDayDate} ကိုယ်ပိုင်စာရင်းချုပ်
            </h3>
            <button
              onClick={() => {
                setFormDate(activeDayDate);
                setIsAddSheetOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>စာရင်းထည့်</span>
            </button>
          </div>

          {/* Day Summary Cards */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="max-w-2xl mx-auto grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">ဝင်ငွေ</span>
                <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300">
                  +{groupedDays[activeDayDate]?.inc.toLocaleString()} Ks
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">သုံးစရိတ်</span>
                <span className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300">
                  -{groupedDays[activeDayDate]?.exp.toLocaleString()} Ks
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">အသားတင်</span>
                <span className={`text-xs sm:text-sm font-black ${
                  (groupedDays[activeDayDate]?.net || 0) >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {(groupedDays[activeDayDate]?.net || 0) >= 0 ? '+' : ''}{(groupedDays[activeDayDate]?.net || 0).toLocaleString()} Ks
                </span>
              </div>
            </div>
          </div>

          {/* Day's Item Rows */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 pb-36 max-w-2xl mx-auto w-full">
            {(!groupedDays[activeDayDate] || groupedDays[activeDayDate]?.logs.length === 0) ? (
              <div className="text-center py-12 text-slate-400 text-xs">စာရင်းမှတ်တမ်းမရှိပါ</div>
            ) : (
              groupedDays[activeDayDate]?.logs.map((tx) => {
                const isIncome = tx.type === 'ဝင်ငွေ';
                return (
                  <div
                    key={tx.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIncome ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {tx.name}
                            </span>
                            {tx.subGroup && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                {tx.subGroup}
                              </span>
                            )}
                            {tx.transferPair && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 shrink-0">
                                🔁 Transfer
                              </span>
                            )}
                          </div>
                          {tx.note && (
                            <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                              {tx.note}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDetailedTime(tx.exactDate || tx.date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm sm:text-base font-black tabular-nums block ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}>
                          {isIncome ? '+' : '-'}{Number(tx.amount).toLocaleString()} MMK
                        </span>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <button
                            onClick={() => handleOpenEditPersonalTx(tx)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 px-2 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>ပြင်မည်</span>
                          </button>
                          <button
                            onClick={() => handleDeletePersonalTx(tx)}
                            className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ဖျက်မည်</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sub-item Audit History Trail (Option Kh) */}
                    {tx.history && tx.history.length > 0 && (
                      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl space-y-0.5 border border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-600 dark:text-slate-300 mb-0.5">🕒 လုပ်ဆောင်ချက် သမိုင်းမှတ်တမ်း:</div>
                        {tx.history.map((h: any, hIdx: number) => (
                          <div key={hIdx} className="truncate">
                            • <b className="text-slate-700 dark:text-slate-200">{h.by || 'Admin'}</b>: {h.msg || 'Action'} ({h.time ? new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET FOR NEW ENTRY */}
      {isAddSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              {t('ကိုယ်ပိုင် ငွေစာရင်း အသစ်ထည့်မည်', 'Add Private Transaction')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setFormType('ဝင်ငွေ')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all min-h-[44px] ${
                    formType === 'ဝင်ငွေ'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  + {t('ဝင်ငွေ', 'Income')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('ထွက်ငွေ')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all min-h-[44px] ${
                    formType === 'ထွက်ငွေ'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  - {t('ထွက်ငွေ', 'Expense')}
                </button>
              </div>

              {/* Amount with Quick Add Chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('ငွေပမာဏ (MMK) *', 'Amount (MMK) *')}
                  </label>
                  {formAmount && (
                    <button
                      type="button"
                      onClick={() => setFormAmount('')}
                      className="text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      ရှင်းမည်
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-black tabular-nums focus:border-indigo-500 outline-none min-h-[48px]"
                  required
                />
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                  {[1000, 3000, 5000, 10000, 50000].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() =>
                        setFormAmount(String((parseInt(formAmount, 10) || 0) + step))
                      }
                      className="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 text-[11px] font-extrabold tabular-nums border border-slate-200/70 dark:border-slate-700 active:scale-95 transition-transform"
                    >
                      +{step.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name / Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('အကြောင်းအရာ / မှတ်ချက်', 'Description / Title')}
                </label>
                <input
                  type="text"
                  placeholder={formType === 'ဝင်ငွေ' ? 'ဥပမာ - အိမ်မှပေးငွေ' : 'ဥပမာ - မနက်စာ / ကော်ဖီဖိုး'}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-indigo-500 outline-none min-h-[46px]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('အမျိုးအစား', 'Category')}
                </label>
                <select
                  value={formSubGroup}
                  onChange={(e) => setFormSubGroup(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-indigo-500 outline-none min-h-[46px]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('ရက်စွဲ', 'Date')}
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-indigo-500 outline-none min-h-[46px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSheetOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 min-h-[48px]"
                >
                  {t('မလုပ်တော့ပါ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 min-h-[48px] active:scale-98 transition-all"
                >
                  {isSubmitting ? t('သိမ်းဆည်းနေပါသည်...', 'Saving...') : t('စာရင်းသိမ်းမည်', 'Save Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERSONAL TRANSACTION MODAL */}
      {showEditModal && editingTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              {t('ကိုယ်ပိုင် ငွေစာရင်း ပြင်ဆင်မည်', 'Edit Private Transaction')}
            </h3>

            <form onSubmit={handleSaveEditPersonalTx} className="space-y-4 pt-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setEditFormType('ဝင်ငွေ')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all min-h-[44px] ${
                    editFormType === 'ဝင်ငွေ'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  + {t('ဝင်ငွေ', 'Income')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditFormType('ထွက်ငွေ')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all min-h-[44px] ${
                    editFormType === 'ထွက်ငွေ'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  - {t('ထွက်ငွေ', 'Expense')}
                </button>
              </div>

              {/* Amount with Quick Add Chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t('ငွေပမာဏ (MMK) *', 'Amount (MMK) *')}
                  </label>
                  {editFormAmount && (
                    <button
                      type="button"
                      onClick={() => setEditFormAmount('')}
                      className="text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      ရှင်းမည်
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={editFormAmount}
                  onChange={(e) => setEditFormAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-black tabular-nums focus:border-indigo-500 outline-none min-h-[46px]"
                  required
                />
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                  {[1000, 3000, 5000, 10000, 50000].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() =>
                        setEditFormAmount(String((parseInt(editFormAmount, 10) || 0) + step))
                      }
                      className="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 text-[11px] font-extrabold tabular-nums border border-slate-200/70 dark:border-slate-700 active:scale-95 transition-transform"
                    >
                      +{step.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('အကြောင်းအရာ အမည်', 'Description / Title')}
                </label>
                <input
                  type="text"
                  placeholder={editFormType === 'ဝင်ငွေ' ? 'ဥပမာ - လစာ၊ အခြားဝင်ငွေ' : 'ဥပမာ - မနက်စာ၊ ဆီဖိုး'}
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-indigo-500 outline-none min-h-[46px]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('အမျိုးအစား', 'Category')}
                </label>
                <select
                  value={editFormSubGroup}
                  onChange={(e) => setEditFormSubGroup(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-indigo-500 outline-none min-h-[46px]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('ရက်စွဲ', 'Date')}
                </label>
                <input
                  type="date"
                  value={editFormDate}
                  onChange={(e) => setEditFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-indigo-500 outline-none min-h-[46px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 min-h-[48px]"
                >
                  {t('မလုပ်တော့ပါ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 min-h-[48px] active:scale-98 transition-all"
                >
                  {isEditSubmitting ? t('ပြင်ဆင်နေပါသည်...', 'Updating...') : t('ပြင်ဆင်မှု သိမ်းမည်', 'Update Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
