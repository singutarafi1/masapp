import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  Save, 
  Tag, 
  FolderPlus,
  RotateCcw
} from 'lucide-react';
import { getCategorySettings, saveCategorySettings } from '../../lib/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

type CategoryKey = 'personal' | 'service' | 'stockPurchase' | 'office' | 'sales' | 'capital' | 'home';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  personal: 'ကိုယ်ပိုင်အသုံးစရိတ် (Personal Wallet)',
  service: 'စက်ပြင် ဝန်ဆောင်မှု (Service Repairs)',
  stockPurchase: 'ပစ္စည်းအဝယ် (Stock Purchases)',
  office: 'ဆိုင်သုံးစရိတ် (Office Opex)',
  sales: 'ပစ္စည်းအရောင်း (POS Sales)',
  capital: 'မတည်ရင်းနှီးငွေ (Capital Investment)',
  home: 'အိမ်သုံးစရိတ် (Home Transfer)',
};

export function CategorySettingsView() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [activeGroup, setActiveGroup] = useState<CategoryKey>('personal');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    getCategorySettings().then((res) => {
      setCategories(res);
    });
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSubCategory.trim();
    if (!clean) return;

    const currentList = categories[activeGroup] || [];
    if (currentList.includes(clean)) {
      showToast('ဤအမျိုးအစား ရှိပြီးသားဖြစ်ပါသည်', 'error');
      return;
    }

    setCategories((prev) => ({
      ...prev,
      [activeGroup]: [...(prev[activeGroup] || []), clean],
    }));
    setNewSubCategory('');
    setHasChanges(true);
  };

  const handleDelete = (item: string) => {
    setCategories((prev) => ({
      ...prev,
      [activeGroup]: (prev[activeGroup] || []).filter((x) => x !== item),
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveCategorySettings(categories, profile?.name || 'Admin');
      showToast('အမျိုးအစားများ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ', 'success');
      setHasChanges(false);
    } catch (err: any) {
      showToast(err.message || 'သိမ်းဆည်းမရပါ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const currentItems = categories[activeGroup] || [];

  return (
    <div className="space-y-5 animate-in fade-in pb-20 px-3 sm:px-6 max-w-4xl mx-auto pt-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Category Settings (အမျိုးအစား စီမံခန့်ခွဲမှု)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ငွေစာရင်းသွင်းရာတွင် အသုံးပြုမည့် Sub-categories များကို စိတ်ကြိုက် သတ်မှတ်ပြင်ဆင်နိုင်ပါသည်
          </p>
        </div>

        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'သိမ်းဆည်းနေပါသည်...' : 'ပြောင်းလဲမှု သိမ်းမည်'}</span>
          </button>
        )}
      </div>

      {/* Group Selector Dropdown / Pill Row */}
      <div className="flex items-center gap-1.5 scroll-touch-x pb-2 scrollbar-none">
        {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveGroup(key)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeGroup === key
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {CATEGORY_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Main List & Add Form Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
            {CATEGORY_LABELS[activeGroup]} ထဲရှိ အမျိုးအစားများ ({currentItems.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Click နှိပ်၍ အလွယ်တကူ ပယ်ဖျက်နိုင်ပါသည်
          </span>
        </div>

        {/* Add Input */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder={`အမျိုးအစား အသစ်ရိုက်ထည့်ပါ (ဥပမာ - ကော်ဖီ/ရေသန့်)...`}
            value={newSubCategory}
            onChange={(e) => setNewSubCategory(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500 shadow-xs"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm shadow-purple-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ထည့်မည်</span>
          </button>
        </form>

        {/* Items Pill Grid */}
        <div className="flex flex-wrap gap-2 pt-2">
          {currentItems.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center w-full">
              ဤအုပ်စုတွင် အမျိုးအစား မရှိသေးပါ
            </div>
          ) : (
            currentItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60 group hover:border-rose-300"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                  title="ဖျက်မည်"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
