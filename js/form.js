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

function resetSentidos() {
    const input = document.getElementById('sentidosSeleccionados');
    if (input) {
        input.value = '';
    }
    
    document.querySelectorAll('.sentido-btn').forEach(btn => {
        btn.classList.remove('active');
    });
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
        estado: 'aviso_creado',
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email,
        historial: [{ fecha: new Date().toISOString(), accion: 'creado', usuario: document.getElementById('reportadoPor').value }]
    };

    if (editingRecordId) {
        // ACTUALIZAR REGISTRO EXISTENTE
        const recordToUpdate = records.find(r => r.id === editingRecordId);
        const historial = recordToUpdate.historial || [];
        historial.push({
            fecha: new Date().toISOString(),
            accion: 'actualizado',
            usuario: document.getElementById('reportadoPor').value
        });

        const updateData = {
            tipo: record.tipo,
            nombre: record.nombre,
            ubicacion: record.ubicacion,
            gpsCoords: record.gpsCoords,
            sentidos: record.sentidos,
            tipoAnomalia: record.tipoAnomalia,
            severidad: record.severidad,
            descripcion: record.descripcion,
            acciones: record.acciones,
            imagen: record.imagen || recordToUpdate.imagen, // Mantener la anterior si no hay nueva
            historial: historial
        };

        if (!isOnline) {
            // Manejo offline para edición podría ser complejo, por ahora simplificamos
            showToast('Modo offline no permite edición segura actualmente', 'warning');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar';
            return;
        }

        recordsRef.child(editingRecordId).update(updateData)
            .then(() => {
                showToast('Actualizado exitosamente', 'success');
                cancelEdit();
            })
            .catch((error) => {
                showToast('Error: ' + error.message, 'error');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar';
            });

        return; // Detener aquí si es edición
    }

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

function editRecord(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;

    editingRecordId = id;

    // Poblar formulario
    setTipo(record.tipo);
    document.getElementById('nombre').value = record.nombre;
    document.getElementById('ubicacion').value = record.ubicacion;
    document.getElementById('gpsCoords').value = record.gpsCoords || '';
    if (record.gpsCoords) document.getElementById('gpsIndicator').classList.remove('hidden');

    // Sentidos
    resetSentidos();
    if (record.sentidos) {
        record.sentidos.forEach(s => toggleSentido(s));
    }

    document.getElementById('tipoAnomalia').value = record.tipoAnomalia;
    setSeveridad(record.severidad);
    document.getElementById('descripcion').value = record.descripcion;
    document.getElementById('acciones').value = record.acciones || '';
    document.getElementById('reportadoPor').value = record.reportadoPor;

    // Imagen
    if (record.imagen) {
        const preview = document.getElementById('imagePreview');
        const placeholder = document.getElementById('uploadPlaceholder');
        const removeBtn = document.getElementById('removeImage');
        preview.src = record.imagen;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeBtn.classList.remove('hidden');
    }

    // UI Feedback
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i><span>Actualizar Registro</span>';
    submitBtn.classList.remove('from-blue-600', 'to-purple-600');
    submitBtn.classList.add('from-orange-500', 'to-orange-700');

    // Scroll al formulario
    document.querySelector('.form-sticky').scrollIntoView({ behavior: 'smooth' });

    // Botón cancelar
    if (!document.getElementById('cancelEditBtn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelEditBtn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'w-full bg-gray-200 text-gray-700 text-sm font-semibold py-2 rounded-md mt-2 hover:bg-gray-300 transition';
        cancelBtn.textContent = 'Cancelar Edición';
        cancelBtn.onclick = cancelEdit;
        submitBtn.parentNode.appendChild(cancelBtn);
    }
}

function cancelEdit() {
    editingRecordId = null;
    const form = document.getElementById('vosoForm');
    form.reset();
    removeImage();
    setSeveridad('media');
    setTipo('equipo');
    resetSentidos();
    document.getElementById('gpsIndicator').classList.add('hidden');

    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('reportadoPor').value = displayName;

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<i class="fas fa-save"></i><span>Guardar</span>';
    submitBtn.classList.add('from-blue-600', 'to-purple-600');
    submitBtn.classList.remove('from-orange-500', 'to-orange-700');

    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.remove();
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
