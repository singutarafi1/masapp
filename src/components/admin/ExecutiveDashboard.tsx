import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Package, 
  Wrench, 
  PieChart as PieChartIcon,
  Building,
  UserCheck,
  BarChart3,
  Award,
  AlertTriangle
} from 'lucide-react';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { TransactionItem, RepairItem, ProductItem } from '../../types';
import { parseAnyDate } from '../../lib/dateUtils';

export function ExecutiveDashboard() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [, setIsLoading] = useState(true);

  // Time filter dropdown
  const [timeFilter, setTimeFilter] = useState<'all' | 'this_month' | 'this_year'>('this_month');
  // Chart range toggle (7 days vs 14 days)
  const [chartDays, setChartDays] = useState<7 | 14>(7);
  const [selectedBarDate, setSelectedBarDate] = useState<string | null>(null);

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

  // Filter transactions according to timeFilter using parseAnyDate
  const now = new Date();
  const filteredTx = transactions.filter((tx) => {
    if (tx.voided) return false;
    if (timeFilter === 'all') return true;

    const d = parseAnyDate(tx.date || tx.exactDate);
    if (isNaN(d.getTime())) return true;

    if (timeFilter === 'this_month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'this_year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // 1. Drawer Cash on Hand (Pure Cash In vs Cash Out from shop operations)
  let drawerIn = 0;
  let drawerOut = 0;
  filteredTx.forEach((tx) => {
    if (tx.group === 'Personal') return;
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'ဝင်ငွေ') drawerIn += amt;
    else if (tx.type === 'ထွက်ငွေ') drawerOut += amt;
  });
  const drawerCashOnHand = drawerIn - drawerOut;

  // 2. Real Business P&L (100% matched with FinanceTab accounting logic)
  let revService = 0;
  let revSales = 0;
  let revOther = 0;
  let cogsStock = 0;
  let cogsRepair = 0;
  let opexOffice = 0;
  let opexHome = 0;
  let opexOther = 0;

  filteredTx.forEach((tx) => {
    if (tx.group === 'Personal') return;
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'ဝင်ငွေ') {
      if (tx.group === 'OwnerFund') return;
      if (tx.group === 'Service') revService += amt;
      else if (tx.group === 'Sales') revSales += amt;
      else revOther += amt;
    } else if (tx.type === 'ထွက်ငွေ') {
      if (tx.group === 'Handover') return;
      if (tx.group === 'StockPurchase') cogsStock += amt;
      else if (tx.group === 'Service') cogsRepair += amt;
      else if (tx.group === 'Office') opexOffice += amt;
      else if (tx.group === 'Home') opexHome += amt;
      else opexOther += amt;
    }
  });

  const totalRevenue = revService + revSales + revOther;
  const totalCogs = cogsStock + cogsRepair;
  const grossProfit = totalRevenue - totalCogs;
  const totalOpex = opexOffice + opexHome + opexOther;
  const netBusinessProfit = grossProfit - totalOpex;
  const profitMargin = totalRevenue > 0 ? ((netBusinessProfit / totalRevenue) * 100).toFixed(1) : '0';

  // 3. Invested Capital in Unsold Assets
  const unsoldProducts = products.filter(
    (p) => p.category !== 'ရောင်းပြီး' && (Number(p.amount) || 0) > 0
  );
  const investedStockCapital = unsoldProducts.reduce(
    (sum, p) => sum + (Number(p.costPrice) || 0) * (Number(p.amount) || 0),
    0
  );
  const potentialStockRevenue = unsoldProducts.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.amount) || 0),
    0
  );

  // Pending repairs in shop
  const pendingRepairs = repairs.filter(
    (r) => r.status === 'စစ်ဆေးပြုပြင်နေဆဲ' || r.status === 'ပြင်ပြီး-မရွေးသေး'
  );
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

  // 5. OPTION (ဂ) — 7-Day / 14-Day Daily Revenue vs Expense Trend Data
  const dailyTrend = useMemo(() => {
    const daysArr: {
      dateStr: string;
      label: string;
      rev: number;
      exp: number;
      net: number;
    }[] = [];

    const map: Record<string, { rev: number; exp: number }> = {};
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toLocaleDateString('en-CA');
      map[dStr] = { rev: 0, exp: 0 };
      daysArr.push({
        dateStr: dStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        rev: 0,
        exp: 0,
        net: 0,
      });
    }

    transactions.forEach((tx) => {
      if (tx.voided || tx.group === 'Personal') return;
      const d = parseAnyDate(tx.date || tx.exactDate);
      if (isNaN(d.getTime())) return;
      const dStr = d.toLocaleDateString('en-CA');
      if (!map[dStr]) return;

      const amt = Number(tx.amount) || 0;
      if (tx.type === 'ဝင်ငွေ' && tx.group !== 'OwnerFund') {
        map[dStr].rev += amt;
      } else if (tx.type === 'ထွက်ငွေ' && tx.group !== 'Handover') {
        map[dStr].exp += amt;
      }
    });

    daysArr.forEach((item) => {
      item.rev = map[item.dateStr]?.rev || 0;
      item.exp = map[item.dateStr]?.exp || 0;
      item.net = item.rev - item.exp;
    });

    const maxVal = Math.max(
      1,
      ...daysArr.map((d) => Math.max(d.rev, d.exp))
    );

    return { daysArr, maxVal };
  }, [transactions, chartDays]);

  const activeBarDay = useMemo(() => {
    if (selectedBarDate) {
      const found = dailyTrend.daysArr.find((d) => d.dateStr === selectedBarDate);
      if (found) return found;
    }
    return dailyTrend.daysArr[dailyTrend.daysArr.length - 1];
  }, [dailyTrend, selectedBarDate]);

  // 6. OPTION (ဂ) — Top 5 Best-Selling Items & Services Ranking
  const topEarners = useMemo(() => {
    const itemMap: Record<
      string,
      { name: string; group: string; totalAmt: number; count: number }
    > = {};

    filteredTx.forEach((tx) => {
      if (tx.voided || tx.group === 'Personal' || tx.type !== 'ဝင်ငွေ') return;
      if (tx.group !== 'Sales' && tx.group !== 'Service') return;

      const cleanName = tx.name
        .replace(/^ရောင်းရငွေ:\s*/i, '')
        .replace(/^လက်ကျန်ရငွေ:\s*/i, '')
        .replace(/^စရံငွေ:\s*/i, '')
        .replace(/\s*\(\d+\s*ခု\)\s*$/, '')
        .trim();

      const key = `${tx.group}__${cleanName}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          name: cleanName,
          group: tx.group || 'Sales',
          totalAmt: 0,
          count: 0,
        };
      }

      const qtyMatch = tx.name.match(/\((\d+)\s*ခု\)/);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : Number((tx as any).qty) || 1;

      itemMap[key].totalAmt += Number(tx.amount) || 0;
      itemMap[key].count += qty;
    });

    const sorted = Object.values(itemMap)
      .sort((a, b) => b.totalAmt - a.totalAmt)
      .slice(0, 5);

    const maxAmt = sorted.length > 0 ? sorted[0].totalAmt : 1;
    return sorted.map((s) => ({
      ...s,
      pct: Math.max(8, Math.round((s.totalAmt / maxAmt) * 100)),
    }));
  }, [filteredTx]);

  // 7. OPTION (ဂ) — Low Stock & Out-of-Stock Reorder Alerts (amount <= 3)
  const lowStockItems = useMemo(() => {
    return products
      .filter((p) => p.category !== 'ရောင်းပြီး' && (Number(p.amount) || 0) <= 3)
      .sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0))
      .slice(0, 8);
  }, [products]);

  return (
    <div className="space-y-5 animate-in fade-in pb-16 px-3.5 sm:px-6 max-w-7xl mx-auto pt-3">
      {/* Header with Title and Time Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Admin စီးပွားရေး စာရင်းချုပ် & သုံးသပ်ချက်
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ဆိုင်၏ စုစုပေါင်း ဝင်ငွေ၊ အသားတင်အမြတ်၊ စတော့အရင်းနှင့် ရောင်းအားအကောင်းဆုံး စာရင်းချုပ်
          </p>
        </div>

        {/* Time Filter Pill Dropdown */}
        <div className="flex items-center gap-1 self-stretch sm:self-auto scroll-touch-x no-scrollbar max-w-full bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setTimeFilter('this_month')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'this_month'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ဒီလ
          </button>
          <button
            onClick={() => setTimeFilter('this_year')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'this_year'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ဒီနှစ်
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            အားလုံး
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid (4 Essential Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Drawer Cash on Hand */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 dark:bg-slate-900 text-white border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-indigo-200 font-semibold mb-1.5">
            <span>ငွေအံဆွဲ လက်ကျန်ငွေ (Cash on Hand)</span>
            <Wallet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums mb-2">
            {drawerCashOnHand.toLocaleString()} <span className="text-xs font-medium text-indigo-300">Ks</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-300 pt-2 border-t border-slate-800 tabular-nums">
            <span className="text-emerald-400">ဝင်: +{drawerIn.toLocaleString()}</span>
            <span>•</span>
            <span className="text-rose-400">ထွက်: -{drawerOut.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Grand Net Business Profit */}
        <div
          className={`p-4 sm:p-5 rounded-2xl text-white shadow-md relative overflow-hidden ${
            netBusinessProfit >= 0
              ? 'bg-emerald-700 dark:bg-emerald-800'
              : 'bg-rose-700 dark:bg-rose-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-100 font-semibold mb-1.5">
            <span>အသားတင် စီးပွားရေးအမြတ် (Net Profit)</span>
            <TrendingUp className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums mb-2">
            {netBusinessProfit.toLocaleString()} <span className="text-xs font-medium opacity-80">Ks</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-100/90 pt-2 border-t border-white/20 tabular-nums">
            <span>Margin: <strong>{profitMargin}%</strong></span>
            <span>ဝင်ငွေ: {totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: Invested Capital in Unsold Stock */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
            <span>လက်ကျန်စတော့ အရင်းနှီးငွေ</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums mb-2">
            {investedStockCapital.toLocaleString()} <span className="text-xs font-medium text-slate-400">Ks</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 tabular-nums">
            <span>ပစ္စည်း {unsoldProducts.length} မျိုး လက်ကျန်</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              ရောင်းတန်ဖိုး: {potentialStockRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Repairs Under Processing */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
            <span>ဆိုင်တင် စက်ပြင်လုံးရေ & ခန့်မှန်းငွေ</span>
            <Wrench className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums mb-2">
            {pendingRepairsEstIncome.toLocaleString()} <span className="text-xs font-medium text-slate-400">Ks</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 tabular-nums">
            <span>ပြင်ဆဲစက် {pendingRepairs.length} လုံး</span>
            <span className="text-rose-500 font-bold">
              အပိုပစ္စည်းရင်း: {pendingRepairsCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* OPTION (ဂ) — VISUAL ANALYTICS SECTION: 7/14-DAY INTERACTIVE BAR CHART */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              နေ့စဉ် ဝင်ငွေ / ထွက်ငွေ နှိုင်းယှဉ်ချက် (Interactive Chart)
            </h3>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setChartDays(7)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartDays === 7
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              ၇ ရက်
            </button>
            <button
              onClick={() => setChartDays(14)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartDays === 14
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              ၁၄ ရက်
            </button>
          </div>
        </div>

        {/* Selected Day Summary Banner (Touch-friendly inspection) */}
        {activeBarDay && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2 flex-wrap text-xs tabular-nums">
            <span className="font-black text-slate-800 dark:text-slate-200">
              📅 {activeBarDay.dateStr}
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ဝင်: +{activeBarDay.rev.toLocaleString()} Ks
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                ထွက်: -{activeBarDay.exp.toLocaleString()} Ks
              </span>
              <span
                className={`font-black px-2 py-0.5 rounded-md ${
                  activeBarDay.net >= 0
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                }`}
              >
                အသားတင်: {activeBarDay.net >= 0 ? '+' : ''}
                {activeBarDay.net.toLocaleString()} Ks
              </span>
            </div>
          </div>
        )}

        {/* Interactive Dual-Bar Chart */}
        <div className="pt-2">
          <div className="h-40 flex items-end gap-1.5 sm:gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            {dailyTrend.daysArr.map((d) => {
              const revHeightPct = Math.round((d.rev / dailyTrend.maxVal) * 100);
              const expHeightPct = Math.round((d.exp / dailyTrend.maxVal) * 100);
              const isSelected = activeBarDay?.dateStr === d.dateStr;

              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedBarDate(d.dateStr)}
                  className={`flex-1 h-full flex flex-col justify-end items-center gap-1 rounded-xl p-1 transition-all ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 ring-1 ring-indigo-500/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-full flex-1 flex items-end justify-center gap-0.5 sm:gap-1">
                    {/* Revenue Bar */}
                    <div
                      style={{ height: `${d.rev > 0 ? Math.max(revHeightPct, 6) : 2}%` }}
                      className={`w-2.5 sm:w-3.5 rounded-t-md transition-all ${
                        d.rev > 0
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${d.exp > 0 ? Math.max(expHeightPct, 6) : 2}%` }}
                      className={`w-2.5 sm:w-3.5 rounded-t-md transition-all ${
                        d.exp > 0
                          ? 'bg-rose-500 dark:bg-rose-400'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                ဝင်ငွေ
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                ထွက်ငွေ
              </span>
            </div>
            <span>တိုင်လေးများကို နှိပ်၍ ရက်အလိုက် အသေးစိတ်ကြည့်နိုင်သည်</span>
          </div>
        </div>
      </div>

      {/* OPTION (ဂ) — TOP 5 BEST-SELLERS & LOW STOCK REORDER ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Top 5 Best-Selling Products & Repair Services */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>ရောင်းအားအကောင်းဆုံး ထိပ်တန်း (၅) မျိုး</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              {timeFilter === 'this_month' ? 'ဒီလအတွင်း' : timeFilter === 'this_year' ? 'ဒီနှစ်အတွင်း' : 'အားလုံး'}
            </span>
          </div>

          {topEarners.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              ဤကာလအတွင်း အရောင်းနှင့် စက်ပြင်မှတ်တမ်း မရှိသေးပါ
            </div>
          ) : (
            <div className="space-y-3">
              {topEarners.map((item, idx) => (
                <div key={`${item.group}_${item.name}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[11px] flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.group === 'Service'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}
                      >
                        {item.group === 'Service' ? 'Service' : `${item.count} ခု`}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums shrink-0">
                      {item.totalAmt.toLocaleString()} Ks
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${item.pct}%` }}
                      className={`h-full rounded-full ${
                        item.group === 'Service' ? 'bg-blue-500' : 'bg-indigo-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Low Stock & Out-of-Stock Reorder Alert Panel */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>ပစ္စည်းပြတ် / လက်ကျန်နည်း သတိပေးချက် (≤ ၃ ခု)</span>
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold tabular-nums">
              {lowStockItems.length} မျိုး
            </span>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="text-center py-10 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              ပစ္စည်းအားလုံး လက်ကျန်လုံလောက်ပါသည် (၃ ခုအထက် ရှိပါသည်)
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {lowStockItems.map((p) => {
                const isZero = (Number(p.amount) || 0) === 0;
                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {p.category} · အရင်း: {Number(p.costPrice || 0).toLocaleString()} Ks
                      </span>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black tabular-nums ${
                        isZero
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      }`}
                    >
                      {isZero ? 'ပြတ်နေသည် (0)' : `လက်ကျန် ${p.amount} ခု`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left: Detailed Income & Expense Structure */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>အမြတ်အစွန်း တွက်ချက်မှု အသေးစိတ် (P&L Drilldown)</span>
          </h3>

          <div className="space-y-2.5">
            {/* Revenue Row */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  စုစုပေါင်း အရောင်း & ဝန်ဆောင်ခ ဝင်ငွေ
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  စက်ပြင်: {revService.toLocaleString()} + အရောင်း: {revSales.toLocaleString()}
                </span>
              </div>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                +{totalRevenue.toLocaleString()}
              </span>
            </div>

            {/* COGS Row */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  ကုန်ကျစရိတ် အရင်း (COGS)
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  စတော့ဝယ်ရင်း: {cogsStock.toLocaleString()} + စက်ပြင်ပစ္စည်း: {cogsRepair.toLocaleString()}
                </span>
              </div>
              <span className="text-sm font-black text-rose-500 tabular-nums shrink-0">
                -{totalCogs.toLocaleString()}
              </span>
            </div>

            {/* Gross Profit */}
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/40 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                အကြမ်းဖျင်းအမြတ် (Gross Profit)
              </span>
              <span className="text-sm font-black text-amber-900 dark:text-amber-200 tabular-nums">
                {grossProfit.toLocaleString()} Ks
              </span>
            </div>

            {/* OPEX Row */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  ဆိုင်လည်ပတ်စရိတ် & အထွေထွေ (OPEX)
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  ဆိုင်သုံး: {opexOffice.toLocaleString()} + အိမ်ပို့: {opexHome.toLocaleString()}
                </span>
              </div>
              <span className="text-sm font-black text-rose-500 tabular-nums shrink-0">
                -{totalOpex.toLocaleString()}
              </span>
            </div>

            {/* Net Profit Summary */}
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                ကျန်ရှိသော အသားတင်အမြတ် (Real Net Profit)
              </span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                {netBusinessProfit.toLocaleString()} Ks
              </span>
            </div>
          </div>
        </div>

        {/* Right: Personal Pocket vs Shop Isolation */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-2.5">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>ကိုယ်ပိုင်အိတ်ကပ် vs ဆိုင်ငွေ ခွဲထုတ်စိစစ်ချက်</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              ဆိုင်ငွေအံဆွဲနှင့် ပုဂ္ဂိုလ်ရေးသုံးငွေ (Personal) ကို ရောထွေးမှုမရှိစေဘဲ စာရင်းကိုင်သဘောတရားအတိုင်း သီးသန့် ခွဲခြားတွက်ချက်ထားပါသည်။
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ပုဂ္ဂိုလ်ရေး စုစုပေါင်း ဝင်ငွေ</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{personalIn.toLocaleString()} Ks</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">ပုဂ္ဂိုလ်ရေး စုစုပေါင်း သုံးငွေ</span>
                <span className="font-bold text-rose-500 tabular-nums">-{personalOut.toLocaleString()} Ks</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs">
                <span className="font-extrabold text-emerald-950 dark:text-emerald-200">ပုဂ္ဂိုလ်ရေး လက်ကျန်ငွေ</span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{personalNet.toLocaleString()} Ks</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
            <Building className="w-4 h-4 shrink-0 text-slate-400" />
            <span>ဆိုင်မှ အပ်ငွေ (Handover) နှင့် ပိုင်ရှင်ထည့်ငွေ (Owner Fund) များသည် transferPair များဖြင့် အလိုအလျောက် ချိတ်ဆက်ထိန်းညှိထားပါသည်။</span>
          </div>
        </div>

      </div>
    </div>
  );
}

