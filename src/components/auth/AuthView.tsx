import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function AuthView() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast('အီးမေးလ်နှင့် စကားဝှက် ဖြည့်ပါ', 'warning');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      showToast('စနစ်အတွင်းသို့ ဝင်ရောက်ပြီးပါပြီ');
    } catch (err: any) {
      let msg = 'အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်';
      if (err.code === 'auth/network-request-failed') {
        msg = 'အင်တာနက် လိုင်းမမိပါ သို့မဟုတ် VPN လိုအပ်နေပါသည်';
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-sm">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-500/25 mb-4">
            A
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Mobile <span className="text-indigo-600 dark:text-indigo-400">ANSWER</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Phone Service & Accounting System
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="mb-5 text-center">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              စနစ်သို့ ဝင်ရောက်ရန်
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              အကောင့်အချက်အလက်များကို ရိုက်ထည့်ပါ
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                အီးမေးလ် (Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                စကားဝှက် (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Role-based Security (Admin & Staff)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
