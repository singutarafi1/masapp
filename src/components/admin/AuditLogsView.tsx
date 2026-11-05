import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  User, 
  Clock, 
  ShieldAlert, 
  RefreshCw,
  Filter
} from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, limit } from '../../lib/firebase';
import { ActivityLogItem } from '../../types';

export function AuditLogsView() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    setIsLoading(true);
    // Fetch last 150 activity logs
    const q = query(collection(db, 'activity_logs'), limit(150));
    const unsub = onSnapshot(q, (snap) => {
      const list: ActivityLogItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ActivityLogItem);
      });

      // Sort by timestamp desc
      list.sort((a, b) => {
        const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
        const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
        return tb - ta;
      });

      setLogs(list);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Distinct users
  const users = Array.from(new Set(logs.map((l) => l.user).filter(Boolean)));

  const filteredLogs = logs.filter((log) => {
    if (userFilter !== 'all' && log.user !== userFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchUser = log.user?.toLowerCase().includes(q);
      if (!matchAction && !matchDetails && !matchUser) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in pb-20 px-3 sm:px-6 max-w-5xl mx-auto pt-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Activity & Audit Logs
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            စတော့အရောင်း၊ စက်ပြင် status ပြောင်းလဲမှု၊ ငွေစာရင်းဖျက်/ပြင်မှု မှတ်တမ်းများ
          </p>
        </div>

        {/* User Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">အသုံးပြုသူ အားလုံး ({users.length})</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="လုပ်ဆောင်ချက် (action) သို့မဟုတ် အသေးစိတ် (details) ဖြင့် ရှာဖွေပါ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Log Feed */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            လုပ်ဆောင်ချက် မှတ်တမ်း မရှိပါ
          </div>
        ) : (
          filteredLogs.map((log) => {
            let timeStr = '';
            if (log.timestamp?.toDate) {
              const d = log.timestamp.toDate();
              timeStr = d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } else if (log.timestamp) {
              timeStr = new Date(log.timestamp).toLocaleString();
            }

            return (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {log.action}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40">
                      <User className="w-2.5 h-2.5" />
                      {log.user || 'Unknown'}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 break-all font-mono">
                      {log.details}
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 self-start sm:self-auto">
                  <Clock className="w-3 h-3" />
                  <span>{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
