// ==========================================
// 📦 MODUL STOK & BARCODE (stok.js)
// ==========================================

// 📁 POPULATE DATALIST KATEGORI & MEREK
function populateDatalists() {
    const catDatalist = document.getElementById('categoryDatalist');
    if (catDatalist) {
        catDatalist.innerHTML = localMasterCategories.map(c => `<option value="${c}">`).join('');
    }

    const filterCatSelect = document.getElementById('filterInvCategory');
    if (filterCatSelect) {
        filterCatSelect.innerHTML = `<option value="">📁 Semua Kategori</option>` + 
            localMasterCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    populateBrandOptionsForForm();
}

function populateBrandOptionsForForm() {
    const selectedCat = document.getElementById('manualKategori') ? document.getElementById('manualKategori').value.trim() : "";
    const brandDatalist = document.getElementById('brandDatalist');
    if (!brandDatalist) return;

    let filteredBrands = localMasterBrands;
    if (selectedCat) {
        filteredBrands = localMasterBrands.filter(b => b.category.toLowerCase() === selectedCat.toLowerCase());
    }

    const brandNames = Array.from(new Set(filteredBrands.map(b => b.brand)));
    brandDatalist.innerHTML = brandNames.map(b => `<option value="${b}">`).join('');

    const filterBrandSelect = document.getElementById('filterInvBrand');
    if (filterBrandSelect) {
        const allBrandNames = Array.from(new Set(localMasterBrands.map(b => b.brand)));
        filterBrandSelect.innerHTML = `<option value="">🏷️ Semua Merek</option>` + 
            allBrandNames.map(b => `<option value="${b}">${b}</option>`).join('');
    }
}

// 📦 RENDER DAFTAR INVENTARIS
function renderInventoryList() {
    const listDiv = document.getElementById('inventoryList');
    if(!listDiv) return;
    const selChkAll = document.getElementById('selectAllInv');
    if (selChkAll) selChkAll.checked = false;

    const selCat = document.getElementById('filterInvCategory') ? document.getElementById('filterInvCategory').value : "";
    const selBrand = document.getElementById('filterInvBrand') ? document.getElementById('filterInvBrand').value : "";

    let filtered = localInventory;
    if (selCat) {
        filtered = filtered.filter(i => String(i.kategori || i.Kategori || "").toLowerCase() === selCat.toLowerCase());
    }
    if (selBrand) {
        filtered = filtered.filter(i => String(i.merek || i.Merek || "").toLowerCase() === selBrand.toLowerCase());
    }

    if(filtered.length === 0) {
        listDiv.innerHTML = "<p style='text-align:center; color:#777;'>Belum ada stok barang yang sesuai filter.</p>";
        return;
    }

    listDiv.innerHTML = filtered.map(item => {
        const sku = item.sku || item.SKU || "-";
        const kat = item.kategori || item.Kategori || "Umum";
        const mrk = item.merek || item.Merek || "-";
        const barcodePabrik = item.barcode_pabrik || item.Barcode_Pabrik || "-";
        const nama = item.nama_barang || item.Nama_Barang || "-";
        const hpp = item.hpp || item.HPP || 0;
        const jual = item.harga_jual || item.Harga_Jual || 0;
        const stok = item.stok || item.Stok || 0;

        return `
        <div class="item-row" style="display:flex; align-items:flex-start; gap:12px; text-align:left;">
            <input type="checkbox" class="chk-box item-chk" data-sku="${sku}" style="margin-top:4px;">
            <div style="flex:1; text-align:left;">
                <div style="margin-bottom:4px;">
                    <span class="badge-tag">${kat}</span>
                    <span class="badge-tag" style="background:#dbeafe; color:#1e40af;">${mrk}</span>
                </div>
                <b style="color:#0f172a;">[${sku}] ${nama}</b><br>
                <small style="color:#64748b;">Barcode Pabrik: <b>${barcodePabrik}</b></small><br>
                <div style="font-size:12px; font-weight:600; color:#334155; margin-top:4px;">
                    Stok: <b>${stok}</b> | HPP: Rp ${formatRupiah(hpp)} | Jual: Rp ${formatRupiah(jual)}
                </div>
                <div style="margin-top:8px; display:flex; gap:6px;">
                    <button class="btn-warning btn-sm" onclick="bukaModalEditBarang('${sku}')">✏️ Edit</button>
                    <button class="btn-danger btn-sm" onclick="hapusBarangLokal('${sku}')">🗑️ Hapus</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function toggleSelectAllInventory(isChecked) {
    document.querySelectorAll('.item-chk').forEach(chk => chk.checked = isChecked);
}

function hapusTerpilihLokal() {
    const checkedBoxes = document.querySelectorAll('.item-chk:checked');
    if(checkedBoxes.length === 0) {
        alert("Pilih minimal satu barang yang ingin dihapus!");
        return;
    }

    if(confirm(`Yakin ingin menghapus ${checkedBoxes.length} barang yang dipilih?`)) {
        const skusToDelete = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-sku'));
        localInventory = localInventory.filter(i => !skusToDelete.includes(String(i.sku || i.SKU)));
        saveAllLocal();
        renderInventoryList();
        alert(`${skusToDelete.length} barang berhasil dihapus!`);
    }
}

function hapusBarangLokal(sku) {
    if(confirm("Yakin ingin menghapus barang stok " + sku + "?")) {
        localInventory = localInventory.filter(i => String(i.sku || i.SKU) !== String(sku));
        saveAllLocal();
        renderInventoryList();
    }
}

function showAddManualModal() { 
    populateDatalists();
    openPage('addManualModal'); 
}

function closeAddManualModal() { goBack(); }

function simpanBarangManualLokal() {
    const kategori = document.getElementById('manualKategori').value.trim();
    const merek = document.getElementById('manualMerek').value.trim();
    const barcodePabrik = document.getElementById('manualBarcodePabrik').value.trim();
    const nama = document.getElementById('manualNama').value.trim();
    const hpp = parseRawNumber('manualHpp');
    const jual = parseRawNumber('manualHargaJual');
    const stok = parseInt(document.getElementById('manualStok').value) || 0;

    if (!kategori || !merek || !nama) { 
        alert("⚠️ Kategori, Merek, dan Nama Barang wajib diisi!"); 
        return; 
    }

    if (barcodePabrik && barcodePabrik !== "-") {
        const barcodeClean = barcodePabrik.toLowerCase();
        const barcodeExist = localInventory.find(i => 
            String(i.barcode_pabrik || i.Barcode_Pabrik || "").trim().toLowerCase() === barcodeClean
        );

        if (barcodeExist) {
            const existNama = barcodeExist.nama_barang || barcodeExist.Nama_Barang;
            const existMerek = barcodeExist.merek || barcodeExist.Merek || "-";

            if (existNama.toLowerCase() !== nama.toLowerCase() || existMerek.toLowerCase() !== merek.toLowerCase()) {
                alert(`🛑 GAGAL MENYIMPAN!\n\nBarcode Pabrik "${barcodePabrik}" sudah terdaftar pada produk:\n[${existMerek}] ${existNama}`);
                return;
            }
        }
    }

    if (!localMasterCategories.includes(kategori)) {
        localMasterCategories.push(kategori);
    }
    const brandExistInMaster = localMasterBrands.some(b => b.category.toLowerCase() === kategori.toLowerCase() && b.brand.toLowerCase() === merek.toLowerCase());
    if (!brandExistInMaster) {
        localMasterBrands.push({ category: kategori, brand: merek });
    }

    const matchedItem = localInventory.find(i => 
        String(i.kategori || i.Kategori || "").trim().toLowerCase() === kategori.toLowerCase() &&
        String(i.merek || i.Merek || "").trim().toLowerCase() === merek.toLowerCase() &&
        String(i.nama_barang || i.Nama_Barang || "").trim().toLowerCase() === nama.toLowerCase()
    );

    if (matchedItem) {
        const currentStok = parseInt(matchedItem.stok || matchedItem.Stok) || 0;
        matchedItem.stok = currentStok + stok;
        alert(`🔍 Barang Ditemukan Sama!\nStok barang "[${merek}] ${nama}" bertambah dari ${currentStok} menjadi ${matchedItem.stok}.`);
    } else {
        const newSku = "SP-" + Math.floor(100000 + Math.random() * 900000);
        localInventory.push({
            sku: newSku,
            kategori: kategori,
            merek: merek,
            barcode_pabrik: barcodePabrik || "-",
            nama_barang: nama,
            hpp: hpp,
            harga_jual: jual,
            stok: stok,
            status: "Di Toko",
            no_pesanan: "MANUAL",
            tgl_masuk: getLocalDateString()
        });
        alert(`✅ Barang Stok Baru Berhasil Ditambahkan dengan SKU: ${newSku}`);
    }

    saveAllLocal();
    populateDatalists();
    
    document.getElementById('manualKategori').value = "";
    document.getElementById('manualMerek').value = "";
    document.getElementById('manualBarcodePabrik').value = "";
    document.getElementById('manualNama').value = "";
    document.getElementById('manualHpp').value = "";
    document.getElementById('manualHargaJual').value = "";
    document.getElementById('manualStok').value = "1";
    goBack();
    renderInventoryList();
}

function bukaModalEditBarang(sku) {
    const item = localInventory.find(i => (i.sku || i.SKU) === sku);
    if(!item) return;

    document.getElementById('editSku').value = sku;
    document.getElementById('editKategori').value = item.kategori || item.Kategori || "";
    document.getElementById('editMerek').value = item.merek || item.Merek || "";
    document.getElementById('editBarcodePabrik').value = item.barcode_pabrik || item.Barcode_Pabrik || "";
    document.getElementById('editNama').value = item.nama_barang || item.Nama_Barang;
    
    let editHppInput = document.getElementById('editHpp');
    editHppInput.value = item.hpp || item.HPP || "";
    formatRupiahInput(editHppInput);

    let editHargaInput = document.getElementById('editHargaJual');
    editHargaInput.value = item.harga_jual || item.Harga_Jual || "";
    formatRupiahInput(editHargaInput);

    document.getElementById('editStok').value = item.stok || item.Stok;

    openPage('editItemModal');
}

function closeEditModal() { goBack(); }

function simpanEditBarangLokal() {
    const sku = document.getElementById('editSku').value;
    const item = localInventory.find(i => (i.sku || i.SKU) === sku);
    if(item) {
        item.kategori = document.getElementById('editKategori').value;
        item.merek = document.getElementById('editMerek').value;
        item.barcode_pabrik = document.getElementById('editBarcodePabrik').value;
        item.nama_barang = document.getElementById('editNama').value;
        item.hpp = parseRawNumber('editHpp');
        item.harga_jual = parseRawNumber('editHargaJual');
        item.stok = document.getElementById('editStok').value;

        saveAllLocal();
        alert("Barang Berhasil Diperbarui!");
        goBack();
        renderInventoryList();
    }
}

function cetakBarcodeModal() {
    //alert("Membuka modul printer Blueprint GL-A44...");
    window.open('print_barcode.html', '_blank');
    
    if (selectedCheckboxes.length > 0) {
        const skus = Array.from(selectedCheckboxes).map(chk => String(chk.getAttribute('data-sku')).trim());
        itemsToPrint = localInventory.filter(i => skus.includes(String(i.sku || i.SKU).trim()));
    } else {
        itemsToPrint = localInventory;
    }

    if (itemsToPrint.length === 0) {
        alert("⚠️ Tidak ada data barang untuk dicetak!");
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("⚠️ Pop-up diblokir browser! Izinkan pop-up pada browser Anda.");
        return;
    }

    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Barcode Stok</title>
            <style>
                body { font-family: sans-serif; padding: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
                .barcode-card { border: 1px dashed #000; padding: 6px; text-align: center; width: 130px; font-size: 10px; page-break-inside: avoid; }
                .barcode-card b { font-size: 10px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .barcode-img { margin: 4px 0; max-width: 100%; height: 32px; object-fit: contain; }
                .barcode-price { font-weight: bold; font-size: 11px; margin-top: 2px; }
            </style>
        </head>
        <body>
    `;

    itemsToPrint.forEach(item => {
        const sku = item.sku || item.SKU || "-";
        const nama = item.nama_barang || item.Nama_Barang || "-";
        const harga = item.harga_jual || item.Harga_Jual || 0;
        const code = (item.barcode_pabrik && item.barcode_pabrik !== "-") ? item.barcode_pabrik : sku;
        
        htmlContent += `
            <div class="barcode-card">
                <b>${nama}</b>
                <img class="barcode-img" src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(code)}&scale=2" alt="${code}"/>
                <div>${code}</div>
                <div class="barcode-price">Rp ${formatRupiah(harga)}</div>
            </div>
        `;
    });

    htmlContent += `
        <script>
            window.onload = function() { setTimeout(function(){ window.print(); }, 500); }
        <` + `/script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

function renderMasterCategoriesBrands() {
    const div = document.getElementById('masterCategoryBrandList');
    if (!div) return;

    if (localMasterBrands.length === 0) {
        div.innerHTML = "<small style='color:#777;'>Belum ada master kategori dan merek.</small>";
        return;
    }

    div.innerHTML = localMasterBrands.map((bm, idx) => `
        <div class="item-row" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <b>[${bm.category}]</b> ${bm.brand}
            </div>
            <button class="btn-danger btn-sm" onclick="hapusMasterBrand(${idx})">🗑️ Hapus</button>
        </div>
    `).join('');
}

function simpanMasterCategoryBrand() {
    const cat = document.getElementById('newCatName').value.trim();
    const brand = document.getElementById('newBrandName').value.trim();

    if (!cat || !brand) {
        alert("⚠️ Kategori dan Merek wajib diisi!");
        return;
    }

    if (!localMasterCategories.includes(cat)) {
        localMasterCategories.push(cat);
    }

    const exist = localMasterBrands.some(b => b.category.toLowerCase() === cat.toLowerCase() && b.brand.toLowerCase() === brand.toLowerCase());
    if (!exist) {
        localMasterBrands.push({ category: cat, brand: brand });
        saveAllLocal();
        populateDatalists();
        renderMasterCategoriesBrands();
        alert(`✅ Merek "${brand}" berhasil ditambahkan ke Kategori "${cat}"!`);
        document.getElementById('newCatName').value = "";
        document.getElementById('newBrandName').value = "";
    } else {
        alert("⚠️ Kategori dan Merek ini sudah ada di master data.");
    }
}

function hapusMasterBrand(index) {
    if (confirm("Yakin ingin menghapus merek ini dari master data?")) {
        localMasterBrands.splice(index, 1);
        saveAllLocal();
        populateDatalists();
        renderMasterCategoriesBrands();
    }
}