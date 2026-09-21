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