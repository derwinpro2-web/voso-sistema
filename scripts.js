// ==========================================
// CONFIGURACIÓN TAILWIND
// ==========================================
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        }
    }
}

// ==========================================
// CONFIGURACIÓN FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAo9Nlk-yJz4UkAlvgX6my_ww3MR-qO6-Q",
    authDomain: "voso-sistema-f81c4.firebaseapp.com",
    databaseURL: "https://voso-sistema-f81c4-default-rtdb.firebaseio.com",
    projectId: "voso-sistema-f81c4",
    storageBucket: "voso-sistema-f81c4.firebasestorage.app",
    messagingSenderId: "385854966826",
    appId: "1:385854966826:web:182e9d68ac20e3eede8753"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
let recordsRef = null;

const ADMIN_EMAIL = 'miguel@polpaico.cl';
let isAdmin = false;
let currentUser = null;
let records = [];
let offlineRecords = JSON.parse(localStorage.getItem('offlineVOSO')) || [];
let currentImage = null;
let isOnline = true;
let currentRecordId = null;
let severityChart = null;
let trendChart = null;
let isLoginMode = true;
let map = null;
let mapMarkers = [];
let recognition = null;

// ==========================================
// AUTENTICACIÓN
// ==========================================

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        isAdmin = (user.email === ADMIN_EMAIL);
        showMainApp();
        initializeApp();
    } else {
        currentUser = null;
        isAdmin = false;
        showLoginScreen();
    }
});

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

function showSettings() {
    hideUserMenu();
    showToast('Configuración próximamente', 'info');
}

function hideUserMenu() {
    document.getElementById('userDropdown').classList.remove('show');
}

// ==========================================
// INICIALIZACIÓN APP
// ==========================================

function initializeApp() {
    recordsRef = database.ref('voso_records');

    updateDateTime();
    setInterval(updateDateTime, 1000);
    setSeveridad('media');
    initCharts();
    checkOnlineStatus();

    recordsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        records = data ? Object.values(data) : [];

        const pendingOffline = offlineRecords.filter(r => !records.find(rec => rec.id === r.id));
        records = [...records, ...pendingOffline];

        renderRecords();
        updateStats();
        updateCharts();
        document.getElementById('loadingOverlay').classList.add('hidden');
        updateSyncStatus(true);
    }, (error) => {
        console.error('Error:', error);
        document.getElementById('loadingOverlay').classList.add('hidden');
        updateSyncStatus(false);
        loadFromLocalStorage();
    });

    window.addEventListener('online', () => {
        isOnline = true;
        updateSyncStatus(true);
        syncOfflineRecords();
        showToast('Conexión restaurada', 'success');
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateSyncStatus(false);
        showToast('Modo offline', 'warning');
    });

    initSignaturePad();

    document.addEventListener('click', function (e) {
        const exportContainer = document.getElementById('exportMenuContainer');
        if (exportContainer && !exportContainer.contains(e.target)) {
            hideExportMenu();
        }

        const notifPanel = document.getElementById('notifPanel');
        const notifBtn = e.target.closest('button[onclick="showNotifications()"]');
        if (notifPanel && !notifPanel.contains(e.target) && !notifBtn && !notifPanel.classList.contains('translate-x-full')) {
            hideNotifications();
        }

        const userMenu = document.querySelector('.user-menu');
        if (userMenu && !userMenu.contains(e.target)) {
            hideUserMenu();
        }
    });

    // Inicializar Dictado por Voz
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'es-ES';
    }
}

// ==========================================
// VISTA DE MAPA Y DICTADO
// ==========================================

function switchListView(view) {
    const listTab = document.getElementById('tabList');
    const mapTab = document.getElementById('tabMap');
    const recordsView = document.getElementById('recordsView');
    const mapView = document.getElementById('mapView');
    const listContainer = document.getElementById('recordsList');

    if (view === 'list') {
        listTab.classList.add('active');
        mapTab.classList.remove('active');
        recordsView.classList.remove('hidden');
        mapView.classList.add('hidden');
        listContainer.classList.remove('hidden');
    } else {
        listTab.classList.remove('active');
        mapTab.classList.add('active');
        recordsView.classList.add('hidden');
        mapView.classList.remove('hidden');
        listContainer.classList.add('hidden');
        initMap();
    }
}

function initMap() {
    if (map) {
        setTimeout(() => map.invalidateSize(), 100);
        renderMapMarkers();
        return;
    }

    // Centro inicial (se ajustará con los marcadores)
    map = L.map('mapContainer').setView([-33.4489, -70.6693], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    renderMapMarkers();
}

function renderMapMarkers() {
    if (!map) return;

    // Limpiar marcadores existentes
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    const gpsRecords = records.filter(r => r.gpsCoords);
    if (gpsRecords.length === 0) return;

    const bounds = [];
    const severityColors = {
        baja: '#10b981', media: '#f59e0b', alta: '#f97316', critica: '#ef4444'
    };

    gpsRecords.forEach(r => {
        const [lat, lng] = r.gpsCoords.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) return;

        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: severityColors[r.severidad] || '#3b82f6',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        marker.bindPopup(`
                    <div class="text-xs">
                        <strong class="block border-b mb-1">${r.nombre}</strong>
                        <p class="mb-1">${r.descripcion.substring(0, 50)}...</p>
                        <span class="font-bold text-[10px] uppercase">${r.estado}</span>
                    </div>
                `);

        mapMarkers.push(marker);
        bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
    }
}

function startVoice(targetId) {
    if (!recognition) {
        showToast('Dictado por voz no soportado en este navegador', 'warning');
        return;
    }

    const btn = event.currentTarget;
    const textarea = document.getElementById(targetId);

    btn.classList.add('recording');
    showToast('Escuchando...', 'info');

    recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        textarea.value = (textarea.value + ' ' + result).trim();
        showToast('Dictado completado', 'success');
    };

    recognition.onerror = () => {
        showToast('Error en el dictado', 'error');
        btn.classList.remove('recording');
    };

    recognition.onend = () => {
        btn.classList.remove('recording');
    };

    recognition.start();
}

// ==========================================
// CONTROL DE MENÚS
// ==========================================

function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    const chevron = document.getElementById('exportChevron');
    const isHidden = menu.classList.contains('hidden');

    hideNotifications();
    hideUserMenu();

    if (isHidden) {
        menu.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
    } else {
        hideExportMenu();
    }
}

function hideExportMenu() {
    const menu = document.getElementById('exportMenu');
    const chevron = document.getElementById('exportChevron');
    if (menu) menu.classList.add('hidden');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
}

function showNotifications() {
    hideExportMenu();
    hideUserMenu();
    document.getElementById('notifPanel').classList.remove('translate-x-full');
    loadNotifications();
}

function hideNotifications() {
    document.getElementById('notifPanel').classList.add('translate-x-full');
}

// ==========================================
// FUNCIONES CORE
// ==========================================

function checkOnlineStatus() {
    isOnline = navigator.onLine;
    updateSyncStatus(isOnline);
    if (!isOnline) {
        document.getElementById('offlineBanner').classList.remove('hidden');
        loadFromLocalStorage();
    }
}

function updateSyncStatus(online) {
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    const banner = document.getElementById('offlineBanner');

    if (online) {
        dot.className = 'w-1.5 h-1.5 bg-green-400 rounded-full sync-indicator';
        text.textContent = 'Online';
        banner.classList.add('hidden');
    } else {
        dot.className = 'w-1.5 h-1.5 bg-red-400 rounded-full';
        text.textContent = 'Offline';
        banner.classList.remove('hidden');
    }
}

function updateDateTime() { }

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const icon = document.getElementById('themeIcon');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

if (localStorage.getItem('theme') === 'dark') toggleDarkMode();

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} mr-2"></i>${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function loadNotifications() {
    const list = document.getElementById('notifList');
    const critical = records.filter(r => r.severidad === 'critica' && r.estado !== 'resuelto');

    if (critical.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">Sin notificaciones</p>';
        return;
    }

    list.innerHTML = critical.map(r => `
                <div class="bg-red-50 border-l-4 border-red-500 p-2 rounded text-xs cursor-pointer hover:bg-red-100" onclick="focusRecord(${r.id})">
                    <p class="font-semibold text-red-800">Crítica: ${r.nombre}</p>
                    <p class="text-red-700">${new Date(r.fecha).toLocaleDateString()}</p>
                </div>
            `).join('');

    const badge = document.getElementById('notifBadge');
    badge.textContent = critical.length;
    badge.classList.remove('hidden');
}

function focusRecord(id) {
    hideNotifications();
    const record = records.find(r => r.id === id);
    if (record) {
        document.getElementById('searchFilter').value = record.nombre;
        filterRecords();
        showToast(`Mostrando: ${record.nombre}`, 'info');
    }
}

function loadFromLocalStorage() {
    const localData = localStorage.getItem(`voso_backup_${currentUser?.uid || 'guest'}`);
    if (localData) {
        records = JSON.parse(localData);
        renderRecords();
        updateStats();
        updateCharts();
    }
}

function syncOfflineRecords() {
    if (offlineRecords.length > 0 && isOnline && currentUser) {
        let syncCount = 0;
        offlineRecords.forEach(record => {
            delete record.syncPending;
            recordsRef.child(record.id).set(record)
                .then(() => {
                    syncCount++;
                    if (syncCount === offlineRecords.length) {
                        offlineRecords = [];
                        localStorage.removeItem('offlineVOSO');
                        showToast(`${syncCount} registros sincronizados`, 'success');
                    }
                })
                .catch(err => console.error('Error sync:', err));
        });
    }
}

// ==========================================
// FORMULARIO
// ==========================================

function setTipo(tipo) {
    document.getElementById('tipoRegistro').value = tipo;
    document.getElementById('labelNombre').textContent = tipo === 'equipo' ? 'Equipo' : 'Área';
    document.getElementById('nombre').placeholder = tipo === 'equipo' ? 'Ej: Compresor A1' : 'Ej: Taller 3';

    document.querySelectorAll('.tipo-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-700');
        btn.classList.add('border-gray-200', 'text-gray-600');
    });

    const activeBtn = document.getElementById(tipo === 'equipo' ? 'btnEquipo' : 'btnArea');
    activeBtn.classList.remove('border-gray-200', 'text-gray-600');
    activeBtn.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700');
}

// CORREGIDO: Toggle sentidos - ahora usa data-sentido
function toggleSentido(sentido) {
    // Buscar el botón por el atributo data-sentido
    const btn = document.querySelector(`.sentido-btn[data-sentido="${sentido}"]`);
    const input = document.getElementById('sentidosSeleccionados');
    let seleccionados = input.value ? input.value.split(',') : [];

    if (seleccionados.includes(sentido)) {
        // Deseleccionar
        seleccionados = seleccionados.filter(s => s !== sentido);
        if (btn) {
            btn.classList.remove('active');
        }
    } else {
        // Seleccionar
        seleccionados.push(sentido);
        if (btn) {
            btn.classList.add('active');
        }
    }

    input.value = seleccionados.join(',');
    console.log('Sentidos seleccionados:', input.value); // Debug
}

function setSeveridad(level) {
    document.getElementById('severidad').value = level;
    const colors = {
        baja: ['border-green-500', 'bg-green-50'],
        media: ['border-yellow-500', 'bg-yellow-50'],
        alta: ['border-orange-500', 'bg-orange-50'],
        critica: ['border-red-500', 'bg-red-50']
    };

    document.querySelectorAll('[data-value]').forEach(btn => {
        btn.className = 'severity-btn-compact rounded-md border-2 border-gray-200 font-medium transition';
    });

    const activeBtn = document.querySelector(`[data-value="${level}"]`);
    if (activeBtn && colors[level]) {
        activeBtn.classList.remove('border-gray-200');
        activeBtn.classList.add(...colors[level]);
    }
}

function searchEquipos(query) {
    const resultsDiv = document.getElementById('searchResults');
    if (!query) {
        resultsDiv.classList.add('hidden');
        return;
    }

    const matches = [...new Set(records.map(r => r.nombre))]
        .filter(name => name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

    if (matches.length > 0) {
        resultsDiv.innerHTML = matches.map(m => `
                    <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0" onclick="selectEquipo('${m}')">${m}</div>
                `).join('');
        resultsDiv.classList.remove('hidden');
    } else {
        resultsDiv.classList.add('hidden');
    }
}

function selectEquipo(name) {
    document.getElementById('nombre').value = name;
    document.getElementById('searchResults').classList.add('hidden');
}

function getLocation() {
    if ("geolocation" in navigator) {
        showToast('Obteniendo GPS...', 'info');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
                document.getElementById('gpsCoords').value = coords;
                document.getElementById('gpsIndicator').classList.remove('hidden');
                showToast(`GPS: ${coords}`, 'success');
            },
            (error) => showToast('Error GPS', 'error'),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        showToast('GPS no disponible', 'warning');
    }
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 800;
                const scale = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                currentImage = canvas.toDataURL('image/jpeg', 0.7);

                const preview = document.getElementById('imagePreview');
                const placeholder = document.getElementById('uploadPlaceholder');
                const removeBtn = document.getElementById('removeImage');

                preview.src = currentImage;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
                removeBtn.classList.remove('hidden');
            };
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeImage() {
    currentImage = null;
    document.getElementById('imagen').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    document.getElementById('removeImage').classList.add('hidden');
}

document.getElementById('vosoForm').addEventListener('submit', function (e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Debes iniciar sesión', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';

    const record = {
        id: Date.now(),
        tipo: document.getElementById('tipoRegistro').value,
        nombre: document.getElementById('nombre').value,
        ubicacion: document.getElementById('ubicacion').value,
        gpsCoords: document.getElementById('gpsCoords').value,
        sentidos: document.getElementById('sentidosSeleccionados').value.split(',').filter(s => s),
        tipoAnomalia: document.getElementById('tipoAnomalia').value,
        severidad: document.getElementById('severidad').value,
        descripcion: document.getElementById('descripcion').value,
        acciones: document.getElementById('acciones').value,
        imagen: currentImage,
        reportadoPor: document.getElementById('reportadoPor').value,
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email,
        historial: [{ fecha: new Date().toISOString(), accion: 'creado', usuario: document.getElementById('reportadoPor').value }]
    };

    if (!isOnline) {
        record.syncPending = true;
        offlineRecords.push(record);
        localStorage.setItem('offlineVOSO', JSON.stringify(offlineRecords));
        records.push(record);
        renderRecords();
        updateStats();
        updateCharts();
        showToast('Guardado localmente', 'warning');
        document.getElementById('pendingSync').classList.remove('hidden');
    } else {
        recordsRef.child(record.id).set(record)
            .then(() => {
                if (record.severidad === 'critica') createNotification(record);
                showToast('Guardado exitosamente', 'success');
            })
            .catch((error) => {
                showToast('Error: ' + error.message, 'error');
                offlineRecords.push(record);
                localStorage.setItem('offlineVOSO', JSON.stringify(offlineRecords));
            });
    }

    this.reset();
    removeImage();
    setSeveridad('media');
    setTipo('equipo');
    resetSentidos();
    document.getElementById('gpsIndicator').classList.add('hidden');
    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('reportadoPor').value = displayName;

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar';
});

function resetSentidos() {
    document.getElementById('sentidosSeleccionados').value = '';
    document.querySelectorAll('.sentido-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

function createNotification(record) {
    database.ref('notifications').push({
        type: 'critical',
        message: `Crítica: ${record.nombre}`,
        recordId: record.id,
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email,
        timestamp: Date.now(),
        read: false
    });
}

// ==========================================
// FIRMA DIGITAL
// ==========================================

function initSignaturePad() {
    const canvas = document.getElementById('signaturePad');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let drawing = false;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function start(e) {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    }

    function move(e) {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        e.preventDefault();
    }

    function stop() {
        drawing = false;
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseout', stop);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', stop);
}

function clearSignature() {
    const canvas = document.getElementById('signaturePad');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function closeWithoutSignature() {
    document.getElementById('signatureModal').classList.add('hidden');
    currentRecordId = null;
}

function saveSignature() {
    const canvas = document.getElementById('signaturePad');
    const signatureData = canvas.toDataURL();

    if (currentRecordId && currentUser) {
        const record = records.find(r => r.id === currentRecordId);
        const historial = record.historial || [];
        historial.push({
            fecha: new Date().toISOString(),
            accion: 'resuelto',
            usuario: currentUser.displayName || currentUser.email
        });

        recordsRef.child(currentRecordId).update({
            estado: 'resuelto',
            firmaCierre: signatureData,
            fechaCierre: new Date().toISOString(),
            historial: historial
        }).then(() => {
            showToast('Cerrado con firma', 'success');
            document.getElementById('signatureModal').classList.add('hidden');
            currentRecordId = null;
        });
    }
}

// ==========================================
// GRÁFICOS
// ==========================================

function initCharts() {
    const ctx1 = document.getElementById('severityChart').getContext('2d');
    severityChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Baja', 'Media', 'Alta', 'Crítica'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        font: { size: 10 },
                        padding: 10
                    }
                }
            }
        }
    });

    const ctx2 = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Anomalías',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { font: { size: 9 } } },
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 9 } } }
            }
        }
    });
}

function updateCharts() {
    const severidadCounts = {
        baja: records.filter(r => r.severidad === 'baja').length,
        media: records.filter(r => r.severidad === 'media').length,
        alta: records.filter(r => r.severidad === 'alta').length,
        critica: records.filter(r => r.severidad === 'critica').length
    };

    severityChart.data.datasets[0].data = [
        severidadCounts.baja,
        severidadCounts.media,
        severidadCounts.alta,
        severidadCounts.critica
    ];
    severityChart.update();

    updateTrendChart();
}

function updateTrendChart() {
    const days = parseInt(document.getElementById('chartPeriod').value);
    const labels = [];
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        labels.push(dateStr);

        const count = records.filter(r => {
            const rDate = new Date(r.fecha);
            return rDate.toDateString() === date.toDateString();
        }).length;
        data.push(count);
    }

    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = data;
    trendChart.update();
}

// ==========================================
// LISTADO
// ==========================================

function renderRecords() {
    const container = document.getElementById('recordsList');
    const emptyState = document.getElementById('emptyState');
    const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const severityFilter = document.getElementById('severityFilter').value;

    let filtered = records.filter(r => {
        const matchesSearch = !searchTerm ||
            r.nombre.toLowerCase().includes(searchTerm) ||
            r.descripcion.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'todos' || r.estado === statusFilter;
        const matchesSeverity = severityFilter === 'todas' || r.severidad === severityFilter;
        return matchesSearch && matchesStatus && matchesSeverity;
    });

    filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = filtered.map(record => createRecordCard(record)).join('');
}

function createRecordCard(record) {
    const fecha = new Date(record.fecha).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const severidadColors = {
        baja: 'bg-green-100 text-green-800 border-green-200',
        media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        alta: 'bg-orange-100 text-orange-800 border-orange-200',
        critica: 'bg-red-100 text-red-800 border-red-200'
    };

    const estadoColors = {
        pendiente: 'bg-gray-100 text-gray-800',
        en_proceso: 'bg-blue-100 text-blue-800',
        resuelto: 'bg-green-100 text-green-800'
    };

    const tipoIcon = record.tipo === 'equipo' ? 'fa-cog' : 'fa-building';
    const anomaliaEmojis = {
        mecanica: '🔧', electrica: '⚡', seguridad: '🛡️',
        ambiental: '🌱', operativa: '⚙️', housekeeping: '🧹'
    };

    const sentidosIcons = {
        ver: '👁️', oir: '👂', sentir: '✋', oler: '👃'
    };
    const sentidosHtml = record.sentidos && record.sentidos.length > 0
        ? `<div class="flex gap-1 mb-2 flex-wrap">${record.sentidos.map(s => `<span class="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">${sentidosIcons[s] || ''} ${s}</span>`).join('')}</div>`
        : '';

    const hasSignature = record.firmaCierre ? '<i class="fas fa-signature text-green-600 ml-1 text-xs" title="Firmado"></i>' : '';
    const syncBadge = record.syncPending ? '<span class="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded">Sync</span>' : '';
    const criticalBorder = record.severidad === 'critica' && record.estado !== 'resuelto' ? 'border-l-4 border-l-red-500' : '';

    return `
                <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden record-card animate-fade-in ${criticalBorder} glass-panel">
                    <div class="p-3">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-start gap-2 min-w-0">
                                <div class="bg-gray-100 p-1.5 rounded flex-shrink-0">
                                    <i class="fas ${tipoIcon} text-gray-600 text-xs"></i>
                                </div>
                                <div class="min-w-0">
                                    <h3 class="font-semibold text-gray-900 text-sm truncate flex items-center">
                                        ${record.nombre}
                                        ${hasSignature}
                                        ${syncBadge}
                                    </h3>
                                    <p class="text-xs text-gray-500 truncate">
                                        <i class="fas fa-map-marker-alt mr-1"></i>${record.ubicacion}
                                        ${record.gpsCoords ? `<span class="text-blue-600 ml-1 cursor-pointer" onclick="showMap('${record.gpsCoords}')" title="Mapa"><i class="fas fa-satellite"></i></span>` : ''}
                                    </p>
                                </div>
                            </div>
                            <div class="flex flex-col gap-1 items-end flex-shrink-0">
                                <span class="px-2 py-0.5 rounded text-[10px] font-medium border ${severidadColors[record.severidad]}">
                                    ${record.severidad}
                                </span>
                                <select onchange="handleStatusChange(${record.id}, this.value)" 
                                    class="text-[10px] px-2 py-0.5 rounded border-0 cursor-pointer ${estadoColors[record.estado]}">
                                    <option value="pendiente" ${record.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                    <option value="en_proceso" ${record.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                                    <option value="resuelto" ${record.estado === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                                </select>
                            </div>
                        </div>

                        ${sentidosHtml}
                        
                        <div class="grid grid-cols-2 gap-2 mb-2 text-xs">
                            <div>
                                <span class="text-gray-500">${anomaliaEmojis[record.tipoAnomalia] || '📋'} ${record.tipoAnomalia}</span>
                            </div>
                            <div class="text-right">
                                <span class="text-gray-500">Por: ${record.reportadoPor}</span>
                                ${record.createdByEmail ? `<br><span class="text-[10px] text-gray-400">${record.createdByEmail}</span>` : ''}
                            </div>
                        </div>
                        
                        <p class="text-xs text-gray-700 mb-2 line-clamp-2">${record.descripcion}</p>
                        
                        ${record.acciones ? `
                            <div class="bg-blue-50 p-2 rounded mb-2 text-xs">
                                <span class="text-blue-600 font-medium">Acción:</span>
                                <span class="text-blue-800 line-clamp-1">${record.acciones}</span>
                            </div>
                        ` : ''}
                        
                        ${record.imagen ? `
                            <div class="mb-2">
                                <div class="relative group cursor-pointer w-fit" onclick="openImageModal('${record.imagen}')">
                                    <img src="${record.imagen}" class="h-20 w-auto rounded object-cover border border-gray-200">
                                    <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded">
                                        <i class="fas fa-expand text-white"></i>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${record.firmaCierre ? `
                            <div class="mb-2">
                                <img src="${record.firmaCierre}" class="h-12 rounded border border-gray-200 bg-white">
                            </div>
                        ` : ''}
                        
                        <div class="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span class="text-[10px] text-gray-400">${fecha}</span>
                            <div class="flex gap-2">
                                <button onclick="printRecord(${record.id})" class="text-blue-600 hover:text-blue-800 text-xs" title="Imprimir">
                                    <i class="fas fa-print"></i>
                                </button>
                                ${(isAdmin || record.createdBy === currentUser.uid) ? `
                                <button onclick="deleteRecord(${record.id})" class="text-red-500 hover:text-red-700 text-xs font-medium" title="${isAdmin ? 'Eliminar (Admin)' : 'Eliminar mi registro'}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
}

function handleStatusChange(id, newStatus) {
    if (newStatus === 'resuelto') {
        currentRecordId = id;
        document.getElementById('signatureModal').classList.remove('hidden');
        clearSignature();
    } else {
        updateStatus(id, newStatus);
    }
}

function updateStatus(id, newStatus) {
    if (!isOnline || !currentUser) {
        showToast('Sin conexión o sesión', 'warning');
        return;
    }

    const record = records.find(r => r.id === id);
    const historial = record.historial || [];
    historial.push({
        fecha: new Date().toISOString(),
        accion: newStatus,
        usuario: currentUser.displayName || currentUser.email
    });

    const updateData = { estado: newStatus, historial: historial };
    if (newStatus !== 'resuelto') {
        updateData.firmaCierre = null;
    }

    recordsRef.child(id).update(updateData)
        .then(() => showToast('Estado actualizado', 'success'))
        .catch(err => showToast('Error', 'error'));
}

function deleteRecord(id) {
    const record = records.find(r => r.id === id);
    if (!record) {
        showToast('Registro no encontrado', 'error');
        return;
    }

    if (!isAdmin && record.createdBy !== currentUser.uid) {
        showToast('Solo puedes eliminar tus propios registros', 'error');
        return;
    }

    if (!confirm('¿Eliminar este registro?')) return;
    if (!isOnline || !currentUser) {
        showToast('Sin conexión o sesión', 'error');
        return;
    }

    recordsRef.child(id).remove()
        .then(() => showToast('Eliminado', 'success'))
        .catch(err => showToast('Error: ' + err.message, 'error'));
}

function printRecord(id) {
    const record = records.find(r => r.id === id);
    const w = window.open('', '_blank');
    w.document.write(`
                <html>
                <head>
                    <title>VOSO #${record.id}</title>
                    <style>
                        body { font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto; }
                        h1 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; font-size: 18px; }
                        .field { margin: 10px 0; font-size: 14px; }
                        .label { font-weight: bold; color: #666; }
                        img { max-width: 100%; margin-top: 10px; }
                        .sentidos { background: #f3f4f6; padding: 10px; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <h1>Reporte VOSO #${record.id}</h1>
                    <div class="field"><span class="label">Fecha:</span> ${new Date(record.fecha).toLocaleString()}</div>
                    <div class="field"><span class="label">Equipo/Área:</span> ${record.nombre}</div>
                    <div class="field"><span class="label">Ubicación:</span> ${record.ubicacion}</div>
                    ${record.sentidos && record.sentidos.length > 0 ? `
                        <div class="sentidos">
                            <span class="label">Detectado por:</span> ${record.sentidos.join(', ')}
                        </div>
                    ` : ''}
                    <div class="field"><span class="label">Tipo:</span> ${record.tipoAnomalia}</div>
                    <div class="field"><span class="label">Severidad:</span> ${record.severidad.toUpperCase()}</div>
                    <div class="field"><span class="label">Estado:</span> ${record.estado}</div>
                    <div class="field"><span class="label">Descripción:</span><br>${record.descripcion}</div>
                    ${record.acciones ? `<div class="field"><span class="label">Acciones:</span><br>${record.acciones}</div>` : ''}
                    ${record.imagen ? `<img src="${record.imagen}">` : ''}
                </body>
                </html>
            `);
    w.document.close();
    w.print();
}

function showMap(coords) {
    const [lat, lng] = coords.split(',');
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
}

// ==========================================
// EXPORTACIONES
// ==========================================

function exportToExcel() {
    const data = records.map(r => ({
        'ID': r.id,
        'Fecha': new Date(r.fecha).toLocaleString(),
        'Tipo': r.tipo,
        'Nombre': r.nombre,
        'Ubicación': r.ubicacion,
        'GPS': r.gpsCoords || '',
        'Sentidos': r.sentidos ? r.sentidos.join(', ') : '',
        'Anomalía': r.tipoAnomalia,
        'Severidad': r.severidad,
        'Estado': r.estado,
        'Descripción': r.descripcion,
        'Acciones': r.acciones || '',
        'Inspector': r.reportadoPor,
        'Imagen': r.imagen ? 'Sí' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "VOSO");

    ws['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 20 },
        { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 40 },
        { wch: 30 }, { wch: 20 }, { wch: 8 }
    ];

    XLSX.writeFile(wb, `VOSO_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Excel descargado', 'success');
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    showToast('Generando reporte PDF...', 'info');

    // --- Encabezado ---
    doc.setFillColor(102, 126, 234); // Color gradient-bg inicial
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text('Control VOSO Pro', 15, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text('Sistema de Verificación Operacional', 15, 28);

    doc.setFontSize(9);
    const now = new Date().toLocaleString();
    doc.text(`Fecha de generación: ${now}`, pageWidth - 15, 33, { align: 'right' });

    // --- Resumen de Estadísticas ---
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Resumen del Reporte', 15, 55);

    const total = records.length;
    const pending = records.filter(r => r.estado === 'pendiente').length;
    const resolved = records.filter(r => r.estado === 'resuelto').length;
    const equipos = new Set(records.map(r => r.nombre)).size;

    doc.autoTable({
        startY: 60,
        head: [['Total Registros', 'Pendientes', 'Resueltos', 'Equipos/Áreas']],
        body: [[total, pending, resolved, equipos]],
        theme: 'plain',
        styles: { fontSize: 10, halign: 'center' },
        headStyles: { fontStyle: 'bold', textColor: [100, 100, 100] }
    });

    // --- Tabla Detallada ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Listado Detallado de Registros', 15, doc.lastAutoTable.finalY + 15);

    const tableBody = records.map(r => [
        r.nombre,
        `${new Date(r.fecha).toLocaleDateString()}\n${r.ubicacion}`,
        `${r.tipoAnomalia}\n(${r.severidad})`,
        r.descripcion,
        r.acciones || '-',
        r.estado.toUpperCase()
    ]);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Equipo/Área', 'Fecha/Ubicación', 'Anomalía', 'Descripción', 'Acciones', 'Estado']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [102, 126, 234], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', width: 30 },
            1: { width: 30 },
            2: { width: 25 },
            3: { width: 45 },
            4: { width: 35 },
            5: { halign: 'center', fontStyle: 'bold' }
        },
        didDrawPage: (data) => {
            // Pie de página
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${data.pageNumber}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
    });

    // --- Sección de Evidencia (Si hay imágenes) ---
    const recordsWithImages = records.filter(r => r.imagen || r.firmaCierre);
    if (recordsWithImages.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(102, 126, 234);
        doc.text('Evidencia Visual y Firmas', 15, 20);

        let currentY = 30;

        for (const r of recordsWithImages) {
            if (currentY > 240) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            doc.text(`Registro: ${r.nombre} (${new Date(r.fecha).toLocaleDateString()})`, 15, currentY);
            currentY += 5;

            if (r.imagen) {
                try {
                    doc.addImage(r.imagen, 'JPEG', 15, currentY, 40, 30);
                } catch (e) { console.error('Error al añadir imagen al PDF', e); }
            }

            if (r.firmaCierre) {
                doc.setFontSize(8);
                doc.text('Firma de Cierre:', 65, currentY + 5);
                try {
                    doc.addImage(r.firmaCierre, 'PNG', 65, currentY + 7, 30, 15);
                } catch (e) { console.error('Error al añadir firma al PDF', e); }
            }

            currentY += 40;
            doc.setDrawColor(230);
            doc.line(15, currentY - 5, pageWidth - 15, currentY - 5);
        }
    }

    doc.save(`Reporte_VOSO_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF generado exitosamente', 'success');
}

function exportToJSON() {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VOSO_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup descargado', 'success');
}

// ==========================================
// UTILIDADES
// ==========================================

function filterRecords() { renderRecords(); }

function filterByStatus(status) {
    document.getElementById('statusFilter').value = status === 'all' ? 'todos' : status;
    filterRecords();
}

function clearFilters() {
    document.getElementById('searchFilter').value = '';
    document.getElementById('statusFilter').value = 'todos';
    document.getElementById('severityFilter').value = 'todas';
    renderRecords();
}

function updateStats() {
    document.getElementById('totalRecords').textContent = records.length;
    document.getElementById('pendingRecords').textContent = records.filter(r => r.estado === 'pendiente').length;
    document.getElementById('resolvedRecords').textContent = records.filter(r => r.estado === 'resuelto').length;
    document.getElementById('totalEquipos').textContent = new Set(records.map(r => r.nombre)).size;
}

function openImageModal(src) {
    document.getElementById('modalImage').src = src;
    document.getElementById('downloadImageBtn').href = src;
    document.getElementById('imageModal').classList.remove('hidden');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeImageModal();
        document.getElementById('signatureModal')?.classList.add('hidden');
        document.getElementById('profileModal')?.classList.add('hidden');
        hideNotifications();
        hideExportMenu();
        hideUserMenu();
    }
});

// ==========================================
// UTILIDAD DE MIGRACIÓN (EJECUTAR EN CONSOLA)
// ==========================================
async function migrateData() {
    if (!isAdmin) {
        showToast("Solo un administrador puede ejecutar la migración.", "error");
        return;
    }

    if (!confirm("⚠️ ¿Estás seguro de migrar los datos?\n\nEsto moverá todos los registros de 'users/uid/voso_records' al nodo compartido 'voso_records'.\n\nIMPORTANTE: Asegúrate de tener las reglas de Firebase en '.read: true' temporalmente.")) {
        return;
    }

    showToast("Iniciando migración...", "info");
    try {
        const usersSnap = await database.ref('users').once('value');
        const users = usersSnap.val();

        if (!users) {
            console.log("No se encontraron usuarios para migrar.");
            return;
        }

        let totalMigrated = 0;
        const sharedRef = database.ref('voso_records');

        for (const uid in users) {
            const legacyRecords = users[uid].voso_records;
            if (legacyRecords) {
                for (const recordId in legacyRecords) {
                    const record = legacyRecords[recordId];

                    // Asegurar campos de autoría
                    if (!record.createdBy) record.createdBy = uid;
                    if (!record.createdByEmail) record.createdByEmail = users[uid].email || 'unknown@example.com';

                    await sharedRef.child(recordId).set(record);
                    totalMigrated++;
                }
            }
        }

        console.log(`✅ Migración completada. Se movieron ${totalMigrated} registros a voso_records.`);
        alert(`Migración exitosa: ${totalMigrated} registros movidos.`);
    } catch (error) {
        console.error("Error en la migración:", error);
        alert("Error: Asegúrate de que las reglas de Firebase permitan leer el nodo 'users'.");
    }
}
