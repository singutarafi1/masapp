import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Package, 
  Wrench, 
  Percent, 
  PieChart as PieChartIcon,
  RefreshCw,
  Building,
  UserCheck
} from 'lucide-react';
import { db, collection, onSnapshot, query, where } from '../../lib/firebase';
import { TransactionItem, RepairItem, ProductItem } from '../../types';

export function ExecutiveDashboard() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Time filter dropdown
  const [timeFilter, setTimeFilter] = useState<'all' | 'this_month' | 'this_year'>('this_month');

  useEffect(() => {
    setIsLoading(true);
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap) => {
      const list: TransactionItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as TransactionItem));
      setTransactions(list);
    });

    const unsubRep = onSnapshot(collection(db, 'repairs'), (snap) => {
      const list: RepairItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as RepairItem));
      setRepairs(list);
    });

    const unsubProd = onSnapshot(collection(db, 'products'), (snap) => {
      const list: ProductItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ProductItem));
      setProducts(list);
      setIsLoading(false);
    });

    return () => {
      unsubTx();
      unsubRep();
      unsubProd();
    };
  }, []);

  // Filter transactions according to timeFilter
  const now = new Date();
  const filteredTx = transactions.filter((tx) => {
    if (tx.voided) return false;
    if (timeFilter === 'all') return true;

    let d: Date;
    if (tx.date && typeof tx.date.toDate === 'function') d = tx.date.toDate();
    else if (tx.date instanceof Date) d = tx.date;
    else if (typeof tx.date === 'string') d = new Date(tx.date);
    else return true;

    if (timeFilter === 'this_month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'this_year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // 1. Drawer Cash on Hand (Pure Cash In vs Cash Out from shop operations)
  // Cash in = ဝင်ငွေ (excluding Personal)
  // Cash out = ထွက်ငွေ (excluding Personal)
  let drawerIn = 0;
  let drawerOut = 0;
  filteredTx.forEach((tx) => {
    if (tx.group === 'Personal') return;
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'ဝင်ငွေ') drawerIn += amt;
    else if (tx.type === 'ထွက်ငွေ') drawerOut += amt;
  });
  const drawerCashOnHand = drawerIn - drawerOut;

  // 2. Real Business P&L
  // Revenue: Service (စက်ပြင်ဝန်ဆောင်ခ) + Sales (ပစ္စည်းအရောင်း)
  // COGS: StockPurchase (ဝယ်ရင်းစရိတ်) + Repair Cost (အပိုပစ္စည်းစရိတ်)
  // Opex: Office (ဆိုင်အသုံးစရိတ်) + Home (အိမ်ပို့စရိတ်)
  let revService = 0;
  let revSales = 0;
  let cogsStock = 0;
  let cogsRepair = 0;
  let opexOffice = 0;
  let opexHome = 0;

  filteredTx.forEach((tx) => {
    if (tx.group === 'Personal') return;
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'ဝင်ငွေ') {
      if (tx.group === 'Service') revService += amt;
      else if (tx.group === 'Sales') revSales += amt;
    } else if (tx.type === 'ထွက်ငွေ') {
      if (tx.group === 'StockPurchase') cogsStock += amt;
      else if (tx.group === 'Service') cogsRepair += amt; // repair cost
      else if (tx.group === 'Office') opexOffice += amt;
      else if (tx.group === 'Home') opexHome += amt;
    }
  });

  const totalRevenue = revService + revSales;
  const totalCogs = cogsStock + cogsRepair;
  const grossProfit = totalRevenue - totalCogs;
  const totalOpex = opexOffice + opexHome;
  const netBusinessProfit = grossProfit - totalOpex;
  const profitMargin = totalRevenue > 0 ? ((netBusinessProfit / totalRevenue) * 100).toFixed(1) : '0';

  // 3. Invested Capital in Unsold Assets
  // Unsold stock products
  const unsoldProducts = products.filter((p) => p.status === 'ပစ္စည်းရှိ');
  const investedStockCapital = unsoldProducts.reduce((sum, p) => sum + (Number(p.costPrice) || 0) * (Number(p.amount) || 1), 0);
  const potentialStockRevenue = unsoldProducts.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.amount) || 1), 0);

  // Pending repairs in shop
  const pendingRepairs = repairs.filter((r) => r.status === 'စစ်ဆေးပြုပြင်နေဆဲ' || r.status === 'ပြင်ပြီး-မရွေးသေး');
  const pendingRepairsEstIncome = pendingRepairs.reduce((sum, r) => sum + (Number(r.income) || 0), 0);
  const pendingRepairsCost = pendingRepairs.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  // 4. Personal summary strip
  let personalIn = 0;
  let personalOut = 0;
  filteredTx.forEach((tx) => {
    if (tx.group === 'Personal') {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'ဝင်ငွေ') personalIn += amt;
      else if (tx.type === 'ထွက်ငွေ') personalOut += amt;
    }
  });
  const personalNet = personalIn - personalOut;

  return (
    <div className="space-y-6 animate-in fade-in pb-16 px-3 sm:px-6 max-w-7xl mx-auto pt-4">
      {/* Header with Title and Time Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Executive Business Overview
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ဆိုင်၏ အမြတ်အစွန်း၊ အံဆွဲငွေစီးဆင်းမှုနှင့် ရင်းနှီးမြှုပ်နှံမှု အခြေအနေ စာရင်းချုပ်
          </p>
        </div>

        {/* Time Filter Pill Dropdown */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setTimeFilter('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === 'this_month'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ဒီလ (This Month)
          </button>
          <button
            onClick={() => setTimeFilter('this_year')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === 'this_year'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ဒီနှစ် (This Year)
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            အားလုံး (All-time)
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid (4 Essential Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Drawer Cash on Hand */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-indigo-200 font-semibold mb-2">
            <span>ငွေအံဆွဲ လက်ကျန်ငွေ (Cash on Hand)</span>
            <Wallet className="w-4 h-4 text-indigo-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            {drawerCashOnHand.toLocaleString()} <span className="text-xs font-medium text-indigo-300">MMK</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-indigo-200/80 pt-2 border-t border-indigo-700/40">
            <span>ဝင်: +{drawerIn.toLocaleString()}</span>
            <span>•</span>
            <span>ထွက်: -{drawerOut.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Grand Net Business Profit */}
        <div className={`p-5 rounded-3xl text-white shadow-xl relative overflow-hidden ${
          netBusinessProfit >= 0
            ? 'bg-gradient-to-br from-emerald-600 to-teal-800 shadow-emerald-950/20'
            : 'bg-gradient-to-br from-rose-600 to-red-800 shadow-rose-950/20'
        }`}>
          <div className="flex items-center justify-between text-xs text-emerald-100 font-semibold mb-2">
            <span>အသားတင် စီးပွားရေးအမြတ် (Net Profit)</span>
            <TrendingUp className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            {netBusinessProfit.toLocaleString()} <span className="text-xs font-medium opacity-80">MMK</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-100/90 pt-2 border-t border-white/20">
            <span>Profit Margin: <strong>{profitMargin}%</strong></span>
            <span>ဝင်ငွေ: {totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: Invested Capital in Unsold Stock */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">
            <span>လက်ကျန်စတော့ အရင်းနှီးငွေ</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            {investedStockCapital.toLocaleString()} <span className="text-xs font-medium text-slate-400">MMK</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>ပစ္စည်း {unsoldProducts.length} မျိုး လက်ကျန်</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              ရောင်းရငွေ: {potentialStockRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Repairs Under Processing */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">
            <span>ဆိုင်တင် စက်ပြင်လုံးရေ & ခန့်မှန်းငွေ</span>
            <Wrench className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            {pendingRepairsEstIncome.toLocaleString()} <span className="text-xs font-medium text-slate-400">MMK</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>ပြင်ဆဲစက် {pendingRepairs.length} လုံး</span>
            <span className="text-rose-500 font-semibold">
              အပိုပစ္စည်းစရိတ်: {pendingRepairsCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Detailed Income & Expense Structure */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>အမြတ်အစွန်း တွက်ချက်မှု အသေးစိတ် (P&L Drilldown)</span>
          </h3>

          <div className="space-y-3">
            {/* Revenue Row */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  စုစုပေါင်း အရောင်း & ဝန်ဆောင်ခ ဝင်ငွေ (Total Revenue)
                </span>
                <span className="text-[11px] text-slate-500">
                  စက်ပြင်ဝင်ငွေ: {revService.toLocaleString()} + ပစ္စည်းအရောင်း: {revSales.toLocaleString()}
                </span>
              </div>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                +{totalRevenue.toLocaleString()}
              </span>
            </div>

            {/* COGS Row */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  ကုန်ကျစရိတ် အရင်း (Cost of Goods Sold - COGS)
                </span>
                <span className="text-[11px] text-slate-500">
                  စတော့ဝယ်ရင်း: {cogsStock.toLocaleString()} + ပြင်ဆင်မှုအပိုပစ္စည်း: {cogsRepair.toLocaleString()}
                </span>
              </div>
              <span className="text-sm font-black text-rose-500">
                -{totalCogs.toLocaleString()}
              </span>
            </div>

            {/* Gross Profit */}
            <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/40 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                အကြမ်းဖျင်းအမြတ် (Gross Profit)
              </span>
              <span className="text-sm font-black text-amber-900 dark:text-amber-200">
                {grossProfit.toLocaleString()} MMK
              </span>
            </div>

            {/* OPEX Row */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  ဆိုင်လည်ပတ်စရိတ် & အထွေထွေ (Operating Expenses)
                </span>
                <span className="text-[11px] text-slate-500">
                  ဆိုင်သုံး (Office): {opexOffice.toLocaleString()} + အိမ်ပို့ (Home): {opexHome.toLocaleString()}
                </span>
              </div>
              <span className="text-sm font-black text-rose-500">
                -{totalOpex.toLocaleString()}
              </span>
            </div>

            {/* Net Profit Summary */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                ကျန်ရှိသော အသားတင်အမြတ် (Real Net Profit)
              </span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {netBusinessProfit.toLocaleString()} MMK
              </span>
            </div>
          </div>
        </div>

        {/* Right: Personal Pocket vs Shop Isolation */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>ကိုယ်ပိုင်အိတ်ကပ် vs ဆိုင်ငွေ ခွဲထုတ်စိစစ်ချက်</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              `admin3.html` logic အတိုင်း ဆိုင်ငွေအံဆွဲနှင့် ပုဂ္ဂိုလ်ရေးသုံးငွေ (Personal) ကို ရောထွေးမှုမရှိစေဘဲ စာရင်းကိုင်သဘောတရားအတိုင်း သီးသန့် ကာကွယ်တွက်ချက်ထားပါသည်။
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ပုဂ္ဂိုလ်ရေး စုစုပေါင်း ဝင်ငွေ</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{personalIn.toLocaleString()} MMK</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ပုဂ္ဂိုလ်ရေး စုစုပေါင်း သုံးငွေ</span>
                <span className="font-bold text-rose-500">-{personalOut.toLocaleString()} MMK</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs">
                <span className="font-extrabold text-emerald-950 dark:text-emerald-200">ပုဂ္ဂိုလ်ရေး လက်ကျန်ငွေ</span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{personalNet.toLocaleString()} MMK</span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
            <Building className="w-4 h-4 shrink-0 text-slate-400" />
            <span>ဆိုင်မှ အပ်ငွေ (Handover) နှင့် ပိုင်ရှင်ထည့်ငွေ (Owner Fund) များသည် သက်ဆိုင်ရာ transferPair များဖြင့် balance အလိုအလျောက် ထိန်းညှိပြီး ဖြစ်ပါသည်။</span>
          </div>
        </div>

      </div>
    </div>
  );
}
