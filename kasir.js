// ==========================================
// 🛒 MODUL KASIR & PENJUALAN (kasir.js)
// ==========================================

// 🔔 TAMPILKAN ANTREAN SERVIS SELESAI
function renderReadyServiceList(query = "") {
    const div = document.getElementById('readyServiceQueueList');
    if (!div) return;
    const q = query.toLowerCase().trim();
    const readyServices = localServices.filter(s => {
        const st = String(s.Status || s.status || "");
        return st.includes("Selesai") && !st.includes("Diambil");
    });

    const filtered = readyServices.filter(item => {
        const nota = String(item.No_Nota || item.no_nota || "").toLowerCase();
        const nama = String(item.Nama_Pelanggan || item.nama_pelanggan || "").toLowerCase();
        const tipe = String(item.Tipe_HP || item.tipe_hp || "").toLowerCase();
        return nota.includes(q) || nama.includes(q) || tipe.includes(q);
    });

    if(filtered.length === 0) { 
        div.innerHTML = "<small style='color:#777;'>Tidak ada antrean servis selesai saat ini.</small>"; 
        return; 
    }

    div.innerHTML = filtered.map(item => {
        const nota = item.No_Nota || item.no_nota;
        const nama = item.Nama_Pelanggan || item.nama_pelanggan;
        const tipe = item.Tipe_HP || item.tipe_hp;
        const total = item.Total_Biaya || item.total_biaya || 0;

        return `
        <div class="item-row" style="background:#fff8dc; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <b>[${nota}] ${tipe} (${nama})</b><br>
                <small>Biaya Servis: Rp ${formatRupiah(total)}</small>
            </div>
            <button class="btn-success btn-sm" onclick="addKasirCartService('${nota}')">➕ Tambah ke Keranjang</button>
        </div>
    `}).join('');
}

// 🔍 CARI BARANG / SERVIS UNTUK KASIR
function searchKasirItem(query) {
    const resultsDiv = document.getElementById('kasirSearchResults');
    if(!resultsDiv) return;
    if(!query || query.trim() === "") { resultsDiv.classList.add('hidden'); return; }
    const q = query.toLowerCase().trim();

    const matchesInv = localInventory.filter(item => {
        const sku = String(item.sku || item.SKU || "").toLowerCase();
        const barcodePabrik = String(item.barcode_pabrik || item.Barcode_Pabrik || "").toLowerCase();
        const nama = String(item.nama_barang || item.Nama_Barang || "").toLowerCase();
        return sku.includes(q) || barcodePabrik.includes(q) || nama.includes(q);
    });

    const matchesSrv = localServices.filter(item => {
        const nota = String(item.No_Nota || item.no_nota || "").toLowerCase();
        const nama = String(item.Nama_Pelanggan || item.nama_pelanggan || "").toLowerCase();
        const st = String(item.Status || item.status || "");
        return st.includes("Selesai") && !st.includes("Diambil") && (nota.includes(q) || nama.includes(q));
    });

    let html = "";
    if(matchesInv.length > 0) {
        html += matchesInv.map(item => {
            const sku = item.sku || item.SKU;
            const barcodePabrik = item.barcode_pabrik || item.Barcode_Pabrik || "";
            const nama = item.nama_barang || item.Nama_Barang;
            const stok = item.stok || item.Stok || 0;
            const jual = item.harga_jual || item.Harga_Jual || 0;
            return `
            <div class="search-item" onclick="addKasirCartItem('${sku}')">
                <span class="badge-sku">${sku}</span>${barcodePabrik ? `<small style='color:blue;'>[Pabrik: ${barcodePabrik}]</small>` : ''} <b>${nama}</b><br>
                <small>Stok: ${stok} \vert{} Harga: Rp${formatRupiah(jual)}</small>
            </div>
        `}).join('');
    }

    if(matchesSrv.length > 0) {
        html += matchesSrv.map(item => {
            const nota = item.No_Nota || item.no_nota;
            const nama = item.Nama_Pelanggan || item.nama_pelanggan;
            const tipe = item.Tipe_HP || item.tipe_hp;
            const total = item.Total_Biaya || item.total_biaya || 0;
            return `
            <div class="search-item" style="background:#fff8dc;" onclick="addKasirCartService('${nota}')">
                <span class="badge-sku" style="background:#28a745;">${nota}</span> <b>Servis: ${tipe} (${nama})</b><br>
                <small>Biaya Servis: Rp ${formatRupiah(total)}</small>
            </div>
        `}).join('');
    }

    if(html !== "") {
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = html;
    } else {
        resultsDiv.classList.remove('hidden');
        resultsDiv.innerHTML = `
            <div class="search-item" style="background:#fff3cd;">
                ⚠️ Barcode <b>"${query}"</b> belum terdaftar.<br>
                <button class="btn-success btn-sm" onclick="bukaModalOpsiA('${query}')">➕ Tambahkan Barang Baru Ini</button>
            </div>
        `;
    }
}

function bukaModalOpsiA(kodeScan) {
    document.getElementById('kasirSearchResults').classList.add('hidden');
    showAddManualModal();
    document.getElementById('manualBarcodePabrik').value = kodeScan;
}

// 🛒 TAMBAH ITEM / SERVIS KE KERANJANG
function addKasirCartItem(sku) {
    const item = localInventory.find(i => String(i.sku || i.SKU) === String(sku));
    if(item) {
        const exist = kasirCart.find(c => String(c.sku || c.SKU) === String(sku));
        if(exist) exist.qty += 1;
        else kasirCart.push({ type: 'item', ...item, qty: 1 });
        renderKasirCart();
        document.getElementById('kasirItemSearch').value = "";
        document.getElementById('kasirSearchResults').classList.add('hidden');
    }
}

function addKasirCartService(nota) {
    const s = localServices.find(i => String(i.No_Nota || i.no_nota) === String(nota));
    if(s) {
        const exist = kasirCart.find(c => String(c.nota || c.No_Nota || c.no_nota) === String(nota));
        if(!exist) {
            kasirCart.push({
                type: 'service',
                nota: s.No_Nota || s.no_nota,
                nama: `Servis HP: ${s.Tipe_HP \vert{}\vert{} s.tipe_hp} (${s.Nama_Pelanggan || s.nama_pelanggan})`,
                harga: parseFloat(s.Total_Biaya || s.total_biaya) || 0,
                qty: 1
            });
        }
        renderKasirCart();
        document.getElementById('kasirItemSearch').value = "";
        document.getElementById('kasirSearchResults').classList.add('hidden');
    }
}

// 🛍️ RENDER KERANJANG & HITUNG KEMBALIAN
function renderKasirCart() {
    const div = document.getElementById('kasirCartList');
    if(!div) return;
    if(kasirCart.length === 0) { 
        div.innerHTML = "<small>Keranjang belanja kosong.</small>"; 
        document.getElementById('dispTotalKasirCart').innerText = "Rp 0"; 
        hitungKembalianKasir();
        return; 
    }
    let total = 0;
    div.innerHTML = kasirCart.map((item, idx) => {
        const nama = item.nama || item.nama_barang || item.Nama_Barang;
        const jual = parseFloat(item.harga || item.harga_jual || item.Harga_Jual) || 0;
        const sub = jual * item.qty;
        total += sub;
        return `
        <div style="background: #e9ecef; padding: 6px; border-radius: 4px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span><b>${nama}</b> (x${item.qty}) = Rp${formatRupiah(sub)}</span>
            <button type="button" class="btn-danger btn-sm" onclick="removeKasirCart(${idx})">❌</button>
        </div>
    `}).join('');
    document.getElementById('dispTotalKasirCart').innerText = `Rp ${formatRupiah(total)}`;
    hitungKembalianKasir();
}

function removeKasirCart(idx) {
    kasirCart.splice(idx, 1);
    renderKasirCart();
}

function toggleCashInput(val) {
    const grp = document.getElementById('cashInputGroup');
    if(!grp) return;
    if(val.includes('Cash')) grp.classList.remove('hidden');
    else grp.classList.add('hidden');
}

function hitungKembalianKasir() {
    let total = 0;
    kasirCart.forEach(item => {
        const jual = parseFloat(item.harga || item.harga_jual || item.Harga_Jual) || 0;
        total += (jual * item.qty);
    });

    const method = document.getElementById('kasirPaymentMethod')?.value || "Cash / Tunai";
    const rec = parseRawNumber('cashReceived');
    const btn = document.getElementById('btnBayarKasir');

    if(method.includes('Cash')) {
        const change = rec - total;
        if(document.getElementById('dispKasirChange')) {
            document.getElementById('dispKasirChange').innerText = `Rp ${formatRupiah(Math.max(0, change))}`;
        }
        if(btn) {
            if(rec < total && total > 0) {
                btn.disabled = true;
                btn.style.opacity = "0.5";
            } else {
                btn.disabled = false;
                btn.style.opacity = "1";
            }
        }
    } else {
        if(btn) {
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }
}

// 💵 PROSES PEMBAYARAN KASIR
function prosesBayarKasirRetailLokal() {
    if(kasirCart.length === 0) { alert("Keranjang belanja kosong!"); return; }
    
    let total = 0;
    kasirCart.forEach(item => {
        const jual = parseFloat(item.harga || item.harga_jual || item.Harga_Jual) || 0;
        total += (jual * item.qty);
    });

    const method = document.getElementById('kasirPaymentMethod').value;
    const rec = parseRawNumber('cashReceived');

    if(method.includes('Cash') && rec < total) {
        alert("Uang pembayaran kurang! Mohon masukkan nominal yang cukup.");
        return;
    }

    const nowIso = new Date().toISOString();

    kasirCart.forEach(cItem => {
        if(cItem.type === 'item') {
            const sku = cItem.sku || cItem.SKU;
            const inv = localInventory.find(i => (i.sku || i.SKU) === sku);
            if(inv) {
                const st = parseInt(inv.stok || inv.Stok) || 0;
                inv.stok = Math.max(0, st - cItem.qty);
            }
        } else if(cItem.type === 'service') {
            const s = localServices.find(srv => (srv.No_Nota || srv.no_nota) === cItem.nota);
            if(s) {
                s.Status = "Diambil / Berhasil";
                s.Metode_Pembayaran = method;
                s.Tgl_Ambil = nowIso;
            }
        }
    });

    saveAllLocal();
    triggerAutoSyncBackground(true);

    alert("Transaksi Pelunasan & Penjualan Berhasil Disimpan!");
    kasirCart = [];
    document.getElementById('cashReceived').value = "";
    renderKasirCart();
    renderReadyServiceList();
    goBack();
}

// 📄 NOTA & CETAK THERMAL
function bukaNotaDetail(noNota) {
    const s = localServices.find(item => (item.No_Nota || item.no_nota) === noNota);
    if(!s) return;

    const nota = s.No_Nota || s.no_nota;
    const nama = s.Nama_Pelanggan || s.nama_pelanggan;
    const tipe = s.Tipe_HP || s.tipe_hp;
    const sp = s.Sparepart_Diperbaiki || s.sparepart_diperbaiki || "-";
    const jasa = parseFloat(s.Biaya_Jasa || s.biaya_jasa) || 0;
    const total = parseFloat(s.Total_Biaya || s.total_biaya) || 0;
    const gar = s.Garansi_Hari || s.garansi_hari || 0;
    const pay = s.Metode_Pembayaran || s.metode_pembayaran || "-";
    const rawTgl = s.Tgl_Ambil || s.tgl_ambil || s.Tgl_Masuk || s.tgl_masuk;
    const tglA = formatDateTimeIndo(rawTgl);
    const petugas = currentUser ? currentUser.nama : "Kasir";

    const storeName = storeProfile.name || "IO ID STORE";
    const storeAddress = storeProfile.address || "Sira Jaya (Menendang) kec. pengkadan";
    const storePhone = storeProfile.phone || "085753712624";
    const storeFooter = storeProfile.footer || `GARANSI ${gar} HARI\n\nSelama masa garansi barang/sparepart bermasalah silahkan hubungi kami. Kerusakan yang disebabkan pengguna bukan tanggung jawab kami. Terima kasih.`;
    const storeLogoHtml = storeProfile.logo ? `<img src="${storeProfile.logo}" class="receipt-logo" alt="Logo">` : ``;

    document.getElementById('notaDetailContent').innerHTML = `
        <div id="printableArea">
            <div class="receipt-header">
                ${storeLogoHtml}
                <h3 class="receipt-title">${storeName}</h3>
                <p class="receipt-sub">${storeAddress}</p>
                <p class="receipt-sub">${storePhone}</p>
            </div>

            <div class="receipt-row">
                <span>Waktu Transaksi</span>
                <b>${tglA}</b>
            </div>
            <div class="receipt-row">
                <span>Metode Pembayaran</span>
                <b>${pay}</b>
            </div>
            <div class="receipt-row">
                <span>No. Transaksi</span>
                <b>${nota} <span style="color:green;">LUNAS</span></b>
            </div>
            <div class="receipt-row">
                <span>Kepada</span>
                <b>${nama}</b>
            </div>
            <div class="receipt-row">
                <span>Petugas / Kasir</span>
                <b>${petugas}</b>
            </div>

            <div class="receipt-divider"></div>

            <div class="receipt-row" style="font-weight:bold;">
                <span>Produk / Servis</span>
                <span>Sub Total</span>
            </div>
            <div style="font-size:13px; margin: 4px 0;">
                <b>${tipe}</b><br>
                <small style="color:#555;">Tindakan: ${sp}</small>
            </div>
            <div class="receipt-row" style="font-size:12px; color:#555;">
                <span>Jasa Pengerjaan</span>
                <span>Rp ${formatRupiah(jasa)}</span>
            </div>

            <div class="receipt-divider"></div>

            <div class="receipt-row" style="font-size:15px; font-weight:bold; color:#111;">
                <span>TOTAL BAYAR</span>
                <span>Rp ${formatRupiah(total)}</span>
            </div>

            <div class="receipt-footer">
                ${storeFooter.replace(/\n/g, '<br>')}
            </div>
        </div>
    `;

    openPage('notaDetailModal');
}

function cetakNotaThermal(paperWidth = 58) {
    const content = document.getElementById('printableArea').innerHTML;
    const windowWidth = paperWidth === 80 ? 420 : 320;
    const printWindow = window.open('', '', `width=${windowWidth},height=600`);
    
    const fontSizeHeader = paperWidth === 80 ? '18px' : '16px';
    const fontSizeBody = paperWidth === 80 ? '13px' : '11px';
    const fontSizeFooter = paperWidth === 80 ? '11px' : '10px';

    printWindow.document.write(`
        <html>
            <head>
                <title>Cetak Nota ${paperWidth}mm</title>
                <style>
                    @page { size: auto; margin: 0; }
                    body { 
                        font-family: Arial, sans-serif; 
                        font-size: 12px; 
                        margin: 5px; 
                        color:#000; 
                        width: ${paperWidth === 80 ? '78mm' : '56mm'}; 
                    }
                    .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                    .receipt-logo { max-width: 70px; max-height: 70px; }
                    .receipt-title { font-size: ${fontSizeHeader}; font-weight: bold; margin: 2px 0; }
                    .receipt-sub { font-size: ${fontSizeBody}; margin: 2px 0; }
                    .receipt-row { display: flex; justify-content: space-between; font-size: ${fontSizeBody}; margin-bottom: 4px; }
                    .receipt-divider { border-top: 1px dashed #000; margin: 8px 0; }
                    .receipt-footer { font-size: ${fontSizeFooter}; text-align: center; margin-top: 10px; border-top: 1px dashed #000; padding-top: 8px; }
                </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

async function bagikanNotaPNG() {
    const element = document.getElementById('notaDetailContent');
    try {
        const canvas = await html2canvas(element, { scale: 2 });
        canvas.toBlob(async (blob) => {
            const file = new File([blob], "Nota_Servis.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Nota Transaksi Servis',
                    text: 'Berikut adalah bukti nota transaksi Anda.',
                    files: [file]
                });
            } else {
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = 'Nota_Servis.png';
                a.click();
                alert("Gambar nota telah berhasil diunduh ke galeri HP Anda.");
            }
        }, 'image/png');
    } catch (err) {
        alert("Gagal mengonversi gambar nota: " + err.message);
    }
}