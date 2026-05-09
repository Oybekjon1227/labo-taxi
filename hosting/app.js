// ===== DRIVER STATE =====
const state = {
    currentDriver: null,   // { id, name, carNumber, phone, username }
    settings: {
        minPrice: 10000,
        perKm: 3000,
        perWaitMin: 500
    },
    trips: [],             // loaded from Firestore
    isRunning: false,
    isWaiting: false,
    distance: 0,
    waitSeconds: 0,
    price: 0,
    speed: 0,
    lastPosition: null,
    watchId: null,
    waitInterval: null,
    priceInterval: null,
    demoInterval: null,
    localSettings: JSON.parse(localStorage.getItem('driver_ui_settings') || '{"darkMode":true,"sound":true}')
};

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ===== DRIVER LOGIN =====
function initLogin() {
    $('btn-drv-login').addEventListener('click', attemptLogin);
    $('drv-password').addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
    $('drv-username').addEventListener('keydown', e => { if (e.key === 'Enter') $('drv-password').focus(); });

    // Eye toggle
    $('drv-eye-btn').addEventListener('click', () => {
        const pw = $('drv-password');
        const icon = $('drv-eye-icon');
        pw.type = pw.type === 'password' ? 'text' : 'password';
        icon.textContent = pw.type === 'password' ? 'visibility' : 'visibility_off';
    });

    // Check session
    const saved = sessionStorage.getItem('driver_session');
    if (saved) {
        try {
            state.currentDriver = JSON.parse(saved);
            showMainApp();
            return;
        } catch {}
    }
    // Show login
    $('driver-login-screen').style.display = 'flex';
}

async function attemptLogin() {
    const username = $('drv-username').value.trim();
    const password = $('drv-password').value;
    const errEl = $('drv-login-error');
    const btn = $('btn-drv-login');

    if (!username || !password) {
        errEl.textContent = 'Login va parolni kiriting';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-round">hourglass_top</span> Tekshirilmoqda...';
    errEl.textContent = '';

    try {
        const snap = await db.collection('drivers')
            .where('username', '==', username)
            .where('password', '==', password)
            .where('active', '==', true)
            .get();

        if (snap.empty) {
            errEl.textContent = '❌ Login yoki parol noto\'g\'ri';
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons-round">login</span> Kirish';
            return;
        }

        const doc = snap.docs[0];
        state.currentDriver = { id: doc.id, ...doc.data() };
        sessionStorage.setItem('driver_session', JSON.stringify(state.currentDriver));
        showMainApp();

    } catch (err) {
        console.error(err);
        // Offline fallback: check localStorage cache
        const cached = localStorage.getItem('driver_session_cache');
        if (cached) {
            const driver = JSON.parse(cached);
            if (driver.username === username && driver.password === password) {
                state.currentDriver = driver;
                sessionStorage.setItem('driver_session', JSON.stringify(driver));
                showMainApp();
                return;
            }
        }
        errEl.textContent = '⚠️ Internet yo\'q. Admin panelga ulanib ko\'ring.';
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons-round">login</span> Kirish';
    }
}

function showMainApp() {
    $('driver-login-screen').style.display = 'none';
    $('app').style.display = 'block';
    // Cache driver for offline use
    localStorage.setItem('driver_session_cache', JSON.stringify(state.currentDriver));
    loadAllData();
    applyTheme();
    applyUISettings();
}

// ===== LOAD DATA FROM FIRESTORE =====
function loadAllData() {
    // Update header
    $('header-driver-name').textContent = state.currentDriver.name || 'Haydovchi';
    $('display-driver-name').textContent = state.currentDriver.name || '—';
    $('display-car-number').textContent = state.currentDriver.carNumber || '—';
    $('display-phone').textContent = state.currentDriver.phone || '—';

    // Listen to global settings in real-time
    db.collection('settings').doc('global').onSnapshot(doc => {
        if (doc.exists) {
            const s = doc.data();
            state.settings.minPrice = s.minPrice || 10000;
            state.settings.perKm = s.perKm || 3000;
            state.settings.perWaitMin = s.perWaitMin || 500;

            $('display-min-price').textContent = formatNumber(state.settings.minPrice) + ' so\'m';
            $('display-per-km').textContent = formatNumber(state.settings.perKm) + ' so\'m';
            $('display-per-min').textContent = formatNumber(state.settings.perWaitMin) + ' so\'m';
        }
    });

    // Listen to driver info updates in real-time
    db.collection('drivers').doc(state.currentDriver.id).onSnapshot(doc => {
        if (doc.exists) {
            const d = doc.data();
            state.currentDriver = { ...state.currentDriver, ...d };
            $('display-driver-name').textContent = d.name || '—';
            $('display-car-number').textContent = d.carNumber || '—';
            $('display-phone').textContent = d.phone || '—';
            $('header-driver-name').textContent = d.name || 'Haydovchi';
        }
    });

    // Load trips for this driver
    loadTrips();
}

function loadTrips() {
    db.collection('trips')
        .where('driverId', '==', state.currentDriver.id)
        .orderBy('date', 'desc')
        .limit(200)
        .onSnapshot(snap => {
            state.trips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Normalize date: Firestore Timestamp → ISO string
            state.trips = state.trips.map(t => ({
                ...t,
                date: t.date?.toDate ? t.date.toDate().toISOString() : t.date
            }));
        }, err => {
            console.warn('Trips load error:', err);
            // Use cached trips
            const cached = localStorage.getItem('trips_' + state.currentDriver.id);
            if (cached) state.trips = JSON.parse(cached);
        });
}

// ===== NAVIGATION =====
$$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const pageId = btn.dataset.page;
        $$('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.page').forEach(p => p.classList.remove('active'));
        $(pageId).classList.add('active');
        if (pageId === 'page-history') {
            updateHistory();
            renderChart();
        }
        playClick();
    });
});

// ===== TAXOMETER =====
function formatNumber(n) {
    return Math.round(n).toLocaleString('uz-UZ');
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function calculatePrice() {
    const s = state.settings;
    const distPrice = state.distance * s.perKm;
    const waitPrice = (state.waitSeconds / 60) * s.perWaitMin;
    const total = distPrice + waitPrice;
    return Math.max(total, state.distance > 0.05 ? s.minPrice : 0);
}

function updateDisplay() {
    const newPrice = calculatePrice();
    if (Math.round(newPrice) !== Math.round(state.price)) {
        state.price = newPrice;
        $('price-value').textContent = formatNumber(state.price);
        $('price-value').classList.add('pulse');
        setTimeout(() => $('price-value').classList.remove('pulse'), 300);
    }
    $('distance-value').textContent = state.distance.toFixed(2);
    $('wait-time-value').textContent = formatTime(state.waitSeconds);
    $('speed-value').textContent = Math.round(state.speed);
}

function startTrip() {
    if (state.isRunning) return;
    state.isRunning = true;
    state.isWaiting = false;
    state.distance = 0;
    state.waitSeconds = 0;
    state.price = 0;
    state.lastPosition = null;
    state.speed = 0;
    updateDisplay();

    $('btn-start').innerHTML = '<span class="material-icons-round">directions_car</span> Harakatda...';
    $('btn-start').classList.add('btn-start-active');
    $('btn-start').disabled = true;
    $('btn-wait').disabled = false;
    $('btn-finish').style.display = 'block';

    if ('geolocation' in navigator) {
        state.watchId = navigator.geolocation.watchPosition(
            pos => {
                const { latitude, longitude, speed } = pos.coords;
                state.speed = speed ? speed * 3.6 : 0;
                if (state.lastPosition && !state.isWaiting) {
                    const dist = haversine(state.lastPosition.lat, state.lastPosition.lng, latitude, longitude);
                    if (dist > 0.005 && dist < 1) state.distance += dist;
                }
                state.lastPosition = { lat: latitude, lng: longitude };
                updateDisplay();
            },
            () => startDemoMovement(),
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
    } else {
        startDemoMovement();
    }

    state.priceInterval = setInterval(updateDisplay, 1000);
    playClick();
}

function startDemoMovement() {
    if (!state.demoInterval) {
        state.demoInterval = setInterval(() => {
            if (state.isRunning && !state.isWaiting) {
                state.distance += 0.02;
                state.speed = 40 + Math.random() * 20;
                updateDisplay();
            }
        }, 1000);
    }
}

function toggleWait() {
    if (!state.isRunning) return;
    state.isWaiting = !state.isWaiting;
    if (state.isWaiting) {
        $('btn-wait').innerHTML = '<span class="material-icons-round">play_arrow</span> Davom etish';
        $('btn-wait').classList.add('btn-wait-active');
        state.waitInterval = setInterval(() => { state.waitSeconds++; updateDisplay(); }, 1000);
    } else {
        $('btn-wait').innerHTML = '<span class="material-icons-round">hourglass_top</span> Mijozni kutish';
        $('btn-wait').classList.remove('btn-wait-active');
        clearInterval(state.waitInterval);
    }
    playClick();
}

async function finishTrip() {
    if (!state.isRunning) return;
    state.isRunning = false;
    state.isWaiting = false;
    state.price = calculatePrice();

    if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
    clearInterval(state.waitInterval);
    clearInterval(state.priceInterval);
    clearInterval(state.demoInterval);
    state.demoInterval = null;
    state.watchId = null;

    const trip = {
        driverId: state.currentDriver.id,
        driverName: state.currentDriver.name,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        price: Math.round(state.price),
        distance: parseFloat(state.distance.toFixed(2)),
        waitMinutes: parseFloat((state.waitSeconds / 60).toFixed(1))
    };

    // Save to Firestore
    try {
        await db.collection('trips').add(trip);
    } catch (err) {
        // Offline: cache locally and sync later
        const offline = JSON.parse(localStorage.getItem('offline_trips') || '[]');
        offline.push({ ...trip, date: new Date().toISOString() });
        localStorage.setItem('offline_trips', JSON.stringify(offline));
        console.warn('Trip saved offline, will sync later');
    }

    // Show modal
    $('modal-price').textContent = formatNumber(Math.round(state.price)) + ' so\'m';
    $('modal-distance').textContent = state.distance.toFixed(2) + ' km';
    $('modal-wait').textContent = formatTime(state.waitSeconds);
    $('trip-modal').classList.add('active');

    // Reset UI
    $('btn-start').innerHTML = '<span class="material-icons-round">play_arrow</span> Boshlash';
    $('btn-start').classList.remove('btn-start-active');
    $('btn-start').disabled = false;
    $('btn-wait').innerHTML = '<span class="material-icons-round">hourglass_top</span> Mijozni kutish';
    $('btn-wait').classList.remove('btn-wait-active');
    $('btn-wait').disabled = true;
    $('btn-finish').style.display = 'none';
    state.speed = 0;
    updateDisplay();
    playClick();
}

$('btn-start').addEventListener('click', startTrip);
$('btn-wait').addEventListener('click', toggleWait);
$('btn-finish').addEventListener('click', finishTrip);
$('btn-modal-close').addEventListener('click', () => {
    $('trip-modal').classList.remove('active');
    playClick();
});

// ===== HAVERSINE =====
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ===== HISTORY =====
function getToday() { return new Date().toISOString().split('T')[0]; }
function getDayName(dateStr) {
    return ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan'][new Date(dateStr).getDay()];
}

function filterTrips(period) {
    const now = new Date();
    const today = getToday();
    return state.trips.filter(t => {
        if (period === 'all') return true;
        const d = new Date(t.date);
        const diff = (now - d) / (1000*60*60*24);
        if (period === 'week') return diff <= 7;
        if (period === 'month') return diff <= 30;
        return true;
    });
}

function updateHistory() {
    const today = getToday();
    const todayTrips = state.trips.filter(t => t.date && t.date.startsWith(today));

    $('today-income').textContent = formatNumber(todayTrips.reduce((s,t) => s + t.price, 0));
    $('today-trips').textContent = todayTrips.length;
    $('today-distance').textContent = todayTrips.reduce((s,t) => s + t.distance, 0).toFixed(1);

    updatePeriod('week');
    renderTripList(state.trips.slice(0, 30));
}

function updatePeriod(period) {
    const filtered = filterTrips(period);
    $('period-income').textContent = formatNumber(filtered.reduce((s,t) => s+t.price, 0)) + ' so\'m';
    $('period-trips').textContent = filtered.length;
    $('period-distance').textContent = filtered.reduce((s,t) => s+t.distance, 0).toFixed(1);
}

function renderTripList(trips) {
    $('trip-list').innerHTML = trips.map(t => {
        const d = new Date(t.date);
        const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        return `
            <div class="trip-item">
                <div class="trip-item-left">
                    <div class="trip-icon"><span class="material-icons-round">local_taxi</span></div>
                    <div class="trip-info-text">
                        <div class="trip-price">${formatNumber(t.price)} so'm</div>
                        <div class="trip-detail">${t.distance} km · ${t.waitMinutes} min kutish</div>
                    </div>
                </div>
                <span class="trip-time">${time}</span>
            </div>`;
    }).join('');
}

$$('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updatePeriod(btn.dataset.filter);
        playClick();
    });
});

// ===== CHART =====
let chartInstance = null;
function renderChart() {
    const labels = [], data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(getDayName(dateStr));
        const dayTrips = state.trips.filter(t => t.date && t.date.startsWith(dateStr));
        data.push(dayTrips.reduce((s,t) => s+t.price, 0));
    }
    if (chartInstance) chartInstance.destroy();
    const ctx = $('income-chart').getContext('2d');
    const isDark = !document.body.classList.contains('light');
    const gradient = ctx.createLinearGradient(0,0,0,180);
    gradient.addColorStop(0,'rgba(245,197,24,0.4)');
    gradient.addColorStop(1,'rgba(245,197,24,0.02)');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: gradient, borderColor:'#f5c518', borderWidth:2, borderRadius:8, borderSkipped:false }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark?'#1a1a2e':'#fff', titleColor: isDark?'#e8e8f0':'#1a1a2e',
                    bodyColor:'#f5c518', cornerRadius:10, padding:10,
                    callbacks: { label: ctx => formatNumber(ctx.raw)+' so\'m' }
                }
            },
            scales: {
                x: { grid:{display:false}, ticks:{color:isDark?'#5c5c7a':'#9aa0a6',font:{family:'Inter',weight:'600',size:11}} },
                y: { grid:{color:isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.05)'}, ticks:{color:isDark?'#5c5c7a':'#9aa0a6',font:{family:'Inter',size:10},callback:v=>v>=1000?(v/1000)+'k':v} }
            }
        }
    });
}

// ===== PROFILE SETTINGS =====
function applyUISettings() {
    $('theme-toggle').checked = !state.localSettings.darkMode;
    $('sound-toggle').checked = state.localSettings.sound;
    applyTheme();
}

$('theme-toggle').addEventListener('change', () => {
    state.localSettings.darkMode = !$('theme-toggle').checked;
    localStorage.setItem('driver_ui_settings', JSON.stringify(state.localSettings));
    applyTheme();
    playClick();
});

$('sound-toggle').addEventListener('change', () => {
    state.localSettings.sound = $('sound-toggle').checked;
    localStorage.setItem('driver_ui_settings', JSON.stringify(state.localSettings));
    playClick();
});

function applyTheme() {
    document.body.classList.toggle('light', !state.localSettings.darkMode);
}

$('btn-logout').addEventListener('click', () => {
    if (confirm('Chiqishni xohlaysizmi?')) {
        sessionStorage.removeItem('driver_session');
        localStorage.removeItem('driver_session_cache');
        location.reload();
    }
});

// ===== SOUND =====
function playClick() {
    if (!state.localSettings.sound) return;
    try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.frequency.value = 800; gain.gain.value = 0.05; osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
        osc.stop(ac.currentTime + 0.08);
    } catch(e) {}
}

// ===== OFFLINE TRIP SYNC =====
function syncOfflineTrips() {
    const offline = JSON.parse(localStorage.getItem('offline_trips') || '[]');
    if (offline.length === 0) return;
    const batch = db.batch();
    offline.forEach(trip => {
        const ref = db.collection('trips').doc();
        batch.set(ref, { ...trip, date: new Date(trip.date) });
    });
    batch.commit().then(() => {
        localStorage.removeItem('offline_trips');
        console.log('Offline trips synced!');
    }).catch(e => console.warn('Sync failed:', e));
}

// ===== INIT =====
applyTheme();
initLogin();

// Try to sync offline trips when online
window.addEventListener('online', syncOfflineTrips);
syncOfflineTrips();
