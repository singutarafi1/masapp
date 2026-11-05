import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  X,
  ArrowUpDown,
  ShoppingCart,
  MoreVertical,
  Edit2,
  Trash2,
  RotateCcw,
  Tag,
  CheckCircle2,
  AlertCircle,
  Archive,
  History,
} from 'lucide-react';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { ProductItem, SortType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDetailedTime } from '../../lib/dateUtils';
import {
  addOrUpdateStockProduct,
  sellProductItem,
  deleteOrRollbackProduct,
} from '../../lib/dataService';

export function InventoryTab() {
  const { profile, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { productCategories, addProductCategory, t, themeConfig } = useSettings();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('အားလုံး');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<SortType>('modified_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');

  // Modals state
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [sellingProduct, setSellingProduct] = useState<ProductItem | null>(null);

  // Selling modal form state
  const [sellQty, setSellQty] = useState(1);
  const [sellMode, setSellMode] = useState<'cash' | 'credit'>('cash');
  const [creditCustomer, setCreditCustomer] = useState('');
  const [creditPhone, setCreditPhone] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'အထွေထွေ',
    amount: 1,
    costPrice: 0,
    price: 0,
  });

  // Action Menu state (opened dropdown item id)
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ProductItem[];
        setProducts(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching inventory:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = products.filter((p) => {
      // Search override
      if (q) {
        return (
          p.name.toLowerCase().includes(q) &&
          p.status !== 'ရောင်းပြီး' &&
          !p.name.includes('(ရောင်းပြီး)')
        );
      }

      if (activeCategory === 'အားလုံး') {
        return p.status !== 'ရောင်းပြီး';
      }
      if (activeCategory === 'ရောင်းပြီး') {
        return p.status === 'ရောင်းပြီး';
      }
      return p.category === activeCategory && p.status !== 'ရောင်းပြီး';
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortType === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortType === 'date_desc') {
        const tA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
        return tB - tA;
      }
      // default: modified_desc
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
  }, [products, searchQuery, activeCategory, sortType]);

  // Grouped products by category
  const groupedProducts = useMemo(() => {
    const map: Record<string, ProductItem[]> = {};
    filteredProducts.forEach((p) => {
      const cat = p.category || 'အထွေထွေ';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [filteredProducts]);

  // Overall Stats
  const stats = useMemo(() => {
    const stockItems = products.filter((p) => p.status !== 'ရောင်းပြီး');
    const totalItemsCount = stockItems.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalCostValue = stockItems.reduce(
      (acc, p) => acc + (Number(p.amount) || 0) * (Number(p.costPrice) || 0),
      0
    );
    const outOfStockCount = stockItems.filter((p) => p.amount <= 0).length;
    return { totalItemsCount, totalCostValue, outOfStockCount };
  }, [products]);

  // Open modal to add product
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'အထွေထွေ',
      amount: 1,
      costPrice: 0,
      price: 0,
    });
    setShowProductModal(true);
  };

  // Open modal to edit product
  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category || 'အထွေထွေ',
      amount: p.amount,
      costPrice: p.costPrice || 0,
      price: p.price || 0,
    });
    setOpenActionId(null);
    setShowProductModal(true);
  };

  // Handle Save product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('ပစ္စည်းအမည် ဖြည့်ပါ', 'warning');
      return;
    }
    if (formData.amount < 0) {
      showToast('အရေအတွက် မှန်ကန်စွာ ဖြည့်ပါ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await addOrUpdateStockProduct(
        editingProduct ? editingProduct.id : null,
        formData,
        profile?.name || 'Staff'
      );
      showToast(editingProduct ? 'ပစ္စည်းစာရင်း ပြင်ဆင်ပြီးပါပြီ' : 'ပစ္စည်းအသစ် ထည့်သွင်းပြီးပါပြီ');
      setShowProductModal(false);
    } catch (err: any) {
      showToast(err.message || 'အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Sell Modal
  const handleOpenSell = (p: ProductItem) => {
    setSellingProduct(p);
    setSellQty(1);
    setSellMode('cash');
    setCreditCustomer('');
    setCreditPhone('');
    setCreditNote('');
  };

  // Submit Sell Modal
  const handleConfirmSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingProduct) return;
    if (sellQty <= 0 || sellQty > sellingProduct.amount) {
      showToast(`လက်ကျန် (${sellingProduct.amount}) ထက်ပိုပြီး မရောင်းနိုင်ပါ`, 'error');
      return;
    }
    if (sellMode === 'credit' && !creditCustomer.trim()) {
      showToast('အကြွေးဝယ်ယူသူ အမည် ဖြည့်ပါ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await sellProductItem(
        sellingProduct,
        sellQty,
        sellMode,
        sellMode === 'credit'
          ? {
              customer: creditCustomer.trim(),
              phone: creditPhone.trim(),
              note: creditNote.trim(),
            }
          : null,
        profile?.name || 'Staff'
      );
      showToast(
        sellMode === 'credit'
          ? `${sellingProduct.name} အကြွေးရောင်းချပြီးပါပြီ 📒`
          : `${sellingProduct.name} ရောင်းချပြီးပါပြီ 💵`
      );
      setSellingProduct(null);
    } catch (err: any) {
      showToast(err.message || 'ရောင်းချရာတွင် အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rollback sold item / Delete regular item
  const handleDeleteProduct = async (item: ProductItem) => {
    setOpenActionId(null);
    const isSold = item.status === 'ရောင်းပြီး';
    const confirmMsg = isSold
      ? `မှားရောင်းမိသော "${item.name}" ၁ ခုစာကို ဖျက်မည်လား?\n(စတော့ထဲ ၁ ခု ပြန်တိုးပေးပြီး ဝင်ငွေစာရင်းမှ ၁ ခုစာ ပြန်နှုတ်ပါမည်)`
      : `"${item.name}" ကို စာရင်းမှ အပြီးဖျက်မည်လား?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteOrRollbackProduct(item, products, profile?.name || 'Staff');
      showToast(isSold ? 'အရောင်းစာရင်း ၁ ခုစာ ပြန်လည်ပြင်ဆင်ပြီးပါပြီ' : 'ပစ္စည်းဖျက်သိမ်းပြီးပါပြီ');
    } catch (err: any) {
      showToast(err.message || 'အမှားဖြစ်ပွားပါသည်', 'error');
    }
  };

  const renderProductCard = (p: ProductItem) => {
    const isSold = p.status === 'ရောင်းပြီး';
    const isOut = p.amount <= 0 && !isSold;

    return (
      <div
        key={p.id}
        className={`relative bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${
          isSold
            ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
            : isOut
            ? 'border-amber-200 dark:border-amber-900/50'
            : 'border-slate-200/80 dark:border-slate-800'
        }`}
      >
        {/* Row 1: Title and Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {p.name}
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                {p.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>📦 လက်ကျန်: <b className="text-slate-800 dark:text-slate-200">{p.amount}</b> ခု</span>
              {p.sellDate && (
                <span className="text-rose-500 font-medium">· 📅 {p.sellDate}</span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                isSold
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : isOut
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {p.status}
            </span>

            {/* Admin 3-dot dropdown menu */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() =>
                    setOpenActionId(openActionId === p.id ? null : p.id)
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openActionId === p.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                    {!isSold ? (
                      <>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>အချက်အလက် ပြင်မည်</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>အပြီးဖျက်မည်</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>မှားရောင်းမိ၍ ၁ ခု ပြန်ဖျက်</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Price Grid & Quick Sell Action */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">အရင်း</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {formatCurrency(p.costPrice)}
              </span>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">ရောင်းဈေး</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {formatCurrency(p.price)}
              </span>
            </div>
          </div>

          {!isSold && !isOut && (
            <button
              onClick={() => handleOpenSell(p)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>ရောင်းမည်</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-36">
      {/* Top Controls & KPI Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-3.5">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="p-2 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                ပစ္စည်းအရေအတွက်
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums block truncate">
                {stats.totalItemsCount.toLocaleString()}
              </span>
            </div>
            <div className="p-2 sm:p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block truncate">
                စတော့အရင်းတန်ဖိုး
              </span>
              <span className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300 tabular-nums truncate block">
                {formatCurrency(stats.totalCostValue)}
              </span>
            </div>
            <div className="p-2 sm:p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400 block truncate">
                လက်ကျန်ပြတ်
              </span>
              <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums block truncate">
                {stats.outOfStockCount}
              </span>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 ပစ္စည်းအမည်ဖြင့် ရှာရန်..."
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

            {/* Sort Menu Trigger */}
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

            {/* View Mode Toggle (Grouped vs Flat List) */}
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors shrink-0 text-xs font-bold gap-1 ${
                viewMode === 'grouped'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title={viewMode === 'grouped' ? t('ပုံမှန်စာရင်းသို့ ပြောင်းမည်', 'Switch to Flat List') : t('အုပ်စုလိုက် ခွဲကြည့်မည်', 'Group by Category')}
            >
              <span>{viewMode === 'grouped' ? '🗂️ အုပ်စုလိုက်' : '📋 စာရင်း'}</span>
            </button>

            {/* Add Product Button */}
            <button
              onClick={handleOpenAdd}
              className={`flex items-center gap-1.5 px-3 py-2.5 ${themeConfig.primaryBg} ${themeConfig.primaryHover} text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all shrink-0`}
            >
              <Plus className="w-4 h-4" />
              <span>{t('+ ပစ္စည်းသစ်', '+ Add Item')}</span>
            </button>
          </div>

          {/* Interactive Dynamic Category Filter Pills */}
          <div className="flex gap-1.5 scroll-touch-x no-scrollbar pb-1">
            {productCategories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Product List */}
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">စတော့စာရင်း ဆွဲယူနေပါသည်...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8">
            <Archive className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              ပစ္စည်းစာရင်း မရှိသေးပါ
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ပစ္စည်းအသစ် ထည့်သွင်းရန် "+ ပစ္စည်းသစ်" ခလုတ်ကို နှိပ်ပါ
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProducts.map((p) => renderProductCard(p))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedProducts).map(([category, items]) => {
                  const totalQty = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                  const totalCost = items.reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.amount) || 0)), 0);
                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between px-2 py-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {category}
                          </h4>
                          <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold shadow-2xs">
                            {items.length} မျိုး ({totalQty} ခု)
                          </span>
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                          {formatCurrency(totalCost)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((p) => renderProductCard(p))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingProduct ? 'ပစ္စည်းစာရင်း ပြင်ဆင်ရန်' : 'ပစ္စည်းအသစ် သွင်းရန်'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ပစ္စည်းအမည် *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ဥပမာ - iPhone 13 Screen"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    အမျိုးအစား
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        const newCat = window.prompt(t('အုပ်စုအသစ် ရိုက်ထည့်ပါ', 'Enter new category name:'));
                        if (newCat && newCat.trim()) {
                          addProductCategory(newCat.trim());
                          setFormData({ ...formData, category: newCat.trim() });
                        }
                      } else {
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  >
                    {productCategories
                      .filter((c) => c !== 'အားလုံး' && c !== 'ရောင်းပြီး')
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    <option value="__NEW__">{t('+ အုပ်စုအသစ် ထည့်မည်...', '+ Add New Category...')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    အရေအတွက် *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    အရင်း (Ks)
                  </label>
                  <input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: Number(e.target.value) })
                    }
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ရောင်းဈေး (Ks)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: Number(e.target.value) })
                    }
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Activity Logs History */}
              {editingProduct?.history && editingProduct.history.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    ပြင်ဆင်မှုမှတ်တမ်း (Activity Logs)
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500">
                    {[...editingProduct.history].reverse().map((h, idx) => (
                      <div key={idx} className="pb-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-none">
                        <span className="text-slate-400">🕒 {formatDetailedTime(h.time)}</span>
                        <div>- {h.msg}</div>
                        <span className="text-indigo-600 font-semibold">By: {h.by}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ပယ်ဖျက်
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'သိမ်းနေသည်...' : 'သိမ်းမည်'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SELL PRODUCT (CASH OR CREDIT) */}
      {sellingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  ပစ္စည်းရောင်းချမည်
                </h3>
                <p className="text-xs text-slate-500">{sellingProduct.name}</p>
              </div>
              <button
                onClick={() => setSellingProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSell} className="mt-4 space-y-3.5">
              {/* Total Calculation Preview */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">ကျသင့်ငွေ</span>
                  <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {formatCurrency(sellingProduct.price * sellQty)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">လက်ကျန်</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {sellingProduct.amount} ခု
                  </span>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ရောင်းမည့်အရေအတွက် *
                </label>
                <input
                  type="number"
                  min="1"
                  max={sellingProduct.amount}
                  value={sellQty}
                  onChange={(e) => setSellQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ငွေပေးချေမှုပုံစံ *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSellMode('cash')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      sellMode === 'cash'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    💵 လက်ငင်း (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellMode('credit')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      sellMode === 'credit'
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    📒 အကြွေး (Credit)
                  </button>
                </div>
              </div>

              {/* Credit Specific Details */}
              {sellMode === 'credit' && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                      ဝယ်သူအမည် *
                    </label>
                    <input
                      type="text"
                      value={creditCustomer}
                      onChange={(e) => setCreditCustomer(e.target.value)}
                      placeholder="ဦးလှမောင်"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                      ဖုန်းနံပါတ်
                    </label>
                    <input
                      type="tel"
                      value={creditPhone}
                      onChange={(e) => setCreditPhone(e.target.value)}
                      placeholder="09..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                      မှတ်ချက်
                    </label>
                    <input
                      type="text"
                      value={creditNote}
                      onChange={(e) => setCreditNote(e.target.value)}
                      placeholder="လကုန်မှ ပေးမည်"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSellingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ပယ်ဖျက်
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'ရောင်းချနေသည်...' : 'ရောင်းချမည်'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
