import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Scale,
  Briefcase,
  ChevronRight,
  ArrowLeft,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { db, collection, query, where, onSnapshot } from '../../lib/firebase';
import { TransactionItem, DayFinanceSummary, TransactionType, TransactionGroup } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  formatCurrency,
  formatDetailedTime,
  getLocalDateString,
} from '../../lib/dateUtils';
import {
  adminMasterDeleteTransaction,
  adminMasterEditTransaction,
  createTransferPair,
} from '../../lib/dataService';
import { addDoc, serverTimestamp } from '../../lib/firebase';

export function FinanceTab() {
  const { profile, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(() => getLocalDateString().slice(0, 7));
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Day Drawer/View
  const [activeDayDate, setActiveDayDate] = useState<string | null>(null);

  // Modals
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [addTxType, setAddTxType] = useState<TransactionType>('ဝင်ငွေ');
  const [showEditTxModal, setShowEditTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);

  // Balance Check / Daily Settlement Modal
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [physicalCashInput, setPhysicalCashInput] = useState('');

  // Owner Fund Modal (Admin only)
  const [showOwnerFundModal, setShowOwnerFundModal] = useState(false);
  const [ownerFundAmt, setOwnerFundAmt] = useState('');
  const [ownerFundNote, setOwnerFundNote] = useState('');

  // Transaction Form state
  const [txFormData, setTxFormData] = useState({
    name: '',
    amount: '',
    group: 'Service' as TransactionGroup,
    date: getLocalDateString(),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to month's transactions
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);

    const year = Number(selectedMonth.slice(0, 4));
    const month = Number(selectedMonth.slice(5, 7));
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const q = query(
      collection(db, 'transactions'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as TransactionItem))
          .filter((d) => d.group !== 'Personal'); // Exclude admin's private personal records
        setTransactions(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching transactions:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [selectedMonth]);

  // Group by local date string (YYYY-MM-DD)
  const groupedDays = useMemo(() => {
    const days: Record<string, DayFinanceSummary> = {};

    transactions.forEach((tx) => {
      const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date || 0);
      const dStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : 'Unknown';

      if (!days[dStr]) {
        days[dStr] = { inc: 0, exp: 0, xOut: 0, xIn: 0, logs: [] };
      }

      const dayObj = days[dStr];
      const amt = Number(tx.amount) || 0;

      if (!tx.voided) {
        if (tx.group === 'Handover') {
          dayObj.xOut += amt; // Handed over to admin
        } else if (tx.group === 'OwnerFund') {
          dayObj.xIn += amt; // Injected from admin
        } else if (tx.type === 'ဝင်ငွေ') {
          dayObj.inc += amt;
        } else {
          dayObj.exp += amt;
        }
      }

      dayObj.logs.push(tx);
    });

    return days;
  }, [transactions]);

  // Overall Monthly Stats
  const monthStats = useMemo(() => {
    let totalInc = 0;
    let totalExp = 0;
    let totalXOut = 0;
    let totalXIn = 0;

    Object.values(groupedDays).forEach((day) => {
      totalInc += day.inc;
      totalExp += day.exp;
      totalXOut += day.xOut;
      totalXIn += day.xIn;
    });

    const netProfit = totalInc - totalExp;
    const currentTillBalance = netProfit - totalXOut + totalXIn;

    return { totalInc, totalExp, netProfit, currentTillBalance };
  }, [groupedDays]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedDays]);

  // Open Add Transaction modal
  const handleOpenAddTx = (type: TransactionType, dateStr?: string) => {
    setAddTxType(type);
    setTxFormData({
      name: '',
      amount: '',
      group: type === 'ဝင်ငွေ' ? 'Service' : 'Office',
      date: dateStr || activeDayDate || getLocalDateString(),
    });
    setShowAddTxModal(true);
  };

  // Submit Add Transaction
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(txFormData.amount);
    if (!txFormData.name.trim() || amt <= 0) {
      showToast('အကြောင်းအရာနှင့် ငွေပမာဏ မှန်ကန်စွာ ဖြည့်ပါ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const parts = txFormData.date.split('-').map(Number);
      const txDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

      await addDoc(collection(db, 'transactions'), {
        type: addTxType,
        group: txFormData.group,
        name: txFormData.name.trim(),
        amount: amt,
        date: txDate,
        exactDate: serverTimestamp(),
        history: [{ msg: 'ငွေစာရင်း အသစ်သွင်းသည်', by: profile?.name || 'Staff', time: new Date().toISOString() }],
      });

      showToast(`${addTxType} စာရင်းသွင်းပြီးပါပြီ`);
      setShowAddTxModal(false);
    } catch (err: any) {
      showToast(err.message || 'သိမ်းဆည်းရာတွင် အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Transaction modal (Admin Master)
  const handleOpenEditTx = (tx: TransactionItem) => {
    setEditingTx(tx);
    const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date || 0);
    setTxFormData({
      name: tx.name,
      amount: String(tx.amount),
      group: tx.group,
      date: !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : getLocalDateString(),
    });
    setShowEditTxModal(true);
  };

  // Save Edit Transaction
  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const amt = Number(txFormData.amount);
    if (!txFormData.name.trim() || amt <= 0) {
      showToast('အချက်အလက် မှန်ကန်စွာ ဖြည့်ပါ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const parts = txFormData.date.split('-').map(Number);
      const txDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

      await adminMasterEditTransaction(
        editingTx.id,
        {
          name: txFormData.name.trim(),
          amount: amt,
          type: editingTx.type,
          group: txFormData.group,
          date: txDate,
        },
        profile?.name || 'Admin'
      );

      showToast('ငွေစာရင်း ပြင်ဆင်ပြီးပါပြီ');
      setShowEditTxModal(false);
    } catch (err: any) {
      showToast(err.message || 'ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Transaction (Admin Master with Bidirectional Sync)
  const handleDeleteTx = async (tx: TransactionItem) => {
    let warning = `ဤငွေစာရင်း (${tx.name} - ${formatCurrency(tx.amount)}) ကို အပြီးဖျက်မည်လား?`;
    if (tx.repairId) {
      warning += '\n\n⚠️ သတိပေးချက်: ဤစာရင်းသည် Repair မှ လာခြင်းဖြစ်သဖြင့် Repair ၏ ရငွေကိုပါ 0 ပြန်ဖြစ်စေပါမည်။';
    } else if (tx.productId) {
      warning += '\n\n⚠️ သတိပေးချက်: ဤစာရင်းသည် အရောင်းမှ လာခြင်းဖြစ်သဖြင့် စတော့ထဲ ၁ ခု ပြန်တိုးပေးပါမည်။';
    } else if (tx.transferId) {
      warning += '\n\n⚠️ သတိပေးချက်: ဤစာရင်းသည် လွှဲပြောင်းမှုဖြစ်သဖြင့် နှစ်ဖက်စလုံး တစ်ပြိုင်နက် ပျက်ပါမည်။';
    }

    if (!window.confirm(warning)) return;

    try {
      await adminMasterDeleteTransaction(tx, profile?.name || 'Admin');
      showToast('ငွေစာရင်း ဖျက်သိမ်းပြီးပါပြီ');
    } catch (err: any) {
      showToast(err.message || 'ဖျက်ရာတွင် အမှားဖြစ်ပွားပါသည်', 'error');
    }
  };

  // Submit Daily Settlement (Balance Check & Handover)
  const handleConfirmDailySettlement = async () => {
    if (!activeDayDate) return;
    const physCash = Math.round(Number(physicalCashInput));
    if (isNaN(physCash) || physCash <= 0) {
      showToast('အပ်နှံမည့် ငွေပမာဏ မှန်ကန်စွာ ဖြည့်ပါ', 'warning');
      return;
    }

    const dayObj = groupedDays[activeDayDate] || { inc: 0, exp: 0, xOut: 0, xIn: 0, logs: [] };
    const sysBal = dayObj.inc - dayObj.exp - dayObj.xOut + dayObj.xIn;
    const diff = physCash - sysBal;

    let diffText = 'စာရင်းကိုက်ပါသည်';
    if (diff > 0) diffText = `${diff.toLocaleString()} Ks ပိုနေသည်`;
    if (diff < 0) diffText = `${Math.abs(diff).toLocaleString()} Ks လိုနေသည်`;

    if (
      !window.confirm(
        `${physCash.toLocaleString()} Ks အပ်နှံမှာ သေချာပါသလား?\n( ${diffText} )`
      )
    )
      return;

    setIsSubmitting(true);
    try {
      let extra: any = null;
      if (diff < 0) {
        extra = {
          type: 'ထွက်ငွေ',
          name: 'ငွေလို (Shortage)',
          amount: Math.abs(diff),
          msg: 'Daily Settlement တွင် ငွေလိုနေသဖြင့် Auto ထွက်ငွေမှတ်သည်',
        };
      } else if (diff > 0) {
        extra = {
          type: 'ဝင်ငွေ',
          name: 'ပိုငွေ (Overage)',
          amount: diff,
          msg: 'Daily Settlement တွင် ငွေပိုနေသဖြင့် Auto ဝင်ငွေမှတ်သည်',
        };
      }

      const parts = activeDayDate.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2], 20, 0, 0);

      await createTransferPair(
        'handover',
        physCash,
        diff !== 0 ? `(${diffText})` : '',
        dateObj,
        extra,
        profile?.name || 'Staff'
      );

      showToast('Admin ထံ ငွေအပ်နှံမှု အောင်မြင်ပါသည် ✅');
      setShowSettlementModal(false);
    } catch (err: any) {
      showToast(err.message || 'ငွေအပ်နှံရာတွင် အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Owner Fund (Inject into Shop Drawer)
  const handleConfirmOwnerFund = async () => {
    if (!activeDayDate) return;
    const amt = Math.round(Number(ownerFundAmt));
    if (isNaN(amt) || amt <= 0) {
      showToast('ထည့်မည့် ငွေပမာဏ ဖြည့်ပါ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const parts = activeDayDate.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2], 20, 0, 0);

      await createTransferPair(
        'ownerfund',
        amt,
        ownerFundNote.trim(),
        dateObj,
        null,
        profile?.name || 'Admin'
      );

      showToast('ဆိုင်ထဲသို့ ထည့်ငွေ ထည့်သွင်းပြီးပါပြီ 💼');
      setShowOwnerFundModal(false);
      setOwnerFundAmt('');
      setOwnerFundNote('');
    } catch (err: any) {
      showToast(err.message || 'အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-28">
      {/* Top Month Selector & Aggregate KPI Cards */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-3.5">
          {/* Month Input & Quick Action buttons */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenAddTx('ဝင်ငွေ')}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ဝင်ငွေ</span>
              </button>
              <button
                onClick={() => handleOpenAddTx('ထွက်ငွေ')}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>- ထွက်ငွေ</span>
              </button>
            </div>
          </div>

          {/* 3 Main KPIs */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="p-2 sm:p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block truncate">
                ဝင်ငွေ စုစုပေါင်း
              </span>
              <span className="text-sm sm:text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums block truncate">
                +{formatCurrency(monthStats.totalInc)}
              </span>
            </div>

            <div className="p-2 sm:p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold text-rose-700 dark:text-rose-400 block truncate">
                ထွက်ငွေ စုစုပေါင်း
              </span>
              <span className="text-sm sm:text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums block truncate">
                -{formatCurrency(monthStats.totalExp)}
              </span>
            </div>

            <div className="p-2 sm:p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 dark:text-indigo-400 block truncate">
                အသားတင် အမြတ်
              </span>
              <span className={`text-sm sm:text-lg font-black tabular-nums block truncate ${
                monthStats.netProfit >= 0
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {monthStats.netProfit >= 0 ? '+' : ''}{formatCurrency(monthStats.netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">ငွေစာရင်း ဆွဲယူနေပါသည်...</span>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8">
            <Wallet className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              ဤလအတွက် ငွေစာရင်း မရှိသေးပါ
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ဝင်ငွေ သို့မဟုတ် ထွက်ငွေ စာရင်း စတင်ထည့်သွင်းပါ
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDates.map((date) => {
              const day = groupedDays[date];
              const net = day.inc - day.exp;
              const tillBal = net - day.xOut + day.xIn;
              const isPositive = net >= 0;

              return (
                <div
                  key={date}
                  onClick={() => setActiveDayDate(date)}
                  className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        📅 {date}
                      </span>
                      <span className="text-xs text-slate-400">· {day.logs.length} စာရင်း</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-600 font-semibold tabular-nums">
                        ဝင်: +{day.inc.toLocaleString()} Ks
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="text-rose-600 font-semibold tabular-nums">
                        ထွက်: -{day.exp.toLocaleString()} Ks
                      </span>
                    </div>

                    {(day.xOut > 0 || day.xIn > 0) && (
                      <div className="mt-1.5 text-[11px] text-slate-500 font-medium">
                        {day.xOut > 0 && <span className="mr-2">🌙 အပ်ငွေ: -{day.xOut.toLocaleString()}</span>}
                        {day.xIn > 0 && <span className="mr-2">💼 ထည့်ငွေ: +{day.xIn.toLocaleString()}</span>}
                        <b className="text-slate-800 dark:text-slate-200">ဆိုင်လက်ကျန်: {tillBal.toLocaleString()} Ks</b>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm sm:text-base font-black tabular-nums ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}{net.toLocaleString()} Ks
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULLSCREEN DAY DETAIL VIEW */}
      {activeDayDate && (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setActiveDayDate(null)}
              className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              📅 {activeDayDate} စာရင်းချုပ်
            </h3>
            <div className="w-12" />
          </div>

          {/* Body Log Items */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 pb-36 max-w-2xl mx-auto w-full">
            {groupedDays[activeDayDate]?.logs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">စာရင်းမှတ်တမ်းမရှိပါ</div>
            ) : (
              groupedDays[activeDayDate]?.logs
                .slice()
                .sort((a, b) => {
                  const ta = a.exactDate?.toDate?.() || new Date(a.date || 0);
                  const tb = b.exactDate?.toDate?.() || new Date(b.date || 0);
                  return tb.getTime() - ta.getTime();
                })
                .map((tx) => {
                  const isInc = tx.type === 'ဝင်ငွေ';
                  const isTransfer = tx.group === 'Handover' || tx.group === 'OwnerFund';

                  return (
                    <div
                      key={tx.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {tx.group}
                            </span>
                            {tx.repairId && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-600">
                                🔧 Repair
                              </span>
                            )}
                            {tx.productId && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                                📦 Stock
                              </span>
                            )}
                            {tx.debtId && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-600">
                                📒 အကြွေး
                              </span>
                            )}
                            {isTransfer && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-600">
                                🔁 Transfer
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-xs text-slate-900 dark:text-white mt-1.5 leading-snug">
                            {tx.name}
                          </div>

                          <div className="text-[10px] text-slate-400 mt-1">
                            🕒 {formatDetailedTime(tx.exactDate || tx.date)}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm font-black tabular-nums ${
                              isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isInc ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </div>

                      {/* Admin Master Action Bar */}
                      {isAdmin && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditTx(tx)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>ပြင်မည်</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTx(tx)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ဖျက်မည်</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>

          {/* Bottom Control Bar of Day Detail */}
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 space-y-2 z-20 max-w-2xl mx-auto pb-safe">
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenAddTx('ဝင်ငွေ', activeDayDate)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                + ဝင်ငွေ ထည့်ရန်
              </button>
              <button
                onClick={() => handleOpenAddTx('ထွက်ငွေ', activeDayDate)}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                - ထွက်ငွေ ထည့်ရန်
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPhysicalCashInput('');
                  setShowSettlementModal(true);
                }}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>⚖️ Balance စစ် / ငွေအပ်</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowOwnerFundModal(true)}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>💼 ဆိုင်ထဲထည့်ငွေ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / CREATE TRANSACTION */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className={addTxType === 'ဝင်ငွေ' ? 'text-emerald-600' : 'text-rose-600'}>
                  {addTxType === 'ဝင်ငွေ' ? '+ ဝင်ငွေ စာရင်းသွင်းရန်' : '- ထွက်ငွေ စာရင်းသွင်းရန်'}
                </span>
              </h3>
              <button
                onClick={() => setShowAddTxModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  အမျိုးအစား (Category Group)
                </label>
                <select
                  value={txFormData.group}
                  onChange={(e) =>
                    setTxFormData({ ...txFormData, group: e.target.value as TransactionGroup })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Service">Service (ဝန်ဆောင်မှု/ပြင်ဆင်ခ)</option>
                  <option value="Sales">Sales (အရောင်းရငွေ)</option>
                  <option value="StockPurchase">StockPurchase (ပစ္စည်းဝယ်ယူမှု)</option>
                  <option value="Office">Office (ဆိုင်သုံးစရိတ်)</option>
                  <option value="Home">Home (အိမ်သုံးစရိတ်)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  အကြောင်းအရာ *
                </label>
                <input
                  type="text"
                  value={txFormData.name}
                  onChange={(e) => setTxFormData({ ...txFormData, name: e.target.value })}
                  placeholder="ဥပမာ - မုန့်ဖိုး / လျှပ်စစ်မီတာခ"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ငွေပမာဏ (Ks) *
                  </label>
                  <input
                    type="number"
                    value={txFormData.amount}
                    onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                    placeholder="10000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ရက်စွဲ *
                  </label>
                  <input
                    type="date"
                    value={txFormData.date}
                    onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  ပယ်ဖျက်
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md disabled:opacity-50 ${
                    addTxType === 'ဝင်ငွေ' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isSubmitting ? 'သိမ်းနေသည်...' : 'စာရင်းသိမ်းမည်'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT TRANSACTION (ADMIN MASTER ERROR CORRECTION) */}
      {showEditTxModal && editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                ငွေစာရင်း ပြင်ဆင်ရန် (Admin Master)
              </h3>
              <button
                onClick={() => setShowEditTxModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTx} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  အမျိုးအစား (Group)
                </label>
                <select
                  value={txFormData.group}
                  onChange={(e) =>
                    setTxFormData({ ...txFormData, group: e.target.value as TransactionGroup })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Service">Service</option>
                  <option value="Sales">Sales</option>
                  <option value="StockPurchase">StockPurchase</option>
                  <option value="Office">Office</option>
                  <option value="Home">Home</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  အကြောင်းအရာ *
                </label>
                <input
                  type="text"
                  value={txFormData.name}
                  onChange={(e) => setTxFormData({ ...txFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ပမာဏ (Ks) *
                  </label>
                  <input
                    type="number"
                    value={txFormData.amount}
                    onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ရက်စွဲ *
                  </label>
                  <input
                    type="date"
                    value={txFormData.date}
                    onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {editingTx.repairId && (
                <p className="text-xs text-blue-500 font-medium">
                  💡 ဤစာရင်းကို ပြင်လိုက်ပါက ချိတ်ဆက်ထားသော Repair doc ၏ ရငွေကိုပါ အလိုအလျောက် sync လုပ်ပေးပါမည်။
                </p>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditTxModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  ပယ်ဖျက်
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'သိမ်းနေသည်...' : 'ပြင်ဆင်ချက်သိမ်းမည်'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DAILY SETTLEMENT (BALANCE CHECK & HANDOVER) */}
      {showSettlementModal && activeDayDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                ⚖️ Balance စစ်ဆေး / ငွေအပ်မည်
              </h3>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* System Balance Display */}
              {(() => {
                const dayObj = groupedDays[activeDayDate] || { inc: 0, exp: 0, xOut: 0, xIn: 0, logs: [] };
                const sysBal = dayObj.inc - dayObj.exp - dayObj.xOut + dayObj.xIn;
                const physCash = Number(physicalCashInput);
                const hasInput = physicalCashInput.trim() !== '' && !isNaN(physCash) && physCash > 0;
                const diff = physCash - sysBal;

                return (
                  <>
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        စနစ်တွင်း လက်ကျန်ငွေ (System Balance)
                      </span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {formatCurrency(sysBal)}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        (ဝင် {dayObj.inc.toLocaleString()} − ထွက် {dayObj.exp.toLocaleString()}
                        {dayObj.xOut ? ` − အပ် ${dayObj.xOut.toLocaleString()}` : ''}
                        {dayObj.xIn ? ` + ထည့် ${dayObj.xIn.toLocaleString()}` : ''})
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        လက်ထဲတွင် တကယ်ရှိသောငွေ (Physical Cash Ks) *
                      </label>
                      <input
                        type="number"
                        value={physicalCashInput}
                        onChange={(e) => setPhysicalCashInput(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-extrabold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>

                    {hasInput && (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold text-center border ${
                          diff === 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : diff > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {diff === 0 && '✅ စာရင်းကိုက်ပါသည်'}
                        {diff > 0 && `⚠️ စနစ်စာရင်းထက် ${diff.toLocaleString()} Ks ပိုနေပါသည် (ပိုငွေမှတ်ပါမည်)`}
                        {diff < 0 && `⚠️ စနစ်စာရင်းထက် ${Math.abs(diff).toLocaleString()} Ks လိုနေပါသည် (ငွေလိုမှတ်ပါမည်)`}
                      </div>
                    )}

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowSettlementModal(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDailySettlement}
                        disabled={!hasInput || isSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md disabled:opacity-40"
                      >
                        {isSubmitting ? 'အပ်နှံနေသည်...' : 'Admin ထံ ငွေအပ်မည်'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: OWNER FUND (INJECT INTO SHOP DRAWER) */}
      {showOwnerFundModal && activeDayDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>💼 ဆိုင်အတွက်ထုတ်ငွေ (Owner Fund)</span>
              </h3>
              <button
                onClick={() => setShowOwnerFundModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <p className="text-xs text-slate-500">
                Admin ပိုက်ဆံအိတ်မှ ဆိုင်ထဲသို့ ထည့်ပေးသောငွေ (ဥပမာ - စတော့ဝယ်ရန်) — အမြတ်/အရှုံး မထိခိုက်ပါ။
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ပမာဏ (Ks) *
                </label>
                <input
                  type="number"
                  value={ownerFundAmt}
                  onChange={(e) => setOwnerFundAmt(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  မှတ်ချက်
                </label>
                <input
                  type="text"
                  value={ownerFundNote}
                  onChange={(e) => setOwnerFundNote(e.target.value)}
                  placeholder="အားသွင်းကြိုး ဝယ်ရန်"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowOwnerFundModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  ပယ်ဖျက်
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOwnerFund}
                  disabled={isSubmitting || !ownerFundAmt}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md disabled:opacity-40"
                >
                  {isSubmitting ? 'ထည့်နေသည်...' : 'ဆိုင်ထဲထည့်မည်'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
