import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Calendar, 
  Tag, 
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { db, collection, onSnapshot, query, where } from '../../lib/firebase';
import { TransactionItem } from '../../types';
import { addPersonalTransaction, adminMasterDeleteTransaction, getCategorySettings } from '../../lib/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, parseAnyDate, formatDetailedTime, getLocalDateString } from '../../lib/dateUtils';

interface DayWalletSummary {
  inc: number;
  exp: number;
  net: number;
  logs: TransactionItem[];
}

export function PersonalWallet() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { t, themeConfig } = useSettings();

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

  // Totals
  let totalIn = 0;
  let totalOut = 0;
  personalTx.forEach((tx) => {
    if (tx.voided) return;
    const a = Number(tx.amount) || 0;
    if (tx.type === 'ဝင်ငွေ') totalIn += a;
    else if (tx.type === 'ထွက်ငွေ') totalOut += a;
  });
  const balance = totalIn - totalOut;

  // Filtered list by type, subGroup and month
  const filteredList = useMemo(() => {
    return personalTx.filter((tx) => {
      if (tx.voided) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (subGroupFilter !== 'all' && tx.subGroup !== subGroupFilter) return false;

      // Month filter
      if (selectedMonth) {
        const d = parseAnyDate(tx.date || tx.exactDate);
        if (!isNaN(d.getTime())) {
          const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (mStr !== selectedMonth) return false;
        }
      }

      return true;
    });
  }, [personalTx, typeFilter, subGroupFilter, selectedMonth]);

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

  return (
    <div className="space-y-6 animate-in fade-in pb-36 px-3 sm:px-6 max-w-5xl mx-auto pt-4">
      
      {/* Wallet Banner Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-950/20 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>{t('ကိုယ်ပိုင် အိတ်ကပ် စာရင်းချုပ်', "Admin's Personal Vault & Wallet")}</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
              {balance.toLocaleString()} <span className="text-sm font-medium text-indigo-300">MMK</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('ဆိုင်ငွေစာရင်းနှင့် ရောထွေးမှုမရှိသော သီးသန့် ကိုယ်ပိုင် အသုံးစရိတ်နှင့် ဝင်ငွေစာရင်း', 'Isolated private wallet ledger for shop owner')}
            </p>
          </div>

          <button
            onClick={() => setIsAddSheetOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all self-start sm:self-auto min-h-[48px]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('+ စာရင်းအသစ်ထည့်မည်', '+ Add Personal Record')}</span>
          </button>
        </div>

        {/* Small In/Out Summary Inside Vault */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-indigo-900/60">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {t('စုစုပေါင်း ကိုယ်ပိုင်ဝင်ငွေ', 'Total Private Income')}
            </span>
            <div className="text-lg font-black text-white mt-0.5">
              +{totalIn.toLocaleString()} <span className="text-[10px] text-slate-400">MMK</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {t('စုစုပေါင်း ကိုယ်ပိုင်သုံးစရိတ်', 'Total Private Expense')}
            </span>
            <div className="text-lg font-black text-white mt-0.5">
              -{totalOut.toLocaleString()} <span className="text-[10px] text-slate-400">MMK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Month, Type and Category) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* Month Input */}
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 min-h-[44px]"
            />
            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth('')}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                {t('လအားလုံး', 'All Months')}
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              {t('အားလုံး', 'All')}
            </button>
            <button
              onClick={() => setTypeFilter('ဝင်ငွေ')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                typeFilter === 'ဝင်ငွေ'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              {t('ဝင်ငွေ', 'Income')}
            </button>
            <button
              onClick={() => setTypeFilter('ထွက်ငွေ')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                typeFilter === 'ထွက်ငွေ'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              {t('ထွက်ငွေ', 'Expense')}
            </button>
          </div>

          {/* SubGroup Dropdown */}
          <select
            value={subGroupFilter}
            onChange={(e) => setSubGroupFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[44px]"
          >
            <option value="all">{t('အမျိုးအစား အားလုံး', 'All Categories')} ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <span>{t('စာရင်း စုစုပေါင်း', 'Total records')}: <b>{filteredList.length}</b> {t('ခု', 'items')}</span>
          <span>{t('ရက်စွဲ စုစုပေါင်း', 'Total days')}: <b>{sortedDates.length}</b> {t('ရက်', 'days')}</span>
        </div>
      </div>

      {/* DAILY GROUPED TRANSACTIONS LIST (COMPACT DATE CARDS MATCHING FINANCETAB) */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            {t('ကိုယ်ပိုင် ငွေစာရင်းများ ဆွဲယူနေပါသည်...', 'Loading personal records...')}
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
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
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      📅 {dateStr}
                    </span>
                    <span className="text-xs text-slate-400">· {day.logs.length} စာရင်း</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-600 font-semibold tabular-nums">
                      ဝင်: +{day.inc.toLocaleString()} Ks
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-rose-600 font-semibold tabular-nums">
                      သုံး: -{day.exp.toLocaleString()} Ks
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-sm sm:text-base font-black tabular-nums ${
                      isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}{day.net.toLocaleString()} Ks
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
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
                        <button
                          onClick={() => handleDeletePersonalTx(tx)}
                          className="mt-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>ဖျက်မည်</span>
                        </button>
                      </div>
                    </div>
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

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('ငွေပမာဏ (MMK) *', 'Amount (MMK) *')}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-black focus:border-indigo-500 outline-none min-h-[48px]"
                  required
                />
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

    </div>
  );
}
