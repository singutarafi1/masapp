import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, doc, getDoc, setDoc } from '../lib/firebase';

export type Language = 'my' | 'en';
export type ThemeColor = 'indigo' | 'violet' | 'emerald' | 'blue' | 'rose' | 'amber';
export type FontSize = 'sm' | 'base' | 'lg';

export const DEFAULT_PRODUCT_CATEGORIES = [
  'အားလုံး',
  'အထွေထွေ',
  'Hardwareအပိုပစ္စည်း',
  'accessories',
  'Touch / LCD',
  'Battery',
  'Charging Ribbon',
  'Back Cover',
  'ရောင်းပြီး',
];

export const THEME_COLOR_CONFIG: Record<
  ThemeColor,
  {
    name: string;
    primaryBg: string;
    primaryHover: string;
    primaryText: string;
    gradient: string;
    badgeBg: string;
    badgeText: string;
    ring: string;
    hex: string;
  }
> = {
  indigo: {
    name: 'Classic Indigo',
    primaryBg: 'bg-indigo-600',
    primaryHover: 'hover:bg-indigo-500',
    primaryText: 'text-indigo-600 dark:text-indigo-400',
    gradient: 'from-indigo-600 to-violet-600',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    ring: 'focus:ring-indigo-500',
    hex: '#4f46e5',
  },
  violet: {
    name: 'Royal Violet',
    primaryBg: 'bg-purple-600',
    primaryHover: 'hover:bg-purple-500',
    primaryText: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-600 to-fuchsia-600',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
    ring: 'focus:ring-purple-500',
    hex: '#9333ea',
  },
  emerald: {
    name: 'Fresh Emerald',
    primaryBg: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-500',
    primaryText: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-600 to-teal-600',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    ring: 'focus:ring-emerald-500',
    hex: '#059669',
  },
  blue: {
    name: 'Ocean Blue',
    primaryBg: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-500',
    primaryText: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-600 to-cyan-600',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    ring: 'focus:ring-blue-500',
    hex: '#2563eb',
  },
  rose: {
    name: 'Ruby Rose',
    primaryBg: 'bg-rose-600',
    primaryHover: 'hover:bg-rose-500',
    primaryText: 'text-rose-600 dark:text-rose-400',
    gradient: 'from-rose-600 to-pink-600',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    ring: 'focus:ring-rose-500',
    hex: '#e11d48',
  },
  amber: {
    name: 'Gold Amber',
    primaryBg: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-500',
    primaryText: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-600 to-orange-600',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    ring: 'focus:ring-amber-500',
    hex: '#d97706',
  },
};

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  shopTitle: string;
  setShopTitle: (title: string) => void;
  productCategories: string[];
  addProductCategory: (cat: string) => Promise<void>;
  removeProductCategory: (cat: string) => Promise<void>;
  t: (myText: string, enText: string) => string;
  themeConfig: typeof THEME_COLOR_CONFIG[ThemeColor];
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'my';
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem('app_theme_color') as ThemeColor) || 'indigo';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem('app_font_size') as FontSize) || 'base';
  });

  const [shopTitle, setShopTitleState] = useState<string>(() => {
    return localStorage.getItem('app_shop_title') || 'Mobile ANSWER Pro';
  });

  const [productCategories, setProductCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('app_product_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_PRODUCT_CATEGORIES;
  });

  // Sync font size class with HTML tag
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-sm', 'font-base', 'font-lg');
    root.classList.add(`font-${fontSize}`);
    localStorage.setItem('app_font_size', fontSize);
  }, [fontSize]);

  // Sync language with HTML lang
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('app_language', language);
  }, [language]);

  // Sync theme color
  useEffect(() => {
    localStorage.setItem('app_theme_color', themeColor);
  }, [themeColor]);

  // Sync shop title
  useEffect(() => {
    localStorage.setItem('app_shop_title', shopTitle);
  }, [shopTitle]);

  // Fetch product categories from Firestore settings collection
  useEffect(() => {
    async function loadRemoteCategories() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'product_categories'));
        if (snap.exists() && Array.isArray(snap.data().list)) {
          const list = snap.data().list;
          if (list.length > 0) {
            setProductCategories(list);
            localStorage.setItem('app_product_categories', JSON.stringify(list));
          }
        }
      } catch (err) {
        console.warn('Using local product categories fallback:', err);
      }
    }
    loadRemoteCategories();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  const setShopTitle = (title: string) => {
    const trimmed = title.trim() || 'Mobile ANSWER Pro';
    setShopTitleState(trimmed);
  };

  const addProductCategory = async (cat: string) => {
    const clean = cat.trim();
    if (!clean || productCategories.includes(clean)) return;
    const updated = [...productCategories, clean];
    setProductCategories(updated);
    localStorage.setItem('app_product_categories', JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'settings', 'product_categories'), { list: updated }, { merge: true });
    } catch (e) {
      console.warn('Could not sync remote product categories:', e);
    }
  };

  const removeProductCategory = async (cat: string) => {
    if (cat === 'အားလုံး' || cat === 'ရောင်းပြီး') return; // protect critical states
    const updated = productCategories.filter((c) => c !== cat);
    setProductCategories(updated);
    localStorage.setItem('app_product_categories', JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'settings', 'product_categories'), { list: updated }, { merge: true });
    } catch (e) {
      console.warn('Could not sync remote product categories:', e);
    }
  };

  // Translation helper
  const t = (myText: string, enText: string) => {
    return language === 'en' ? enText : myText;
  };

  const themeConfig = THEME_COLOR_CONFIG[themeColor] || THEME_COLOR_CONFIG.indigo;

  return (
    <SettingsContext.Provider
      value={{
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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
