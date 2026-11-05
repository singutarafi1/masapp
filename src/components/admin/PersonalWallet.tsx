import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Calendar, 
  Tag, 
  Filter,
  DollarSign,
  TrendingDown,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { db, collection, onSnapshot, query, where, orderBy } from '../../lib/firebase';
import { TransactionItem } from '../../types';
import { addPersonalTransaction, getCategorySettings } from '../../lib/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function PersonalWallet() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [personalTx, setPersonalTx] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter
  const [typeFilter, setTypeFilter] = useState<'all' | 'ဝင်ငွေ' | 'ထွက်ငွေ'>('all');
  const [subGroupFilter, setSubGroupFilter] = useState<string>('all');

  // Bottom Sheet Modal state for new personal entry
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
        const ta = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const tb = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
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

  // Filtered list
  const filteredList = personalTx.filter((tx) => {
    if (tx.voided) return false;
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (subGroupFilter !== 'all' && tx.subGroup !== subGroupFilter) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) {
      showToast('ငွေပမာဏ မှန်ကန်စွာ ထည့်ပါ', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPersonalTransaction({
        type: formType,
        amount: amt,
        subGroup: formSubGroup || 'အထွေထွေ',
        name: formName || (formType === 'ဝင်ငွေ' ? 'ပုဂ္ဂိုလ်ရေး ဝင်ငွေ' : 'ပုဂ္ဂိုလ်ရေး သုံးစွဲငွေ'),
        date: new Date(formDate),
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

  return (
    <div className="space-y-6 animate-in fade-in pb-36 px-3 sm:px-6 max-w-5xl mx-auto pt-4">
      
      {/* Wallet Banner Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-950/20 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Wallet className="w-4 h-4" />
              <span>Admin's Personal Vault & Wallet</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
              {balance.toLocaleString()} <span className="text-sm font-medium text-indigo-300">MMK</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ဆိုင်ငွေစာရင်းနှင့် ရောထွေးမှုမရှိသော သီးသန့် ကိုယ်ပိုင် အသုံးစရိတ်နှင့် ဝင်ငွေစာရင်း
            </p>
          </div>

          <button
            onClick={() => setIsAddSheetOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>စာရင်းအသစ်ထည့်မည်</span>
          </button>
        </div>

        {/* Small In/Out Summary Inside Vault */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-indigo-900/60">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              စုစုပေါင်း ကိုယ်ပိုင်ဝင်ငွေ
            </span>
            <div className="text-lg font-black text-white mt-0.5">
              +{totalIn.toLocaleString()} <span className="text-[10px] text-slate-400">MMK</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              စုစုပေါင်း ကိုယ်ပိုင်သုံးစရိတ်
            </span>
            <div className="text-lg font-black text-white mt-0.5">
              -{totalOut.toLocaleString()} <span className="text-[10px] text-slate-400">MMK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Row with Dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              အားလုံး
            </button>
            <button
              onClick={() => setTypeFilter('ဝင်ငွေ')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'ဝင်ငွေ'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              ဝင်ငွေ
            </button>
            <button
              onClick={() => setTypeFilter('ထွက်ငွေ')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'ထွက်ငွေ'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              ထွက်ငွေ
            </button>
          </div>

          {/* SubGroup Dropdown */}
          <select
            value={subGroupFilter}
            onChange={(e) => setSubGroupFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">အမျိုးအစား အားလုံး ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          စာရင်း {filteredList.length} ခု တွေ့ရှိပါသည်
        </span>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            ကိုယ်ပိုင် ငွေစာရင်း မှတ်တမ်း မရှိသေးပါ
          </div>
        ) : (
          filteredList.map((tx) => {
            const isIncome = tx.type === 'ဝင်ငွေ';
            let dateStr = '';
            if (tx.date && typeof tx.date.toDate === 'function') {
              dateStr = tx.date.toDate().toLocaleDateString('en-GB');
            } else if (tx.date) {
              dateStr = new Date(tx.date).toLocaleDateString('en-GB');
            }

            return (
              <div
                key={tx.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isIncome 
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  }`}>
                    {isIncome ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {tx.name}
                      </span>
                      {tx.subGroup && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {tx.subGroup}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>
                </div>

                <div className={`text-sm font-black ${
                  isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}>
                  {isIncome ? '+' : '-'}{Number(tx.amount).toLocaleString()} MMK
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sheet Modal for Adding Personal Tx */}
      {isAddSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsAddSheetOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl z-10 animate-in slide-in-from-bottom-5">
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                <span>ကိုယ်ပိုင် ငွေစာရင်း သွင်းမည်</span>
              </h3>
              <button
                onClick={() => setIsAddSheetOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ပိတ်မည်
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormType('ထွက်ငွေ')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    formType === 'ထွက်ငွေ'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ထွက်ငွေ (Expense)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('ဝင်ငွေ')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    formType === 'ဝင်ငွေ'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ဝင်ငွေ (Income)
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ငွေပမာဏ (MMK) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="ဥပမာ: 15000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category / SubGroup */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  အသုံးစရိတ် အမျိုးအစား
                </label>
                <select
                  value={formSubGroup}
                  onChange={(e) => setFormSubGroup(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Remark */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  အကြောင်းအရာ မှတ်ချက် (Title)
                </label>
                <input
                  type="text"
                  placeholder="ဥပမာ: မနက်စာ စားစရိတ်"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ရက်စွဲ
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? 'သိမ်းဆည်းနေပါသည်...' : 'စာရင်းသိမ်းမည်'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
