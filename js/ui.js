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
