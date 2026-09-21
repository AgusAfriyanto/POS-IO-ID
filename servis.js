// ==========================================
// 🔧 MODUL SERVIS & GARANSI (servis.js)
// ==========================================

// ⚠️ CEK NAMA PELANGGAN GANDA
function cekNamaPelangganGanda(namaInput) {
    const hintDiv = document.getElementById('namaHint');
    if (!hintDiv) return;
    const q = namaInput.trim().toLowerCase();
    if(!q) { hintDiv.innerText = ""; return; }

    const found = localServices.find(s => String(s.Nama_Pelanggan || s.nama_pelanggan || "").trim().toLowerCase() === q);
    if(found) {
        const hp = found.No_HP || found.no_hp || "";
        hintDiv.innerHTML = `⚠️ Nama <b>"${found.Nama_Pelanggan || found.nama_pelanggan}"</b> pernah terdaftar (HP: ${hp}). Gunakan nama ini jika orang yang sama.`;
        if(hp && !document.getElementById('noHp').value) {
            document.getElementById('noHp').value = hp;
        }
    } else {
        hintDiv.innerText = "";
    }
}

// 📝 SIMPAN SERVIS MASUK
function simpanServisKasirLokal() {
    const nama = document.getElementById('namaPelanggan').value;
    const hp = document.getElementById('noHp').value;
    const tipe = document.getElementById('tipeHp').value;
    const rusak = document.getElementById('kerusakan').value;

    if(!nama || !tipe) { alert("Nama Pelanggan & Tipe HP wajib diisi!"); return; }

    const noNota = "SRV-" + String(localServices.length + 1).padStart(3, '0');
    const newServis = {
        No_Nota: noNota,
        Tgl_Masuk: new Date().toISOString(),
        Nama_Pelanggan: nama,
        No_HP: hp,
        Tipe_HP: tipe,
        Kerusakan: rusak,
        Teknisi_ID: "-",
        Biaya_Jasa: 0,
        Sparepart_Diperbaiki: "-",
        Garansi_Hari: 0,
        Total_Biaya: 0,
        Status: "Proses",
        Metode_Pembayaran: "-",
        Tgl_Ambil: "-"
    };

    localServices.push(newServis);
    saveAllLocal();
    triggerAutoSyncBackground(true);

    alert("Servis Masuk Berhasil Disimpan Instant! No Nota: " + noNota);
    document.getElementById('namaPelanggan').value = "";
    document.getElementById('noHp').value = "";
    document.getElementById('tipeHp').value = "";
    document.getElementById('kerusakan').value = "";
    if(document.getElementById('namaHint')) document.getElementById('namaHint').innerText = "";
    goBack();
}

// 📋 RENDER & FILTER DAFTAR SERVIS
function renderServisList() {
    filterDaftarServis(document.getElementById('servisSearch')?.value || "");
}

function filterDaftarServis(query) {
    const q = query.toLowerCase().trim();
    const role = currentUser ? currentUser.role.toLowerCase() : '';

    let listToDisplay = localServices.filter(item => {
        const st = String(item.Status || item.status || "Proses");
        return !st.includes("Diambil") && !st.includes("Berhasil");
    });

    if (role.includes('teknisi')) {
        listToDisplay = listToDisplay.filter(item => {
            const st = String(item.Status || item.status || "Proses");
            return st === "Proses";
        });
    }

    const filtered = listToDisplay.filter(item => {
        const nota = String(item.No_Nota || item.no_nota || "").toLowerCase();
        const nama = String(item.Nama_Pelanggan || item.nama_pelanggan || "").toLowerCase();
        const tipe = String(item.Tipe_HP || item.tipe_hp || "").toLowerCase();
        const st = String(item.Status || item.status || "").toLowerCase();
        return nota.includes(q) || nama.includes(q) || tipe.includes(q) || st.includes(q);
    });

    const listDiv = document.getElementById('servisList');
    if(!listDiv) return;
    if(filtered.length === 0) listDiv.innerText = "Tidak ada antrean pekerjaan servis aktif.";
    else {
        listDiv.innerHTML = filtered.map(item => {
            const nota = item.No_Nota || item.no_nota;
            const tipe = item.Tipe_HP || item.tipe_hp;
            const nama = item.Nama_Pelanggan || item.nama_pelanggan;
            const rusak = item.Kerusakan || item.kerusakan;
            const st = item.Status || item.status || "Proses";
            const total = item.Total_Biaya || item.total_biaya || 0;

            return `
            <div class="item-row" onclick="handleServisClick('${nota}')">
                <b>[${nota}] ${tipe} (${nama})</b><br>
                Kerusakan: ${rusak}<br>
                Status: <b style="color:${st === 'Proses' ? '#ffc107' : '#17a2b8'};">${st}</b> | Total: Rp ${formatRupiah(total)}
                <div style="margin-top:8px;" onclick="event.stopPropagation();">
                    ${(st === 'Proses' && (role.includes('teknisi') || role.includes('owner'))) ? `<button class="btn-warning btn-sm" onclick="bukaModalTeknisi('${nota}')">🛠️ Kerjakan / Isi Sparepart</button>` : ''}
                    ${(st === 'Proses' && role.includes('kasir') && !role.includes('owner')) ? `<small style="color:#856404; font-weight:bold;">🟡 Sedang Dikerjakan Teknisi</small>` : ''}
                    ${(st === 'Selesai' && !role.includes('teknisi')) ? `<button class="btn-success btn-sm" onclick="openPage('kasirPenjualanSection'); addKasirCartService('${nota}');">🛒 Ambil & Pelunasan Kasir</button>` : ''}
                </div>
            </div>
        `}).join('');
    }
}

function handleServisClick(noNota) {
    const item = localServices.find(s => (s.No_Nota || s.no_nota) === noNota);
    if(!item) return;
    const st = item.Status || item.status || "Proses";
    const role = currentUser ? currentUser.role.toLowerCase() : '';

    if(st.includes("Diambil") || st.includes("Berhasil")) {
        bukaNotaDetail(noNota);
    } else if(st === "Selesai") {
        if(!role.includes('teknisi')) {
            openPage('kasirPenjualanSection');
            addKasirCartService(noNota);
        }
    } else {
        if(role.includes('teknisi') || role.includes('owner')) {
            bukaModalTeknisi(noNota);
        } else {
            alert("Servis ini masih dalam pengerjaan teknisi.");
        }
    }
}

// 🛠️ MODUL TEKNISI (PENGERJAAN & SPAREPART)
function bukaModalTeknisi(noNota) {
    const item = localServices.find(s => (s.No_Nota || s.no_nota) === noNota);
    if(!item) return;
    selectedServiceForTeknisi = noNota;

    const nota = item.No_Nota || item.no_nota;
    const nama = item.Nama_Pelanggan || item.nama_pelanggan;
    const tipe = item.Tipe_HP || item.tipe_hp;
    const rusak = item.Kerusakan || item.kerusakan;

    document.getElementById('teknisiInfo').innerHTML = `<b>Nota:</b> ${nota}<br><b>Pelanggan:</b> ${nama} (${tipe})<br><b>Kerusakan:</b> ${rusak}`;
    selectedSparepartList = [];
    renderSelectedSpareparts();
    document.getElementById('tindakanManual').value = "";
    document.getElementById('biayaJasa').value = "";
    document.getElementById('garansiHari').value = "";
    hitungTotalTeknisi();
    openPage('teknisiModal');
}

function searchSparepart(query) {
    const resultsDiv = document.getElementById('searchResults');
    if(!resultsDiv) return;
    if(!query || query.trim() === "") { resultsDiv.classList.add('hidden'); return; }
    const q = query.toLowerCase().trim();
    const matches = localInventory.filter(item => {
        const sku = String(item.sku || item.SKU || "").toLowerCase();
        const barcodePabrik = String(item.barcode_pabrik || item.Barcode_Pabrik || "").toLowerCase();
        const nama = String(item.nama_barang || item.Nama_Barang || "").toLowerCase();
        return sku.includes(q) || barcodePabrik.includes(q) || nama.includes(q);
    });

    if(matches.length > 0) {
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = matches.map(item => {
            const sku = item.sku || item.SKU;
            const nama = item.nama_barang || item.Nama_Barang;
            const stok = item.stok || item.Stok || 0;
            const jual = item.harga_jual || item.Harga_Jual || 0;
            return `
            <div class="search-item" onclick="selectSparepart('${sku}')">
                <span class="badge-sku">${sku}</span> <b>${nama}</b><br>
                <small>Stok: ${stok} | Harga: Rp ${formatRupiah(jual)}</small>
            </div>
        `}).join('');
    } else {
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = `<div class="search-item" style="color: #888;">Barang tidak ditemukan.</div>`;
    }
}

function selectSparepart(sku) {
    const item = localInventory.find(i => String(i.sku || i.SKU) === String(sku));
    if(item) {
        selectedSparepartList.push(item);
        renderSelectedSpareparts();
        document.getElementById('sparepartSearch').value = "";
        document.getElementById('searchResults').classList.add('hidden');
        hitungTotalTeknisi();
    }
}

function renderSelectedSpareparts() {
    const div = document.getElementById('selectedSpareparts');
    if(!div) return;
    if(selectedSparepartList.length === 0) { div.innerHTML = ""; return; }
    div.innerHTML = "<b>Sparepart Terpilih:</b>" + selectedSparepartList.map((item, idx) => {
        const sku = item.sku || item.SKU;
        const nama = item.nama_barang || item.Nama_Barang;
        const jual = item.harga_jual || item.Harga_Jual || 0;
        return `
        <div style="background: #e9ecef; padding: 6px; border-radius: 4px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span><span class="badge-sku">${sku}</span> ${nama} (Rp ${formatRupiah(jual)})</span>
            <button type="button" class="btn-danger btn-sm" onclick="removeSparepart(${idx})">❌</button>
        </div>
    `}).join('');
}

function removeSparepart(index) {
    selectedSparepartList.splice(index, 1);
    renderSelectedSpareparts();
    hitungTotalTeknisi();
}

function hitungTotalTeknisi() {
    const jasa = parseRawNumber('biayaJasa');
    let totalSparepart = 0;
    selectedSparepartList.forEach(item => totalSparepart += parseFloat(item.harga_jual || item.Harga_Jual) || 0);
    calculatedTotalTeknisi = jasa + totalSparepart;
    if(document.getElementById('dispTotalTeknisi')) {
        document.getElementById('dispTotalTeknisi').innerText = `Rp ${formatRupiah(calculatedTotalTeknisi)}`;
    }
}

function simpanPengerjaanTeknisiLokal() {
    const s = localServices.find(item => (item.No_Nota || item.no_nota) === selectedServiceForTeknisi);
    if(s) {
        let usedNamesArr = selectedSparepartList.map(i => i.nama_barang || i.Nama_Barang);
        const man = document.getElementById('tindakanManual').value;
        if(man) usedNamesArr.push(man);

        s.Teknisi_ID = currentUser ? currentUser.id : "Teknisi";
        s.Biaya_Jasa = parseRawNumber('biayaJasa');
        s.Sparepart_Diperbaiki = usedNamesArr.join(', ') || "-";
        s.Garansi_Hari = document.getElementById('garansiHari').value || 0;
        s.Total_Biaya = calculatedTotalTeknisi;
        s.Status = "Selesai";

        selectedSparepartList.forEach(sp => {
            const spSku = sp.sku || sp.SKU;
            const invItem = localInventory.find(i => (i.sku || i.SKU) === spSku);
            if(invItem) {
                const st = parseInt(invItem.stok || invItem.Stok) || 0;
                invItem.stok = Math.max(0, st - 1);
            }
        });

        saveAllLocal();
        triggerAutoSyncBackground(true);

        alert("Pengerjaan Servis Berhasil Disimpan Instant & Siap Diambil di Kasir!");
        goBack();
    }
}

// 🛡️ TRACKING GARANSI
function renderGaransiList(query = "") {
    const div = document.getElementById('garansiList');
    if(!div) return;
    const q = query.toLowerCase().trim();
    const completedServices = localServices.filter(s => {
        const st = String(s.Status || s.status || "");
        return st.includes("Diambil") || st.includes("Berhasil");
    });

    const filtered = completedServices.filter(item => {
        const nota = String(item.No_Nota || item.no_nota || "").toLowerCase();
        const nama = String(item.Nama_Pelanggan || item.nama_pelanggan || "").toLowerCase();
        const tipe = String(item.Tipe_HP || item.tipe_hp || "").toLowerCase();
        const hp = String(item.No_HP || item.no_hp || "").toLowerCase();
        return nota.includes(q) || nama.includes(q) || tipe.includes(q) || hp.includes(q);
    });

    if(filtered.length === 0) { div.innerText = "Tidak ada riwayat garansi."; return; }

    const now = new Date();
    div.innerHTML = filtered.map(item => {
        const nota = item.No_Nota || item.no_nota;
        const nama = item.Nama_Pelanggan || item.nama_pelanggan || "Tanpa Nama";
        const tipe = item.Tipe_HP || item.tipe_hp;
        const hp = item.No_HP || item.no_hp || "-";
        const garansiHari = parseInt(item.Garansi_Hari || item.garansi_hari) || 0;
        const tglAmbilStr = item.Tgl_Ambil || item.tgl_ambil || item.Tgl_Masuk || item.tgl_masuk;

        let statusGaransiHtml = "";
        if (tglAmbilStr && tglAmbilStr !== "-") {
            const tglAmbil = new Date(tglAmbilStr);
            const tglExpired = new Date(tglAmbil);
            tglExpired.setDate(tglExpired.getDate() + garansiHari);

            const diffTime = tglExpired - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
                statusGaransiHtml = `<span class="garansi-aktif">🟢 GARANSI AKTIF (Sisa ${diffDays} Hari)</span>`;
            } else {
                statusGaransiHtml = `<span class="garansi-expired">🔴 KADALUWARSA (Expired ${Math.abs(diffDays)} Hari lalu)</span>`;
            }
        } else {
            statusGaransiHtml = `<span class="garansi-expired">⚠️ Belum Diambil</span>`;
        }

        return `
        <div class="item-row">
            <b>[${nota}] ${tipe} (${nama})</b><br>
            📞 No. HP: <b>${hp}</b><br>
            🕒 Waktu Penyerahan: ${formatDateTimeIndo(tglAmbilStr)}<br>
            🛡️ Durasi Garansi: <b>${garansiHari} Hari</b><br>
            Status Garansi: ${statusGaransiHtml}
            <div style="margin-top:8px;">
                <button class="btn-info btn-sm" onclick="bukaNotaDetail('${nota}')">📄 Lihat Nota Rincian</button>
            </div>
        </div>
    `}).join('');
}
// =========================================================================
// 🛡️ 1. FUNGSI RENDER DAFTAR GARANSI (DENGAN TOMBOL NOTA AKTIF)
// =========================================================================
function renderGaransiList(query = "") {
    const div = document.getElementById('garansiList');
    if (!div) return;

    const q = query.toLowerCase().trim();
    
    // Ambil data servis lokal
    const services = (typeof localServices !== 'undefined' && Array.isArray(localServices)) 
        ? localServices 
        : JSON.parse(localStorage.getItem('pos_services') || '[]');

    // Filter hanya servis yang sudah Selesai / Diambil / Berhasil
    const completedServices = services.filter(s => {
        const st = String(s.Status || s.status || "");
        return st.includes("Diambil") || st.includes("Berhasil") || st.includes("Selesai");
    });

    const filtered = completedServices.filter(item => {
        const nota = String(item.No_Nota || item.no_nota || "").toLowerCase();
        const nama = String(item.Nama_Pelanggan || item.nama_pelanggan || "").toLowerCase();
        const tipe = String(item.Tipe_HP || item.tipe_hp || "").toLowerCase();
        const hp = String(item.No_HP || item.no_hp || "").toLowerCase();
        return nota.includes(q) || nama.includes(q) || tipe.includes(q) || hp.includes(q);
    });

    if (filtered.length === 0) { 
        div.innerHTML = "<div class='p-4 text-center text-gray-500'>Tidak ada riwayat garansi.</div>"; 
        return; 
    }

    const now = new Date();
    div.innerHTML = filtered.map(item => {
        // Ambil No Nota dengan fallback aman
        const nota = String(item.No_Nota || item.no_nota || item.nota || "").trim();
        const nama = item.Nama_Pelanggan || item.nama_pelanggan || "Tanpa Nama";
        const tipe = item.Tipe_HP || item.tipe_hp || "-";
        const hp = item.No_HP || item.no_hp || "-";
        const garansiHari = parseInt(item.Garansi_Hari || item.garansi_hari) || 0;
        const tglAmbilStr = item.Tgl_Ambil || item.tgl_ambil || item.Tgl_Masuk || item.tgl_masuk;

        let statusGaransiHtml = "";
        if (tglAmbilStr && tglAmbilStr !== "-") {
            const tglAmbil = new Date(tglAmbilStr);
            const tglExpired = new Date(tglAmbil);
            tglExpired.setDate(tglExpired.getDate() + garansiHari);

            const diffTime = tglExpired - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
                statusGaransiHtml = `<span class="garansi-aktif">🟢 GARANSI AKTIF (Sisa ${diffDays} Hari)</span>`;
            } else {
                statusGaransiHtml = `<span class="garansi-expired">🔴 KADALUWARSA (Expired ${Math.abs(diffDays)} Hari lalu)</span>`;
            }
        } else {
            statusGaransiHtml = `<span class="garansi-expired">⚠️ Belum Diambil</span>`;
        }

        const tglIndo = typeof formatDateTimeIndo === 'function' ? formatDateTimeIndo(tglAmbilStr) : tglAmbilStr;

        return `
        <div class="item-row">
            <b>[${nota}] ${tipe} (${nama})</b><br>
            📞 No. HP: <b>${hp}</b><br>
            🕒 Waktu Penyerahan: ${tglIndo}<br>
            🛡️ Durasi Garansi: <b>${garansiHari} Hari</b><br>
            Status Garansi: ${statusGaransiHtml}
            <div style="margin-top:8px;">
                <button type="button" class="btn-info btn-sm" onclick="bukaNotaDetail('${nota}')">📄 Lihat Nota Rincian</button>
            </div>
        </div>
    `}).join('');
}

// =========================================================================
// 📄 2. FUNGSI MEMBUKA MODAL DETAIL NOTA
// =========================================================================
function bukaNotaDetail(noNota) {
    if (!noNota) {
        alert("⚠️ Nomor Nota tidak ditemukan!");
        return;
    }

    const services = (typeof localServices !== 'undefined' && Array.isArray(localServices)) 
        ? localServices 
        : JSON.parse(localStorage.getItem('pos_services') || '[]');

    const targetNota = String(noNota).trim().toLowerCase();
    const s = services.find(item => {
        const itemNota = String(item.No_Nota || item.no_nota || item.nota || "").trim().toLowerCase();
        return itemNota === targetNota;
    });

    if (!s) {
        alert(`⚠️ Data nota "${noNota}" tidak ditemukan di memori lokal!`);
        return;
    }

    const nota = s.No_Nota || s.no_nota || noNota;
    const nama = s.Nama_Pelanggan || s.nama_pelanggan || "Pelanggan";
    const tipe = s.Tipe_HP || s.tipe_hp || "Servis";
    const tindakan = s.Sparepart_Diperbaiki || s.sparepart_diperbaiki || s.Tindakan || s.tindakan || s.Kerusakan || s.kerusakan || "-";
    const jasa = parseFloat(s.Biaya_Jasa || s.biaya_jasa) || 0;
    const total = parseFloat(s.Total_Biaya || s.total_biaya) || 0;
    const garansi = s.Garansi_Hari || s.garansi_hari || 0;
    const pay = s.Metode_Pembayaran || s.metode_pembayaran || "Cash / Tunai";
    const rawTgl = s.Tgl_Ambil || s.tgl_ambil || s.Tgl_Masuk || s.tgl_masuk || new Date().toISOString();

    const fmtRupiah = (val) => (typeof formatRupiah === 'function') 
        ? formatRupiah(val) 
        : parseInt(val || 0).toLocaleString('id-ID');

    const tglFormatted = (typeof formatDateTimeIndo === 'function') ? formatDateTimeIndo(rawTgl) : rawTgl;

    let petugas = "AGUS AFRIYANTO";
    if (typeof currentUser !== 'undefined' && currentUser && (currentUser.nama || currentUser.Nama_Staf)) {
        petugas = currentUser.nama || currentUser.Nama_Staf;
    }

    let profile = {};
    try {
        profile = (typeof storeProfile !== 'undefined' && storeProfile && storeProfile.name) 
            ? storeProfile 
            : JSON.parse(localStorage.getItem('pos_store_profile') || '{}');
    } catch(e) {}

    const storeName = profile.name || "IO ID STORE";
    const storeAddress = profile.address || "Sira Jaya (Menendang) kec. pengkadan";
    const storePhone = profile.phone || "085753712624";
    const storeLogoHtml = profile.logo ? `<img src="${profile.logo}" class="receipt-logo" alt="Logo" style="max-width:80px; margin:0 auto 6px auto; display:block;"><br>` : ``;
    
    const defaultFooter = `GARANSI ${garansi} HARI\n\nSelama masa garansi barang/sparepart bermasalah silahkan hubungi kami. Kerusakan yang disebabkan pengguna bukan tanggung jawab kami. Terima kasih.`;
    const storeFooter = profile.footer || defaultFooter;

    const container = document.getElementById('notaDetailContent');
    if (!container) {
        alert("⚠️ Elemen '#notaDetailContent' tidak ditemukan!");
        return;
    }

    // Render Nota
    container.innerHTML = `
        <div id="printableArea">
            <div class="receipt-header" style="text-align:center; border-bottom:2px dashed #bbb; padding-bottom:12px; margin-bottom:12px;">
                ${storeLogoHtml}
                <h3 class="receipt-title" style="font-size:18px; font-weight:bold; margin:0; color:#111;">${storeName}</h3>
                <p class="receipt-sub" style="font-size:12px; color:#555; margin:2px 0;">${storeAddress}</p>
                <p class="receipt-sub" style="font-size:12px; color:#555; margin:2px 0;">${storePhone}</p>
            </div>

            <div class="receipt-row" style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                <span>Waktu Transaksi</span>
                <b>${tglFormatted}</b>
            </div>
            <div class="receipt-row" style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                <span>Metode Pembayaran</span>
                <b>${pay}</b>
            </div>
            <div class="receipt-row" style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                <span>No. Transaksi</span>
                <b>${nota} <span style="color:green; font-weight:bold;">LUNAS</span></b>
            </div>
            <div class="receipt-row" style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                <span>Kepada</span>
                <b>${nama}</b>
            </div>
            <div class="receipt-row" style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                <span>Petugas / Kasir</span>
                <b>${petugas}</b>
            </div>

            <div class="receipt-divider" style="border-top:1px dashed #ccc; margin:10px 0;"></div>

            <div class="receipt-row" style="display:flex; justify-content:space-between; font-size:13px; font-weight:bold; margin-bottom:6px;">
                <span>Produk / Servis</span>
                <span>Sub Total</span>
            </div>
            
            <div style="font-size:13px; margin: 6px 0;">
                <b>${tipe}</b><br>
                <small style="color:#555;">Tindakan: ${tindakan}</small>
            </div>
            
            <div class="receipt-row" style="display:flex; justify-content:space-between; font-size:12px; color:#555; margin-bottom:6px;">
                <span>Jasa Pengerjaan</span>
                <span>Rp ${fmtRupiah(jasa)}</span>
            </div>

            <div class="receipt-divider" style="border-top:1px dashed #ccc; margin:10px 0;"></div>

            <div class="receipt-row" style="display:flex; justify-content:space-between; font-size:15px; font-weight:bold; color:#111;">
                <span>TOTAL BAYAR</span>
                <span>Rp ${fmtRupiah(total)}</span>
            </div>

            <div class="receipt-footer" style="font-size:11px; color:#666; text-align:center; margin-top:12px; border-top:1px solid #eee; padding-top:10px; white-space:pre-line;">
                ${storeFooter.replace(/\n/g, '<br>')}
            </div>
        </div>
    `;

    // Tampilkan Modal Nota
    if (typeof openPage === 'function') {
        openPage('notaDetailModal');
    } else {
        document.querySelectorAll('.card, #mainSection').forEach(el => el.classList.add('hidden'));
        document.getElementById('notaDetailModal').classList.remove('hidden');
    }
}
// =========================================================================
// 🖨️ 1. FUNGSI CETAK NOTA THERMAL (58mm & 80mm)
// =========================================================================
function cetakNotaThermal(paperWidth = 58) {
    const printElement = document.getElementById('printableArea') || document.getElementById('notaDetailContent');
    if (!printElement) {
        alert("⚠️ Konten nota tidak ditemukan!");
        return;
    }

    const content = printElement.innerHTML;
    const windowWidth = paperWidth === 80 ? 420 : 320;
    
    // Buka jendela baru untuk cetak
    const printWindow = window.open('', '_blank', `width=${windowWidth},height=600`);
    if (!printWindow) {
        alert("⚠️ Pop-up diblokir browser! Harap izinkan Pop-up di pojok kanan atas browser Anda untuk mencetak.");
        return;
    }

    const fontSizeHeader = paperWidth === 80 ? '16px' : '14px';
    const fontSizeBody = paperWidth === 80 ? '12px' : '11px';
    const fontSizeFooter = paperWidth === 80 ? '10px' : '9px';

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Cetak Nota ${paperWidth}mm</title>
                <style>
                    @page { size: auto; margin: 0; }
                    body { 
                        font-family: Arial, sans-serif; 
                        font-size: ${fontSizeBody}; 
                        margin: 4px; 
                        color: #000; 
                        width: ${paperWidth === 80 ? '76mm' : '54mm'}; 
                    }
                    .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                    .receipt-logo { max-width: 60px; max-height: 60px; display: block; margin: 0 auto 4px auto; }
                    .receipt-title { font-size: ${fontSizeHeader}; font-weight: bold; margin: 2px 0; }
                    .receipt-sub { font-size: ${fontSizeBody}; margin: 1px 0; }
                    .receipt-row { display: flex; justify-content: space-between; font-size: ${fontSizeBody}; margin-bottom: 4px; }
                    .receipt-divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .receipt-footer { font-size: ${fontSizeFooter}; text-align: center; margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; white-space: pre-line; }
                </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Berikan jeda sebentar agar browser selesai memuat gaya CSS sebelum cetak
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 300);
}

// =========================================================================
// 📤 2. FUNGSI SHARE / DOWNLOAD NOTA GAMBAR PNG
// =========================================================================
async function bagikanNotaPNG() {
    const element = document.getElementById('notaDetailContent');
    if (!element) {
        alert("⚠️ Konten nota tidak ditemukan!");
        return;
    }

    if (typeof html2canvas === 'undefined') {
        alert("⚠️ Pustaka konversi gambar (html2canvas) belum terhubung! Pastikan koneksi internet aktif.");
        return;
    }

    try {
        // Konversi tampilan elemen HTML menjadi gambar Canvas tajam
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
        });

        canvas.toBlob(async (blob) => {
            if (!blob) {
                alert("Gagal memproses gambar nota!");
                return;
            }

            const fileName = `Nota_IO_ID_STORE.png`;
            const file = new File([blob], fileName, { type: "image/png" });

            // Jika diakses dari Handphone (Android/iOS)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'Nota Transaksi IO ID STORE',
                        text: 'Berikut adalah bukti nota transaksi Anda.',
                        files: [file]
                    });
                } catch (shareErr) {
                    // Pengguna membatalkan menu share
                }
            } else {
                // Jika diakses dari Laptop / PC (Otomatis Download Gambar PNG)
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                alert("📷 Nota berhasil diunduh sebagai gambar PNG! Anda bisa langsung melampirkannya ke WhatsApp Web.");
            }
        }, 'image/png');
    } catch (err) {
        alert("Gagal membuat gambar nota: " + err.message);
    }
}