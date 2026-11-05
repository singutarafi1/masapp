import React, { useState } from 'react';
import { 
  DatabaseBackup, 
  Download, 
  Trash2, 
  Lock, 
  ShieldAlert, 
  Calendar, 
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { db, collection, getDocs } from '../../lib/firebase';
import { archiveDeleteByDateRange } from '../../lib/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function DataArchiveControl() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  // PIN security protection
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Batch delete state
  const [targetCollection, setTargetCollection] = useState<'transactions' | 'repairs' | 'products' | 'activity_logs'>('transactions');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'admin') {
      setIsUnlocked(true);
      showToast('System Control Unlocked', 'success');
    } else {
      showToast('PIN မမှန်ကန်ပါ (Default: admin)', 'error');
    }
  };

  // Helper to trigger CSV download
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Export Transactions CSV
  const exportTransactions = async () => {
    setIsExporting('tx');
    try {
      const snap = await getDocs(collection(db, 'transactions'));
      let csv = 'ID,Type,Group,SubGroup,Name,Amount,Date,Voided,Source\n';
      snap.forEach((d) => {
        const item = d.data();
        let dateStr = '';
        if (item.date?.toDate) dateStr = item.date.toDate().toISOString();
        else if (item.date) dateStr = String(item.date);

        const row = [
          d.id,
          item.type || '',
          item.group || '',
          item.subGroup || '',
          `"${(item.name || '').replace(/"/g, '""')}"`,
          item.amount || 0,
          dateStr,
          item.voided ? 'true' : 'false',
          item.source || 'tx'
        ].join(',');
        csv += row + '\n';
      });

      downloadCSV(`MobileAnswer_Transactions_${new Date().toISOString().slice(0, 10)}.csv`, csv);
      showToast('Transactions CSV Export အောင်မြင်ပါသည်', 'success');
    } catch (err: any) {
      showToast('Export မအောင်မြင်ပါ: ' + err.message, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  // 2. Export Repairs CSV
  const exportRepairs = async () => {
    setIsExporting('rep');
    try {
      const snap = await getDocs(collection(db, 'repairs'));
      let csv = 'VRNo,CustomerName,Phone,Model,Issue,Status,Cost,Income,Date\n';
      snap.forEach((d) => {
        const item = d.data();
        const row = [
          item.vrno || '',
          `"${(item.name || '').replace(/"/g, '""')}"`,
          item.phone || '',
          `"${(item.model || '').replace(/"/g, '""')}"`,
          `"${(item.issue || '').replace(/"/g, '""')}"`,
          item.status || '',
          item.cost || 0,
          item.income || 0,
          item.date || ''
        ].join(',');
        csv += row + '\n';
      });

      downloadCSV(`MobileAnswer_Repairs_${new Date().toISOString().slice(0, 10)}.csv`, csv);
      showToast('Repairs CSV Export အောင်မြင်ပါသည်', 'success');
    } catch (err: any) {
      showToast('Export မအောင်မြင်ပါ: ' + err.message, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  // 3. Export Products CSV
  const exportProducts = async () => {
    setIsExporting('prod');
    try {
      const snap = await getDocs(collection(db, 'products'));
      let csv = 'Name,Category,Amount,CostPrice,Price,Status,SellDate\n';
      snap.forEach((d) => {
        const item = d.data();
        const row = [
          `"${(item.name || '').replace(/"/g, '""')}"`,
          item.category || '',
          item.amount || 0,
          item.costPrice || 0,
          item.price || 0,
          item.status || '',
          item.sellDate || ''
        ].join(',');
        csv += row + '\n';
      });

      downloadCSV(`MobileAnswer_Products_${new Date().toISOString().slice(0, 10)}.csv`, csv);
      showToast('Products CSV Export အောင်မြင်ပါသည်', 'success');
    } catch (err: any) {
      showToast('Export မအောင်မြင်ပါ: ' + err.message, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  // Batch Archive Deletion
  const handleBatchDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== 'DELETE') {
      showToast('အတည်ပြုရန် "DELETE" ဟု ရိုက်ထည့်ပါ', 'error');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      showToast('စတင်ရက်စွဲသည် ပြီးဆုံးရက်စွဲထက် မကြီးရပါ', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      const count = await archiveDeleteByDateRange(targetCollection, start, end, profile?.name || 'Admin');
      showToast(`${count} records ဖျက်သိမ်းပြီးပါပြီ`, 'success');
      setConfirmName('');
    } catch (err: any) {
      showToast('ဖျက်သိမ်းမရပါ: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          System Control & Archive Room
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
          ဒေတာများ Backup ထုတ်ခြင်းနှင့် ရက်စွဲအလိုက် စာရင်းရှင်းလင်းခြင်းအတွက် Admin PIN ရိုက်ထည့်ပါ
        </p>

        <form onSubmit={handleUnlock} className="space-y-3">
          <input
            type="password"
            required
            placeholder="Admin PIN (Default: admin)"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-bold text-sm tracking-widest focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 active:scale-95 transition-all"
          >
            သော့ဖွင့်မည် (Unlock)
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-20 px-3 sm:px-6 max-w-4xl mx-auto pt-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <DatabaseBackup className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Data Archive & CSV Backup Control
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ဆိုင်ဒေတာများကို Excel/CSV ဖိုင်အဖြစ် ဒေါင်းလုဒ်ရယူခြင်းနှင့် စာရင်းရှင်းလင်းခြင်း
          </p>
        </div>

        <button
          onClick={() => {
            setIsUnlocked(false);
            setPin('');
          }}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 dark:bg-slate-800"
        >
          သော့ပြန်ခတ်မည်
        </button>
      </div>

      {/* 1. CSV Export Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span>CSV / Excel Backup ဒေါင်းလုဒ် ရယူရန်</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Google Sheets သို့မဟုတ် Microsoft Excel တွင် တိုက်ရိုက်ဖွင့်ကြည့်နိုင်သော UTF-8 format ဖြင့် ဒေါင်းလုဒ်လုပ်ပေးပါမည်။
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={exportTransactions}
            disabled={isExporting !== null}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left group"
          >
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 dark:text-white">
              <span>Finance Ledger</span>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isExporting === 'tx' ? 'ထုတ်ယူနေပါသည်...' : 'ဝင်/ထွက်ငွေ စာရင်းအားလုံး'}
            </p>
          </button>

          <button
            onClick={exportRepairs}
            disabled={isExporting !== null}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left group"
          >
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 dark:text-white">
              <span>Repairs Record</span>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isExporting === 'rep' ? 'ထုတ်ယူနေပါသည်...' : 'စက်ပြင်မှတ်တမ်း အားလုံး'}
            </p>
          </button>

          <button
            onClick={exportProducts}
            disabled={isExporting !== null}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left group"
          >
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 dark:text-white">
              <span>Inventory & Sold</span>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isExporting === 'prod' ? 'ထုတ်ယူနေပါသည်...' : 'စတော့နှင့် အရောင်းစာရင်း'}
            </p>
          </button>
        </div>
      </div>

      {/* 2. Date Range Batch Archive & Purge */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-600">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
            ရက်စွဲအလိုက် စာရင်းရှင်းလင်း ဖျက်သိမ်းခြင်း (Permanent Archive Purge)
          </h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          သတိပြုရန်: ရွေးချယ်ထားသော ရက်စွဲအပိုင်းအခြားအတွင်းရှိ ဒေတာများကို Database မှ အပြီးတိုင် ဖျက်ပစ်ပါမည်။ မဖျက်မီ အထက်ပါ CSV Backup ကို ကြိုတင် ဒေါင်းလုဒ်ဆွဲထားပါ။
        </p>

        <form onSubmit={handleBatchDelete} className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                ဖျက်မည့် စာရင်း (Collection)
              </label>
              <select
                value={targetCollection}
                onChange={(e: any) => setTargetCollection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-rose-500"
              >
                <option value="transactions">ဝင်/ထွက်ငွေစာရင်း (Transactions)</option>
                <option value="repairs">စက်ပြင်မှတ်တမ်း (Repairs)</option>
                <option value="activity_logs">လုပ်ဆောင်ချက်မှတ်တမ်း (Activity Logs)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                စတင်ရက်စွဲ (From)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                ပြီးဆုံးရက်စွဲ (To)
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200/60 dark:border-rose-900/40">
            <label className="text-xs font-bold text-rose-700 dark:text-rose-300 block mb-1">
              အတည်ပြုရန် <strong>"DELETE"</strong> ဟု ရိုက်ထည့်ပါ
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="DELETE"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-xs font-bold text-rose-600 focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={isDeleting || confirmName !== 'DELETE'}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-rose-600/30 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'ဖျက်နေပါသည်...' : 'စာရင်းရှင်းမည်'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
