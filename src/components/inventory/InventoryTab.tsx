import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
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
  ChevronDown,
  Clock,
  LayoutList,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { ProductItem, SortType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDetailedTime } from '../../lib/dateUtils';
import { useBackHandler } from '../../lib/backNavigation';
import {
  addOrUpdateStockProduct,
  sellProductItem,
  deleteOrRollbackProduct,
} from '../../lib/dataService';

export function InventoryTab() {
  const { profile, isAdmin } = useAuth();
  const { showToast, confirmAction, promptAction, runWithLoading } = useToast();
  const { productCategories, addProductCategory, t, themeConfig } = useSettings();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('အားလုံး');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<SortType>('modified_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'compact' | 'grouped'>('list');

  // Accordion state for history logs (Option Kh)
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [sellingProduct, setSellingProduct] = useState<ProductItem | null>(null);

  // Selling modal form state (string input allows clearing '1' with backspace)
  const [sellQtyInput, setSellQtyInput] = useState<string>('1');
  const sellQty = Math.max(0, parseInt(sellQtyInput || '0', 10) || 0);
  const [sellMode, setSellMode] = useState<'cash' | 'credit'>('cash');
  const [creditCustomer, setCreditCustomer] = useState('');
  const [creditPhone, setCreditPhone] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product Form State (string inputs allow clean backspace deletion on mobile keyboard)
  const [formData, setFormData] = useState({
    name: '',
    category: 'အထွေထွေ',
    amount: '1',
    costPrice: '',
    price: '',
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

  const [showSoldHistory, setShowSoldHistory] = useState(false);

  // Hardware Back Button support for SKW WebView
  useBackHandler(showSoldHistory, () => setShowSoldHistory(false));
  useBackHandler(showProductModal, () => setShowProductModal(false));
  useBackHandler(sellingProduct !== null, () => setSellingProduct(null));

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // If viewing sold history archive
    if (showSoldHistory) {
      let soldList = products.filter((p) => p.status === 'ရောင်းပြီး');
      if (q) {
        soldList = soldList.filter((p) => p.name.toLowerCase().includes(q));
      }
      return soldList.sort((a, b) => {
        const tA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const tB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return tB - tA;
      });
    }

    let result = products.filter((p) => {
      // Exclude sold items from regular stock view
      if (p.status === 'ရောင်းပြီး' || p.name.includes('(ရောင်းပြီး)')) {
        return false;
      }

      if (q) {
        return p.name.toLowerCase().includes(q);
      }

      if (activeCategory === 'အားလုံး') {
        return true;
      }
      return p.category === activeCategory;
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
  }, [products, searchQuery, activeCategory, sortType, showSoldHistory]);

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
    const soldCount = products.filter((p) => p.status === 'ရောင်းပြီး').length;
    return { totalItemsCount, totalCostValue, outOfStockCount, soldCount };
  }, [products]);

  const [recordCashExpense, setRecordCashExpense] = useState(true);

  // Open modal to add product
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setRecordCashExpense(true);
    setFormData({
      name: '',
      category: 'အထွေထွေ',
      amount: '1',
      costPrice: '',
      price: '',
    });
    setShowProductModal(true);
  };

  // Open modal to edit product
  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setRecordCashExpense(true);
    setFormData({
      name: p.name,
      category: p.category || 'အထွေထွေ',
      amount: String(p.amount ?? 0),
      costPrice: p.costPrice ? String(p.costPrice) : '',
      price: p.price ? String(p.price) : '',
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
    const parsedAmount = Number(formData.amount || 0);
    const parsedCostPrice = Number(formData.costPrice || 0);
    const parsedPrice = Number(formData.price || 0);

    if (isNaN(parsedAmount) || parsedAmount < 0) {
      showToast('အရေအတွက် မှန်ကန်စွာ ဖြည့်ပါ', 'warning');
      return;
    }

    const ok = await confirmAction({
      title: editingProduct ? 'ပစ္စည်းစာရင်း ပြင်ဆင်မည်လား?' : 'ပစ္စည်းအသစ် ထည့်သွင်းမည်လား?',
      message: `"${formData.name.trim()}" (${parsedAmount} ခု) — ရောင်းဈေး ${formatCurrency(parsedPrice)} ဖြင့် ${editingProduct ? 'ပြင်ဆင်သိမ်းဆည်း' : 'အသစ်ထည့်သွင်း'}ပါမည်။`,
      confirmText: editingProduct ? 'ပြင်ဆင်သိမ်းမည်' : 'အသစ်သွင်းမည်',
      variant: 'info',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      await runWithLoading(
        () =>
          addOrUpdateStockProduct(
            editingProduct ? editingProduct.id : null,
            {
              name: formData.name.trim(),
              category: formData.category,
              amount: parsedAmount,
              costPrice: parsedCostPrice,
              price: parsedPrice,
            },
            profile?.name || 'Staff',
            recordCashExpense
          ),
        editingProduct ? 'ပစ္စည်းစာရင်း ပြင်ဆင်သိမ်းဆည်းနေပါသည်...' : 'ပစ္စည်းအသစ် Online သိမ်းဆည်းနေပါသည်...'
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
    setSellQtyInput('1');
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

    const totalSellPrice = sellingProduct.price * sellQty;
    const ok = await confirmAction({
      title: sellMode === 'credit' ? '📒 အကြွေးရောင်းချမှု အတည်ပြုရန်' : '💵 လက်ငင်းရောင်းချမှု အတည်ပြုရန်',
      message: `${sellingProduct.name} (${sellQty} ခု)\nကျသင့်ငွေ: ${formatCurrency(totalSellPrice)}${
        sellMode === 'credit' ? `\nဝယ်သူ: ${creditCustomer.trim()}` : ''
      }`,
      confirmText: sellMode === 'credit' ? 'အကြွေးရောင်းမည်' : 'ရောင်းချမည်',
      variant: sellMode === 'credit' ? 'warning' : 'success',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      await runWithLoading(
        () =>
          sellProductItem(
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
          ),
        'အရောင်းစာရင်းနှင့် စတော့လက်ကျန် Online ချိတ်ဆက်နေပါသည်...'
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
      : `"${item.name}" (လက်ကျန် ${item.amount} ခု) ကို စာရင်းမှ အပြီးတိုင် ဖျက်သိမ်းမည်လား?`;

    const ok = await confirmAction({
      title: isSold ? 'အရောင်း ၁ ခုစာ ပြန်ဖြုတ်မည်လား?' : 'ပစ္စည်းစာရင်း အပြီးဖျက်မည်လား?',
      message: confirmMsg,
      confirmText: isSold ? '၁ ခု ပြန်ဖြုတ်မည်' : 'အပြီးဖျက်မည်',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await runWithLoading(
        () => deleteOrRollbackProduct(item, products, profile?.name || 'Staff'),
        isSold ? 'အရောင်းစာရင်း ပြန်လည်ပြင်ဆင်နေပါသည်...' : 'ပစ္စည်းစာရင်း ဖျက်သိမ်းနေပါသည်...'
      );
      showToast(isSold ? 'အရောင်းစာရင်း ၁ ခုစာ ပြန်လည်ပြင်ဆင်ပြီးပါပြီ' : 'ပစ္စည်းဖျက်သိမ်းပြီးပါပြီ');
      if (editingProduct?.id === item.id) {
        setShowProductModal(false);
      }
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
            {isAdmin && (
              <>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">အရင်း</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatCurrency(p.costPrice)}
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
              </>
            )}
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">ရောင်းဈေး</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {formatCurrency(p.price)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleDeleteProduct(p)}
                className="min-h-[42px] px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                title={isSold ? 'မှားရောင်းမိ၍ ၁ ခု ပြန်ဖြုတ်မည်' : 'ပစ္စည်းစာရင်း ဖျက်မည်'}
              >
                {isSold ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isSold ? 'ပြန်ဖြုတ်' : 'ဖျက်မည်'}</span>
              </button>
            )}

            {!isSold && !isOut && (
              <button
                onClick={() => handleOpenSell(p)}
                className="flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>ရောင်းမည်</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 3: History Accordion (Option Kh) */}
        {p.history && p.history.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() =>
                setExpandedHistoryIds((prev) => ({
                  ...prev,
                  [p.id]: !prev[p.id],
                }))
              }
              className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <History className="w-3.5 h-3.5" />
              <span>🕒 မှတ်တမ်း ({p.history.length} ခု)</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  expandedHistoryIds[p.id] ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedHistoryIds[p.id] && (
              <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl space-y-1 animate-in slide-in-from-top-1 duration-150">
                {p.history.map((h: any, idx: number) => (
                  <div key={idx} className="truncate">
                    • <b className="text-slate-700 dark:text-slate-200">{h.by || 'User'}</b>: {h.msg || 'Action'} ({h.time ? new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper to render a compact single-row item for fast mobile scanning (Option င)
  const renderCompactRow = (p: ProductItem) => {
    const isSold = p.category === 'ရောင်းပြီး';
    const isOut = p.amount === 0;
    const isLow = p.amount > 0 && p.amount <= 3;

    return (
      <div
        key={p.id}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2.5 shadow-2xs"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {p.name}
            </h4>
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                isOut
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                  : isLow
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
            >
              {p.amount} ခု
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
            <span className="text-slate-400 truncate max-w-[90px]">{p.category}</span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {formatCurrency(p.price)}
            </span>
            {p.costPrice > 0 && (
              <span className="text-[10px] text-slate-400 tabular-nums">
                (ရင်း {formatCurrency(p.costPrice)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isSold && !isOut && (
            <button
              onClick={() => handleOpenSell(p)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>ရောင်း</span>
            </button>
          )}
          {!isSold && (
            <button
              onClick={() => handleOpenEdit(p)}
              className="min-h-[38px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="ပြင်ဆင်ရန်"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => handleDeleteProduct(p)}
              className="min-h-[38px] min-w-[36px] flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
              title={isSold ? '၁ ခု ပြန်ဖြုတ်မည်' : 'အပြီးဖျက်မည်'}
            >
              {isSold ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-36">
      {/* Top Controls & KPI Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 py-3.5 sm:px-6 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto space-y-2.5">
          {/* Quick Metrics + Add Product CTA in one sleek mobile row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 min-w-0">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                စုစုပေါင်းအရေအတွက်
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums block truncate">
                {stats.totalItemsCount.toLocaleString()} ခု
              </span>
            </div>

            <div className="px-3 py-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 min-w-0">
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block truncate">
                လက်ကျန်ပြတ်
              </span>
              <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 tabular-nums block truncate">
                {stats.outOfStockCount} မျိုး
              </span>
            </div>

            <button
              onClick={handleOpenAdd}
              className={`min-h-[46px] flex items-center justify-center gap-1.5 px-3 py-2 ${themeConfig.primaryBg} ${themeConfig.primaryHover} text-white text-xs font-extrabold rounded-xl shadow-sm active:scale-95 transition-all`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('ပစ္စည်းသစ်', 'Add Item')}</span>
            </button>
          </div>

          {/* Search & View Mode Controls */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ပစ္စည်းအမည် ရှာရန်..."
                className="w-full pl-9 pr-8 py-2 min-h-[44px] bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700/70 rounded-xl text-xs sm:text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 text-slate-900 dark:text-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Menu Trigger */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl border flex items-center justify-center transition-colors ${
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
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between ${
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
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between ${
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
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between ${
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

            {/* 3-Mode View Switcher: Card (ကတ်) -> Compact (ကျဉ်း) -> Grouped (အုပ်စု) */}
            <button
              onClick={() =>
                setViewMode(
                  viewMode === 'list' ? 'compact' : viewMode === 'compact' ? 'grouped' : 'list'
                )
              }
              className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-center transition-colors shrink-0 text-xs font-bold gap-1 ${
                viewMode !== 'list'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="မြင်ကွင်းပုံစံ ပြောင်းရန်"
            >
              <span>
                {viewMode === 'list'
                  ? '📋 ကတ်'
                  : viewMode === 'compact'
                  ? '⚡ ကျဉ်း'
                  : '🗂️ အုပ်စု'}
              </span>
            </button>
          </div>

          {/* Option (ခ) Clean Product Category Pills (Pure Categories ONLY, no 'ရောင်းပြီး') */}
          <div className="flex items-center gap-1.5 scroll-touch-x no-scrollbar pb-0.5">
            {productCategories
              .filter((cat) => cat !== 'ရောင်းပြီး')
              .map((cat) => {
                const isActive = !showSoldHistory && activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setShowSoldHistory(false);
                      setActiveCategory(cat);
                    }}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}

            {/* Separate Sold History / Rollback trigger button */}
            <button
              onClick={() => setShowSoldHistory(!showSoldHistory)}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                showSoldHistory
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{showSoldHistory ? 'စတော့သို့ ပြန်သွားမည်' : `အရောင်းမှတ်တမ်း (${stats.soldCount})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Product List */}
      <div className="max-w-5xl mx-auto px-3.5 py-3.5 sm:px-6">
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
              ပစ္စည်းအသစ် ထည့်သွင်းရန် "ပစ္စည်းသစ်" ခလုတ်ကို နှိပ်ပါ
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProducts.map((p) => renderProductCard(p))}
              </div>
            ) : viewMode === 'compact' ? (
              <div className="space-y-2">
                {filteredProducts.map((p) => renderCompactRow(p))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedProducts).map(([category, items]) => {
                  const totalQty = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                  const totalCost = items.reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.amount) || 0)), 0);
                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {category}
                          </h4>
                          <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold shadow-2xs tabular-nums">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingProduct ? 'ပစ္စည်းစာရင်း ပြင်ဆင်ရန်' : 'ပစ္စည်းအသစ် သွင်းရန်'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
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
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  အမျိုးအစား
                </label>
                <select
                  value={formData.category}
                  onChange={async (e) => {
                    const val = e.target.value;
                    if (val === '__NEW__') {
                      const newCat = await promptAction({
                        title: t('+ အုပ်စုအသစ် ထည့်မည်', '+ Add New Category'),
                        message: t('ပစ္စည်းအုပ်စုအမည် အသစ် ရိုက်ထည့်ပါ', 'Enter new category name:'),
                        placeholder: 'ဥပမာ - Battery / Remax / မှန်မာ',
                        confirmText: t('အုပ်စုထည့်မည်', 'Add Group'),
                      });
                      if (newCat && newCat.trim()) {
                        await addProductCategory(newCat.trim());
                        setFormData((prev) => ({ ...prev, category: newCat.trim() }));
                      }
                    } else {
                      setFormData({ ...formData, category: val });
                    }
                  }}
                  className="w-full px-3 py-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
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

              {/* Quantity with tactile - / + Stepper Buttons + Clearable Manual Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  အရေအတွက် (လက်ကျန်) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = Math.max(0, (parseInt(formData.amount, 10) || 0) - 1);
                      setFormData({ ...formData, amount: String(current) });
                    }}
                    className="min-h-[46px] min-w-[48px] rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition-transform"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    className="flex-1 min-h-[46px] px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-base font-extrabold tabular-nums outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                    min="0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const current = (parseInt(formData.amount, 10) || 0) + 1;
                      setFormData({ ...formData, amount: String(current) });
                    }}
                    className="min-h-[46px] min-w-[48px] rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    အရင်း (Ks)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: e.target.value })
                    }
                    placeholder="0"
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold tabular-nums outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ရောင်းဈေး (Ks)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="0"
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold tabular-nums outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Cash Till Deduction Toggle */}
              {Number(formData.costPrice) > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      💵 ဆိုင်ငွေစာရင်းထဲတွင် အသုံးစရိတ် (ထွက်ငွေ) အဖြစ် မှတ်မည်
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 tabular-nums">
                      {recordCashExpense
                        ? `(ဝယ်ယူစရိတ် ${formatCurrency((Number(formData.costPrice) || 0) * (Number(formData.amount) || 0))} ကို ထွက်ငွေအဖြစ် မှတ်ပါမည်)`
                        : '(ဆိုင်ထဲ အရင်ရှိပြီးသား စတော့အဟောင်းဖြစ်ပါက အံဆွဲငွေ မနှုတ်ပါ)'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={recordCashExpense}
                      onChange={(e) => setRecordCashExpense(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              )}

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

              <div className="pt-2 flex gap-2">
                {isAdmin && editingProduct && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(editingProduct)}
                    className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center justify-center gap-1 hover:bg-rose-100 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ဖျက်မည်</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ပယ်ဖျက်
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  ပစ္စည်းရောင်းချမည်
                </h3>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                  {sellingProduct.name}
                </p>
              </div>
              <button
                onClick={() => setSellingProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSell} className="mt-4 space-y-4">
              {/* Total Calculation Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">ကျသင့်ငွေ စုစုပေါင်း</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {formatCurrency(sellingProduct.price * sellQty)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 block">လက်ရှိလက်ကျန်</span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">
                    {sellingProduct.amount} ခု
                  </span>
                </div>
              </div>

              {/* Quantity with Large - / + Stepper Buttons + Clearable Manual Input + Quick Preset Chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ရောင်းမည့်အရေအတွက် *
                  </label>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    ၁ ခု = {formatCurrency(sellingProduct.price)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, (parseInt(sellQtyInput, 10) || 1) - 1);
                      setSellQtyInput(String(next));
                    }}
                    disabled={sellQty <= 1}
                    className="min-h-[48px] min-w-[52px] rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={sellingProduct.amount}
                    value={sellQtyInput}
                    onChange={(e) => setSellQtyInput(e.target.value)}
                    placeholder="1"
                    className="flex-1 min-h-[48px] px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500/40 focus:border-indigo-500 rounded-xl text-center text-lg font-black tabular-nums outline-none text-slate-900 dark:text-white"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(
                        sellingProduct.amount,
                        (parseInt(sellQtyInput, 10) || 0) + 1
                      );
                      setSellQtyInput(String(next));
                    }}
                    disabled={sellQty >= sellingProduct.amount}
                    className="min-h-[48px] min-w-[52px] rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Quantity Preset Chips */}
                {sellingProduct.amount > 1 && (
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                    {[1, 2, 3, 5, 10]
                      .filter((n) => n <= sellingProduct.amount)
                      .map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSellQtyInput(String(preset))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                            sellQty === preset
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {preset} ခု
                        </button>
                      ))}
                    {sellingProduct.amount > 2 && (
                      <button
                        type="button"
                        onClick={() => setSellQtyInput(String(sellingProduct.amount))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                          sellQty === sellingProduct.amount
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        အားလုံး ({sellingProduct.amount})
                      </button>
                    )}
                  </div>
                )}
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
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
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
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
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
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
