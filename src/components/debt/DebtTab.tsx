import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  X,
  ArrowUpDown,
  Phone,
  DollarSign,
  Edit2,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  Plus,
} from 'lucide-react';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { DebtItem, DebtStatus, SortType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDetailedTime } from '../../lib/dateUtils';
import {
  addDebtPayment,
  removeLastDebtPayment,
  voidDebtRecord,
} from '../../lib/dataService';
import { doc, updateDoc, serverTimestamp, arrayUnion } from '../../lib/firebase';

export function DebtTab() {
  const { profile, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ကျန်ရှိ');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<SortType>('modified_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Pay Modal State
  const [payingDebt, setPayingDebt] = useState<DebtItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  // Edit Note Modal
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [editCustomer, setEditCustomer] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNote, setEditNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'debts'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as DebtItem[];
        setDebts(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching debts:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Summary Metrics
  const summary = useMemo(() => {
    const openList = debts.filter((d) => d.status === 'ကျန်ရှိ');
    const totalRemaining = openList.reduce(
      (sum, d) => sum + (Number(d.total || 0) - Number(d.paid || 0)),
      0
    );
    const uniqueCustomers = new Set(openList.map((d) => (d.customer || '').trim().toLowerCase()));
    return {
      totalRemaining,
      openCount: openList.length,
      customerCount: uniqueCustomers.size,
    };
  }, [debts]);

  // Filter & Grouping
  const filteredDebts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = debts.filter((d) => {
      if (q) {
        return (
          (d.customer || '').toLowerCase().includes(q) ||
          (d.productName || '').toLowerCase().includes(q) ||
          (d.phone || '').includes(q) ||
          (d.note || '').toLowerCase().includes(q)
        );
      }

      if (activeFilter === 'အားလုံး') return d.status !== 'void';
      if (activeFilter === 'Void') return d.status === 'void';
      return d.status === activeFilter;
    });

    // Sort
    return result.sort((a, b) => {
      if (sortType === 'name_asc') {
        return (a.customer || '').localeCompare(b.customer || '');
      }
      if (sortType === 'date_desc') {
        const tA = a.createdAt?.toMillis?.() || new Date(a.date || 0).getTime();
        const tB = b.createdAt?.toMillis?.() || new Date(b.date || 0).getTime();
        return tB - tA;
      }
      let mA = 0, mB = 0;
      if (a.history && a.history.length > 0) {
        mA = new Date(a.history[a.history.length - 1].time).getTime();
      } else if (a.updatedAt?.toMillis) {
        mA = a.updatedAt.toMillis();
      } else if (a.createdAt?.toMillis) {
        mA = a.createdAt.toMillis();
      }

      if (b.history && b.history.length > 0) {
        mB = new Date(b.history[b.history.length - 1].time).getTime();
      } else if (b.updatedAt?.toMillis) {
        mB = b.updatedAt.toMillis();
      } else if (b.createdAt?.toMillis) {
        mB = b.createdAt.toMillis();
      }

      return mB - mA;
    });
  }, [debts, searchQuery, activeFilter, sortType]);

  // Group by customer
  const groupedByCustomer = useMemo(() => {
    const map: Record<string, { customer: string; phone: string; items: DebtItem[] }> = {};

    filteredDebts.forEach((d) => {
      const k = (d.customer || 'အမည်မသိ').trim().toLowerCase();
      if (!map[k]) {
        map[k] = { customer: d.customer || 'အမည်မသိ', phone: d.phone || '', items: [] };
      }
      map[k].items.push(d);
    });

    return Object.values(map).sort((a, b) => a.customer.localeCompare(b.customer));
  }, [filteredDebts]);

  // Open Pay Modal
  const handleOpenPay = (d: DebtItem) => {
    const remain = Number(d.total || 0) - Number(d.paid || 0);
    setPayingDebt(d);
    setPayAmount(String(remain));
    setPayNote('');
  };

  // Submit Payment
  const handleSubmitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('ပေးချေမည့် ပမာဏ မှန်ကန်စွာ ဖြည့်ပါ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addDebtPayment(
        payingDebt.id,
        amt,
        payNote.trim(),
        profile?.name || 'Staff'
      );

      showToast(
        res.isFinal
          ? 'အကြွေး အားလုံး ရှင်းပြီးပါပြီ ✅'
          : `လက်ခံပြီးပါပြီ (ကျန် ${formatCurrency(res.remaining)})`
      );
      setPayingDebt(null);
    } catch (err: any) {
      showToast(err.message || 'ငွေလက်ခံရာတွင် အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revert last payment
  const handleRevertLastPayment = async (d: DebtItem) => {
    if (!d.payments || d.payments.length === 0) return;
    const last = d.payments[d.payments.length - 1];
    if (
      !window.confirm(
        `နောက်ဆုံးပေးချေမှု ${formatCurrency(last.amount)} ကို ပြန်ဖျက်မည်လား?\n(ဝင်ငွေစာရင်းမှ ပြန်နှုတ်ပြီး အကြွေးပြန်တက်ပါမည်)`
      )
    )
      return;

    try {
      await removeLastDebtPayment(d.id, profile?.name || 'Staff');
      showToast('နောက်ဆုံးပေးချေမှု ပြန်လည်ပယ်ဖျက်ပြီးပါပြီ');
    } catch (err: any) {
      showToast(err.message || 'အမှားဖြစ်ပွားပါသည်', 'error');
    }
  };

  // Void Debt
  const handleVoidDebt = async (d: DebtItem) => {
    if (
      !window.confirm(
        `${d.customer} ၏ ${d.productName} အကြွေးစာရင်းကို Void လုပ်မည်လား?\n(စတော့ထဲ ပစ္စည်းပြန်ထည့်ပြီး ပေးသွင်းငွေများကို ဝင်ငွေစာရင်းမှ ပြန်နှုတ်ပါမည်)`
      )
    )
      return;

    try {
      await voidDebtRecord(d.id, profile?.name || 'Staff');
      showToast('အကြွေးစာရင်းကို Void ပြုလုပ်ပြီးပါပြီ');
    } catch (err: any) {
      showToast(err.message || 'အမှားဖြစ်ပွားပါသည်', 'error');
    }
  };

  // Open Edit Customer Info Modal
  const handleOpenEdit = (d: DebtItem) => {
    setEditingDebt(d);
    setEditCustomer(d.customer);
    setEditPhone(d.phone || '');
    setEditNote(d.note || '');
  };

  // Save Edit Customer Info
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    if (!editCustomer.trim()) {
      showToast('ဝယ်သူအမည် ဖြည့်ပါ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'debts', editingDebt.id), {
        customer: editCustomer.trim(),
        phone: editPhone.trim(),
        note: editNote.trim(),
        updatedAt: serverTimestamp(),
        history: arrayUnion({
          msg: `အချက်အလက် ပြင်ဆင်: ${editCustomer}`,
          by: profile?.name || 'Staff',
          time: new Date().toISOString(),
        }),
      });
      showToast('အကြွေးအချက်အလက် ပြင်ဆင်ပြီးပါပြီ');
      setEditingDebt(null);
    } catch (err: any) {
      showToast(err.message || 'အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-28">
      {/* Top Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-3.5">
          {/* Summary Card */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                📒 အကြွေးကျန်ငွေ စုစုပေါင်း
              </span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                {formatCurrency(summary.totalRemaining)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                ဝယ်သူ {summary.customerCount} ယောက်
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {summary.openCount} စာရင်း
              </span>
            </div>
          </div>

          {/* Search & Sort Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 ဝယ်သူအမည် / ပစ္စည်း / ဖုန်းဖြင့် ရှာရန်..."
                className="w-full pl-9 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700/70 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-900 dark:text-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors ${
                  showSortMenu
                    ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-600'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
                title="အစီအစဉ်ရွေးရန်"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setSortType('modified_desc');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between ${
                      sortType === 'modified_desc'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>⏱️ နောက်ဆုံးပြင်ဆင်မှု</span>
                  </button>
                  <button
                    onClick={() => {
                      setSortType('date_desc');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between ${
                      sortType === 'date_desc'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>📅 ရက်စွဲ (အသစ်ဆုံး)</span>
                  </button>
                  <button
                    onClick={() => {
                      setSortType('name_asc');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between ${
                      sortType === 'name_asc'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>🔤 အက္ခရာစဉ် (A-Z)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 scroll-touch-x no-scrollbar pb-1">
            {['ကျန်ရှိ', 'ရှင်းပြီး', 'အားလုံး', 'Void'].map((st) => {
              const isActive = activeFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setActiveFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content (Customer Grouped Debt List) */}
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">အကြွေးစာရင်း ဆွဲယူနေပါသည်...</span>
          </div>
        ) : groupedByCustomer.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              အကြွေးစာရင်း မရှိပါ
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ပစ္စည်းရောင်းချချိန်တွင် "အကြွေး (Credit)" ရွေးချယ်နိုင်ပါသည်
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByCustomer.map((g, gIdx) => {
              const customerRemain = g.items.reduce(
                (sum, d) => sum + (d.status === 'ကျန်ရှိ' ? Number(d.total || 0) - Number(d.paid || 0) : 0),
                0
              );

              return (
                <div key={gIdx} className="space-y-2">
                  {/* Customer Group Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs font-bold">
                        {g.customer.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {g.customer}
                      </span>
                      {g.phone && (
                        <a
                          href={`tel:${g.phone}`}
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{g.phone}</span>
                        </a>
                      )}
                    </div>

                    {customerRemain > 0 && (
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        ကျန်: {formatCurrency(customerRemain)}
                      </span>
                    )}
                  </div>

                  {/* Customer Items */}
                  <div className="space-y-2.5">
                    {g.items.map((d) => {
                      const total = Number(d.total || 0);
                      const paid = Number(d.paid || 0);
                      const remain = total - paid;
                      const isOpen = d.status === 'ကျန်ရှိ';
                      const isVoid = d.status === 'void';

                      return (
                        <div
                          key={d.id}
                          className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm space-y-3 ${
                            isVoid
                              ? 'border-slate-200 dark:border-slate-800 opacity-60'
                              : 'border-slate-200/80 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                {d.productName} × {d.qty}
                              </h4>
                              {d.note && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  📝 {d.note}
                                </p>
                              )}
                            </div>

                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg shrink-0 ${
                                isVoid
                                  ? 'bg-slate-100 text-slate-500'
                                  : isOpen
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {isVoid ? 'Void' : d.status}
                            </span>
                          </div>

                          {/* Amounts Grid */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-center text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">စုစုပေါင်း</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                                {formatCurrency(total)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">ပေးပြီး</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatCurrency(paid)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">ကျန်ရှိ</span>
                              <span className="font-black text-rose-600 dark:text-rose-400 tabular-nums">
                                {formatCurrency(isVoid ? 0 : remain)}
                              </span>
                            </div>
                          </div>

                          {/* Payment Records Accordion/List */}
                          {d.payments && d.payments.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                              {d.payments.map((p, pIdx) => (
                                <div key={pIdx} className="flex justify-between items-center">
                                  <span>💰 {formatDetailedTime(p.date)} {p.note && `(${p.note})`}</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {formatCurrency(p.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action Bar */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 flex-wrap">
                            {isOpen && (
                              <button
                                onClick={() => handleOpenPay(d)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>ငွေပေးချေ</span>
                              </button>
                            )}

                            {d.payments && d.payments.length > 0 && (
                              <button
                                onClick={() => handleRevertLastPayment(d)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                                title="နောက်ဆုံးပေးချေမှု ဖျက်မည်"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>ငွေသွင်းမှု ပြန်ဖြုတ်</span>
                              </button>
                            )}

                            {!isVoid && (
                              <button
                                onClick={() => handleOpenEdit(d)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>ပြင်မည်</span>
                              </button>
                            )}

                            {isAdmin && !isVoid && (
                              <button
                                onClick={() => handleVoidDebt(d)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1"
                                title="စာရင်းမှင်တား ပယ်ဖျက်"
                              >
                                <span>Void</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: PAY DEBT */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  💰 အကြွေးပေးချေ လက်ခံမည်
                </h3>
                <p className="text-xs text-slate-500">
                  {payingDebt.customer} — {payingDebt.productName}
                </p>
              </div>
              <button
                onClick={() => setPayingDebt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPay} className="mt-4 space-y-3.5">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">ကျန်ငွေ:</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatCurrency(Number(payingDebt.total || 0) - Number(payingDebt.paid || 0))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ပေးချေသည့် ပမာဏ (Ks) *
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  မှတ်ချက်
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="ဥပမာ - KPay မှ လွှဲသည်"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  ပယ်ဖျက်
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'လက်ခံနေသည်...' : 'ငွေလက်ခံမည်'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CUSTOMER INFO */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                📝 အကြွေးစာရင်း ပြင်ဆင်ရန်
              </h3>
              <button
                onClick={() => setEditingDebt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ဝယ်သူအမည် *
                </label>
                <input
                  type="text"
                  value={editCustomer}
                  onChange={(e) => setEditCustomer(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ဖုန်းနံပါတ်
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  မှတ်ချက်
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  rows={2}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
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
    </div>
  );
}
