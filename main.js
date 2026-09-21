// ==========================================
// ⚙️ MODUL UTAMA & SINKRONISASI (main.js)
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbymdKsDDnD31gURSiTleKNfehQv9jBHF2Ogthfz2ego7kmdsRrOVxU-V8G3IrGpkFLD0A/exec";

// 📦 DEKLARASI VARIABEL GLOBAL & LOKAL STORAGE
let currentUser = null;
let localServices = JSON.parse(localStorage.getItem('pos_services') || '[]');
let localInventory = JSON.parse(localStorage.getItem('pos_inventory') || '[]');
let localExpenses = JSON.parse(localStorage.getItem('pos_expenses') || '[]');
let localUsers = JSON.parse(localStorage.getItem('pos_users') || '[]');
let localDrafts = JSON.parse(localStorage.getItem('pos_drafts') || '[]');
let localMasterCategories = JSON.parse(localStorage.getItem('pos_categories') || '["LCD", "Charger", "Kabel", "Baterai", "Aksesoris"]');
let localMasterBrands = JSON.parse(localStorage.getItem('pos_brands') || '[{"category":"LCD","brand":"OG"},{"category":"LCD","brand":"Mitu"},{"category":"Charger","brand":"Anker"},{"category":"Charger","brand":"Vivan"}]');
let storeProfile = JSON.parse(localStorage.getItem('pos_store_profile') || '{}');

let kasirCart = [];
let selectedSparepartList = [];
let selectedServiceForTeknisi = null;
let calculatedTotalTeknisi = 0;

// 🗓️ UTILS: FORMAT TANGGAL & NOMINAL
function getLocalDateString(dateInput = new Date()) {
    if (!dateInput || dateInput === "-") return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput).split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatRupiahInput(input) {
    let val = input.value.replace(/\D/g, '');
    if (val === '') {
        input.value = '';
        return;
    }
    input.value = parseInt(val, 10).toLocaleString('id-ID');
}

function parseRawNumber(elementId) {
    let el = document.getElementById(elementId);
    if (!el) return 0;
    let val = el.value.replace(/\./g, '').replace(/\D/g, '');
    return parseFloat(val) || 0;
}

function formatRupiah(a) { return (!a && a !== 0) ? "0" : parseInt(a).toLocaleString('id-ID'); }

function formatDateTimeIndo(isoString) {
    if (!isoString || isoString === "-") return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes} WIB`;
}

// 📊 RINGKASAN DASHBOARD
function updateQuickStats() {
    const prosesCount = localServices.filter(s => (s.Status || s.status) === 'Proses').length;
    const todayStr = getLocalDateString();
    let todayOmset = 0;

    localServices.filter(s => {
        const st = String(s.Status || s.status || "");
        const tgl = getLocalDateString(s.Tgl_Ambil || s.tgl_ambil || s.Tgl_Masuk || s.tgl_masuk || "");
        return (st.includes("Diambil") || st.includes("Berhasil")) && tgl === todayStr;
    }).forEach(s => todayOmset += parseFloat(s.Total_Biaya || s.total_biaya || 0));

    const elServis = document.getElementById('dashServisCount');
    const elOmset = document.getElementById('dashOmsetToday');
    if(elServis) elServis.innerText = `${prosesCount} Unit`;
    if(elOmset) elOmset.innerText = `Rp ${formatRupiah(todayOmset)}`;
}

// ⚡ SINKRONISASI OTOMATIS & MANUAL
let syncTimeout = null;
function triggerAutoSyncBackground(isImmediate = false) {
    const badge = document.getElementById('syncStatus');
    if(badge) {
        badge.innerText = "🔄 Syncing...";
        badge.className = "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 cursor-pointer";
    }
    
    clearTimeout(syncTimeout);
    
    const runSync = async () => {
        if (!navigator.onLine) {
            if(badge) {
                badge.innerText = "⚡ Off-line Ready";
                badge.className = "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 cursor-pointer";
            }
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "syncBulkData",
                    services: localServices,
                    inventory: localInventory,
                    expenses: localExpenses
                })
            });
            const res = await response.json();
            if(res.status === "success" && badge) {
                badge.innerText = "⚡ Off-line Ready";
                badge.className = "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 cursor-pointer";
            }
        } catch(e) {
            if(badge) {
                badge.innerText = "⚠️ Offline Mode";
                badge.className = "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 cursor-pointer";
            }
        }
    };

    if(isImmediate) runSync();
    else syncTimeout = setTimeout(runSync, 2000);
}

async function manualSync() {
    await fetchMasterDataBackground();
    alert("🔄 Data berhasil disinkronkan dengan Google Sheets!");
}

async function fetchMasterDataBackground() {
    if (!navigator.onLine) return;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "getAllMasterData" })
        });
        const res = await response.json();
        if(res.status === "success") {
            if(res.inventory && res.inventory.length > 0) localInventory = res.inventory;
            if(res.services && res.services.length > 0) localServices = res.services;
            if(res.expenses && res.expenses.length > 0) localExpenses = res.expenses;
            if(res.users && res.users.length > 0) localUsers = res.users;

            saveAllLocal();
        }
    } catch(e){}
}

function saveAllLocal() {
    localStorage.setItem('pos_services', JSON.stringify(localServices));
    localStorage.setItem('pos_inventory', JSON.stringify(localInventory));
    localStorage.setItem('pos_expenses', JSON.stringify(localExpenses));
    localStorage.setItem('pos_users', JSON.stringify(localUsers));
    localStorage.setItem('pos_drafts', JSON.stringify(localDrafts));
    localStorage.setItem('pos_categories', JSON.stringify(localMasterCategories));
    localStorage.setItem('pos_brands', JSON.stringify(localMasterBrands));
    localStorage.setItem('pos_store_profile', JSON.stringify(storeProfile));
    updateQuickStats();
    triggerAutoSyncBackground();
}

// 📷 MODUL SCANNER KAMERA
let html5QrCode = null;
let activeScannerTarget = "";

function bukaKameraScanner(targetMode) {
    activeScannerTarget = targetMode;
    document.getElementById('modalScanner').classList.remove('hidden');

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader-kamera");
    }

    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            handleHasilScanKamera(decodedText);
        },
        (errorMessage) => {}
    ).catch(err => {
        alert("Gagal mengaktifkan kamera: " + err);
        document.getElementById('modalScanner').classList.add('hidden');
    });
}

function tutupKameraScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById('modalScanner').classList.add('hidden');
        }).catch(err => {
            document.getElementById('modalScanner').classList.add('hidden');
        });
    } else {
        document.getElementById('modalScanner').classList.add('hidden');
    }
}

function handleHasilScanKamera(kodeScan) {
    tutupKameraScanner();
    const kodeClean = String(kodeScan).trim().toLowerCase();

    if (activeScannerTarget === 'kasir') {
        const itemDitemukan = localInventory.find(i => 
            String(i.sku || i.SKU || "").toLowerCase() === kodeClean ||
            String(i.barcode_pabrik || i.Barcode_Pabrik || "").toLowerCase() === kodeClean
        );

        if (itemDitemukan) {
            if(typeof addKasirCartItem === 'function') addKasirCartItem(itemDitemukan.sku || itemDitemukan.SKU);
        } else {
            alert(`⚠️ Barang dengan barcode "${kodeScan}" tidak ditemukan di inventaris!`);
        }
    } 
    else if (activeScannerTarget === 'teknisi') {
        if(document.getElementById('sparepartSearch')) document.getElementById('sparepartSearch').value = kodeScan;
        if(typeof searchSparepart === 'function') searchSparepart(kodeScan);
    } 
    else if (activeScannerTarget === 'tambahManual') {
        if(document.getElementById('manualBarcodePabrik')) document.getElementById('manualBarcodePabrik').value = kodeScan;
        if(document.getElementById('manualNama')) document.getElementById('manualNama').focus();
    }
}

// 🧭 NAVIGASI HALAMAN & STATE
function openPage(pageId) {
    if (!currentUser) {
        showMainMenu();
        return;
    }
    document.querySelectorAll('.card, #mainSection').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    history.pushState({ page: pageId }, '', '#' + pageId);
}

// 🔙 FUNGSI KEMBALI STABIL (Langsung ke Dashboard Utama)
function goBack() {
    showMainMenu();
}

window.onpopstate = function(event) {
    if (!currentUser) {
        showMainMenu();
        return;
    }
    document.querySelectorAll('.card, #mainSection').forEach(el => el.classList.add('hidden'));
    if (event.state && event.state.page) {
        document.getElementById(event.state.page).classList.remove('hidden');
    } else {
        showMainMenu();
    }
};

function showMainMenu() {
    document.querySelectorAll('.card, #mainSection').forEach(el => el.classList.add('hidden'));
    if(currentUser) {
        document.getElementById('mainSection').classList.remove('hidden');
        updateQuickStats();
    } else {
        window.location.hash = "";
        document.getElementById('loginSection').classList.remove('hidden');
    }
}

// 🚀 INISIALISASI APLIKASI
window.onload = function() {
    fetchMasterDataBackground();
    if(typeof populateDatalists === 'function') populateDatalists();

    // 🔒 PENTING: Cek dari sessionStorage (Akan null jika browser baru dibuka)
    const savedUser = sessionStorage.getItem('pos_user');
    if(savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('mainSection').classList.remove('hidden');
        document.getElementById('userGreeting').innerText = `Halo, ${currentUser.nama} (${currentUser.role}) 👋`;
        if(typeof applyRolePermissions === 'function') applyRolePermissions();
        updateQuickStats();
    } else {
        // Jika tidak ada sesi login, kunci halaman meskipun URL ditempel langsung
        currentUser = null;
        showMainMenu();
    }

    setInterval(() => {
        if (currentUser && navigator.onLine) {
            fetchMasterDataBackground();
        }
    }, 30000);
};