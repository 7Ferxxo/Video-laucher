/* ============================================
   Video Launcher — App Logic
   ============================================ */

(function () {
    'use strict';

    // --- DOM Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadContent = document.getElementById('uploadContent');
    const videoPreview = document.getElementById('videoPreview');
    const previewPlayer = document.getElementById('previewPlayer');
    const videoInfo = document.getElementById('videoInfo');
    const removeVideoBtn = document.getElementById('removeVideo');
    const caption = document.getElementById('caption');
    const charCount = document.getElementById('charCount');
    const submitBtn = document.getElementById('submitBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const statusMessage = document.getElementById('statusMessage');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModal = document.getElementById('closeModal');
    const saveSettings = document.getElementById('saveSettings');
    const webhookUrlInput = document.getElementById('webhookUrl');
    const emailNotifyInput = document.getElementById('emailNotify');
    const historyList = document.getElementById('historyList');
    const platformTiktok = document.getElementById('platformTiktok');
    const platformInstagram = document.getElementById('platformInstagram');

    // --- State ---
    let selectedFile = null;
    let isUploading = false;

    // --- Initialization ---
    function init() {
        loadSettings();
        loadHistory();
        bindEvents();
    }

    // --- Settings ---
    function loadSettings() {
        const saved = localStorage.getItem('videoLauncherSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            webhookUrlInput.value = settings.webhookUrl || '';
            emailNotifyInput.value = settings.email || '';
        }
    }

    function saveSettingsToStorage() {
        const settings = {
            webhookUrl: webhookUrlInput.value.trim(),
            email: emailNotifyInput.value.trim()
        };
        localStorage.setItem('videoLauncherSettings', JSON.stringify(settings));
    }

    function getWebhookUrl() {
        const saved = localStorage.getItem('videoLauncherSettings');
        if (saved) {
            return JSON.parse(saved).webhookUrl || '';
        }
        return '';
    }

    // --- Event Bindings ---
    function bindEvents() {
        // Drop zone
        dropZone.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-video')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });

        removeVideoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearFile();
        });

        // Caption
        caption.addEventListener('input', () => {
            charCount.textContent = `${caption.value.length} / 2200`;
            updateSubmitState();
        });

        // Platform toggles
        platformTiktok.addEventListener('click', () => togglePlatform(platformTiktok));
        platformInstagram.addEventListener('click', () => togglePlatform(platformInstagram));

        // Submit
        submitBtn.addEventListener('click', handleSubmit);

        // Settings
        settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
        closeModal.addEventListener('click', () => settingsModal.classList.remove('active'));
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.remove('active');
        });
        saveSettings.addEventListener('click', () => {
            saveSettingsToStorage();
            settingsModal.classList.remove('active');
            showStatus('success', '✅ Configuración guardada');
        });

        // Keyboard shortcut for settings
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') settingsModal.classList.remove('active');
        });
    }

    // --- File Handling ---
    function handleFile(file) {
        // Validate type
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/avi'];
        if (!file.type.startsWith('video/')) {
            showStatus('error', '❌ Solo se permiten archivos de video');
            return;
        }

        // Validate size (500MB)
        if (file.size > 500 * 1024 * 1024) {
            showStatus('error', '❌ El video no puede pesar más de 500MB');
            return;
        }

        selectedFile = file;

        // Show preview
        const url = URL.createObjectURL(file);
        previewPlayer.src = url;
        previewPlayer.play().catch(() => {});

        // File info
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const ext = file.name.split('.').pop().toUpperCase();
        videoInfo.innerHTML = `
            <span>📁 ${file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name}</span>
            <span>📦 ${sizeMB} MB</span>
            <span>🎬 ${ext}</span>
        `;

        uploadContent.classList.add('hidden');
        videoPreview.classList.remove('hidden');
        dropZone.style.padding = '16px';

        updateSubmitState();
    }

    function clearFile() {
        selectedFile = null;
        fileInput.value = '';
        previewPlayer.src = '';

        uploadContent.classList.remove('hidden');
        videoPreview.classList.add('hidden');
        dropZone.style.padding = '';

        updateSubmitState();
    }

    // --- Platform Toggle ---
    function togglePlatform(card) {
        card.classList.toggle('selected');
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.checked = card.classList.contains('selected');
        updateSubmitState();
    }

    // --- Submit State ---
    function updateSubmitState() {
        const hasFile = !!selectedFile;
        const hasPlatform = platformTiktok.classList.contains('selected') || platformInstagram.classList.contains('selected');
        submitBtn.disabled = !hasFile || !hasPlatform || isUploading;
    }

    // --- Upload Handler ---
    async function handleSubmit() {
        const webhookUrl = getWebhookUrl();

        if (!webhookUrl) {
            settingsModal.classList.add('active');
            showStatus('warning', '⚠️ Primero configura la URL del Webhook de n8n');
            return;
        }

        if (!selectedFile) {
            showStatus('error', '❌ Selecciona un video primero');
            return;
        }

        const platforms = [];
        if (platformTiktok.classList.contains('selected')) platforms.push('tiktok');
        if (platformInstagram.classList.contains('selected')) platforms.push('instagram');

        if (platforms.length === 0) {
            showStatus('warning', '⚠️ Selecciona al menos una plataforma');
            return;
        }

        isUploading = true;
        updateSubmitState();
        hideStatus();

        // Show progress
        progressContainer.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = '⏱️ Preparando envío...';

        submitBtn.querySelector('.btn-text').textContent = 'Subiendo...';

        try {
            const formData = new FormData();
            formData.append('data', selectedFile, selectedFile.name);
            formData.append('caption', caption.value.trim());
            formData.append('platforms', platforms.join(','));
            formData.append('email', emailNotifyInput.value.trim());
            formData.append('timestamp', new Date().toISOString());

            // Upload with progress
            const result = await uploadWithProgress(webhookUrl, formData);

            if (result.ok) {
                showStatus('success', '✅ ¡Video enviado a n8n! Se publicará en breve.');
                addToHistory(selectedFile.name, platforms, 'sent');
                // Reset form
                clearFile();
                caption.value = '';
                charCount.textContent = '0 / 2200';
            } else {
                throw new Error(`HTTP ${result.status}`);
            }

        } catch (error) {
            console.error('Upload error:', error);
            showStatus('error', `❌ Error al enviar: ${error.message}. Revisa que n8n esté activo.`);
            addToHistory(selectedFile?.name || 'Video', [], 'failed');
        } finally {
            isUploading = false;
            updateSubmitState();
            progressContainer.classList.add('hidden');
            submitBtn.querySelector('.btn-text').textContent = 'Publicar Ahora';
        }
    }

    function uploadWithProgress(url, formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressFill.style.width = `${percent}%`;

                    if (percent < 30) {
                        progressText.textContent = `📤 Subiendo video... ${percent}%`;
                    } else if (percent < 70) {
                        progressText.textContent = `🚀 Enviando a n8n... ${percent}%`;
                    } else if (percent < 100) {
                        progressText.textContent = `⚡ Casi listo... ${percent}%`;
                    } else {
                        progressText.textContent = '🔄 Esperando respuesta de n8n...';
                    }
                }
            });

            xhr.addEventListener('load', () => {
                resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Error de red. Verifica la conexión con n8n.'));
            });

            xhr.addEventListener('timeout', () => {
                reject(new Error('Timeout — n8n tardó demasiado en responder.'));
            });

            xhr.timeout = 120000; // 2 minutes for large videos
            xhr.open('POST', url);
            xhr.send(formData);
        });
    }

    // --- Status Messages ---
    function showStatus(type, message) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');

        if (type === 'success') {
            setTimeout(hideStatus, 5000);
        }
    }

    function hideStatus() {
        statusMessage.classList.add('hidden');
    }

    // --- History ---
    function loadHistory() {
        const saved = localStorage.getItem('videoLauncherHistory');
        if (saved) {
            const items = JSON.parse(saved);
            if (items.length > 0) {
                historyList.innerHTML = '';
                items.forEach(item => renderHistoryItem(item));
            }
        }
    }

    function addToHistory(filename, platforms, status) {
        const item = {
            filename,
            platforms,
            status,
            time: new Date().toLocaleString('es-ES', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        // Get existing history
        let history = [];
        const saved = localStorage.getItem('videoLauncherHistory');
        if (saved) history = JSON.parse(saved);

        // Add to front, max 20 items
        history.unshift(item);
        if (history.length > 20) history = history.slice(0, 20);

        localStorage.setItem('videoLauncherHistory', JSON.stringify(history));

        // Render
        const emptyMsg = historyList.querySelector('.history-empty');
        if (emptyMsg) emptyMsg.remove();

        renderHistoryItem(item, true);
    }

    function renderHistoryItem(item, prepend = false) {
        const platformIcons = {
            tiktok: '🎵',
            instagram: '📸'
        };

        const platformStr = item.platforms.map(p => platformIcons[p] || p).join(' ');
        const statusClass = item.status === 'sent' ? 'sent' : 'failed';
        const statusLabel = item.status === 'sent' ? 'Enviado' : 'Error';

        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-thumb">${item.status === 'sent' ? '🎬' : '⚠️'}</div>
            <div class="history-details">
                <p class="history-name">${escapeHtml(item.filename)}</p>
                <p class="history-meta">
                    <span>${platformStr || '—'}</span>
                    <span>${item.time}</span>
                </p>
            </div>
            <span class="history-status ${statusClass}">${statusLabel}</span>
        `;

        if (prepend) {
            historyList.prepend(div);
        } else {
            historyList.appendChild(div);
        }
    }

    // --- Utility ---
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Start ---
    init();

})();
