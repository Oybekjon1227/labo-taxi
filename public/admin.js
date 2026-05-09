// ===== ADMIN AUTH =====
const ADMIN_DEFAULT = { username: 'admin', password: 'labo2024' };

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function fmtNum(n) { return Math.round(n).toLocaleString('uz-UZ'); }
function fmtDate(val) {
    const d = val?.toDate ? val.toDate() : new Date(val);
    const p = n => String(n).padStart(2,'0');
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function showToast(msg, type='') {
    const t = $('admin-toast');
    t.textContent = msg;
    t.className = 'admin-toast show ' + type;
    setTimeout(() => t.className = 'admin-toast', 2800);
}

function loadAdminCreds() {
    return JSON.parse(localStorage.getItem('admin_creds') || JSON.stringify(ADMIN_DEFAULT));
}
function saveAdminCreds(c) { localStorage.setItem('admin_creds', JSON.stringify(c)); }

// ===== LOGIN =====
$('btn-login').addEventListener('click', doLogin);
$('login-password').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
$('login-username').addEventListener('keydown', e => { if(e.key==='Enter') $('login-password').focus(); });
$('btn-admin-logout').addEventListener('click', adminLogout);

$('btn-toggle-pw').addEventListener('click', () => {
    const pw = $('login-password'), icon = $('eye-icon');
    pw.type = pw.type === 'password' ? 'text' : 'password';
    icon.textContent = pw.type === 'password' ? 'visibility' : 'visibility_off';
});

function doLogin() {
    const u = $('login-username').value.trim();
    const p = $('login-password').value;
    const creds = loadAdminCreds();
    if (u === creds.username && p === creds.password) {
        sessionStorage.setItem('admin_logged_in', 'yes');
        $('login-error').textContent = '';
        $('login-screen').classList.remove('active');
        $('admin-screen').classList.add('active');
        initAdmin();
    } else {
        $('login-error').textContent = '❌ Login yoki parol noto\'g\'ri';
        $('login-password').value = '';
        $('login-password').focus();
    }
}

function adminLogout() {
    sessionStorage.removeItem('admin_logged_in');
    $('admin-screen').classList.remove('active');
    $('login-screen').classList.add('active');
    $('login-username').value = '';
    $('login-password').value = '';
}

if (sessionStorage.getItem('admin_logged_in') === 'yes') {
    $('login-screen').classList.remove('active');
    $('admin-screen').classList.add('active');
    initAdmin();
}

// ===== NAVIGATION =====
function switchSection(sectionId) {
    $$('.admin-section').forEach(s => s.classList.remove('active'));
    $(sectionId).classList.add('active');
    $$('.sidebar-item').forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionId));
    const titles = { 'section-dashboard':'Dashboard','section-drivers':'Haydovchilar','section-pricing':'Narxlar','section-trips':'Safarlar' };
    $('topbar-title').textContent = titles[sectionId] || 'Admin';
    closeSidebar();
}
$$('.sidebar-item').forEach(btn => btn.addEventListener('click', () => switchSection(btn.dataset.section)));

$('btn-hamburger').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
    $('sidebar-overlay').classList.toggle('active');
});
function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('open');
    $('sidebar-overlay').classList.remove('active');
}
$('sidebar-overlay').addEventListener('click', closeSidebar);

// ===== GLOBAL STATE =====
let allDrivers = [];
let allTrips = [];
let currentTripFilter = 'all';
let currentDriverFilter = 'all';

// ===== INIT =====
function initAdmin() {
    listenDrivers();
    listenSettings();
    listenTrips();
    initPricing();
    initPasswordChange();
}

// ===== DRIVERS - REAL-TIME LISTENER =====
function listenDrivers() {
    db.collection('drivers').orderBy('createdAt', 'desc').onSnapshot(snap => {
        allDrivers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDriversTable();
        updateDashDrivers();
        updateTripDriverFilter();
    }, err => showToast('Haydovchilar yuklanmadi: ' + err.message, 'error'));
}

function renderDriversTable() {
    const tbody = $('drivers-tbody');
    if (allDrivers.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Haydovchilar topilmadi</td></tr>';
        return;
    }
    tbody.innerHTML = allDrivers.map(d => `
        <tr>
            <td><strong>${d.name || '—'}</strong></td>
            <td>${d.carNumber || '—'}</td>
            <td>${d.phone || '—'}</td>
            <td><code class="login-code">${d.username || '—'}</code></td>
            <td>
                <span class="status-badge ${d.active ? 'active' : 'inactive'}">
                    ${d.active ? 'Faol' : 'Bloklangan'}
                </span>
            </td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit" onclick="openEditModal('${d.id}')" title="Tahrirlash">
                    <span class="material-icons-round">edit</span>
                </button>
                <button class="btn-icon ${d.active ? 'btn-block' : 'btn-activate'}" onclick="toggleDriverStatus('${d.id}', ${d.active})" title="${d.active ? 'Bloklash' : 'Faollashtirish'}">
                    <span class="material-icons-round">${d.active ? 'block' : 'check_circle'}</span>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteDriver('${d.id}', '${(d.name||'').replace(/'/g,'')}')" title="O'chirish">
                    <span class="material-icons-round">delete</span>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateDashDrivers() {
    const el = $('dash-drivers-list');
    if (!el) return;
    $('dash-driver-count').textContent = allDrivers.filter(d=>d.active).length;
    el.innerHTML = allDrivers.slice(0,5).map(d => `
        <div class="driver-info-row-admin">
            <span class="material-icons-round">${d.active?'check_circle':'block'}</span>
            <div>
                <div class="d-label">${d.username}</div>
                <div class="d-value">${d.name || '—'} · ${d.carNumber || '—'}</div>
            </div>
            <span class="status-badge ${d.active?'active':'inactive'}" style="margin-left:auto;">${d.active?'Faol':'Bloklangan'}</span>
        </div>
    `).join('');
}

function updateTripDriverFilter() {
    const sel = $('trip-driver-filter');
    const current = sel.value;
    sel.innerHTML = '<option value="all">Barcha haydovchilar</option>' +
        allDrivers.map(d => `<option value="${d.id}">${d.name || d.username}</option>`).join('');
    sel.value = current;
}

// Add driver
$('btn-add-driver').addEventListener('click', async () => {
    const name     = $('new-driver-name').value.trim();
    const carNum   = $('new-car-number').value.trim();
    const phone    = $('new-phone').value.trim();
    const rawUsername = $('new-username').value.trim();
    const username = rawUsername.toLowerCase(); // Kichik harflar bilan saqlash
    const password = $('new-password').value.trim();
    const note     = $('new-note').value.trim();

    if (!name || !username || !password) {
        showToast('Ism, login va parol majburiy!', 'error'); return;
    }

    // Check username uniqueness
    const existing = allDrivers.find(d => d.username === username);
    if (existing) { showToast('Bu login allaqachon mavjud!', 'error'); return; }

    try {
        await db.collection('drivers').add({
            name, carNumber: carNum, phone, username, password, note,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Clear form
        ['new-driver-name','new-car-number','new-phone','new-username','new-password','new-note']
            .forEach(id => $(id).value = '');
        showToast('✓ Haydovchi qo\'shildi!', 'success');
    } catch(err) {
        showToast('Xatolik: ' + err.message, 'error');
    }
});

// Toggle driver active/blocked
async function toggleDriverStatus(id, isActive) {
    const action = isActive ? 'bloklash' : 'faollashtirish';
    if (!confirm(`Haydovchini ${action}ni xohlaysizmi?`)) return;
    try {
        await db.collection('drivers').doc(id).update({ active: !isActive });
        showToast(`✓ Haydovchi ${isActive ? 'bloklandi' : 'faollashtirildi'}`, 'success');
    } catch(err) { showToast('Xatolik: ' + err.message, 'error'); }
}

// Delete driver
async function deleteDriver(id, name) {
    if (!confirm(`"${name}" ni o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
    try {
        await db.collection('drivers').doc(id).delete();
        showToast('✓ Haydovchi o\'chirildi', 'success');
    } catch(err) { showToast('Xatolik: ' + err.message, 'error'); }
}

// Edit modal
function openEditModal(id) {
    const driver = allDrivers.find(d => d.id === id);
    if (!driver) return;
    $('edit-driver-id').value = id;
    $('edit-driver-name').value = driver.name || '';
    $('edit-car-number').value = driver.carNumber || '';
    $('edit-phone').value = driver.phone || '';
    $('edit-username').value = driver.username || '';
    $('edit-password').value = '';
    $('edit-note').value = driver.note || '';
    $('edit-driver-modal').classList.add('active');
}

$('btn-close-edit-modal').addEventListener('click', () => $('edit-driver-modal').classList.remove('active'));

$('btn-save-edit-driver').addEventListener('click', async () => {
    const id = $('edit-driver-id').value;
    const updates = {
        name: $('edit-driver-name').value.trim(),
        carNumber: $('edit-car-number').value.trim(),
        phone: $('edit-phone').value.trim(),
        username: $('edit-username').value.trim(),
        note: $('edit-note').value.trim()
    };
    const newPw = $('edit-password').value.trim();
    if (newPw) updates.password = newPw;

    if (!updates.name || !updates.username) {
        showToast('Ism va login majburiy!', 'error'); return;
    }
    try {
        await db.collection('drivers').doc(id).update(updates);
        $('edit-driver-modal').classList.remove('active');
        showToast('✓ Haydovchi ma\'lumotlari yangilandi!', 'success');
    } catch(err) { showToast('Xatolik: ' + err.message, 'error'); }
});

// ===== SETTINGS - REAL-TIME =====
function listenSettings() {
    db.collection('settings').doc('global').onSnapshot(doc => {
        if (doc.exists) {
            const s = doc.data();
            $('admin-min-price').value = s.minPrice || 10000;
            $('admin-per-km').value = s.perKm || 3000;
            $('admin-per-min').value = s.perWaitMin || 500;
            $('tarif-summary-dash').innerHTML = `
                <div class="tarif-chip"><span class="tarif-chip-label">Minimal</span><span class="tarif-chip-value">${fmtNum(s.minPrice||0)}</span></div>
                <div class="tarif-chip"><span class="tarif-chip-label">Har km</span><span class="tarif-chip-value">${fmtNum(s.perKm||0)}</span></div>
                <div class="tarif-chip"><span class="tarif-chip-label">Kutish/min</span><span class="tarif-chip-value">${fmtNum(s.perWaitMin||0)}</span></div>
            `;
            calcSimulation();
        }
    });
}

function initPricing() {
    $('btn-save-pricing').addEventListener('click', async () => {
        const minP = parseInt($('admin-min-price').value)||0;
        const perKm = parseInt($('admin-per-km').value)||0;
        const perMin = parseInt($('admin-per-min').value)||0;
        if (minP<0||perKm<0||perMin<0) { showToast('Narxlar manfiy bo\'lishi mumkin emas!','error'); return; }
        try {
            await db.collection('settings').doc('global').set({ minPrice:minP, perKm, perWaitMin:perMin });
            showToast('✓ Tariflar saqlandi — APK ga real-time qo\'llanildi!','success');
        } catch(err) { showToast('Xatolik: '+err.message,'error'); }
    });
    ['admin-min-price','admin-per-km','admin-per-min','sim-km','sim-min'].forEach(id => {
        const el = $(id); if(el) el.addEventListener('input', calcSimulation);
    });
}

function calcSimulation() {
    const minP = parseInt($('admin-min-price').value)||0;
    const perKm = parseInt($('admin-per-km').value)||0;
    const perMin = parseInt($('admin-per-min').value)||0;
    const km = parseFloat($('sim-km').value)||0;
    const min = parseFloat($('sim-min').value)||0;
    const total = Math.max(km*perKm + min*perMin, km>0.05?minP:0);
    $('sim-price').textContent = fmtNum(total) + ' so\'m';
}

// ===== TRIPS - REAL-TIME =====
function listenTrips() {
    db.collection('trips').orderBy('date','desc').limit(500).onSnapshot(snap => {
        allTrips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateDashboard();
        renderTripsTable();
    }, err => console.warn('Trips error:', err));

    $('trip-driver-filter').addEventListener('change', () => {
        currentDriverFilter = $('trip-driver-filter').value;
        renderTripsTable();
    });
}

function filterTripsByPeriod(trips, period) {
    const now = new Date();
    const today = new Date().toISOString().split('T')[0];
    return trips.filter(t => {
        if (period==='all') return true;
        const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        const dateStr = d.toISOString().split('T')[0];
        if (period==='today') return dateStr===today;
        const diff = (now-d)/(1000*60*60*24);
        if (period==='week') return diff<=7;
        if (period==='month') return diff<=30;
        return true;
    });
}

function renderTripsTable() {
    let filtered = currentDriverFilter==='all' ? [...allTrips] :
        allTrips.filter(t => t.driverId===currentDriverFilter);
    filtered = filterTripsByPeriod(filtered, currentTripFilter);

    const totalIncome = filtered.reduce((s,t)=>s+t.price,0);
    const totalKm = filtered.reduce((s,t)=>s+(t.distance||0),0);
    $('trips-summary-banner').innerHTML = `
        <div class="tarif-chip"><span class="tarif-chip-label">Safarlar</span><span class="tarif-chip-value">${filtered.length}</span></div>
        <div class="tarif-chip"><span class="tarif-chip-label">Daromad</span><span class="tarif-chip-value">${fmtNum(totalIncome)}</span></div>
        <div class="tarif-chip"><span class="tarif-chip-label">Masofa (km)</span><span class="tarif-chip-value">${totalKm.toFixed(1)}</span></div>
    `;

    const tbody = $('admin-trips-tbody');
    if (filtered.length===0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Safarlar topilmadi</td></tr>'; return;
    }
    tbody.innerHTML = filtered.map((t,i) => {
        const d = t.date?.toDate ? t.date.toDate() : new Date(t.date||0);
        const dateStr = isNaN(d)?'—':fmtDate(d);
        return `<tr>
            <td class="num-cell">${i+1}</td>
            <td>${t.driverName||'—'}</td>
            <td>${dateStr}</td>
            <td class="price-cell">${fmtNum(t.price)} so'm</td>
            <td class="num-cell">${t.distance||0} km</td>
            <td class="num-cell">${t.waitMinutes||0} min</td>
        </tr>`;
    }).join('');
}

$$('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        $$('.chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        currentTripFilter = chip.dataset.filter;
        renderTripsTable();
    });
});

// ===== DASHBOARD =====
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const total = allTrips.reduce((s,t)=>s+t.price,0);
    const todayTrips = allTrips.filter(t => {
        const d = t.date?.toDate ? t.date.toDate() : new Date(t.date||0);
        return d.toISOString().split('T')[0]===today;
    });
    $('dash-total-income').textContent = fmtNum(total);
    $('dash-total-trips').textContent = allTrips.length;
    $('dash-today-income').textContent = fmtNum(todayTrips.reduce((s,t)=>s+t.price,0));
}

// ===== ADMIN PASSWORD CHANGE =====
function initPasswordChange() {
    // Open modal from sidebar (add button)
    $('btn-close-pw-modal').addEventListener('click', ()=>$('change-pw-modal').classList.remove('active'));
    $('btn-save-new-pw').addEventListener('click', () => {
        const np = $('admin-new-password').value;
        const cp = $('admin-confirm-password').value;
        if (!np||np.length<4) { showToast('Parol kamida 4 ta belgi','error'); return; }
        if (np!==cp) { showToast('Parollar mos kelmadi!','error'); return; }
        const creds = loadAdminCreds();
        creds.password = np;
        saveAdminCreds(creds);
        $('change-pw-modal').classList.remove('active');
        $('admin-new-password').value='';
        $('admin-confirm-password').value='';
        showToast('✓ Admin paroli o\'zgartirildi!','success');
    });
}
