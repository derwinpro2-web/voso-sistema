// ==========================================
// AUTENTICACIÓN
// ==========================================

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        if (user.email === ADMIN_EMAIL) {
            isAdmin = true;
            finishLogin();
        } else {
            database.ref(`users/${user.uid}/role`).once('value').then(snapshot => {
                isAdmin = (snapshot.val() === 'admin');
                finishLogin();
            }).catch(() => {
                isAdmin = false;
                finishLogin();
            });
        }
    } else {
        currentUser = null;
        isAdmin = false;
        showLoginScreen();
    }
});

function finishLogin() {
    showMainApp();
    initializeApp();
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    updateUserUI();
}

function updateUserUI() {
    if (!currentUser) return;

    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    const initials = displayName.charAt(0).toUpperCase();

    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = displayName + (isAdmin ? ' (Admin)' : '');
    document.getElementById('dropdownUserName').textContent = displayName + (isAdmin ? ' ⭐ Admin' : '');
    document.getElementById('dropdownUserEmail').textContent = currentUser.email;
    document.getElementById('reportadoPor').value = displayName;

    // Mostrar botón de migración si es admin
    const migrationSection = document.getElementById('adminMigrationSection');
    if (migrationSection) {
        migrationSection.style.display = isAdmin ? 'block' : 'none';
    }

    // Mostrar panel de usuarios si es admin
    const usersSection = document.getElementById('adminUsersSection');
    if (usersSection) {
        usersSection.style.display = isAdmin ? 'block' : 'none';
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleText = document.getElementById('toggleText');
    const toggleBtn = document.getElementById('toggleBtn');

    if (isLoginMode) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        toggleText.textContent = '¿No tienes cuenta?';
        toggleBtn.textContent = 'Regístrate';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        toggleText.textContent = '¿Ya tienes cuenta?';
        toggleBtn.textContent = 'Inicia sesión';
    }
    hideError();
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    document.getElementById('errorText').textContent = message;
    errorDiv.classList.add('show');
}

function hideError() {
    document.getElementById('loginError').classList.remove('show');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Ingresando...';

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        let message = 'Error al iniciar sesión';
        switch (error.code) {
            case 'auth/user-not-found': message = 'Usuario no encontrado'; break;
            case 'auth/wrong-password': message = 'Contraseña incorrecta'; break;
            case 'auth/invalid-email': message = 'Email inválido'; break;
            case 'auth/user-disabled': message = 'Usuario deshabilitado'; break;
        }
        showError(message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Iniciar Sesión</span>';
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const btn = document.getElementById('registerBtn');

    if (password !== passwordConfirm) {
        showError('Las contraseñas no coinciden');
        return;
    }

    if (password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creando cuenta...';

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });

        await database.ref(`users/${userCredential.user.uid}`).set({
            name: name,
            email: email,
            createdAt: Date.now(),
            role: 'user'
        });

        showToast('Cuenta creada exitosamente', 'success');
    } catch (error) {
        let message = 'Error al crear cuenta';
        switch (error.code) {
            case 'auth/email-already-in-use': message = 'Este email ya está registrado'; break;
            case 'auth/invalid-email': message = 'Email inválido'; break;
            case 'auth/weak-password': message = 'Contraseña muy débil'; break;
        }
        showError(message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Crear Cuenta</span>';
    }
});

function logout() {
    if (confirm('¿Cerrar sesión?')) {
        auth.signOut().then(() => {
            showToast('Sesión cerrada', 'info');
        }).catch((error) => {
            showToast('Error al cerrar sesión', 'error');
        });
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

function showProfile() {
    hideUserMenu();
    const modal = document.getElementById('profileModal');
    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    const initials = displayName.charAt(0).toUpperCase();

    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent = displayName;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileDate').textContent = new Date(currentUser.metadata.creationTime).toLocaleDateString();

    const userRecords = records.filter(r => r.createdBy === currentUser.uid || r.reportadoPor === displayName);
    document.getElementById('profileRecords').textContent = userRecords.length;

    modal.classList.remove('hidden');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.add('hidden');
}

function showUsersPanel() {
    hideUserMenu();
    document.getElementById('usersModal').classList.remove('hidden');
    loadUsersAdmin();
}

function closeUsersPanel() {
    document.getElementById('usersModal').classList.add('hidden');
}

function loadUsersAdmin() {
    if (!isAdmin) return;

    database.ref('users').once('value').then(snapshot => {
        const usersData = snapshot.val();
        if (!usersData) return;

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        // Convert to array and sort by date descending
        const usersArray = Object.keys(usersData).map(uid => ({
            uid,
            ...usersData[uid]
        })).sort((a, b) => b.createdAt - a.createdAt);

        usersArray.forEach(u => {
            const isSuperAdmin = u.email === ADMIN_EMAIL;

            let roleSelect = '';
            if (isSuperAdmin) {
                roleSelect = '<span class="text-xs font-bold text-gray-500">Super Admin</span>';
            } else {
                roleSelect = `
                    <select onchange="changeUserRole('${u.uid}', this.value)" class="text-xs bg-gray-50 border border-gray-300 text-gray-900 rounded focus:ring-blue-500 focus:border-blue-500 block p-1">
                        <option value="user" ${u.role !== 'admin' ? 'selected' : ''}>Usuario</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
                    </select>
                `;
            }

            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-gray-50";
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-gray-900">${u.name || 'Sin nombre'}</td>
                <td class="px-4 py-3">${u.email}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-[10px] rounded-full font-medium ${u.role === 'admin' || isSuperAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                        ${isSuperAdmin ? 'SUPER ADMIN' : (u.role === 'admin' ? 'ADMINISTRADOR' : 'USUARIO')}
                    </span>
                </td>
                <td class="px-4 py-3">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td class="px-4 py-3 text-right">${roleSelect}</td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(err => {
        showToast('Error cargando usuarios', 'error');
        console.error(err);
    });
}

function changeUserRole(uid, newRole) {
    if (!isAdmin) return;

    if (!confirm(`¿Estás seguro de cambiar el rol a ${newRole.toUpperCase()}?`)) {
        loadUsersAdmin(); // Reset select visual state
        return;
    }

    database.ref(`users/${uid}/role`).set(newRole)
        .then(() => {
            showToast('Rol actualizado correctamente', 'success');
            loadUsersAdmin();
        })
        .catch(err => {
            showToast('Error al cambiar rol', 'error');
            console.error(err);
        });
}

function showSettings() {
    hideUserMenu();
    showToast('Configuración próximamente', 'info');
}

function hideUserMenu() {
    document.getElementById('userDropdown').classList.remove('show');
}
