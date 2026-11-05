import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { db, collection, getDocs, query, orderBy, limit } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getLocalDateString } from '../../lib/dateUtils';
import {
  sellProductItem,
  saveRepairData,
  addDebtPayment,
  voidRepairRecord,
  voidDebtRecord,
} from '../../lib/dataService';
import { addDoc, serverTimestamp } from '../../lib/firebase';

interface Message {
  role: 'user' | 'system';
  text: string;
}

export function AiModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      text: 'မင်္ဂလာပါ၊ စာရင်းသွင်းရန် သို့မဟုတ် သိလိုသည်များကို အသံဖြင့်ပြောပါ သို့မဟုတ် စာရိုက်ပါ။',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice speech setup
  const toggleSpeech = () => {
    if (typeof window !== 'undefined' && window.AndroidApp?.startVoice) {
      window.AndroidApp.startVoice();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Browser မှ အသံစနစ် မပံ့ပိုးပါ', 'warning');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'my-MM';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      setIsListening(false);
      const text = event.results[0][0].transcript;
      if (text) {
        handleSendMessage(text);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Build live context for Gemini
  const buildShopContext = async () => {
    const today = getLocalDateString();
    const month = today.slice(0, 7);

    const [pSnap, rSnap, tSnap, dSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(query(collection(db, 'repairs'), orderBy('timestamp', 'desc'), limit(150))),
      getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(250))),
      getDocs(collection(db, 'debts')),
    ]);

    const prods = pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    const stock = prods.filter((p) => p.status !== 'ရောင်းပြီး');
    const txs = tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    const debts = dSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any)).filter((d) => d.status !== 'void');

    let todayIn = 0, todayOut = 0;
    txs.forEach((t) => {
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date || 0);
      const ds = d.toLocaleDateString('en-CA');
      if (ds === today) {
        if (t.type === 'ဝင်ငွေ') todayIn += Number(t.amount || 0);
        else todayOut += Number(t.amount || 0);
      }
    });

    const openDebts = debts.filter((d) => d.status === 'ကျန်ရှိ');
    const openDebtTotal = openDebts.reduce((sum, d) => sum + (Number(d.total) - Number(d.paid)), 0);

    return `TODAY=${today} | USER=${profile?.name || 'Staff'} | ROLE=${profile?.role || 'staff'}
STATS: todayIncome=${todayIn}, todayExpense=${todayOut}, openDebtTotal=${openDebtTotal}
STOCK LIST: ${stock.slice(0, 50).map((p) => `${p.name} (လက်ကျန် ${p.amount} ခု, ဈေး ${p.price})`).join(' | ')}
RECENT REPAIRS: ${rSnap.docs.slice(0, 20).map((d) => `VR:${d.data().vrno} ${d.data().name} (${d.data().model} - ${d.data().status})`).join(' | ')}`;
  };

  const handleSendMessage = async (rawText?: string) => {
    const text = (rawText || inputText).trim();
    if (!text || isProcessing) return;

    setInputText('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setIsProcessing(true);

    try {
      const context = await buildShopContext();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${
          import.meta.env.VITE_GEMINI_API_KEY || ''
        }`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: `You are the built-in AI Assistant of Mobile ANSWER (Myanmar phone shop & repair).
Reply ONLY with JSON: {"action":"answer|finance|sell|new_repair","message":"short burmese reply","amount":0,"name":""}
Current live data:
${context}`,
                },
              ],
            },
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      const resData = await response.json();
      if (resData.candidates && resData.candidates.length > 0) {
        const textContent = resData.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textContent);

        if (parsed.action === 'finance' && parsed.amount) {
          await addDoc(collection(db, 'transactions'), {
            type: 'ဝင်ငွေ',
            group: 'Service',
            name: parsed.name || 'AI သွင်းငွေ',
            amount: Number(parsed.amount),
            date: new Date(),
            exactDate: serverTimestamp(),
            history: [{ msg: 'AI မှ စာရင်းသွင်းသည်', by: profile?.name || 'Staff', time: new Date().toISOString() }],
          });
          setMessages((prev) => [
            ...prev,
            { role: 'system', text: `✅ ${parsed.message || `${parsed.amount} Ks ဝင်ငွေစာရင်း သွင်းပြီးပါပြီ`}` },
          ]);
        } else {
          setMessages((prev) => [...prev, { role: 'system', text: parsed.message || 'နားလည်ပါပြီ' }]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'system', text: 'အချက်အလက်ကို ပြန်လည်မရရှိနိုင်ပါ။ နောက်တစ်ကြိမ် ကြိုးစားကြည့်ပါ။' },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          text: `အဆင်မပြေပါ: ${err.message || 'API ချိတ်ဆက်မှု စစ်ဆေးပါ'}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[80vh] sm:h-[650px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                AI Smart Assistant
              </h3>
              <p className="text-[10px] text-slate-400">Mobile ANSWER Voice & Text Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200/50 dark:border-slate-700/50'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>တွက်ချက်နေပါသည်...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input & Voice Controls */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 pb-safe">
          <button
            onClick={toggleSpeech}
            className={`p-2.5 rounded-xl border transition-all ${
              isListening
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700'
            }`}
            title="အသံဖြင့်ပြောရန်"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="စာရိုက်ပါ သို့မဟုတ် မေးခွန်းမေးပါ..."
            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-40 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
