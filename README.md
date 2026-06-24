# SMC Trading Journal

A production-quality mobile trading journal for ICT / Smart Money Concepts traders.
Its single purpose is **discipline**: log every trade with its setup, confluences,
risk, and mistakes — then surface analytics that show which setups make money and
which recurring mistakes lose it.

> **Runs 100% locally.** Trades are stored in **expo-sqlite**, settings/auth in
> **AsyncStorage**. No account, no backend, and no network are required. Optional
> Firebase cloud sync is stubbed in [`lib/firebase.ts`](lib/firebase.ts) and off by
> default.

---

## Features

- **Pre-trade checklist gate** — the form stays locked until you tick all 5
  discipline checks. Intentional friction, by design.
- **Rich trade logging** — symbol, direction, session, HTF bias + timeframes,
  ICT/SMC setup type, multi-select confluences, premium/discount zone, entry/SL/TP,
  risk %, with **live R:R auto-calculation** and SL-side validation.
- **Close flow** — pick result, enter exit → auto-calculated realized R and P&L,
  tag mistakes, attach before/after screenshots (compressed on device).
- **Dashboard** — net R, win rate, expectancy, profit factor, streak, equity curve,
  with 7 / 30 / all-time quick filters.
- **Trade list** — live search + filters (setup, session, result, period,
  "only trades with mistakes").
- **Calendar** — monthly P&L heatmap colored by daily net R; tap a day for its trades.
- **Stats** — win rate & total R by setup / session / confluence, ranked recurring
  mistakes with R bled, and a clean-vs-mistakes comparison. All computed by **pure,
  unit-tested functions** in [`lib/analytics.ts`](lib/analytics.ts).
- **Settings** — risk defaults, starting balance, custom setups/confluences,
  JSON/CSV export, dark/light theme (dark default).
- **Analiz** — grounded, Turkish, scenario-based stock research reports (web
  search + optional fundamentals API, never hallucinated numbers). See
  [Analiz (Hisse Senedi Araştırma Raporu)](#analiz-hisse-senedi-araştırma-raporu) below.

---

## Tech stack

React Native + Expo (SDK 51) · TypeScript (strict) · Expo Router · Zustand ·
expo-sqlite + AsyncStorage · NativeWind (Tailwind) · react-native-gifted-charts ·
expo-image-picker / -manipulator · date-fns · @expo/vector-icons · expo-haptics.

---

## Getting started (local machine)

### Prerequisites
- **Node.js 18+** and npm
- The **Expo Go** app on your phone (iOS/Android), or an Android emulator /
  iOS simulator.

### 1. Install dependencies
```bash
npm install
```
If you hit a version mismatch warning, align native packages to the SDK:
```bash
npx expo install --fix
```

### 2. Start the app
```bash
npx expo start
```
Then scan the QR code with Expo Go (Android) or the Camera app (iOS), or press
`a` / `i` to launch an emulator/simulator.

> **First launch** automatically seeds **10 sample trades** (see
> [`lib/seed.ts`](lib/seed.ts)) so the dashboard, calendar and stats screens are
> populated immediately. Wipe and restore them anytime from
> **Settings → Data → Reset & reseed**.

### 3. Run the unit tests
```bash
npm test
```
Covers the analytics and R:R math in [`lib/__tests__`](lib/__tests__).

---

## How storage works

| Data | Where | Module |
|------|-------|--------|
| Trades | SQLite table `trades` | [`lib/db.ts`](lib/db.ts) |
| Settings (risk, balance, theme, custom lists) | AsyncStorage (Zustand persist) | [`store/useSettingsStore.ts`](store/useSettingsStore.ts) |
| Local auth (account / guest) | AsyncStorage (Zustand persist) | [`store/useAuthStore.ts`](store/useAuthStore.ts) |
| Screenshots | On-device file URIs (compressed JPEG) | [`components/ScreenshotUploader.tsx`](components/ScreenshotUploader.tsx) |

The SQLite schema is created on first launch; arrays (confluences, mistakes,
screenshots) are stored as JSON columns.

> **Auth note:** the email/password account is **local-only** (stored on the
> device, lightly hashed) and is **not** a security boundary — it exists to model
> the sign-in flow and the anonymous "Continue as guest" fallback. Swap in real
> Firebase Auth via `lib/firebase.ts` if you need it.

---

## Project structure

```
app/
  _layout.tsx            Root: DB bootstrap + seed, theme sync, auth gate
  auth/sign-in.tsx       Email/password + anonymous guest
  (tabs)/
    index.tsx            Dashboard (KPIs + equity curve)
    trades.tsx           Trade list (search + filters)
    calendar.tsx         Monthly P&L heatmap
    stats.tsx            Deep analytics
    settings.tsx         Account, risk, custom lists, export, theme
  trade/
    new.tsx              Checklist gate -> trade form
    [id].tsx             Detail / edit / close
components/              TradeCard, ChecklistGate, SetupPicker, EquityCurve, … + ui/
lib/
  constants.ts           Setups, confluences, mistakes, sessions, zones
  types.ts               Trade / Settings / User models
  db.ts                  expo-sqlite CRUD
  storage.ts             AsyncStorage helpers
  rr.ts                  R:R calc + level validation (pure)
  analytics.ts           All stat calculations (pure, testable)
  filter.ts              Trade list filtering (pure)
  export.ts              JSON / CSV export
  seed.ts                10 sample trades
  firebase.ts            Optional cloud-sync stub (off by default)
store/                   useTradeStore, useSettingsStore, useAuthStore
```

---

## Edge cases handled

- Stop loss on the wrong side of entry → inline validation error, R:R stays 0.
- Closing an already-closed trade → blocked in store and UI.
- Over-risk above your configured max → flagged in red on the form.
- Double-tap save/close → guarded by a `saving` flag in the store.
- Deleting today's trade → explicit confirmation dialog.
- Long symbols / long notes → truncation and wrapping throughout.

---

## Troubleshooting

- **Styles not applying / NativeWind:** ensure `npx expo start -c` (clears the
  Metro cache) after the first install. `global.css` + `metro.config.js` +
  `babel.config.js` must all be present (they are).
- **Native version warnings:** run `npx expo install --fix`.
- **Charts blank / "Gradient package was not found":** gifted-charts needs both
  `react-native-svg` and `expo-linear-gradient` — both are included. After installing
  them, fully restart the bundler with `npx expo start -c` and reload the app.

---

## Optional: enable Firebase sync

See the step-by-step instructions at the top of
[`lib/firebase.ts`](lib/firebase.ts). The app keeps working entirely offline; sync
is purely additive.

---

## v2 — Düşük sürtünme + Türkçe arayüz

### Hızlı işlem kaydı (4 alan + tek kaydırma)
Bir işlemi saniyeler içinde kaydetmek için yeni akış:

**Aç → (tek cümle yaz YA DA 4 alanı doldur) → kaydırarak onayla → kaydedildi.**

- **Sadece 4 zorunlu alan:** parite, yön, setup tipi, giriş/stop/hedef. Geri kalan
  her şey **"Detay ekle (opsiyonel)"** altında toplanır ve kaydı engellemez.
- **Otomatik alanlar:** seans, giriş saatinden killzone pencerelerine göre otomatik
  belirlenir (dokununca düzenlenir); bölge (premium/discount/EQ), range tepe/dip
  girilirse otomatik hesaplanır; planlanan R:R giriş/SL/TP'den canlı çıkar.
- **Son değerler hatırlanır:** parite, risk %, zaman dilimleri ve HTF yönü son
  işlemden ön-doldurulur ([`store/useSettingsStore.ts`](store/useSettingsStore.ts)
  içinde `lastUsed`).
- **5 kutucuklu kontrol listesi yerine tek hareket:** "Kuralıma uygun — işlemi
  kaydet" kaydırma kontrolü ([`components/SwipeToConfirm.tsx`](components/SwipeToConfirm.tsx)).
- **Yansıtma kapanışta:** hatalar, notlar ve "sonrası" ekran görüntüsü yalnızca
  işlemi **kapatırken** sorulur — yansıtmanın doğal olduğu an.

### Türkçe arayüz
Tüm kullanıcı metinleri [`lib/strings.ts`](lib/strings.ts) içinde toplanmıştır
(`S` nesnesi + setup/seans/bölge/yön/sonuç/hata etiket haritaları). Kod
tanımlayıcıları, enum anahtarları ve DB alan adları İngilizce kalır; trader jargonu
(Order Block, FVG, Killzone, premium/discount) sektör standardı olarak İngilizce
korunur. Tarih/takvim biçimleri `date-fns` Türkçe (`tr`) yereli ile.

---

## Giderler (Expenses)

Tekrarlayan sabit giderleri (Netflix, Spotify, kira, spor, telefon, yazılım
abonelikleri…) takip eden ek modül. **Çekirdek ilke aynı: düşük sürtünme** —
sabit gider tekrarladığı için kullanıcı her gideri **bir kez** tanımlar, uygulama
her dönem otomatik sayar. Trading özellikleri tamamen korunur; bu additif bir modül.

- **Navigasyon:** "İşlemler" ile "Takvim" arasına **"Giderler"** sekmesi.
- **Veri:** local-first — SQLite `expenses` tablosu (web'de AsyncStorage),
  cihazda lokal. (Spec'te Firestore geçiyor; proje local-first olduğu için aynı
  desen SQLite ile uygulandı.) Örnek (mock) gider yok; ekran boş başlar ve her
  kartta çöp kutusuyla tek dokunuşta silersin.
- **Para birimi:** her gider **kendi** para biriminde tutulur (kira ₺,
  abonelikler çoğunlukla $/€). **Ayarlar → "Para Birimi & Kur"** içinde ana para
  birimi + **manuel** USD→TRY / EUR→TRY kuru (otomatik çekme yok, offline kalır).
  Tüm toplamlar ana para biriminde; kartta hem orijinal hem karşılık gösterilir
  (örn. "9.99 USD ≈ 410 TRY").

**Ekranlar**
- **Liste (ana ekran):** 3 özet kart (Aylık Toplam, Yıllık Toplam, Aktif Abonelik),
  **Yaklaşan Ödemeler** şeridi (önümüzdeki 7 gün, en yakın üstte), kategori filtresi,
  yaklaşan ödeme gününe göre sıralı liste (pasifler soluk + "Durduruldu" etiketi),
  altta **kategori dağılım grafiği** (gifted-charts donut + lejant).
- **Ekle/Düzenle:** ZORUNLU sadece **isim, tutar, para birimi, kategori**. Döngü
  (varsayılan aylık), ödeme günü (varsayılan bugün) ve "Detay ekle (opsiyonel)"
  altındaki ödeme yöntemi/notlar serbest. Son kullanılan para birimi & kategori
  ön-doldurulur. **Silme yerine "Durdur"** (active=false) öne çıkarılır; tam silme
  ayrı, ikincil aksiyon.
**Analytics** — hepsi saf fonksiyon: [`lib/expenseAnalytics.ts`](lib/expenseAnalytics.ts)
(`monthlyTotal`, `yearlyTotal`, `totalByCategory`, `upcomingPayments`,
`mostExpensiveSubscriptions`, `convert`, `nextBillingDate`) + Jest testleri.

> Not: `experiments.typedRoutes` kapatıldı — yeni route ekledikçe çıkan tipli-route
> tazeleme sürtünmesini önlemek için (çalışma zamanına etkisi yok).

---

## Analiz (Hisse Senedi Araştırma Raporu)

Hisse kodu girip (BIST: `THYAO`, `ASELS`… veya yabancı: `AAPL`, `NVDA`…) o şirket
için **gerçek veriye dayalı**, Türkçe, senaryo bazlı bir finansal rapor üreten ek
modül. Trading ve Giderler özellikleri tamamen korunur; **"Analiz"** sekmesi
"Takvim"in yanına eklendi.

### Veri ilkesi: gerçek veri, halüsinasyon yok
Model hiçbir rakamı **icat etmez**. Akış:
1. Kullanıcı isteğe bağlı bir Financial Modeling Prep API anahtarı girmişse,
   o anahtarla şirketin temel verileri (gelir, net kâr, F/K, F/DD…) önce çekilir
   ve modele **ground truth** olarak verilir.
2. Model, Anthropic'in **web_search** aracıyla son haberleri, son finansal
   sonuçları, sektör/rakip bilgisini ve güncel fiyatı arar.
3. Rapor bu bulunan verilere **dayanarak** yazılır; bulunamayan her alan `null` +
   `dataGaps` listesinde dürüstçe belirtilir — asla tahmin edilmez.

BIST hisseleri için yapılandırılmış API kapsamı zayıf olduğundan model KAP
açıklamaları ve haber kaynaklarına dayanır; verinin tarihi raporda her zaman
görünür (`asOfDate`, `fundamentals.note`).

### Rapor içeriği
Özet · Değerleme (ucuz/makul/pahalı rozeti) · Kısa (0-6 ay) / Orta (6-24 ay) /
Uzun (2-5 yıl) vadeli **bear/base/bull senaryolu** fiyat görünümü (tek kesin sayı
yasak — her zaman olasılıklı senaryo) · Temel veriler · Güçlü yönler · Riskler ·
Sektör & rakipler · Tarihli son haberler · Kaynaklar (tıklanır link) · Güven
seviyesi · Eksik veriler listesi. Rapor altında her zaman sabit yasal uyarı
görünür: *"Bu rapor yapay zeka tarafından üretilmiştir, yatırım tavsiyesi
değildir..."*

[`lib/stockAnalysis.ts`](lib/stockAnalysis.ts) — sistem promptu, Anthropic
çağrısı (`claude-sonnet-4-6`, `web_search_20250305` aracı, `max_tokens: 4000`),
opsiyonel FMP fetch'i ve modelin döndürdüğü (güvenilmeyen) JSON'un savunmacı
normalizasyonu.

### Önbellekleme (maliyet kontrolü)
Web araması yavaş ve token-yoğun olduğu için her rapor **cihazda lokal**
saklanır (SQLite `stock_analyses` tablosu, web'de AsyncStorage — proje
local-first olduğu için Firestore yerine aynı yerel desen kullanıldı). Aynı
hisseyi tekrar açtığında rapor anında önbellekten gelir; **otomatik yenileme
yoktur**, kullanıcı "Yeniden Analiz Et" ile tetikler. Daha önce analiz edilen
hisseler arama çubuğunun altında kayıtlı kısayollar (chip) olarak görünür.

### Opsiyonel: Financial Modeling Prep API anahtarı
**Ayarlar** ekranında "Finansal Veri API Anahtarı" alanına ücretsiz bir
[Financial Modeling Prep](https://site.financialmodelingprep.com/) anahtarı
eklenebilir. Anahtar yoksa özellik **yine çalışır** — sadece web aramasına
dayanır ve fundamentals daha çok "web kaynaklı, doğrulayın" niteliğinde olur.
Anahtar sadece bu cihazda (Ayarlar/AsyncStorage) saklanır, hiçbir yere
gönderilmez/loglanmaz.

### Hata durumları
- Geçersiz/JSON-dışı model yanıtı → "Rapor oluşturulamadı, tekrar dener misin?"
  (girilen hisse kodu kaybolmaz).
- Ağ hatası → aynı şekilde tekrar denenebilir mesajı.
- `EXPO_PUBLIC_ANTHROPIC_API_KEY` yoksa → net uyarı, uygulama çökmez.
- Tanınmayan/yetersiz veri olan hisse kodu → model `confidence: "düşük"` +
  `dataGaps` ile işaretler; arayüzde "Bu kod için yeterli veri bulunamadı"
  görünür.
