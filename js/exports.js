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

function toggleRecordSelection(id, isSelected) {
    if (isSelected) {
        selectedRecords.add(id);
    } else {
        selectedRecords.delete(id);
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    const count = selectedRecords.size;
    const exportBtn = document.getElementById('exportBtn');
    if (count > 0) {
        exportBtn.innerHTML = `<i class="fas fa-check-square mr-1"></i>PDF (${count})`;
        exportBtn.classList.remove('bg-white/20');
        exportBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } else {
        exportBtn.innerHTML = `<i class="fas fa-download mr-1"></i><span class="hidden md:inline">Exportar</span><i class="fas fa-chevron-down text-xs ml-1 transition-transform duration-200" id="exportChevron"></i>`;
        exportBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        exportBtn.classList.add('bg-white/20');
    }
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Filter by selection if any
    const recordsToExport = selectedRecords.size > 0
        ? records.filter(r => selectedRecords.has(r.id))
        : records;

    if (recordsToExport.length === 0) {
        showToast('No hay registros para exportar', 'warning');
        return;
    }

    showToast(`Generando reporte PDF (${recordsToExport.length})...`, 'info');

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

    const total = recordsToExport.length;
    const avisoCreado = recordsToExport.filter(r => r.estado === 'aviso_creado').length;
    const pending = recordsToExport.filter(r => r.estado === 'pendiente').length;
    const resolved = recordsToExport.filter(r => r.estado === 'resuelto').length;
    const equipos = new Set(recordsToExport.map(r => r.nombre)).size;

    doc.autoTable({
        startY: 60,
        head: [['Total Registros', 'Aviso Creado', 'Pendientes', 'Resueltos', 'Equipos/Áreas']],
        body: [[total, avisoCreado, pending, resolved, equipos]],
        theme: 'plain',
        styles: { fontSize: 10, halign: 'center' },
        headStyles: { fontStyle: 'bold', textColor: [100, 100, 100] }
    });

    // --- Tabla Detallada ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Listado Detallado de Registros', 15, doc.lastAutoTable.finalY + 15);

    const tableBody = recordsToExport.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(r => [
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
    const recordsWithImages = recordsToExport.filter(r => r.imagen || r.firmaCierre);
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

    // Opción: limpiar selección tras exportar
    selectedRecords.clear();
    updateSelectionUI();
    renderRecords();
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
    document.getElementById('avisoRecords').textContent = records.filter(r => r.estado === 'aviso_creado').length;
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
