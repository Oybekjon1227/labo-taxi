/**
 * Firebase Configuration — Labo Oltiariq Taxi
 * Updated with user keys
 */

const firebaseConfig = {
    apiKey:            "AIzaSyA2H01LsH30gUtxnLAhwcAuZguBY6AaSUE",
    authDomain:        "gen-lang-client-0466073876.firebaseapp.com",
    projectId:         "gen-lang-client-0466073876",
    storageBucket:     "gen-lang-client-0466073876.firebasestorage.app",
    messagingSenderId: "470427764921",
    appId:             "1:470427764921:web:86f2c79a6850dd03aaf368"
};

// Firebase ni ishga tushirish
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// APK ichida offline qo'llab-quvvatlash (Capacitor uchun)
db.enablePersistence({ synchronizeTabs: true })
    .catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn('Offline persistence: bir nechta tab ochiq');
        } else if (err.code === 'unimplemented') {
            console.warn('Offline persistence bu brauzerda ishlamaydi');
        }
    });

/**
 * Firestore tuzilmasi:
 *
 * settings/global        → { minPrice, perKm, perWaitMin }
 * drivers/{id}           → { name, carNumber, phone, username, password, note, active, createdAt }
 * trips/{id}             → { driverId, driverName, date, price, distance, waitMinutes }
 */
