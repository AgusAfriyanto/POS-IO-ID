// ==========================================
// 🔑 MODUL AUTENTIKASI & KELOLA STAF (auth.js)
// ==========================================

// 🚪 FUNGSI LOGIN
async function login() {
    const user_id = document.getElementById('userId').value.trim();
    const password = document.getElementById('password').value.trim();
    const msg = document.getElementById('message');

    if(!user_id || !password) {
        msg.style.color = "red";
        msg.innerText = "Isi User ID dan Password!";
        return;
    }

    msg.style.color = "blue";
    msg.innerText = "Memeriksa...";

    let found = localUsers.find(u => 
        String(u.id || u.User_ID || u[0]).toLowerCase() === user_id.toLowerCase() && 
        String(u.pin || u.PIN || u.Password || u[3]) === password
    );

    if (!found) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: "login", user_id: user_id, password: password })
            });
            const result = await response.json();

            if (result.status === "success") {
                currentUser = result.user;
                // 🔒 PENTING: Gunakan sessionStorage agar auto logout saat browser ditutup
                sessionStorage.setItem('pos_user', JSON.stringify(currentUser));
                await fetchMasterDataBackground();

                document.getElementById('loginSection').classList.add('hidden');
                document.getElementById('mainSection').classList.remove('hidden');
                document.getElementById('userGreeting').innerText = `Halo, ${currentUser.nama} (${currentUser.role}) 👋`;
                applyRolePermissions();
                updateQuickStats();
                msg.innerText = "";
                return;
            } else {
                msg.style.color = "red";
                msg.innerText = result.message;
                return;
            }
        } catch (err) {
            msg.style.color = "red";
            msg.innerText = "Gagal terhubung ke server!";
            return;
        }
    }

    currentUser = { 
        id: found.id || found.User_ID || found[0], 
        nama: found.nama || found.Nama_Staf || found[1], 
        role: found.role || found.Role || found[2] 
    };
    // 🔒 PENTING: Gunakan sessionStorage
    sessionStorage.setItem('pos_user', JSON.stringify(currentUser));
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainSection').classList.remove('hidden');
    document.getElementById('userGreeting').innerText = `Halo, ${currentUser.nama} (${currentUser.role}) 👋`;
    applyRolePermissions();
    updateQuickStats();
    msg.innerText = "";
}

// 🚪 FUNGSI LOGOUT
function logout() { 
    sessionStorage.removeItem('pos_user'); 
    currentUser = null; 
    document.querySelectorAll('.card').forEach(el => el.classList.add('hidden'));
    document.getElementById('mainSection').classList.add('hidden'); 
    document.getElementById('loginSection').classList.remove('hidden'); 
    window.location.hash = "";
}

// 👥 TAMPILKAN DAFTAR STAF
function renderUsersList() {
    const div = document.getElementById('userList');
    if(!div) return;
    if(localUsers.length === 0) div.innerText = "Belum ada staf terdaftar.";
    else {
        div.innerHTML = localUsers.map(u => {
            const id = u.id || u.User_ID || u[0];
            const nama = u.nama || u.Nama_Staf || u[1];
            const role = u.role || u.Role || u[2];
            return `
            <div style="border-bottom:1px solid #ddd; padding:6px 0;">
                <b>[${id}] ${nama}</b> - Role: <i>${role}</i>
            </div>
        `}).join('');
    }
}

// ➕ TAMBAH STAF BARU
async function simpanUserBaru() {
    const nama = document.getElementById('newNama').value;
    const role = document.getElementById('newRole').value;
    const pin = document.getElementById('newPin').value;

    if(!nama || !pin) { alert("Nama Staf dan PIN wajib diisi!"); return; }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "addUser", nama_staf: nama, role: role, pin: pin })
        });
        const result = await response.json();
        alert(result.message);
        if(result.status === "success" && result.new_user) {
            localUsers.push(result.new_user);
            saveAllLocal();
        }
        document.getElementById('newNama').value = "";
        document.getElementById('newPin').value = "";
        renderUsersList();
    } catch(e) { alert("Gagal membuat user baru!"); }
}

// 🛡️ ATUR HAK AKSES PERAN (OWNER / KASIR / TEKNISI)
function applyRolePermissions() {
    const r = currentUser ? currentUser.role.toLowerCase() : '';
    
    document.querySelectorAll('.role-owner, .role-kasir, .role-teknisi').forEach(el => el.classList.add('hidden'));

    if(r.includes('teknisi')) {
        document.querySelectorAll('.role-teknisi').forEach(el => el.classList.remove('hidden'));
    } else if(r.includes('kasir')) {
        document.querySelectorAll('.role-kasir').forEach(el => el.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.role-owner, .role-kasir, .role-teknisi').forEach(el => el.classList.remove('hidden'));
    }
}