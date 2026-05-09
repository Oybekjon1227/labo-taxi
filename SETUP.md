# 🚖 Labo Oltiariq — Setup Qo'llanma

## Arxitektura

```
Admin Panel (Web)  ←──── Firebase Firestore ────→  Driver App (APK)
  admin.html                  ↕ Real-time              index.html
  admin.js               Sync (auto)                   app.js
```

---

## 1-qadam: Firebase Loyiha Yaratish

1. **https://console.firebase.google.com** ga kiring
2. **"Add project"** → Loyiha nomi: `labo-taxi` → "Continue"
3. Google Analytics: o'chirib qo'ysa ham bo'ladi → "Create project"

### Firestore Database:
4. Chap menyu → **"Firestore Database"** → **"Create database"**
5. **"Start in test mode"** → "Next" → Region tanlang → "Enable"

### Web App qo'shish:
6. Loyiha settings (⚙️) → **"Your apps"** → `</>` (Web) tugmasini bosing
7. App nickname: `labo-taxi-web` → "Register app"
8. **Firebase SDK config ni ko'chirib oling** (quyidagi ko'rinishda):

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "labo-taxi.firebaseapp.com",
  projectId: "labo-taxi",
  storageBucket: "labo-taxi.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 2-qadam: firebase-config.js ni To'ldirish

`C:\Users\Oybekjon\Desktop\TAXI\firebase-config.js` faylini oching va o'zingizning Firebase ma'lumotlaringizni kiriting:

```js
const firebaseConfig = {
    apiKey:            "YOUR_API_KEY",        // ← shu yerga
    authDomain:        "YOUR_AUTH_DOMAIN",    // ← shu yerga
    projectId:         "YOUR_PROJECT_ID",     // ← shu yerga
    storageBucket:     "YOUR_STORAGE_BUCKET", // ← shu yerga
    messagingSenderId: "YOUR_SENDER_ID",      // ← shu yerga
    appId:             "YOUR_APP_ID"          // ← shu yerga
};
```

> ⚠️ **Muhim**: Shu faylni `www\firebase-config.js` ga ham nusxalang!

---

## 3-qadam: Admin Panel Ishga Tushirish

`admin.html` faylini brauzerda oching yoki web server bilan ishlatib:

```
Login:  admin
Parol:  labo2024
```

### Admin panelda haydovchi qo'shish:
1. **Haydovchilar** → "Yangi haydovchi qo'shish"
2. Ism, Mashina raqami, Telefon, **Login**, **Parol** kiriting
3. "Haydovchi qo'shish" tugmasini bosing

### Narxlarni o'rnatish:
1. **Narxlar** bo'limiga o'ting
2. Minimal narx, har km narxi, kutish narxini kiriting
3. "Narxlarni Saqlash" — **barcha haydovchilarga avtomatik qo'llaniladi!**

---

## 4-qadam: APK Yaratish

### Kerakli dasturlar:
- ✅ **Android Studio**: https://developer.android.com/studio
- ✅ **Java JDK 17+**: https://adoptium.net/

### APK build qilish:

**Usul 1 — Avtomatik script:**
```
build-apk.bat
```
Faylni ikki marta bosing → Android Studio ochiladi → **Build → Build APK**

**Usul 2 — Qo'lda:**
```bash
# Fayllarni yangilash
copy index.html www\
copy style.css www\
copy app.js www\
copy firebase-config.js www\

# Capacitor sinxronlash
npx cap sync android

# Android Studio ochish
npx cap open android
```

Android Studio ichida:
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

APK fayl manzili:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 5-qadam: APK ni Telefonга O'rnatish

1. APK faylni telefonga o'tkazing (USB yoki Telegram)
2. Telefonda: **Sozlamalar → Xavfsizlik → Noma'lum manbalardan o'rnatishga ruxsat**
3. APK faylni bosib o'rnating

---

## Fayllar Tuzilmasi

```
TAXI/
├── index.html          ← Haydovchi ilovasi (APK uchun)
├── style.css           ← Ilova stillari
├── app.js              ← Ilova mantiqi + Firebase
├── firebase-config.js  ← Firebase sozlamalari ⚠️ TO'LDIRING!
├── admin.html          ← Admin panel (web)
├── admin.css           ← Admin panel stillari
├── admin.js            ← Admin panel mantiqi
├── build-apk.bat       ← APK build skripti
├── www/                ← APK uchun web fayllar (build paytida yangilanadi)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── firebase-config.js
├── android/            ← Android loyiha (Capacitor yaratgan)
│   └── app/build/outputs/apk/debug/app-debug.apk  ← APK shu yerda
└── capacitor.config.json
```

---

## Firestore Ma'lumotlar Tuzilmasi

```
Firestore:
├── settings/
│   └── global              ← Admin o'rnatadi, haydovchi o'qiydi
│       ├── minPrice: 10000
│       ├── perKm: 3000
│       └── perWaitMin: 500
│
├── drivers/
│   └── {driverId}          ← Admin yaratadi
│       ├── name: "Ahmad"
│       ├── carNumber: "01A123AA"
│       ├── phone: "+998901234567"
│       ├── username: "ahmad1"
│       ├── password: "parol123"
│       ├── active: true
│       └── createdAt: timestamp
│
└── trips/
    └── {tripId}            ← Haydovchi safar tugaganida saqlaydi
        ├── driverId: "..."
        ├── driverName: "Ahmad"
        ├── date: timestamp
        ├── price: 25000
        ├── distance: 8.5
        └── waitMinutes: 3.0
```

---

## Xavfsizlik (Production uchun)

Firestore Security Rules ni quyidagi bilan almashtiring:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Settings: hamma o'qiy oladi, faqat adminlar yoza oladi
    match /settings/{document} {
      allow read: if true;
      allow write: if false; // Admin faqat Firebase Console orqali
    }
    // Drivers: faqat o'qish (login uchun)
    match /drivers/{driverId} {
      allow read: if true;
      allow write: if false;
    }
    // Trips: hamma yoza oladi, hamma o'qiy oladi
    match /trips/{tripId} {
      allow read, write: if true;
    }
  }
}
```

---

## Muammolar va Yechimlar

| Muammo | Yechim |
|--------|--------|
| "Firebase not defined" xatosi | `firebase-config.js` to'g'ri to'ldirilganini tekshiring |
| Haydovchi login bo'lmayapti | Internet bor-yo'qligini tekshiring. Firebase Console → Drivers → haydovchi `active: true` ekanini tekshiring |
| APK build bo'lmayapti | Android Studio va JDK 17+ o'rnatilganini tekshiring |
| GPS ishlamayapti | Telefonda Location ruxsati berilganini tekshiring |
| Admin paneldan o'zgarish APK ga tushayotgani yo'q | `firebase-config.js` da bir xil `projectId` borligini tekshiring |
