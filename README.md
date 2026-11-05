# Mobile ANSWER Pro / Answer Admin Pro

> **မိုဘိုင်းဖုန်း အရောင်း/စက်ပြင် ကောင်တာ၊ စတော့၊ အကြွေးနှင့် လုပ်ငန်းသုံး/ကိုယ်ပိုင် ငွေစာရင်း စီမံခန့်ခွဲသည့် စနစ်**  
> Complete Mobile Shop POS, Repair Ticket Management, Inventory, Financial Accounting & Private Vault Management System.

---

## 📁 ဖိုင်နှင့် ဒိုင်ရိုက်ထရီ လမ်းညွှန်ချက်များ (Directory & File Structure)

### 1. ⚙️ Core Setup & Configuration (အခြေခံ စနစ်ဖိုင်များ)
* **`package.json`**: Node.js dependencies (React 19, Vite, Firebase, Lucide Icons, Tailwind CSS v4) နှင့် build/dev scripts များ။
* **`vite.config.ts`**: Vite build bundler configuration နှင့် dev server port 3000 သတ်မှတ်ချက်များ။
* **`tsconfig.json`**: TypeScript compiler အမျိုးအစားနှင့် path alias သတ်မှတ်ချက်များ။
* **`index.html`**: App ၏ HTML Entry Point နှင့် Mobile Viewport Meta Tags များ။
* **`metadata.json`**: AI Studio Applet ၏ Name, Description နှင့် Capabilities သတ်မှတ်ချက်များ။

---

### 2. 🚀 Source Root (`/src`)
* **`src/main.tsx`**: React Application ကို DOM ထဲသို့ စတင် Mount လုပ်ပေးသည့် ဖိုင်ဖြစ်ပြီး `AuthContext`၊ `SettingsContext`၊ `ToastContext` Provider များကို မတည်ပေးပါသည်။
* **`src/App.tsx`**: Main Root Component ဖြစ်ပြီး Navigation Tab တိုင်း၏ State၊ Drawer မီနူး၊ Modal များ၊ Role Permissions နှင့် Routing များကို စီမံခန့်ခွဲပေးပါသည်။
* **`src/index.css`**: Tailwind CSS v4 styling၊ Custom Scrollbar နှင့် Dark/Light Mode Color Palette Setup ဖိုင်။

---

### 3. 📦 Data Types & Data Services (`/src/types` & `/src/lib`)
* **`src/types/index.ts`**:
  - `ProductItem`: စတော့ပစ္စည်း စာရင်း 구조 (အမည်၊ အရေအတွက်၊ ဝယ်ရင်း၊ ရောင်းဈေး၊ Status)
  - `RepairItem`: စက်ပြင် ဖုန်းမှတ်တမ်း 구조 (VR နံပါတ်၊ ဖုန်းမော်ဒယ်၊ ပြစ်ချက်၊ အရင်း၊ ရငွေ၊ အခြေအနေ)
  - `TransactionItem`: ငွေစာရင်း မှတ်တမ်း 구조 (ဝင်ငွေ/ထွက်ငွေ၊ အမျိုးအစား၊ ပမာဏ၊ ရက်စွဲ၊ History Log)
  - `DebtItem`: အကြွေးစာရင်း 구조 (ဝယ်သူအမည်၊ ဖုန်း၊ ကျန်ငွေ၊ ပေးပြီး၊ Payments Array)
  - `UserProfile`: အကောင့်အချက်အလက် (Admin / Staff Role၊ အမည်၊ အီးမေးလ်)

* **`src/lib/firebase.ts`**: Firebase SDK (Authentication & Firestore Database) Initialization နှင့် Real-time Collection Reference များ။
* **`src/lib/dataService.ts`**:
  - **Core Business Logic ဖိုင်ဖြစ်ပါသည်**
  - `addOrUpdateStockProduct()`: စတော့အသစ်သွင်းခြင်း/တိုးခြင်း (ဆိုင်ငွေထဲမှ Auto ငွေနှုတ်သည့် Toggle ပါဝင်သည်)
  - `sellProductItem()`: စတော့ ရောင်းချခြင်း/အကြွေးရောင်းခြင်း
  - `saveRepairData()`: စက်ပြင်မှတ်တမ်း သွင်းခြင်း/ပြင်ခြင်း/ထုတ်ယူခြင်း
  - `createTransferPair()`: ဆိုင်ငွေနှင့် ကိုယ်ပိုင်ငွေအကြား လွှဲပြောင်းခြင်း (`Handover` / `OwnerFund`)
  - `adminMasterEditTransaction()` / `adminMasterDeleteTransaction()`: Admin Master ဖြင့် ငွေစာရင်းများ ပြင်ဆင်/ဖျက်သိမ်း၍ နှစ်ဖက် စာရင်း ချိန်ညှိခြင်း (Bidirectional Sync)
* **`src/lib/dateUtils.ts`**:
  - `parseAnyDate()`: Firestore Timestamp၊ Date၊ String၊ Milliseconds များကို ကာကွယ် စစ်ဆေးပေးသည့် ရက်စွဲ Parser
  - `formatCurrency()`: မြန်မာကျပ်ငွေ ပမာဏ ကော်မာခြား Format စနစ်
  - `formatDetailedTime()`: အချိန်နှင့် ရက်စွဲ ဖော်ပြပေးသည့် စနစ်
* **`src/lib/voucher.ts`**: ဖုန်းပြင် ဘောက်ချာ/ပြေစာ ပုံရိပ်ထုတ်ယူခြင်း (Voucher Image Export) နှင့် Android Native Save ချိတ်ဆက်မှု။

---

### 4. 🌐 Context State Providers (`/src/context`)
* **`src/context/AuthContext.tsx`**: Firebase User Login/Logout လက်ခံခြင်း၊ Admin သို့မဟုတ် Staff Role Permissions များကို စစ်ဆေးထိန်းချုပ်ပေးခြင်း။
* **`src/context/SettingsContext.tsx`**: ဆိုင်အမည်၊ Theme Color၊ Dark/Light Mode နှင့် မြန်မာ/အင်္ဂလိပ် နှစ်ဘာသာ ပြောင်းလဲသည့် ဘာသာစကား Engine (`t()`)။
* **`src/context/ToastContext.tsx`**: စနစ်အနှံ့ ပေါ်လာသော အကြောင်းကြားစာ (Notification Floating Toast Messages) စနစ်။

---

### 5. 🧩 Layout Components (`/src/components`)
* **`src/components/Navbar.tsx`**:
  - အပေါ်ဆုံး Navigation Header
  - ဆိုင်အမည်၊ Menu Drawer ခလုတ်၊ AI Smart Button နှင့် Profile Avatar
* **`src/components/BottomNav.tsx`**:
  - ဖုန်းမျက်နှာပြင် အောက်ခြေ အဓိက ခလုတ်များ (`Stock`၊ `Repair`၊ `Finance`၊ `Personal`၊ `Debts`)
  - AI Voice/Text Smart Floating Trigger
* **`src/components/NavigationDrawer.tsx`**:
  - ဘေးတိုက် ပွင့်လာသော Side Drawer Panel
  - Admin Suite Portal Links (`Dashboard`၊ `Personal Wallet`၊ `Audit Logs`၊ `Backup`၊ `Settings`)
  - ဝန်ထမ်းအကောင့်သစ် ဖွင့်ရန် ခလုတ်နှင့် အကောင့်ထွက်ရန် ခလုတ်

---

### 6. 📱 Operational Counter Modules (`/src/components/...`)

#### 📦 Inventory Module (`/src/components/inventory`)
* **`InventoryTab.tsx`**:
  - စတော့ပစ္စည်း စာရင်းများ၊ ရှာဖွေမှုနှင့် Filter Pills များ
  - ပစ္စည်းအသစ်သွင်းခြင်း/ပြင်ခြင်း Modal (ဝယ်ရင်းငွေကို ဆိုင်ငွေထဲမှ နှုတ်မနှုတ် သတ်မှတ်နိုင်သည်)
  - ပစ္စည်း ရောင်းချခြင်း/အကြွေးရောင်းခြင်း Modal
  - တစ်ရက်တည်း ရောင်းပြီး စတော့များ ပေါင်းစည်းပြသမှု နှင့် **`🕒 မှတ်တမ်း`** Accordion (Option Kh)

#### 🔧 Mobile Repair Module (`/src/components/repair`)
* **`RepairTab.tsx`**:
  - ဖုန်းပြင် လက်ခံ/စစ်ဆေး/ပြင်ပြီး/ထုတ်ယူပြီး/ပြန်ထုတ် Workflow စနစ်
  - VR Ticket နံပါတ်၊ ပြစ်ချက်၊ ဖောက်သည် ဖုန်းနံပါတ်၊ ပြင်ခ နှင့် အပိုပစ္စည်း အရင်းများ မှတ်တမ်း
  - ဘောက်ချာ/ပြေစာ ပရင့်ထုတ်ခြင်း (Voucher Generator)
  - **`🕒 မှတ်တမ်း`** Accordion ပါဝင်သည်

#### 💳 Finance Module (`/src/components/finance`)
* **`FinanceTab.tsx`**:
  - ဆိုင်ငွေအံဆွဲ (Cash Drawer) ဝင်ငွေ/ထွက်ငွေ စာရင်းချုပ်
  - နေ့စဉ် စာရင်းချုပ် Drilldown မျက်နှာပြင်
  - **တစ်ရက်တည်း အမည်တူ ရောင်းရငွေများ ပေါင်းစည်းပြသခြင်း (× N ခု)**
  - **`🕒 မှတ်တမ်း`** Collapsible Accordion (Option Kh)
  - ညစဉ် ဆိုင်ငွေအပ်ခြင်း (`Handover`)၊ Admin ထည့်ငွေ (`OwnerFund`) နှင့် အံဆွဲ စစ်ဆေးခြင်း (Physical Cash Settlement)

#### 📒 Debt Module (`/src/components/debt`)
* **`DebtTab.tsx`**:
  - ဝယ်သူအလိုက် အကြွေးကျန်ငွေများ အုပ်စုဖွဲ့ ပြသခြင်း
  - အကြွေး ဆပ်ယူခြင်း၊ အပိုင်းလိုက် ဆပ်ယူခြင်း မှတ်တမ်း
  - Void လုပ်ခြင်းနှင့် **`🕒 မှတ်တမ်း`** Accordion

---

### 7. 👑 Admin Suite Modules (`/src/components/admin`)
* **`ExecutiveDashboard.tsx`**:
  - လုပ်ငန်းချုပ် P&L ရှင်းတမ်း (Operating Revenue - COGS - OPEX = Net Profit)
  - ဆိုင်ငွေအံဆွဲ လက်ကျန်ငွေ (Drawer Cash on Hand)
  - စတော့ထဲရှိ မရောင်းရသေးသော ပစ္စည်းတန်ဖိုး (Invested Capital)
* **`PersonalWallet.tsx`**:
  - ဆိုင်ငွေနှင့် ရောထွေးမှုမရှိသော Admin ၏ သီးသန့် ကိုယ်ပိုင် အိတ်ကပ် ငွေစာရင်း
  - နေ့စွဲအလိုက် စာရင်းချုပ် မူလမျက်နှာပြင် နှင့် Tap-to-Drilldown Fullscreen Detail View
  - စာရင်း ပြင်ဆင်ရန် (Edit) ခလုတ်၊ Modal နှင့် **`🕒 မှတ်တမ်း`** Accordion
* **`AuditLogsView.tsx`**:
  - စနစ်တစ်ခုလုံး၏ အချိန်၊ မည်သူက မည်သည့် လုပ်ဆောင်ချက် ပြုလုပ်သွားသည်ဆိုသော Real-time Activity Logs Stream
* **`SettingsView.tsx`**:
  - ဆိုင်အမည်၊ Color Theme နှင့် မြန်မာ/အင်္ဂလိပ် ဘာသာစကား ပြောင်းလဲရန်
* **`CategorySettingsView.tsx`**:
  - ကိုယ်ပိုင်ငွေစာရင်း နှင့် ဆိုင်သုံးစရိတ် Category များ စိတ်ကြိုက် ပြင်ဆင်ရန်
* **`DataArchiveControl.tsx`**:
  - စနစ်တွင်း ဒေတာများ Backup အရန်သိမ်းရန် နှင့် Archive လုပ်ရန်

---

### 8. 🔐 Auth & AI Modules (`/src/components/auth` & `/src/components/ai`)
* **`AuthView.tsx`**: အကောင့်ဝင်ရန် (Login) မျက်နှာပြင်
* **`RegisterModal.tsx`**: Admin က ဝန်ထမ်းအကောင့်သစ် ပြုလုပ်ပေးသည့် Modal
* **`AiModal.tsx`**: အသံဖြင့်/စာဖြင့် စာရင်းအမြန်သွင်းနိုင်သော AI Smart Input Assistant

---

### 🛠️ Build & Run Commands
```bash
# 1. Development Server စတင်ရန်
npm run dev

# 2. TypeScript Syntax စစ်ဆေးရန်
npm run lint

# 3. Production App Bundle တည်ဆောက်ရန်
npm run build
```
