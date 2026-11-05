import React, { useState } from 'react';
import { 
  Palette, 
  Type, 
  Globe, 
  Store, 
  Boxes, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  FolderPlus
} from 'lucide-react';
import { 
  useSettings, 
  ThemeColor, 
  FontSize, 
  Language, 
  THEME_COLOR_CONFIG 
} from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { CategorySettingsView } from './CategorySettingsView';

export function SettingsView() {
  const {
    language,
    setLanguage,
    themeColor,
    setThemeColor,
    fontSize,
    setFontSize,
    shopTitle,
    setShopTitle,
    productCategories,
    addProductCategory,
    removeProductCategory,
    t,
    themeConfig,
  } = useSettings();

  const { showToast } = useToast();

  const [titleInput, setTitleInput] = useState(shopTitle);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [activeSettingsSection, setActiveSettingsSection] = useState<'general' | 'product_groups' | 'finance_categories'>('general');

  const handleSaveTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    setShopTitle(titleInput.trim());
    showToast(t('ဆိုင်အမည် ခေါင်းစဉ် သိမ်းဆည်းပြီးပါပြီ', 'Shop title updated successfully'));
  };

  const handleAddProductCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryInput.trim();
    if (!clean) return;
    if (productCategories.includes(clean)) {
      showToast(t('ဤအုပ်စု ရှိပြီးသားဖြစ်ပါသည်', 'Category already exists'), 'warning');
      return;
    }
    await addProductCategory(clean);
    setNewCategoryInput('');
    showToast(t(`ပစ္စည်းအုပ်စု "${clean}" ထည့်သွင်းပြီးပါပြီ`, `Added category "${clean}"`));
  };

  const handleRemoveProductCategory = async (cat: string) => {
    if (cat === 'အားလုံး' || cat === 'ရောင်းပြီး') {
      showToast(t('ဤမူလအမျိုးအစားကို ဖျက်၍မရပါ', 'Cannot delete default category'), 'warning');
      return;
    }
    await removeProductCategory(cat);
    showToast(t(`ပစ္စည်းအုပ်စု "${cat}" ကို ပယ်ဖျက်ပြီးပါပြီ`, `Removed category "${cat}"`));
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-32 px-3 sm:px-6 max-w-4xl mx-auto pt-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl ${themeConfig.badgeBg} ${themeConfig.primaryText} flex items-center justify-center font-bold`}>
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {t('စနစ် အပြင်အဆင်နှင့် စိတ်ကြိုက်ပြောင်းလဲမှု', 'System Preferences & Settings')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t(
              'Theme အရောင်၊ စာလုံးအရွယ်အစား၊ ဘာသာစကား၊ ဆိုင်ခေါင်းစဉ်နှင့် ပစ္စည်းအုပ်စုများကို စိတ်ကြိုက်ပြင်ဆင်နိုင်ပါသည်',
              'Customize theme color, typography, language, title, and product groups'
            )}
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto scroll-touch-x no-scrollbar p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setActiveSettingsSection('general')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSettingsSection === 'general'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t('အထွေထွေ အပြင်အဆင်', 'General')}
          </button>
          <button
            onClick={() => setActiveSettingsSection('product_groups')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSettingsSection === 'product_groups'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t('ပစ္စည်း အုပ်စုများ', 'Stock Groups')}
          </button>
          <button
            onClick={() => setActiveSettingsSection('finance_categories')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSettingsSection === 'finance_categories'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t('ငွေစာရင်း အမျိုးအစား', 'Finance Sub-cats')}
          </button>
        </div>
      </div>

      {activeSettingsSection === 'general' && (
        <div className="space-y-5">
          {/* 1. App Title / Shop Header */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Store className="w-4 h-4 text-indigo-500" />
              <span>{t('ဆိုင်အမည် နှင့် စာရင်းခေါင်းစဉ် (App Title)', 'Shop & App Title')}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('Navbar နှင့် Header များတွင် ပြသလိုသည့် ဆိုင်အမည် သို့မဟုတ် စာရင်းခေါင်းစဉ် ရိုက်ထည့်ပါ', 'The title displayed on navbar and vouchers')}
            </p>
            <form onSubmit={handleSaveTitle} className="flex gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Mobile ANSWER Pro"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className={`px-4 py-2.5 rounded-xl ${themeConfig.primaryBg} ${themeConfig.primaryHover} text-white font-bold text-xs shadow-sm active:scale-95 transition-all`}
              >
                {t('သိမ်းမည်', 'Save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleInput('Mobile ANSWER Pro');
                  setShopTitle('Mobile ANSWER Pro');
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold"
                title={t('မူလအတိုင်း ပြန်ထားမည်', 'Reset to Default')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* 2. Language Switcher */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Globe className="w-4 h-4 text-emerald-500" />
              <span>{t('ဘာသာစကား ရွေးချယ်မှု (Language)', 'Language Preference')}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('စနစ် တစ်ခုလုံးတွင် အသုံးပြုမည့် ဘာသာစကားကို ရွေးချယ်ပါ', 'Select interface language for the application')}
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                onClick={() => setLanguage('my')}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  language === 'my'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🇲🇲</span>
                  <div className="text-left">
                    <span className="text-xs font-bold block leading-none">မြန်မာစာ</span>
                    <span className="text-[10px] text-slate-400">Myanmar</span>
                  </div>
                </div>
                {language === 'my' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              </button>

              <button
                onClick={() => setLanguage('en')}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  language === 'en'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🇬🇧</span>
                  <div className="text-left">
                    <span className="text-xs font-bold block leading-none">English</span>
                    <span className="text-[10px] text-slate-400">International</span>
                  </div>
                </div>
                {language === 'en' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              </button>
            </div>
          </div>

          {/* 3. Theme Color Accent */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Palette className="w-4 h-4 text-purple-500" />
              <span>{t('Theme အရောင် အပြင်အဆင် (Theme Color Accent)', 'Theme Color Palette')}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('မိမိစိတ်ကြိုက် အသွင်အပြင် အရောင်ကို ရွေးချယ်ပါ', 'Pick a signature accent color for buttons, badges and highlights')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(Object.keys(THEME_COLOR_CONFIG) as ThemeColor[]).map((key) => {
                const cfg = THEME_COLOR_CONFIG[key];
                const isSelected = themeColor === key;
                return (
                  <button
                    key={key}
                    onClick={() => setThemeColor(key)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 font-bold shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full shadow-xs shrink-0 flex items-center justify-center text-white"
                      style={{ backgroundColor: cfg.hex }}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className="text-xs font-bold truncate">{cfg.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Font Size Scale */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Type className="w-4 h-4 text-blue-500" />
              <span>{t('စာလုံးအရွယ်အစား (Font Size Scale)', 'Font Scale')}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('ဖုန်းမျက်နှာပြင်တွင် စာဖတ်ရ လွယ်ကူစေရန် စာလုံးအရွယ်အစားကို ချိန်ညှိပါ', 'Adjust text scaling for comfortable reading on small screens')}
            </p>
            <div className="grid grid-cols-3 gap-2.5 max-w-md">
              {[
                { id: 'sm' as FontSize, label: t('အသေး (Compact)', 'Small'), sub: '14px' },
                { id: 'base' as FontSize, label: t('ပုံမှန် (Normal)', 'Normal'), sub: '15px' },
                { id: 'lg' as FontSize, label: t('အကြီး (Large)', 'Large'), sub: '16.5px' },
              ].map((opt) => {
                const isSelected = fontSize === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFontSize(opt.id)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-black shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold block">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Product Groups Management */}
      {activeSettingsSection === 'product_groups' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {t('စတော့ ပစ္စည်းအုပ်စုများ စီမံခန့်ခွဲမှု', 'Stock Item Groups Management')}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t(
                  'စတော့စာရင်းတွင် ပစ္စည်းများကို Group ဖွဲ့စည်း၍ ရှာဖွေနိုင်ပြီး ပစ္စည်းအသစ်ထည့်ရာတွင် အသုံးပြုနိုင်ပါသည်',
                  'Categories used for grouping items in inventory and POS entry'
                )}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {productCategories.length} {t('ခု', 'items')}
            </span>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddProductCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              placeholder={t('အုပ်စုအသစ် ရိုက်ထည့်ပါ (ဥပမာ - Touch/LCD, Speaker, ကာဗာ)...', 'Add new category (e.g., Battery, Charging Port)...')}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className={`px-4 py-2.5 rounded-xl ${themeConfig.primaryBg} ${themeConfig.primaryHover} text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all`}
            >
              <Plus className="w-4 h-4" />
              <span>{t('အုပ်စုထည့်မည်', 'Add Group')}</span>
            </button>
          </form>

          {/* Current Category Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {productCategories.map((cat) => {
              const isDefaultProtected = cat === 'အားလုံး' || cat === 'ရောင်းပြီး';
              return (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    isDefaultProtected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/60 dark:border-slate-700/60'
                      : 'bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white border-indigo-200 dark:border-indigo-900/60 shadow-2xs'
                  }`}
                >
                  <span>{cat}</span>
                  {!isDefaultProtected && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProductCategory(cat)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors"
                      title={t('ဖျက်မည်', 'Delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Finance Sub-categories */}
      {activeSettingsSection === 'finance_categories' && (
        <div className="bg-white dark:bg-slate-900 p-2 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <CategorySettingsView />
        </div>
      )}
    </div>
  );
}
