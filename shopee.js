// ==========================================
// 🛍️ MODUL SHOPEE & EMAIL SYNC (shopee.js)
// ==========================================

const SENSITIVE_KEYWORDS = [
    "pro", "max", "plus", "mini", "ultra", "se", "s", "note", "lite", "4g", "5g",
    "64gb", "128gb", "256gb", "512gb", "1tb",
    "2gb", "4gb", "8gb", "12gb", "16gb", "32gb"
];

function normalizeItemName(name) {
    return String(name || "").toLowerCase()
        .replace(/\bip\b|\biph\b|\biphone\b/g, "iphone")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractTokens(normalized) {
    return normalized.split(" ").filter(t => t.length > 0);
}

function isStoreItemSubsetOfShopee(storeName, shopeeName) {
    const normStore = normalizeItemName(storeName);
    const normShopee = normalizeItemName(shopeeName);

    if (normStore === normShopee) return true;

    const storeTokens = extractTokens(normStore);
    const shopeeTokens = extractTokens(normShopee);

    for (let kw of SENSITIVE_KEYWORDS) {
        const hasInStore = storeTokens.includes(kw);
        const hasInShopee = shopeeTokens.includes(kw);
        if (hasInStore !== hasInShopee) return false;
    }

    const shopeeTokenSet = new Set(shopeeTokens);
    for (let token of storeTokens) {
        if (!shopeeTokenSet.has(token)) return false;
    }

    return true;
}

function findMatchingInventoryItem(rawShopeeName) {
    for (let inv of localInventory) {
        const existingStoreName = inv.nama_barang || inv.Nama_Barang || "";
        if (isStoreItemSubsetOfShopee(existingStoreName, rawShopeeName)) {
            return inv;
        }
    }
    return null;
}

function simpanPengeluaranShopeeLokal() {
    const noPesanan = document.getElementById('shopeeNoPesanan').value.trim();
    const nominal = parseRawNumber('shopeeNominal');
    const ket = document.getElementById('shopeeKet').value;

    if(!noPesanan || !nominal) { alert("No. Pesanan dan Nominal wajib diisi!"); return; }

    const existExp = localExpenses.find(e => String(e.no_pesanan || e.No_Pesanan).trim().toLowerCase() === noPesanan.toLowerCase());
    if(existExp) {
        const statusExp = existExp.status_sync || "Belum Sync";
        if(statusExp === "Sudah Sync") {
            alert("🛑 No. Pesanan Shopee ini sudah pernah terdaftar dan SUDAH DI-SYNC!");
        } else {
            alert("🛑 No. Pesanan Shopee ini sudah ada dalam antrean verifikasi!");
        }
        return;
    }

    const newId = "EXP-" + String(localExpenses.length + 1).padStart(3, '0');
    localExpenses.push({
        id: newId,
        tanggal: getLocalDateString(),
        kategori: "Belanja Shopee",
        no_pesanan: noPesanan,
        keterangan: ket || "Pembelian Sparepart Shopee",
        nominal: nominal,
        status_sync: "Belum Sync"
    });

    saveAllLocal();
    alert("Pengeluaran Shopee Berhasil Dicatat & Masuk Antrean Sync!");
    document.getElementById('shopeeNoPesanan').value = "";
    document.getElementById('shopeeNominal').value = "";
    document.getElementById('shopeeKet').value = "";
    renderShopeeQueue();
}

function renderShopeeQueue() {
    const div = document.getElementById('shopeeQueueList');
    if (!div) return;
    const pendingExpenses = localExpenses.filter(exp => (exp.status_sync || "Belum Sync") !== "Sudah Sync");

    if(pendingExpenses.length === 0) {
        div.innerHTML = "<small style='color:#777;'>Tidak ada antrean paket yang perlu diverifikasi.</small>";
    } else {
        div.innerHTML = pendingExpenses.map(exp => {
            const noP = exp.no_pesanan || exp.No_Pesanan || "-";
            const nom = exp.nominal || exp.Nominal || 0;
            const ket = exp.keterangan || exp.Keterangan || "-";
            const st = exp.status_sync || "Belum Sync";

            return `
            <div class="item-row">
                <b>No. Pesanan: #${noP}</b><br>
                Nominal: Rp ${formatRupiah(nom)} | Keterangan: ${ket}<br>
                Status: <span style="font-size:11px; padding:2px 8px; border-radius:10px; font-weight:bold; background:#fff3cd; color:#856404;">${st}</span>
                <div style="margin-top:6px;">
                    <button class="btn-success btn-sm" onclick="syncEmailShopeeDirect('${noP}')">📩 Verifikasi Email Shopee</button>
                </div>
            </div>
        `}).join('');
    }
    renderPendingDrafts();
}

async function syncEmailShopeeDirect(noPesanan) {
    if (!navigator.onLine) {
        alert("⚠️ Fitur Verifikasi Email memerlukan koneksi internet aktif.");
        return;
    }

    alert("Memeriksa Gmail untuk Pesanan #" + noPesanan + "...");
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "fetchShopeeItems", no_pesanan: noPesanan })
        });
        const result = await response.json();

        if(result.status === "success") {
            const items = result.items;
            let mergedCount = 0;
            let draftCount = 0;

            for (let it of items) {
                const rawName = String(it.nama_barang).trim();
                const qtyToAdd = it.qty || 1;

                const matchedInv = findMatchingInventoryItem(rawName);

                if (matchedInv) {
                    const currentStok = parseInt(matchedInv.stok || matchedInv.Stok) || 0;
                    matchedInv.stok = currentStok + qtyToAdd;
                    mergedCount++;
                } else {
                    localDrafts.push({
                        id: "DFT-" + Math.floor(100000 + Math.random() * 900000),
                        nama_barang: rawName,
                        hpp: it.hpp,
                        qty: qtyToAdd,
                        no_pesanan: noPesanan
                    });
                    draftCount++;
                }
            }

            const exp = localExpenses.find(e => (e.no_pesanan || e.No_Pesanan) === noPesanan);
            if(exp) exp.status_sync = "Sudah Sync";

            saveAllLocal();
            alert(`Sync Email Berhasil!\n- ${mergedCount} barang cocok & otomatis menambahkan stok lama\n- ${draftCount} barang baru masuk ke Antrean Konfirmasi (Draft).`);
            renderShopeeQueue();
        } else {
            alert("Gagal Sync Email: " + result.message);
        }
    } catch(e) { alert("Terjadi kesalahan jaringan!"); }
}

function renderPendingDrafts() {
    const div = document.getElementById('pendingDraftList');
    if (!div) return;

    if (localDrafts.length === 0) {
        div.innerHTML = "<small style='color:#777;'>Tidak ada antrean barang baru saat ini.</small>";
        return;
    }

    div.innerHTML = localDrafts.map((d, idx) => `
        <div class="item-row" style="background:#fff8dc; border:1px solid #ffe8a1;">
            <b>${d.nama_barang}</b><br>
            <small>HPP / Modal: Rp ${formatRupiah(d.hpp)} | Qty: ${d.qty} Pcs</small><br>
            <label style="margin-top:5px; display:block;"><small><b>Set Harga Jual Toko (Rp):</b></small></label>
            <input type="text" id="draftHarga_${d.id}" inputmode="numeric" pattern="[0-9]*" placeholder="Harga Jual" oninput="formatRupiahInput(this)" value="${formatRupiah(d.hpp * 1.3)}">
            <div style="display:flex; gap:5px; margin-top:8px;">
                <button class="btn-success btn-sm" onclick="rilisDraftKeStok('${d.id}')">🚀 Rilis ke Stok Toko</button>
                <button class="btn-danger btn-sm" onclick="hapusDraft('${d.id}')">❌ Hapus</button>
            </div>
        </div>
    `).join('');
}

function rilisDraftKeStok(draftId) {
    const idx = localDrafts.findIndex(d => d.id === draftId);
    if (idx === -1) return;

    const draft = localDrafts[idx];
    const hargaJualInput = parseRawNumber(`draftHarga_${draftId}`);

    if (hargaJualInput <= 0) {
        alert("Masukkan Harga Jual yang valid sebelum merilis barang ke stok toko!");
        return;
    }

    const newSku = "SP-" + Math.floor(100000 + Math.random() * 900000);
    localInventory.push({
        sku: newSku,
        kategori: "Umum",
        merek: "-",
        barcode_pabrik: "-",
        nama_barang: draft.nama_barang,
        hpp: draft.hpp,
        harga_jual: hargaJualInput,
        stok: draft.qty,
        status: "Di Toko",
        no_pesanan: draft.no_pesanan || "SHOPEE",
        tgl_masuk: getLocalDateString()
    });

    localDrafts.splice(idx, 1);
    saveAllLocal();

    alert(`Berhasil! Barang "${draft.nama_barang}" telah resmi dirilis ke Stok Toko (SKU: ${newSku}).`);
    renderShopeeQueue();
}

function hapusDraft(draftId) {
    if (confirm("Yakin ingin menghapus item antrean ini?")) {
        localDrafts = localDrafts.filter(d => d.id !== draftId);
        saveAllLocal();
        renderPendingDrafts();
    }
}