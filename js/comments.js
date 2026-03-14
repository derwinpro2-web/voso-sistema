// ==========================================
// HILOS DE COMENTARIOS Y SEGUIMIENTO
// ==========================================

function openComments(recordId) {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    currentCommentsRecordId = recordId;
    document.getElementById('commentsRecordName').textContent = record.nombre + ' — ' + record.ubicacion;
    document.getElementById('commentsModal').classList.remove('hidden');
    document.getElementById('commentText').value = '';
    removeCommentImage();

    // Real-time listener
    const commentsRef = database.ref(`comments/${recordId}`);
    if (commentsListener) commentsListener();

    const unsubscribe = commentsRef.orderByChild('timestamp').on('value', (snapshot) => {
        const comments = [];
        snapshot.forEach(child => {
            comments.push({ id: child.key, ...child.val() });
        });
        renderComments(comments);
    });

    commentsListener = () => commentsRef.off('value', unsubscribe);
}

function closeComments() {
    document.getElementById('commentsModal').classList.add('hidden');
    if (commentsListener) {
        commentsListener();
        commentsListener = null;
    }
    currentCommentsRecordId = null;
    currentCommentImage = null;
}

function renderComments(comments) {
    const container = document.getElementById('commentsList');
    const emptyState = document.getElementById('commentsEmpty');

    if (comments.length === 0) {
        container.innerHTML = '';
        container.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = comments.map(c => {
        const isOwn = c.userId === currentUser.uid;
        const time = new Date(c.timestamp).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        const initials = (c.userName || 'U').charAt(0).toUpperCase();

        const bgClass = isOwn ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-800';
        const alignClass = isOwn ? 'own' : 'other';
        const timeClass = isOwn ? 'text-white/70' : 'text-gray-400';
        const nameClass = isOwn ? 'text-white/90' : 'text-blue-600';

        return `
            <div class="comment-bubble ${alignClass} ${bgClass} rounded-xl p-3 shadow-sm">
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full ${isOwn ? 'bg-white/30' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0">
                        <span class="text-[9px] font-bold ${isOwn ? 'text-white' : 'text-blue-600'}">${initials}</span>
                    </div>
                    <span class="text-[10px] font-semibold ${nameClass}">${c.userName || 'Usuario'}</span>
                    <span class="text-[9px] ${timeClass} ml-auto">${time}</span>
                </div>
                ${c.text ? `<p class="text-xs leading-relaxed">${escapeHtml(c.text)}</p>` : ''}
                ${c.image ? `<img src="${c.image}" class="comment-image mt-2" onclick="openImageModal('${c.image}')" alt="Adjunto">` : ''}
                ${(isOwn || isAdmin) ? `
                    <div class="flex justify-end mt-1">
                        <button onclick="deleteComment('${c.id}')" class="${isOwn ? 'text-white/50 hover:text-white/90' : 'text-gray-300 hover:text-red-500'} text-[10px] transition" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Scroll al final
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addComment() {
    if (!currentUser || !currentCommentsRecordId) return;

    const textInput = document.getElementById('commentText');
    const text = textInput.value.trim();

    if (!text && !currentCommentImage) {
        showToast('Escribe un comentario o adjunta una foto', 'warning');
        return;
    }

    const sendBtn = document.getElementById('sendCommentBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-xs"></i>';

    const comment = {
        text: text,
        image: currentCommentImage || null,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email.split('@')[0],
        timestamp: Date.now()
    };

    const commentsRef = database.ref(`comments/${currentCommentsRecordId}`);
    commentsRef.push(comment)
        .then(() => {
            // Update comment count on the record
            return commentsRef.once('value');
        })
        .then((snapshot) => {
            const count = snapshot.numChildren();
            return recordsRef.child(currentCommentsRecordId).update({ commentCount: count });
        })
        .then(() => {
            textInput.value = '';
            textInput.style.height = 'auto';
            removeCommentImage();
        })
        .catch(err => {
            showToast('Error al enviar: ' + err.message, 'error');
        })
        .finally(() => {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane text-xs"></i>';
        });
}

function previewCommentImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 600;
                const scale = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                currentCommentImage = canvas.toDataURL('image/jpeg', 0.6);

                document.getElementById('commentImagePreview').src = currentCommentImage;
                document.getElementById('commentImagePreviewContainer').classList.remove('hidden');
            };
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeCommentImage() {
    currentCommentImage = null;
    document.getElementById('commentImagePreviewContainer').classList.add('hidden');
    document.getElementById('commentImageInput').value = '';
}

function deleteComment(commentId) {
    if (!currentCommentsRecordId || !currentUser) return;
    if (!confirm('¿Eliminar este comentario?')) return;

    const commentsRef = database.ref(`comments/${currentCommentsRecordId}`);
    commentsRef.child(commentId).remove()
        .then(() => commentsRef.once('value'))
        .then((snapshot) => {
            const count = snapshot.numChildren();
            return recordsRef.child(currentCommentsRecordId).update({ commentCount: count });
        })
        .then(() => showToast('Comentario eliminado', 'success'))
        .catch(err => showToast('Error: ' + err.message, 'error'));
}
