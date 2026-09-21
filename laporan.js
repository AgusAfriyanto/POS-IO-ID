// ==========================================
// 📊 MODUL LAPORAN & PENGATURAN TOKO (laporan.js)
// ==========================================

// 📊 LAPORAN KEUANGAN & ANALISIS
function applyReportFilter() {
    const range = document.getElementById('reportFilterRange')?.value || "month";
    const customDiv = document.getElementById('customDateRange');
    if(customDiv) {
        if(range === 'custom') customDiv.classList.remove('hidden');
        else customDiv.classList.add('hidden');
    }

    const todayStr = getLocalDateString();

    let filteredSrv = localServices.filter(s => {
        const st = String(s.Status || s.status || "");
        return st.includes("Diambil") || st.includes("Berhasil");
    });

    let filteredExp = localExpenses;

    if(range === 'today') {
        filteredSrv = filteredSrv.filter(s => getLocalDateString(s.Tgl_Ambil || s.tgl_ambil || s.Tgl_Masuk || s.tgl_masuk) === todayStr);
        filteredExp = filteredExp.filter(e => getLocalDateString(e.tanggal || e.Tanggal) === todayStr);
    } else if(range === 'month') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        filteredSrv = filteredSrv.filter(s => {
            const d = new Date(s.Tgl_Ambil || s.tgl_ambil || s.Tgl_Masuk || s.tgl_masuk);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        filteredExp = filteredExp.filter(e => {
            const d = new Date(e.tanggal || e.Tanggal);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    } else if(range === 'custom') {
        const start = document.getElementById('startDate')?.value;
        const end = document.getElementById('endDate')?.value;
        if(start && end) {
            filteredSrv = filteredSrv.filter(s => {
                const tgl = getLocalDateString(s.Tgl_Ambil || s.tgl_ambil || s.Tgl_Masuk || s.tgl_masuk);
                return tgl >= start && tgl <= end;
            });
            filteredExp = filteredExp.filter(e => {
                const tgl = getLocalDateString(e.tanggal || e.Tanggal);
                return tgl >= start && tgl <= end;
            });
        }
    }

    let omset = 0, cash = 0, qris = 0, totalJasa = 0;
    
    filteredSrv.forEach(s => {
        const val = parseFloat(s.Total_Biaya || s.total_biaya) || 0;
        const jasa = parseFloat(s.Biaya_Jasa || s.biaya_jasa) || 0;
        
        omset += val;
        totalJasa += jasa;

        const pay = String(s.Metode_Pembayaran || s.metode_pembayaran || "");
        if(pay.includes('QRIS') || pay.includes('Transfer')) qris += val;
        else cash += val;
    });

    let totalExp = 0;
    filteredExp.forEach(e => totalExp += parseFloat(e.nominal || e.Nominal) || 0);

    let labaKotor = totalJasa;
    let labaBersih = labaKotor - totalExp;

    if(document.getElementById('statOmset')) document.getElementById('statOmset').innerText = `Rp ${formatRupiah(omset)}`;
    if(document.getElementById('statCash')) document.getElementById('statCash').innerText = `Rp ${formatRupiah(cash)}`;
    if(document.getElementById('statQris')) document.getElementById('statQris').innerText = `Rp ${formatRupiah(qris)}`;
    if(document.getElementById('statLabaKotor')) document.getElementById('statLabaKotor').innerText = `Rp ${formatRupiah(labaKotor)}`;
    if(document.getElementById('statExp')) document.getElementById('statExp').innerText = `Rp ${formatRupiah(totalExp)}`;
    if(document.getElementById('statLaba')) document.getElementById('statLaba').innerText = `Rp ${formatRupiah(labaBersih)}`;

    renderTopCustomers(filteredSrv);
}

function renderTopCustomers(filteredSrvData) {
    const listDiv = document.getElementById('topCustomersList');
    if(!listDiv) return;

    const dataToProcess = filteredSrvData || localServices.filter(s => {
        const st = String(s.Status || s.status || "");
        return st.includes("Diambil") || st.includes("Berhasil");
    });

    if(dataToProcess.length === 0) {
        listDiv.innerHTML = "<small style='color:#777;'>Belum ada data transaksi pelanggan pada periode ini.</small>";
        return;
    }

    const customerMap = {};
    dataToProcess.forEach(s => {
        const nama = (s.Nama_Pelanggan || s.nama_pelanggan || "Tanpa Nama").trim();
        const total = parseFloat(s.Total_Biaya || s.total_biaya) || 0;
        const hp = s.No_HP || s.no_hp || "-";

        if(!customerMap[nama]) {
            customerMap[nama] = { nama: nama, hp: hp, count: 0, totalSpend: 0 };
        }
        customerMap[nama].count += 1;
        customerMap[nama].totalSpend += total;
    });

    let customerArray = Object.values(customerMap);
    const sortBy = document.getElementById('customerSortFilter') ? document.getElementById('customerSortFilter').value : 'freq';

    if(sortBy === 'val') {
        customerArray.sort((a, b) => b.totalSpend - a.totalSpend);
    } else {
        customerArray.sort((a, b) => b.count - a.count);
    }

    listDiv.innerHTML = customerArray.slice(0, 10).map((c, idx) => `
        <div class="item-row" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <b>#${idx + 1} ${c.nama}</b> (${c.hp})<br>
                <small>Total Transaksi: <b>${c.count}x Datang</b></small>
            </div>
            <div style="text-align:right;">
                <b style="color:green;">Rp ${formatRupiah(c.totalSpend)}</b>
            </div>
        </div>
    `).join('');
}

function loadFinancialReport() { applyReportFilter(); }

function switchReportTab(n) { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    if(document.getElementById(`btnTab${n}`)) document.getElementById(`btnTab${n}`).classList.add('active'); 
    
    if(document.getElementById('tabKeuangan')) document.getElementById('tabKeuangan').classList.add('hidden'); 
    if(document.getElementById('tabTerlaris')) document.getElementById('tabTerlaris').classList.add('hidden'); 
    if(document.getElementById('tabNgendap')) document.getElementById('tabNgendap').classList.add('hidden'); 
    if(document.getElementById('tabPelanggan')) document.getElementById('tabPelanggan').classList.add('hidden');
    
    if(n===1 && document.getElementById('tabKeuangan')) document.getElementById('tabKeuangan').classList.remove('hidden'); 
    if(n===2 && document.getElementById('tabTerlaris')) document.getElementById('tabTerlaris').classList.remove('hidden'); 
    if(n===3 && document.getElementById('tabNgendap')) document.getElementById('tabNgendap').classList.remove('hidden'); 
    if(n===4 && document.getElementById('tabPelanggan')) {
        document.getElementById('tabPelanggan').classList.remove('hidden');
        applyReportFilter();
    }
}

// ⚙️ PENGATURAN PROFIL TOKO & NOTA
function konversiLogoToBase64(input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("⚠️ Ukuran gambar terlalu besar! Pilih gambar di bawah 2MB.");
            input.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            document.getElementById('setStoreLogo').value = base64Image;
            document.getElementById('previewLogoContainer').innerHTML = `
                <img src="${base64Image}" style="max-width: 80px; max-height: 80px; border: 1px solid #ccc; padding: 2px; border-radius: 4px; margin-top:5px;">
                <br><small style="color:green;">✓ Logo siap disimpan</small>
            `;
        };
        reader.readAsDataURL(file);
    }
}

function loadStoreProfileInput() {
    if(document.getElementById('setStoreName')) document.getElementById('setStoreName').value = storeProfile.name || "IO ID STORE";
    if(document.getElementById('setStoreAddress')) document.getElementById('setStoreAddress').value = storeProfile.address || "Sira Jaya (Menendang) kec. pengkadan";
    if(document.getElementById('setStorePhone')) document.getElementById('setStorePhone').value = storeProfile.phone || "085753712624";
    if(document.getElementById('setStoreLogo')) document.getElementById('setStoreLogo').value = storeProfile.logo || "";
    if(document.getElementById('setStoreFooter')) document.getElementById('setStoreFooter').value = storeProfile.footer || "";

    const previewDiv = document.getElementById('previewLogoContainer');
    if (previewDiv) {
        if (storeProfile.logo) {
            previewDiv.innerHTML = `
                <img src="${storeProfile.logo}" style="max-width: 80px; max-height: 80px; border: 1px solid #ccc; padding: 2px; border-radius: 4px; margin-top:5px;">
                <br><small style="color:gray;">Logo saat ini</small>
            `;
        } else {
            previewDiv.innerHTML = "";
        }
    }
}

function simpanProfilToko() {
    storeProfile = {
        name: document.getElementById('setStoreName')?.value.trim() || "IO ID STORE",
        address: document.getElementById('setStoreAddress')?.value.trim() || "",
        phone: document.getElementById('setStorePhone')?.value.trim() || "",
        logo: document.getElementById('setStoreLogo')?.value.trim() || "",
        footer: document.getElementById('setStoreFooter')?.value.trim() || ""
    };

    saveAllLocal();
    alert("✅ Pengaturan Nota & Profil Toko Berhasil Disimpan!");
}

function switchSettingsTab(n) {
    if(document.getElementById('btnSetTab1')) document.getElementById('btnSetTab1').classList.remove('active');
    if(document.getElementById('btnSetTab2')) document.getElementById('btnSetTab2').classList.remove('active');
    if(document.getElementById('btnSetTab3')) document.getElementById('btnSetTab3').classList.remove('active');
    
    if(document.getElementById('tabProfilNota')) document.getElementById('tabProfilNota').classList.add('hidden');
    if(document.getElementById('tabKelolaStaf')) document.getElementById('tabKelolaStaf').classList.add('hidden');
    if(document.getElementById('tabMasterCategoryBrand')) document.getElementById('tabMasterCategoryBrand').classList.add('hidden');

    if (n === 1) {
        if(document.getElementById('btnSetTab1')) document.getElementById('btnSetTab1').classList.add('active');
        if(document.getElementById('tabProfilNota')) document.getElementById('tabProfilNota').classList.remove('hidden');
    } else if (n === 2) {
        if(document.getElementById('btnSetTab2')) document.getElementById('btnSetTab2').classList.add('active');
        if(document.getElementById('tabKelolaStaf')) document.getElementById('tabKelolaStaf').classList.remove('hidden');
        if(typeof renderUsersList === 'function') renderUsersList();
    } else if (n === 3) {
        if(document.getElementById('btnSetTab3')) document.getElementById('btnSetTab3').classList.add('active');
        if(document.getElementById('tabMasterCategoryBrand')) document.getElementById('tabMasterCategoryBrand').classList.remove('hidden');
        if(typeof renderMasterCategoriesBrands === 'function') renderMasterCategoriesBrands();
    }
}