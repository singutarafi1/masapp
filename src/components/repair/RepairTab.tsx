import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wrench,
  Plus,
  Search,
  X,
  ArrowUpDown,
  Phone,
  MapPin,
  Smartphone,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Trash2,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { RepairItem, RepairStatus, SortType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDetailedTime, getLocalDateString } from '../../lib/dateUtils';
import {
  saveRepairData,
  voidRepairRecord,
  deleteRepairPermanently,
} from '../../lib/dataService';
import { exportVoucherImage, downloadVoucherDataUrl } from '../../lib/voucher';

export function RepairTab() {
  const { profile, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('အားလုံး');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<SortType>('modified_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Modal states
  const [selectedRepair, setSelectedRepair] = useState<RepairItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voucher preview modal
  const [voucherDataUrl, setVoucherDataUrl] = useState<string | null>(null);
  const [isGeneratingVoucher, setIsGeneratingVoucher] = useState(false);
  const voucherCaptureRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState<{
    vrno: number | string;
    date: string;
    name: string;
    phone: string;
    location: string;
    model: string;
    issue: string;
    remark: string;
    status: RepairStatus;
    cost: number;
    income: number;
  }>({
    vrno: 1,
    date: getLocalDateString(),
    name: '',
    phone: '',
    location: '',
    model: '',
    issue: '',
    remark: '',
    status: 'စစ်ဆေးပြုပြင်နေဆဲ',
    cost: 0,
    income: 0,
  });

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'repairs'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as RepairItem[];
        setRepairs(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching repairs:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filter & Sort
  const filteredRepairs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = repairs.filter((r) => {
      const s = r.status || 'စစ်ဆေးပြုပြင်နေဆဲ';
      if (q) {
        return (
          (r.name || '').toLowerCase().includes(q) ||
          (r.vrno || '').toString().includes(q) ||
          (r.phone || '').includes(q) ||
          (r.model || '').toLowerCase().includes(q)
        );
      }

      if (activeFilter === 'အားလုံး') return true;
      if (activeFilter === 'စစ်ဆေးဆဲ') {
        return s === 'စစ်ဆေးပြုပြင်နေဆဲ' || s.includes('ပြင်မရ-မရွေးသေး');
      }
      if (activeFilter === 'ပြင်ပြီး') {
        return s === 'ပြင်ပြီး-မရွေးသေး';
      }
      if (activeFilter === 'ရွေးသွားပြီ') {
        return s.includes('ထုတ်ယူပြီး');
      }
      if (activeFilter === 'Void') {
        return s === 'ပယ်ဖျက် (Void)';
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortType === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortType === 'date_desc') {
        const tA = a.timestamp?.toMillis?.() || new Date(a.date || 0).getTime();
        const tB = b.timestamp?.toMillis?.() || new Date(b.date || 0).getTime();
        return tB - tA;
      }
      // default: modified_desc
      let mA = 0, mB = 0;
      if (a.history && a.history.length > 0) {
        mA = new Date(a.history[a.history.length - 1].time).getTime();
      } else if (a.updatedAt?.toMillis) {
        mA = a.updatedAt.toMillis();
      } else if (a.timestamp?.toMillis) {
        mA = a.timestamp.toMillis();
      }

      if (b.history && b.history.length > 0) {
        mB = new Date(b.history[b.history.length - 1].time).getTime();
      } else if (b.updatedAt?.toMillis) {
        mB = b.updatedAt.toMillis();
      } else if (b.timestamp?.toMillis) {
        mB = b.timestamp.toMillis();
      }

      return mB - mA;
    });
  }, [repairs, searchQuery, activeFilter, sortType]);

  // Open Form for New Repair
  const handleOpenNew = () => {
    let maxVr = 0;
    repairs.forEach((d) => {
      const currentVr = parseInt(String(d.vrno)) || 0;
      if (currentVr > maxVr) maxVr = currentVr;
    });

    setIsNewRecord(true);
    setSelectedRepair(null);
    setFormData({
      vrno: maxVr + 1,
      date: getLocalDateString(),
      name: '',
      phone: '',
      location: '',
      model: '',
      issue: '',
      remark: '',
      status: 'စစ်ဆေးပြုပြင်နေဆဲ',
      cost: 0,
      income: 0,
    });
    setShowModal(true);
  };

  // Open Form for Existing Repair
  const handleOpenDetail = (r: RepairItem) => {
    setIsNewRecord(false);
    setSelectedRepair(r);
    setFormData({
      vrno: r.vrno,
      date: r.date || getLocalDateString(),
      name: r.name || '',
      phone: r.phone || '',
      location: r.location || '',
      model: r.model || '',
      issue: r.issue || '',
      remark: r.remark || '',
      status: r.status || 'စစ်ဆေးပြုပြင်နေဆဲ',
      cost: r.cost || 0,
      income: r.income || 0,
    });
    setShowModal(true);
  };

  // Save Repair
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.model.trim() || !formData.issue.trim()) {
      showToast('အမည်၊ ဖုန်းမော်ဒယ်နှင့် ပြစ်ချက် ပြည့်စုံစွာ ဖြည့်ပါ', 'warning');
      return;
    }

    if (formData.status === 'ထုတ်ယူပြီး-အောင်မြင်' && formData.income <= 0) {
      showToast('ရွေးယူသွားပါက ရငွေ (Income) မဖြစ်မနေ ထည့်ပေးပါ', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveRepairData(
        isNewRecord ? null : selectedRepair!.id,
        formData,
        profile?.name || 'Staff'
      );
      showToast(isNewRecord ? 'ဖုန်းအသစ် လက်ခံမှတ်တမ်း တင်ပြီးပါပြီ' : 'ပြင်ဆင်မှုမှတ်တမ်း သိမ်းပြီးပါပြီ');
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message || 'သိမ်းဆည်းရာတွင် အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void Repair
  const handleVoid = async () => {
    if (!selectedRepair) return;
    if (
      !window.confirm(
        `VR:${selectedRepair.vrno} ကို ပယ်ဖျက် (Void) လုပ်မည်လား?\n(ဆက်စပ်ငွေစာရင်းများပါ အလိုအလျောက် ပယ်ဖျက်ပါမည်)`
      )
    )
      return;

    setIsSubmitting(true);
    try {
      await voidRepairRecord(selectedRepair.id, profile?.name || 'Staff');
      showToast(`VR:${selectedRepair.vrno} ကို ပယ်ဖျက်ပြီးပါပြီ`);
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message || 'အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Permanently (Admin only)
  const handleDeletePermanent = async () => {
    if (!selectedRepair || !isAdmin) return;
    if (
      !window.confirm(
        `VR:${selectedRepair.vrno} ကို ဒေတာဘေ့စ်ထဲမှ အပြီးဖျက်မည်လား?\n(ဤလုပ်ဆောင်ချက်သည် ပြန်ယူ၍ မရနိုင်ပါ)`
      )
    )
      return;

    setIsSubmitting(true);
    try {
      await deleteRepairPermanently(selectedRepair.id, selectedRepair.vrno, profile?.name || 'Admin');
      showToast(`VR:${selectedRepair.vrno} ကို အပြီးတိုင် ဖျက်သိမ်းပြီးပါပြီ`);
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message || 'အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Voucher Image
  const handleGenerateVoucher = async () => {
    if (!voucherCaptureRef.current) return;
    setIsGeneratingVoucher(true);
    try {
      const dataUrl = await exportVoucherImage(voucherCaptureRef.current, formData.vrno);
      setVoucherDataUrl(dataUrl);
    } catch (err: any) {
      showToast('ဘောက်ချာပုံ ထုတ်ယူရာတွင် အမှားဖြစ်ပွားပါသည်', 'error');
    } finally {
      setIsGeneratingVoucher(false);
    }
  };

  return (
    <div className="pb-28">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 VR နံပါတ် / အမည် / ဖုန်းဖြင့် ရှာရန်..."
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

            {/* Quick Add Repair */}
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ အပ်ဖုန်းသစ်</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {['အားလုံး', 'စစ်ဆေးဆဲ', 'ပြင်ပြီး', 'ရွေးသွားပြီ', 'Void'].map((st) => {
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

      {/* Repair Cards Feed */}
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">ပြင်ဆင်မှုမှတ်တမ်းများ ဆွဲယူနေပါသည်...</span>
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8">
            <Wrench className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              ဖုန်းပြင်မှတ်တမ်း မရှိသေးပါ
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ဖုန်းအသစ်လက်ခံရန် "+ အပ်ဖုန်းသစ်" ခလုတ်ကို နှိပ်ပါ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRepairs.map((r) => {
              const isVoid = r.status === 'ပယ်ဖျက် (Void)';
              const isCollected = (r.status || '').includes('ထုတ်ယူပြီး');
              const isReady = r.status === 'ပြင်ပြီး-မရွေးသေး';
              const isFailed = (r.status || '').includes('ပြင်မရ');

              return (
                <div
                  key={r.id}
                  onClick={() => handleOpenDetail(r)}
                  className={`cursor-pointer bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] ${
                    isVoid
                      ? 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-950/40'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {/* Row 1: Customer Name and VR */}
                  <div className="flex items-center justify-between gap-2">
                    <strong
                      className={`text-sm font-bold text-slate-900 dark:text-white truncate ${
                        isVoid ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {r.name}
                    </strong>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 tabular-nums shrink-0">
                      VR: {r.vrno}
                    </span>
                  </div>

                  {/* Row 2: Grid Info */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="flex items-center gap-1.5 truncate">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{r.model}</span>
                    </span>
                    <span className="flex items-center gap-1.5 truncate text-rose-500 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{r.issue}</span>
                    </span>
                    {r.phone && (
                      <span className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{r.phone}</span>
                      </span>
                    )}
                    {r.location && (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{r.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Row 3: Status Badge & Timestamps */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                        isVoid
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : isCollected
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : isFailed
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : isReady
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {r.status}
                    </span>

                    <span className="text-[10px] text-slate-400 font-medium">
                      {r.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL / EDIT / CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isNewRecord ? 'ဖုန်းအသစ် လက်ခံခြင်း' : `VR: ${formData.vrno} အသေးစိတ်`}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    VR နံပါတ် *
                  </label>
                  <input
                    type="number"
                    value={formData.vrno}
                    onChange={(e) => setFormData({ ...formData, vrno: Number(e.target.value) })}
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
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer အမည် *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ဦးသန်းလွင်"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ဖုန်းနံပါတ်
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    လိပ်စာ / နေရပ်
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="မန္တလေး"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ဖုန်း Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Redmi Note 12"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ပြစ်ချက် (Issue) *
                  </label>
                  <input
                    type="text"
                    value={formData.issue}
                    onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                    placeholder="မျက်နှာပြင်ကွဲ / ပါဝါမတက်"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  မှတ်ချက် (Remark)
                </label>
                <input
                  type="text"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="Back cover ပွန်းနေသည်"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Status and Pricing Section */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                  Status & Pricing
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    အခြေအနေ (Status)
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as RepairStatus })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="စစ်ဆေးပြုပြင်နေဆဲ">⏳ စစ်ဆေးပြုပြင်နေဆဲ</option>
                    <option value="ပြင်ပြီး-မရွေးသေး">✅ ပြင်ပြီး (မရွေးသေး)</option>
                    <option value="ပြင်မရ-မရွေးသေး">❌ ပြင်မရ (မရွေးသေး)</option>
                    <option value="ထုတ်ယူပြီး-အောင်မြင်">📦 ပြင်ပြီး ရွေးသွားပြီ (Collected)</option>
                    <option value="ထုတ်ယူပြီး-ပြင်မရ">📦 ပြင်မရ ရွေးသွားပြီ</option>
                    <option value="ပယ်ဖျက် (Void)">🚫 မှားသွင်းမိ၍ ပယ်ဖျက်မည် (Void)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      အပိုပစ္စည်း အရင်း (Ks)
                    </label>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData({ ...formData, cost: Number(e.target.value) })
                      }
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ရငွေ / ပြင်ခ (Income Ks)
                    </label>
                    <input
                      type="number"
                      value={formData.income}
                      onChange={(e) =>
                        setFormData({ ...formData, income: Number(e.target.value) })
                      }
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  * ထုတ်ယူပြီးပါက ဤနေရာမှ ဝင်ငွေ (Income) သည် Finance ထဲသို့ အလိုအလျောက် ရောက်ရှိပါမည်။
                </p>
              </div>

              {/* Activity Log */}
              {selectedRepair?.history && selectedRepair.history.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    မှတ်တမ်း (Activity Logs)
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500">
                    {[...selectedRepair.history].reverse().map((h, i) => (
                      <div key={i} className="pb-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-none">
                        <span className="text-slate-400">🕒 {formatDetailedTime(h.time)}</span>
                        <div>- {h.msg}</div>
                        <span className="text-indigo-600 font-semibold">By: {h.by}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                {!isNewRecord && (
                  <button
                    type="button"
                    onClick={handleGenerateVoucher}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Receipt</span>
                  </button>
                )}

                {!isNewRecord && selectedRepair?.status !== 'ပယ်ဖျက် (Void)' && (
                  <button
                    type="button"
                    onClick={handleVoid}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Void</span>
                  </button>
                )}

                {isAdmin && !isNewRecord && (
                  <button
                    type="button"
                    onClick={handleDeletePermanent}
                    className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-rose-100"
                    title="အပြီးဖျက်မည် (Admin only)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

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

      {/* HIDDEN VOUCHER TEMPLATE FOR HTML2CANVAS */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div
          ref={voucherCaptureRef}
          className="w-[380px] bg-white p-8 text-slate-900 border-t-8 border-indigo-600"
          style={{ fontFamily: "'Noto Sans Myanmar', sans-serif" }}
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Mobile <span className="text-indigo-600">ANSWER</span>
            </h2>
            <span className="text-xs font-bold text-slate-500 tracking-widest uppercase block mt-1">
              Phone Service & Repair
            </span>
          </div>

          <div className="space-y-2 text-xs border-y border-dashed border-slate-300 py-4 my-4">
            <div className="flex justify-between">
              <span className="text-slate-500">ရက်စွဲ:</span>
              <span className="font-bold">{formData.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ဘောက်ချာ No:</span>
              <span className="font-bold text-indigo-600">VR-{formData.vrno}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold">{formData.name}</span>
            </div>
            {formData.phone && (
              <div className="flex justify-between">
                <span className="text-slate-500">ဖုန်း:</span>
                <span className="font-bold">{formData.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">မော်ဒယ်:</span>
              <span className="font-bold">{formData.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ပြစ်ချက်:</span>
              <span className="font-bold text-rose-600">{formData.issue}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-extrabold text-indigo-700 pt-2 border-t border-slate-200">
            <span>ကျသင့်ငွေ စုစုပေါင်း:</span>
            <span className="text-lg text-rose-600">{formatCurrency(formData.income)}</span>
          </div>

          <p className="text-center text-[11px] text-slate-400 italic mt-8">
            ယုံကြည်စိတ်ချစွာ အပ်နှံခြင်းအတွက် ကျေးဇူးတင်ပါသည်။
          </p>
        </div>
      </div>

      {/* VOUCHER PREVIEW MODAL */}
      {voucherDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="flex flex-col items-center max-w-sm w-full">
            <img
              src={voucherDataUrl}
              alt="Voucher Receipt"
              className="max-h-[65vh] w-auto rounded-2xl shadow-2xl border border-slate-700"
            />
            <p className="text-xs text-slate-300 mt-3 text-center">
              💡 ပုံကို ဖိထားပြီး (Long Press) လည်း Save နိုင်ပါသည်။
            </p>
            <div className="flex gap-3 w-full mt-4">
              <button
                onClick={() => downloadVoucherDataUrl(voucherDataUrl, formData.vrno)}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <Download className="w-4 h-4" />
                <span>Save ပုံသိမ်းမည်</span>
              </button>
              <button
                onClick={() => setVoucherDataUrl(null)}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl"
              >
                ပိတ်မည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
