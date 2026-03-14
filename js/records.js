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
        aviso_creado: 'bg-cyan-100 text-cyan-800',
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
                                <div class="flex items-center self-stretch pr-1">
                                    <input type="checkbox" 
                                        class="voso-checkbox w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                                        onchange="toggleRecordSelection(${record.id}, this.checked)"
                                        ${selectedRecords.has(record.id) ? 'checked' : ''}
                                        onclick="event.stopPropagation()">
                                </div>
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
                                    <option value="aviso_creado" ${record.estado === 'aviso_creado' ? 'selected' : ''}>Aviso Creado</option>
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
                                <button onclick="openComments(${record.id})" class="text-purple-600 hover:text-purple-800 text-xs relative" title="Comentarios">
                                    <i class="fas fa-comments"></i>
                                    ${record.commentCount ? `<span class="absolute -top-1.5 -right-2 bg-purple-600 text-white comment-badge">${record.commentCount}</span>` : ''}
                                </button>
                                <button onclick="printRecord(${record.id})" class="text-blue-600 hover:text-blue-800 text-xs" title="Imprimir">
                                    <i class="fas fa-print"></i>
                                </button>
                                ${(isAdmin || record.createdBy === currentUser.uid) ? `
                                <button onclick="editRecord(${record.id})" class="text-blue-600 hover:text-blue-800 text-xs" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
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
