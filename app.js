if (typeof window !== 'undefined' && typeof window.chrome === 'undefined') {
    window.chrome = {
        runtime: {
            lastError: null,
            sendMessage: (_payload, cb) => {
                if (cb) cb({ success: false, error: 'Web版では利用できません' });
            }
        },
        storage: {
            local: {
                get: async () => ({}),
                set: async () => {}
            }
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'harada_method_app_data_v1';

    // ========================================
    // グローバルヘルパー関数
    // ========================================
    const HabitHelper = {
        builtInIds: ['sleep', 'english', 'muscle', 'jogging', 'mental', 'social'],

        isCompleted(habitId) {
            const card = document.getElementById(`card-${habitId}`);
            return card ? card.classList.contains('completed') : false;
        },

        isResting(habitId) {
            const card = document.getElementById(`card-${habitId}`);
            return card ? card.classList.contains('resting') : false;
        },

        setCardState(habitId, state) {
            const card = document.getElementById(`card-${habitId}`);
            if (!card) return;

            card.classList.remove('completed', 'resting');
            if (state === 'done') {
                card.classList.add('completed');
            } else if (state === 'rest') {
                card.classList.add('resting');
            }
        },

        getCardState(habitId) {
            if (this.isCompleted(habitId)) return 'done';
            if (this.isResting(habitId)) return 'rest';
            return 'none';
        }
    };

    let appState = {
        goal: '',
        deadline: '',
        fourViews: {
            selfTangible: '',
            selfIntangible: '',
            societyTangible: '',
            societyIntangible: ''
        },
        milestones: {
            days3: '',
            week1: '',
            month1: '',
            month3: '',
            month6: '',
            year1: ''
        },
        // KPIs for SMART goals
        kpis: [
            { name: '', current: '', target: '', unit: '', history: [] },
            { name: '', current: '', target: '', unit: '', history: [] },
            { name: '', current: '', target: '', unit: '', history: [] }
        ],
        // Habits (Dynamic)
        habitDefinitions: [
            { id: 'sleep', name: '早寝早起き', icon: 'fa-solid fa-bed', feedback: 'Good Morning! ☀️' },
            { id: 'english', name: '英語学習', icon: 'fa-solid fa-language', feedback: 'Great Job! 🎉' },
            { id: 'muscle', name: '筋トレ', icon: 'fa-solid fa-dumbbell', feedback: 'Nice Pump! 💪' },
            { id: 'jogging', name: 'ジョギング', icon: 'fa-solid fa-person-running', feedback: 'Good Run! 🏃‍♂️' },
            { id: 'mental', name: 'メンタルケア', icon: 'fa-solid fa-spa', feedback: 'Relaxed 😌' },
            { id: 'social', name: '発信活動', icon: 'fa-solid fa-share-nodes', feedback: 'Posted! 📱' }
        ],
        // Supporters
        supporters: [
            { name: '', do: '', dont: '' },
            { name: '', do: '', dont: '' },
            { name: '', do: '', dont: '' },
            { name: '', do: '', dont: '' }
        ],
        // Mental Control
        mental: {
            declaration: '',
            selftalk: '',
            improvement: '',
            reset: ''
        },
        // Mandala: 9 blocks
        mandala: Array(9).fill(null).map(() => Array(9).fill('')),
        routines: [], // { id, text }
        logs: {}, // { 'YYYY-MM-DD': { routineId: boolean } }
        sprintGoals: [] // { id, text, deadline, completed }
    };



    try {
        initRestButtons();
        initSliders();
        initChipEditing();
        initStarRating();
    } catch (e) {
        console.error('Fatal Init Error:', e);
        alert('起動エラー: ' + e.message);
    }

    function loadState() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                appState = { ...appState, ...parsed };
                // Ensure array structures
                if (!appState.mandala || appState.mandala.length !== 9) {
                    appState.mandala = Array(9).fill(null).map(() => Array(9).fill(''));
                }
                if (!appState.sprintGoals) appState.sprintGoals = [];
                if (!appState.milestones) appState.milestones = {};
                if (!appState.habitDefinitions) {
                    // Default habits if missing
                    appState.habitDefinitions = [
                        { id: 'sleep', name: '早寝早起き', icon: 'fa-solid fa-bed', feedback: 'Good Morning! ☀️' },
                        { id: 'english', name: '英語学習', icon: 'fa-solid fa-language', feedback: 'Great Job! 🎉' },
                        { id: 'muscle', name: '筋トレ', icon: 'fa-solid fa-dumbbell', feedback: 'Nice Pump! 💪' },
                        { id: 'jogging', name: 'ジョギング', icon: 'fa-solid fa-person-running', feedback: 'Good Run! 🏃‍♂️' },
                        { id: 'mental', name: 'メンタルケア', icon: 'fa-solid fa-spa', feedback: 'Relaxed 😌' },
                        { id: 'social', name: '発信活動', icon: 'fa-solid fa-share-nodes', feedback: 'Posted! 📱' }
                    ];
                }
                if (!appState.supporters) {
                    appState.supporters = [
                        { name: '', do: '', dont: '' },
                        { name: '', do: '', dont: '' },
                        { name: '', do: '', dont: '' },
                        { name: '', do: '', dont: '' }
                    ];
                }
                if (!appState.mental) {
                    appState.mental = { declaration: '', selftalk: '', improvement: '', reset: '' };
                }
            } catch (e) {
                console.error('Failed to parse state', e);
            }
        }
        renderHabits(); // Initial Render
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        updateDashboard();
    }

    // --- Navigation ---
    const navLinksContainer = document.getElementById('nav-links');
    let navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.page-section');
    const NAV_ORDER_KEY = 'harada_nav_order';

    // Load saved nav order
    function loadNavOrder() {
        const savedOrder = localStorage.getItem(NAV_ORDER_KEY);
        if (savedOrder && navLinksContainer) {
            try {
                const order = JSON.parse(savedOrder);
                const items = Array.from(navLinksContainer.children);
                order.forEach(targetId => {
                    const item = items.find(el => el.getAttribute('data-target') === targetId);
                    if (item) navLinksContainer.appendChild(item);
                });
                // Re-query after reorder
                navItems = document.querySelectorAll('.nav-item');
            } catch (e) {
                console.error('Failed to load nav order', e);
            }
        }
    }

    // Save nav order
    function saveNavOrder() {
        if (!navLinksContainer) return;
        const order = Array.from(navLinksContainer.children).map(el => el.getAttribute('data-target'));
        localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order));
    }

    // Drag and drop for nav items
    let draggedItem = null;

    function initNavDragDrop() {
        navItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('drag-over'));
                saveNavOrder();
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (draggedItem && draggedItem !== item) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                if (draggedItem && draggedItem !== item && navLinksContainer) {
                    const allItems = Array.from(navLinksContainer.children);
                    const draggedIndex = allItems.indexOf(draggedItem);
                    const targetIndex = allItems.indexOf(item);

                    if (draggedIndex < targetIndex) {
                        navLinksContainer.insertBefore(draggedItem, item.nextSibling);
                    } else {
                        navLinksContainer.insertBefore(draggedItem, item);
                    }
                }
            });

            // Click handler for navigation
            item.addEventListener('click', (e) => {
                // Don't navigate if clicking drag handle
                if (e.target.classList.contains('drag-handle')) return;

                const targetId = item.getAttribute('data-target');
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                sections.forEach(sec => {
                    sec.classList.remove('active');
                    if (sec.id === targetId) {
                        sec.classList.add('active');
                        if (targetId === 'dashboard') updateDashboard();
                        if (targetId === 'mandala') renderMandala();
                        if (targetId === 'sprint-goals') renderSprintGoals();
                    }
                });
            });
        });
    }

    loadNavOrder();
    initNavDragDrop();

    // --- Settings & Config (Moved to top for priority) ---
    const userProfileBtn = document.querySelector('.user-profile');
    const settingsModal = document.getElementById('settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const configGasUrl = document.getElementById('config-gas-url');
    const configSsUrl = document.getElementById('config-ss-url');
    const configNotebookUrl = document.getElementById('config-notebook-url');
    const configGeminiKey = document.getElementById('config-gemini-key');
    const configCustomPrompt = document.getElementById('config-custom-prompt');
    const linkSsUrl = document.getElementById('link-ss-url');
    const linkNotebookUrl = document.getElementById('link-notebook-url');
    const CONFIG_KEY = 'nld_config';

    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', async () => {

            // Fallback config object
            let config = {};

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                try {
                    const result = await chrome.storage.local.get(CONFIG_KEY);
                    config = result[CONFIG_KEY] || {};
                } catch (e) { console.error(e); }
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem(CONFIG_KEY);
                if (stored) {
                    try { config = JSON.parse(stored); } catch (e) { }
                }
            }

            if (configGasUrl) configGasUrl.value = config.gasUrl || '';
            if (configSsUrl) {
                configSsUrl.value = config.ssUrl || '';
                updateConfigLink(linkSsUrl, config.ssUrl);
            }
            if (configNotebookUrl) {
                configNotebookUrl.value = config.notebookUrl || '';
                updateConfigLink(linkNotebookUrl, config.notebookUrl);
            }
            if (configGeminiKey) configGeminiKey.value = config.geminiApiKey || '';
            const defPrompt = "以下の文章を日記として読みやすく整形してください。内容は変えず、誤字脱字の修正や言い回しの改善のみを行ってください。アドバイスや感想、追加の質問は一切不要です。出力は整形後の本文のみにしてください。";
            if (configCustomPrompt) configCustomPrompt.value = config.customPrompt || defPrompt;

            if (settingsModal) settingsModal.classList.add('open');
        });
    }

    function updateConfigLink(linkEl, url) {
        if (!linkEl) return;
        if (url && url.startsWith('http')) {
            linkEl.href = url;
            linkEl.style.display = 'inline-block';
        } else {
            linkEl.style.display = 'none';
        }
    }

    // Real-time update for links
    if (configSsUrl) configSsUrl.addEventListener('input', (e) => updateConfigLink(linkSsUrl, e.target.value));
    if (configNotebookUrl) configNotebookUrl.addEventListener('input', (e) => updateConfigLink(linkNotebookUrl, e.target.value));
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => settingsModal.classList.remove('open'));
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', async () => {
            const config = {
                gasUrl: configGasUrl ? configGasUrl.value : '',
                ssUrl: configSsUrl ? configSsUrl.value : '',
                notebookUrl: configNotebookUrl ? configNotebookUrl.value : '',
                geminiApiKey: configGeminiKey ? configGeminiKey.value : '',
                customPrompt: configCustomPrompt ? configCustomPrompt.value : ''
            };
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ [CONFIG_KEY]: config });
                alert('設定を保存しました (Extension Storage)');
                settingsModal.classList.remove('open');
            } else {
                // Fallback to localStorage
                localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
                alert('設定を保存しました (Local Storage)');
                settingsModal.classList.remove('open');
            }
        });
    }

    // --- Goal Setting Logic ---
    const goalInput = document.getElementById('goal-input');
    const deadlineInput = document.getElementById('deadline-input');
    const viewInputs = {
        selfTangible: document.getElementById('view-self-tangible'),
        selfIntangible: document.getElementById('view-self-intangible'),
        societyTangible: document.getElementById('view-society-tangible'),
        societyIntangible: document.getElementById('view-society-intangible')
    };
    // Milestones Inputs
    const milestoneInputs = {
        days3: document.getElementById('milestone-3days'),
        week1: document.getElementById('milestone-1week'),
        month1: document.getElementById('milestone-1month'),
        month3: document.getElementById('milestone-3months'),
        month6: document.getElementById('milestone-6months'),
        year1: document.getElementById('milestone-1year')
    };

    const saveGoalBtn = document.getElementById('save-goal-btn');

    function initGoalForm() {
        if (appState.goal) goalInput.value = appState.goal;
        if (appState.deadline) deadlineInput.value = appState.deadline;
        if (appState.fourViews) {
            if (viewInputs.selfTangible) viewInputs.selfTangible.value = appState.fourViews.selfTangible || '';
            if (viewInputs.selfIntangible) viewInputs.selfIntangible.value = appState.fourViews.selfIntangible || '';
            if (viewInputs.societyTangible) viewInputs.societyTangible.value = appState.fourViews.societyTangible || '';
            if (viewInputs.societyIntangible) viewInputs.societyIntangible.value = appState.fourViews.societyIntangible || '';
        }
        if (appState.milestones) {
            if (milestoneInputs.days3) milestoneInputs.days3.value = appState.milestones.days3 || '';
            if (milestoneInputs.week1) milestoneInputs.week1.value = appState.milestones.week1 || '';
            if (milestoneInputs.month1) milestoneInputs.month1.value = appState.milestones.month1 || '';
            if (milestoneInputs.month3) milestoneInputs.month3.value = appState.milestones.month3 || '';
            if (milestoneInputs.month6) milestoneInputs.month6.value = appState.milestones.month6 || '';
            if (milestoneInputs.year1) milestoneInputs.year1.value = appState.milestones.year1 || '';
        }
        // Render KPIs dynamically
        renderKpis();
    }

    // ========================================
    // KPI DYNAMIC RENDERING SYSTEM
    // ========================================
    const kpiContainer = document.getElementById('kpi-container');
    const addKpiBtn = document.getElementById('add-kpi-btn');

    function createKpiElement(index, kpi = {}) {
        const div = document.createElement('div');
        div.className = 'kpi-item';
        div.dataset.index = index;
        const isDecrease = kpi.direction === 'decrease';
        // Get start value from first history entry if available
        const startValue = kpi.history?.[0]?.value || '';
        div.dataset.startValue = startValue;
        div.innerHTML = `
                <div class="kpi-header">
                    <span class="kpi-badge">KPI ${index + 1}</span>
                    <input type="text" class="kpi-name-input" data-field="name" placeholder="例：TOEIC" value="${kpi.name || ''}">
                    <button class="kpi-direction-toggle ${isDecrease ? 'decrease' : ''}" data-field="direction" title="目標の方向を切り替え">
                        ${isDecrease ? '<i class="fa-solid fa-arrow-down"></i> 減少' : '<i class="fa-solid fa-arrow-up"></i> 増加'}
                    </button>
                    <button class="kpi-delete-btn" title="削除"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="kpi-values">
                    <div class="kpi-value-group" style="flex: 2;">
                        <label>現在値</label>
                        <input type="number" class="kpi-number-input" data-field="current" placeholder="0" value="${kpi.current || ''}">
                    </div>
                    <div class="kpi-arrow">${isDecrease ? '↓' : '→'}</div>
                    <div class="kpi-value-group" style="flex: 2;">
                        <label>目標値</label>
                        <input type="number" class="kpi-number-input" data-field="target" placeholder="100" value="${kpi.target || ''}">
                    </div>
                </div>
                <div class="kpi-values" style="margin-bottom: 0;">
                     <div class="kpi-value-group">
                        <label>期日</label>
                        <input type="date" class="kpi-date-input" data-field="deadline" value="${kpi.deadline || ''}">
                    </div>
                </div>
                <div class="kpi-progress-bar">
                    <div class="kpi-progress-fill" style="width: 0%"></div>
                </div>
            `;

        // Add event listeners
        const currentInput = div.querySelector('[data-field="current"]');
        const targetInput = div.querySelector('[data-field="target"]');
        const directionBtn = div.querySelector('.kpi-direction-toggle');
        const deleteBtn = div.querySelector('.kpi-delete-btn');
        const arrowDiv = div.querySelector('.kpi-arrow');

        currentInput.addEventListener('input', () => updateKpiProgressForElement(div));
        targetInput.addEventListener('input', () => updateKpiProgressForElement(div));

        directionBtn.addEventListener('click', () => {
            const isNowDecrease = directionBtn.classList.toggle('decrease');
            directionBtn.innerHTML = isNowDecrease
                ? '<i class="fa-solid fa-arrow-down"></i> 減少'
                : '<i class="fa-solid fa-arrow-up"></i> 増加';
            arrowDiv.textContent = isNowDecrease ? '↓' : '→';
            updateKpiProgressForElement(div);
        });

        deleteBtn.addEventListener('click', () => deleteKpi(index));

        // Initial progress update
        setTimeout(() => updateKpiProgressForElement(div), 0);

        return div;
    }

    function updateKpiProgressForElement(element) {
        const currentInput = element.querySelector('[data-field="current"]');
        const targetInput = element.querySelector('[data-field="target"]');
        const directionBtn = element.querySelector('.kpi-direction-toggle');
        const progressFill = element.querySelector('.kpi-progress-fill');
        if (!currentInput || !targetInput || !progressFill) return;

        const current = parseFloat(currentInput.value) || 0;
        const target = parseFloat(targetInput.value) || 0;
        const isDecrease = directionBtn?.classList.contains('decrease');
        // Use stored start value from history, or current value as fallback
        const start = parseFloat(element.dataset.startValue) || current;

        let progress = 0;

        if (isDecrease) {
            // Decrease goal (e.g., weight: 80kg → 65kg)
            // If no history yet, treat current as start
            const effectiveStart = start || current;
            const totalChange = effectiveStart - target;
            const currentChange = effectiveStart - current;
            if (totalChange > 0) {
                progress = (currentChange / totalChange) * 100;
            }
            // If current <= target, goal achieved
            if (current <= target) progress = 100;
        } else {
            // Increase goal (e.g., TOEIC: 0 → 800)
            if (target > 0) {
                progress = (current / target) * 100;
            }
        }

        progress = Math.max(0, Math.min(100, progress));
        progressFill.style.width = `${progress}%`;
    }

    function renderKpis() {
        if (!kpiContainer) return;
        kpiContainer.innerHTML = '';

        // Ensure kpis array exists
        if (!appState.kpis || appState.kpis.length === 0) {
            appState.kpis = [
                { name: '', current: '', target: '', unit: '', history: [] },
                { name: '', current: '', target: '', unit: '', history: [] }
            ];
        }

        appState.kpis.forEach((kpi, index) => {
            const element = createKpiElement(index, kpi);
            kpiContainer.appendChild(element);
        });
    }

    function addKpi() {
        if (!appState.kpis) appState.kpis = [];
        // Add 1 KPI
        appState.kpis.push({ name: '', start: '', current: '', target: '', direction: 'increase', history: [] });
        renderKpis();
    }

    function deleteKpi(index) {
        if (appState.kpis.length <= 1) {
            alert('最低1つのKPIが必要です');
            return;
        }
        appState.kpis.splice(index, 1);
        renderKpis();
    }

    function collectKpisFromUI() {
        const items = kpiContainer ? kpiContainer.querySelectorAll('.kpi-item') : [];
        const kpis = [];
        items.forEach((item, index) => {
            const name = item.querySelector('[data-field="name"]')?.value || '';
            const current = item.querySelector('[data-field="current"]')?.value || '';
            const target = item.querySelector('[data-field="target"]')?.value || '';
            const deadline = item.querySelector('[data-field="deadline"]')?.value || '';
            const directionBtn = item.querySelector('.kpi-direction-toggle');
            const direction = directionBtn?.classList.contains('decrease') ? 'decrease' : 'increase';

            // Preserve history from existing state
            const existingHistory = appState.kpis[index]?.history || [];

            // Add today's value to history if changed
            const today = new Date().toISOString().split('T')[0];
            const currentValue = parseFloat(current);
            let history = [...existingHistory];

            if (!isNaN(currentValue)) {
                const lastEntry = history[history.length - 1];
                if (!lastEntry || lastEntry.date !== today) {
                    history.push({ date: today, value: currentValue });
                } else {
                    lastEntry.value = currentValue;
                }
            }

            kpis.push({ name, current, target, deadline, direction, history });
        });
        return kpis;
    }

    // Add KPI button listener
    if (addKpiBtn) {
        addKpiBtn.addEventListener('click', addKpi);
    }

    // Legacy function for compatibility
    function updateKpiProgress(index) {
        const items = kpiContainer ? kpiContainer.querySelectorAll('.kpi-item') : [];
        if (items[index]) updateKpiProgressForElement(items[index]);
    }

    if (saveGoalBtn) saveGoalBtn.addEventListener('click', () => {
        appState.goal = goalInput.value;
        appState.deadline = deadlineInput.value;
        if (viewInputs.selfTangible) appState.fourViews.selfTangible = viewInputs.selfTangible.value;
        if (viewInputs.selfIntangible) appState.fourViews.selfIntangible = viewInputs.selfIntangible.value;
        if (viewInputs.societyTangible) appState.fourViews.societyTangible = viewInputs.societyTangible.value;
        if (viewInputs.societyIntangible) appState.fourViews.societyIntangible = viewInputs.societyIntangible.value;

        // Save Milestones
        appState.milestones = {
            days3: milestoneInputs.days3 ? milestoneInputs.days3.value : '',
            week1: milestoneInputs.week1 ? milestoneInputs.week1.value : '',
            month1: milestoneInputs.month1 ? milestoneInputs.month1.value : '',
            month3: milestoneInputs.month3 ? milestoneInputs.month3.value : '',
            month6: milestoneInputs.month6 ? milestoneInputs.month6.value : '',
            year1: milestoneInputs.year1 ? milestoneInputs.year1.value : ''
        };

        // Save KPIs (dynamic)
        appState.kpis = collectKpisFromUI();

        // Sync Main Goal to Mandala
        appState.mandala[4][4] = appState.goal;

        saveState();
        alert('目標設定を保存しました');
    });

    // ... (Sprint Goals remains same) ...
    // Note: To preserve context perfectly, I will skip re-outputting Sprint Logic here as it's separate.
    // The previous replace call might require me to bridge this gap carefully.
    // Let me just ensure the replaced block connects correctly.
    // WAIT, I need to update the AI Wizard Logic further down too. 
    // I should probably target the specific AI Wizard block separately or include it here if contiguous.
    // Looking at file content, AI Logic starts at line 169.
    // My replace block ends before that. I will do AI logic in next step.

    // --- Sprint Goals (3 Days) Logic ---
    const sprintList = document.getElementById('sprint-list');
    const btnAddSprint = document.getElementById('btn-add-sprint-goal');

    function renderSprintGoals() {
        if (!sprintList) return;
        sprintList.innerHTML = '';
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (appState.sprintGoals.length === 0) {
            sprintList.innerHTML = '<div class="empty-state">直近3日間で達成したいことを登録しましょう</div>';
            return;
        }

        appState.sprintGoals.forEach(sg => {
            const div = document.createElement('div');
            div.className = 'sprint-item';
            div.innerHTML = `
                <div class="sprint-check ${sg.completed ? 'checked' : ''}" data-id="${sg.id}">
                    <i class="fa-solid fa-check"></i>
                </div>
                <div class="sprint-content">
                    <div class="sprint-text ${sg.completed ? 'checked' : ''}">${sg.text}</div>
                    <div class="sprint-meta">期限: ${sg.deadline || 'なし'}</div>
                </div>
                <div class="sprint-delete" data-id="${sg.id}"><i class="fa-solid fa-trash"></i></div>
            `;

            // Toggle Check
            div.querySelector('.sprint-check').addEventListener('click', () => {
                sg.completed = !sg.completed;
                saveState();
                renderSprintGoals();
            });

            // Delete
            div.querySelector('.sprint-delete').addEventListener('click', () => {
                if (confirm('削除してもよろしいですか？')) {
                    appState.sprintGoals = appState.sprintGoals.filter(g => g.id !== sg.id);
                    saveState();
                    renderSprintGoals();
                }
            });

            sprintList.appendChild(div);
        });
    }

    if (btnAddSprint) btnAddSprint.addEventListener('click', () => {
        const text = prompt('3日以内に達成したい目標を入力してください:');
        if (text) {
            const d = new Date();
            d.setDate(d.getDate() + 3);
            const deadlineStr = d.toISOString().split('T')[0];

            appState.sprintGoals.push({
                id: Date.now().toString(),
                text: text,
                deadline: deadlineStr,
                completed: false
            });
            saveState();
            renderSprintGoals();
        }
    });


    // --- AI Wizard Logic ---
    const btnOpenWizard = document.getElementById('btn-open-ai-wizard');
    const wizardModal = document.getElementById('ai-wizard-modal');
    const wizardContent = document.getElementById('wizard-content');
    const btnWizNext = document.getElementById('btn-wiz-next');
    const btnWizPrev = document.getElementById('btn-wiz-prev');
    const btnWizCancel = document.getElementById('btn-wiz-cancel');
    const btnWizSave = document.getElementById('btn-wiz-save'); // New
    const stepIndicators = document.querySelectorAll('.step-indicator .step');

    let currentWizStep = 1;
    let wizAnswers = {}; // Changed to let to allow reassignment
    const totalSteps = 5;

    const wizQuestions = [
        { id: 1, title: 'Q1. 達成したいこと', text: 'あなたが一番達成したい目標（夢）は何ですか？', placeholder: '例：年収2000万円、英語ペラペラ、フルマラソン完走...' },
        { id: 2, title: 'Q2. 目的・理由', text: 'なぜそれを達成したいのですか？それを達成すると、どんな良いことがありますか？', placeholder: '例：家族を旅行に連れて行ける、自分に自信がつく...' },
        { id: 3, title: 'Q3. 自分のメリット（有形）', text: '達成した時、あなた自身が得られる「目に見えるもの」は何ですか？', placeholder: '例：新しい車、貯金、賞状...' },
        { id: 4, title: 'Q4. 自分の変化（無形）', text: '達成した時、あなたの心やスキルはどう成長していますか？', placeholder: '例：自信、忍耐力、プレゼンスキル...' },
        { id: 5, title: 'Q5. 他者への貢献', text: 'あなたがそれを達成することで、周りの人や社会にどんな良い影響がありますか？', placeholder: '例：家族が笑顔になる、後輩の目標になる...' }
    ];

    function renderWizardStep(step) {
        // Update Indicators
        stepIndicators.forEach((ind, idx) => {
            if (idx + 1 === step) ind.classList.add('active');
            else ind.classList.remove('active');
        });

        // Show Buttons
        btnWizPrev.style.display = step === 1 ? 'none' : 'block';
        btnWizNext.innerHTML = step === totalSteps ? '生成する <i class="fa-solid fa-wand-magic-sparkles"></i>' : '次へ <i class="fa-solid fa-arrow-right"></i>';

        const q = wizQuestions[step - 1];
        wizardContent.innerHTML = `
            <div class="question-slide active">
                <h3>${q.title}</h3>
                <p>${q.text}</p>
                <textarea id="wiz-input-${step}" placeholder="${q.placeholder}" style="width:100%; height:120px;">${wizAnswers[step] || ''}</textarea>
            </div>
        `;
    }

    if (btnOpenWizard) {
        btnOpenWizard.addEventListener('click', () => {
            currentWizStep = 1;

            // Load Draft if exists
            const draft = localStorage.getItem('nld_wiz_draft');
            if (draft) {
                try {
                    wizAnswers = JSON.parse(draft);
                } catch (e) {
                    wizAnswers = {};
                }
            } else {
                wizAnswers = {};
            }

            renderWizardStep(1);
            wizardModal.classList.add('open');
        });
    }

    if (btnWizCancel) {
        btnWizCancel.addEventListener('click', () => {
            if (wizardModal) wizardModal.classList.remove('open');
        });
    }

    // Temp Save Logic
    if (btnWizSave) {
        btnWizSave.addEventListener('click', () => {
            // Save current step input first
            const input = document.getElementById(`wiz-input-${currentWizStep}`);
            if (input) wizAnswers[currentWizStep] = input.value;

            localStorage.setItem('nld_wiz_draft', JSON.stringify(wizAnswers));
            alert('回答を一時保存しました。\n次回開くときに復元されます。');
        });
    }

    if (btnWizPrev) {
        btnWizPrev.addEventListener('click', () => {
            if (currentWizStep > 1) {
                // Save current
                const input = document.getElementById(`wiz-input-${currentWizStep}`);
                if (input) wizAnswers[currentWizStep] = input.value;

                currentWizStep--;
                renderWizardStep(currentWizStep);
            }
        });
    }

    if (btnWizNext) {
        btnWizNext.addEventListener('click', async () => {
            const input = document.getElementById(`wiz-input-${currentWizStep}`);
            if (!input || !input.value.trim()) {
                alert('回答を入力してください');
                return;
            }

            // Save current answer
            wizAnswers[currentWizStep] = input.value;

            // If not the last step, advance to next step
            if (currentWizStep < totalSteps) {
                currentWizStep++;
                renderWizardStep(currentWizStep);
                return;
            }

            // Last step - generate AI response
            btnWizNext.disabled = true;
            btnWizNext.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 生成中...';

            const userPrompt = `
                以下の5つの回答を元に、原田メソッドの「4観点シート」、「メイン目標」、そして目標達成までの「マイルストーン（3日後、1週間後、1ヶ月後、3ヶ月後、半年後、1年後）」をJSON形式で生成してください。
                回答1(目標): ${wizAnswers[1]}
                回答2(理由): ${wizAnswers[2]}
                回答3(自分有形): ${wizAnswers[3]}
                回答4(自分無形): ${wizAnswers[4]}
                回答5(社会他者): ${wizAnswers[5]}
                
                重要：具体的で数値化された目標を生成してください。マイルストーンは具体的な行動と数値目標を含めてください。
                
                出力フォーマットJSON:
                {
                    "goal": "具体的で測定可能なメイン目標（例：〇〇を達成する）",
                    "deadline": "YYYY-MM-DD形式（今日から半年後くらいを目安に）",
                    "selfTangible": "私・有形：自分が得られる具体的な成果物やお金",
                    "selfIntangible": "私・無形：自分の心やスキルの成長",
                    "societyTangible": "社会他者・有形：他者や組織に提供できる具体的な成果",
                    "societyIntangible": "社会他者・無形：他者に与える目に見えない影響",
                    "milestones": {
                        "days3": "3日後：最初の一歩として具体的に何をする",
                        "week1": "1週間後：最初の成果として何を達成する",
                        "month1": "1ヶ月後：習慣化の目安として何ができている",
                        "month3": "3ヶ月後：四半期の成果として何を達成する",
                        "month6": "半年後：折り返し地点として何ができている",
                        "year1": "1年後：最終目標として何を達成している"
                    }
                }
            `;

            chrome.runtime.sendMessage({
                type: 'generate-ai-response',
                prompt: userPrompt
            }, (response) => {
                btnWizNext.disabled = false;
                btnWizNext.innerHTML = '生成する <i class="fa-solid fa-wand-magic-sparkles"></i>';

                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    alert('エラー: ' + chrome.runtime.lastError.message);
                    return;
                }

                if (response && response.success) {
                    try {
                        let data = response.data;
                        if (!data && response.raw) {
                            // Extract JSON if embedded in text
                            const jsonMatch = response.raw.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                try { data = JSON.parse(jsonMatch[0]); } catch (e) { }
                            }
                        }

                        if (!data) {
                            alert('生成結果の解析に失敗しました。\n' + (response.raw || ''));
                            console.log(response.raw);
                            return;
                        }

                        // Apply to inputs
                        if (data.goal && goalInput) goalInput.value = data.goal;
                        if (data.deadline && deadlineInput) deadlineInput.value = data.deadline;
                        if (data.selfTangible && viewInputs.selfTangible) viewInputs.selfTangible.value = data.selfTangible;
                        if (data.selfIntangible && viewInputs.selfIntangible) viewInputs.selfIntangible.value = data.selfIntangible;
                        if (data.societyTangible && viewInputs.societyTangible) viewInputs.societyTangible.value = data.societyTangible;
                        if (data.societyIntangible && viewInputs.societyIntangible) viewInputs.societyIntangible.value = data.societyIntangible;

                        // Apply to Milestones
                        if (data.milestones) {
                            if (data.milestones.days3 && milestoneInputs.days3) milestoneInputs.days3.value = data.milestones.days3;
                            if (data.milestones.week1 && milestoneInputs.week1) milestoneInputs.week1.value = data.milestones.week1;
                            if (data.milestones.month1 && milestoneInputs.month1) milestoneInputs.month1.value = data.milestones.month1;
                            if (data.milestones.month3 && milestoneInputs.month3) milestoneInputs.month3.value = data.milestones.month3;
                            if (data.milestones.month6 && milestoneInputs.month6) milestoneInputs.month6.value = data.milestones.month6;
                            if (data.milestones.year1 && milestoneInputs.year1) milestoneInputs.year1.value = data.milestones.year1;
                        }

                        // Also save to appState
                        appState.goal = data.goal || '';
                        appState.deadline = data.deadline || '';
                        appState.fourViews = {
                            selfTangible: data.selfTangible || '',
                            selfIntangible: data.selfIntangible || '',
                            societyTangible: data.societyTangible || '',
                            societyIntangible: data.societyIntangible || ''
                        };
                        appState.milestones = data.milestones || {};
                        saveState();

                        // Clear draft
                        localStorage.removeItem('nld_wiz_draft');

                        wizardModal.classList.remove('open');
                        alert('🎉 目標設定が生成されました！\n\n各項目を確認して、必要に応じて編集してください。\n「保存」ボタンで保存できます。');

                    } catch (e) {
                        console.error(e);
                        alert('生成結果の解析に失敗しました。もう一度試してください。');
                    }
                } else {
                    alert('生成に失敗しました: ' + (response ? response.error : '応答がありません'));
                }
            });
        });
    }


    // --- Mandala Logic ---
    const mandalaContainer = document.getElementById('mandala-grid');

    function renderMandala() {
        if (!mandalaContainer) return;
        // Ensure mandala array exists
        if (!appState.mandala || !Array.isArray(appState.mandala) || appState.mandala.length !== 9) {
            appState.mandala = Array(9).fill(null).map(() => Array(9).fill(''));
        }
        mandalaContainer.innerHTML = '';
        for (let bIndex = 0; bIndex < 9; bIndex++) {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'mandala-block';
            // Add special class for center block
            if (bIndex === 4) blockDiv.classList.add('center-block');
            for (let cIndex = 0; cIndex < 9; cIndex++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'mandala-cell';
                const isBlockCenter = cIndex === 4;
                const isCoreCenter = bIndex === 4 && cIndex === 4;

                if (isCoreCenter) cellDiv.classList.add('core-center');
                else if (isBlockCenter) cellDiv.classList.add('center-cell');

                // Focus textarea when clicking the cell background (since textarea might be small)
                cellDiv.addEventListener('click', (e) => {
                    if (e.target !== textArea) {
                        textArea.focus();
                    }
                });

                const textArea = document.createElement('textarea');
                textArea.value = appState.mandala[bIndex][cIndex] || '';

                const isOuterBlockCenter = isBlockCenter && bIndex !== 4;
                if (isOuterBlockCenter) {
                    textArea.readOnly = true;
                    textArea.placeholder = "（中央から反映）";
                }

                textArea.addEventListener('change', (e) => {
                    const newVal = e.target.value;
                    appState.mandala[bIndex][cIndex] = newVal;
                    if (bIndex === 4 && cIndex !== 4) {
                        appState.mandala[cIndex][4] = newVal;
                    }
                    saveState();
                    renderMandala();
                });
                cellDiv.appendChild(textArea);
                blockDiv.appendChild(cellDiv);
            }
            mandalaContainer.appendChild(blockDiv);
        }
    }

    // --- Routine Matrix Logic ---
    const routineMatrix = document.getElementById('routine-matrix');
    const newRoutineInput = document.getElementById('new-routine-input');
    const addRoutineBtn = document.getElementById('add-routine-btn');

    // Helper to get array of dates for the matrix (last 13 days + today)
    function getMatrixDates() {
        const dates = [];
        const end = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(end);
            d.setDate(d.getDate() - i);
            dates.push(d);
        }
        return dates;
    }

    function renderRoutineMatrix() {
        if (!routineMatrix) return;
        routineMatrix.innerHTML = '';
        const dates = getMatrixDates();

        // 1. Header Row
        const headerRow = document.createElement('tr');
        const cornerTh = document.createElement('th');
        cornerTh.className = 'routine-name-col';
        cornerTh.textContent = 'ルーティン項目';
        headerRow.appendChild(cornerTh);

        dates.forEach(d => {
            const th = document.createElement('th');
            const dateStr = d.toISOString().split('T')[0];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            if (isToday) th.classList.add('today-col');

            // Format: MM/DD
            th.textContent = `${d.getMonth() + 1}/${d.getDate()}`;
            headerRow.appendChild(th);
        });
        routineMatrix.appendChild(headerRow);
    }

    if (addRoutineBtn && newRoutineInput) {
        addRoutineBtn.addEventListener('click', () => {
            const text = newRoutineInput.value.trim();
            if (text) {
                appState.routines.push({ id: Date.now().toString(), text: text });
                newRoutineInput.value = '';
                saveState();
                renderRoutineMatrix();
            }
        });
    }

    // --- Dashboard ---
    function updateDashboard() {
        // Safe update for Archived Dashboard Widgets
        const mainGoalEl = document.getElementById('dashboard-main-goal');
        if (mainGoalEl) mainGoalEl.textContent = appState.goal || '目標未設定';

        const deadlineEl = document.getElementById('dashboard-deadline');
        if (deadlineEl) deadlineEl.textContent = appState.deadline ? `期日: ${appState.deadline} ` : '';

        // Today's Routine Stats
        const todoDoneEl = document.getElementById('today-routine-done');
        if (todoDoneEl) {
            const now = new Date();
            const dayKey = now.toISOString().split('T')[0];
            const todaysLog = appState.logs[dayKey] || {};
            const total = appState.routines.length;
            const done = appState.routines.filter(r => todaysLog[r.id]).length;

            todoDoneEl.textContent = done;
            if (document.getElementById('today-routine-total')) document.getElementById('today-routine-total').textContent = total;

            const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

            const pb = document.querySelector('.progress-bar-fill');
            if (pb) pb.style.width = `${percentage}% `;
            const pt = document.querySelector('.progress-text');
            if (pt) pt.textContent = `${percentage}% 達成`;
        }

        const kpItems = document.querySelectorAll('.kp-item');
        if (kpItems.length > 0) {
            const views = [
                appState.fourViews.selfTangible, appState.fourViews.selfIntangible,
                appState.fourViews.societyTangible, appState.fourViews.societyIntangible
            ];
            kpItems.forEach((item, index) => {
                if (views[index] && views[index].length > 0) {
                    item.style.background = 'rgba(210, 153, 34, 0.2)';
                    const icon = item.querySelector('i');
                    if (icon) icon.style.opacity = '1';
                } else {
                    item.style.background = 'rgba(255, 255, 255, 0.05)';
                    const icon = item.querySelector('i');
                    if (icon) icon.style.opacity = '0.5';
                }
            });
        }
    }

    // --- Journal Elements ---
    const journalElements = {
        date: document.getElementById('journal-date'),
        title: document.getElementById('journal-declaration'), // タイトル入力欄
        tags: document.getElementById('journal-tags'),
        declaration: document.getElementById('journal-declaration'),
        content: document.getElementById('journal-textarea'), // Thoughts/Free
        calendar: document.getElementById('journal-calendar'),
        todo: document.getElementById('journal-todo'),
        activity: document.getElementById('journal-activity'),
        redo: document.getElementById('journal-redo'), // New
        confidence: document.getElementById('journal-confidence'), // New
        scores: {
            heart: document.getElementById('score-heart'),
            skill: document.getElementById('score-skill'),
            body: document.getElementById('score-body'),
            life: document.getElementById('score-life')
        },
        btnSchedule: document.getElementById('btn-get-schedule'),
        btnHistory: document.getElementById('btn-get-history'),
        btnTempSave: document.getElementById('btn-temp-save'),
        btnSave: document.getElementById('btn-save-sync'),
        btnAiFormat: document.getElementById('btn-ai-format'),
        status: document.getElementById('journal-status'),
        prevDate: document.getElementById('prev-date'),
        nextDate: document.getElementById('next-date')
    };

    const habitElements = {
        wakeup: document.getElementById('habit-wakeup'),
        bedtime: document.getElementById('habit-bedtime'),

        englishContentId: 'habit-english-content',
        englishTime: document.getElementById('habit-english-time'),
        muscleMenuId: 'habit-muscle-menu',
        muscleDetail: document.getElementById('habit-muscle-detail'),
        joggingDist: document.getElementById('habit-jogging-dist'),
        joggingTime: document.getElementById('habit-jogging-time'),
        mentalMenuId: 'habit-mental-menu',
        socialMenuId: 'habit-social-menu'
    };

    let currentJournalDate = new Date();

    // --- Habit Helpers & Rest Mode ---
    function setRestMode(habitId, isResting) {
        const card = document.getElementById(`card-${habitId}`);
        if (!card) return;

        if (isResting) {
            card.classList.add('resting');
        } else {
            card.classList.remove('resting');
        }

        const btn = card.querySelector(`.rest-btn[data-habit="${habitId}"]`);
        if (btn) {
            if (isResting) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }

    function initRestButtons() {
        document.querySelectorAll('.rest-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const habitId = btn.dataset.habit;
                const card = document.getElementById(`card-${habitId}`);
                if (!card) return;

                const isResting = !card.classList.contains('resting');
                setRestMode(habitId, isResting);
            });
        });
    }

    // --- Slider Logic ---
    // --- Slider Logic ---
    function updateSliderDisplay(input) {
        const displayId = input.id.replace('habit-', 'display-');
        const display = document.getElementById(displayId);
        if (display) {
            const val = parseFloat(input.value);
            if (input.step === '0.1') {
                display.textContent = val.toFixed(1);
            } else {
                display.textContent = val;
            }
        }

        // Also sync with manual input field if it exists
        const manualInputId = input.id.replace('habit-', 'input-');
        const manualInput = document.getElementById(manualInputId);
        if (manualInput && document.activeElement !== manualInput) {
            manualInput.value = input.value;
        }

        // Update Progress Background
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || 100;
        const val = parseFloat(input.value) || 0;
        const percentage = ((val - min) / (max - min)) * 100;
        input.style.background = `linear-gradient(to right, var(--accent-gold) ${percentage}%, rgba(255,255,255,0.1) ${percentage}%)`;
    }

    function initSliders() {
        document.querySelectorAll('.habit-slider').forEach(input => {
            // Init display
            updateSliderDisplay(input);

            // Input event
            input.addEventListener('input', () => updateSliderDisplay(input));
        });

        // Sync manual input fields with sliders
        document.querySelectorAll('.slider-value-input').forEach(manualInput => {
            manualInput.addEventListener('input', () => {
                const sliderId = manualInput.id.replace('input-', 'habit-');
                const slider = document.getElementById(sliderId);
                if (slider) {
                    slider.value = manualInput.value;
                    updateSliderDisplay(slider);
                }
            });
        });

        document.querySelectorAll('.slider-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.dataset.target;
                const step = parseFloat(btn.dataset.step);
                const input = document.getElementById(targetId);
                if (input) {
                    let current = parseFloat(input.value);
                    if (btn.classList.contains('plus')) {
                        current += step;
                    } else {
                        current -= step;
                    }
                    // Clamp
                    if (current < parseFloat(input.min)) current = parseFloat(input.min);
                    if (current > parseFloat(input.max)) current = parseFloat(input.max);

                    input.value = current;
                    // Fire input event manually so display updates
                    updateSliderDisplay(input);
                }
            });
        });
    }

    // --- Meal Log ---
    const mealContainer = document.getElementById('meal-ui-container');
    const todoTextarea = document.getElementById('journal-todo');
    const mealQuickBtn = document.getElementById('btn-meal-quick');
    const mealQuickPanel = document.getElementById('meal-quick-panel');
    const mealQuickText = document.getElementById('meal-quick-text');
    const mealQuickApplyBtn = document.getElementById('btn-meal-quick-apply');
    const mealQuickClearBtn = document.getElementById('btn-meal-quick-clear');
    const mealAiBtn = document.getElementById('btn-meal-ai');
    const mealTempBtn = document.getElementById('btn-meal-temp-save');
    const mealAiModal = document.getElementById('meal-ai-modal');
    const mealAiSummaryEl = document.getElementById('meal-ai-summary');
    const mealAiNutritionEl = document.getElementById('meal-ai-nutrition');
    const mealAiJsonEl = document.getElementById('meal-ai-json');
    const mealAiCloseBtn = document.getElementById('btn-meal-ai-close');
    const mealAiCopyBtn = document.getElementById('btn-meal-ai-copy');
    const mealAiSaveBtn = document.getElementById('btn-meal-ai-save');
    let currentMealAi = null;

    const mealInputs = {
        breakfast: document.getElementById('meal-breakfast'),
        lunch: document.getElementById('meal-lunch'),
        dinner: document.getElementById('meal-dinner'),
        snack: document.getElementById('meal-snack')
    };

    const buildMealText = () => {
        const lines = [];
        const pushSection = (label, value) => {
            lines.push(`【${label}】`);
            lines.push(value ? value.trim() : '');
            lines.push('');
        };
        pushSection('朝', mealInputs.breakfast?.value || '');
        pushSection('昼', mealInputs.lunch?.value || '');
        pushSection('夜', mealInputs.dinner?.value || '');
        pushSection('間食', mealInputs.snack?.value || '');

        // Trim trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
        return lines.join('\n');
    };

    const buildMealTextFromInputs = () => {
        const b = mealInputs.breakfast?.value || '';
        const l = mealInputs.lunch?.value || '';
        const d = mealInputs.dinner?.value || '';
        const s = mealInputs.snack?.value || '';
        return [
            '【朝】',
            b.trim(),
            '',
            '【昼】',
            l.trim(),
            '',
            '【夜】',
            d.trim(),
            '',
            '【間食】',
            s.trim()
        ].join('\n').trim();
    };

    const extractSection = (text, label) => {
        const pattern = new RegExp(`【${label}】\\s*([\\s\\S]*?)(?=【(朝|昼|夜|間食)】|$)`);
        const match = text.match(pattern);
        return match ? match[1].trim() : '';
    };

    const parseMealText = (text) => {
        const result = {
            meals: { breakfast: '', lunch: '', dinner: '', snack: '' }
        };
        if (!text) return result;
        const hasHeaders = /【(朝|昼|夜|間食)】/.test(text);
        if (!hasHeaders) {
            result.meals.breakfast = text.trim();
            return result;
        }
        result.meals.breakfast = extractSection(text, '朝');
        result.meals.lunch = extractSection(text, '昼');
        result.meals.dinner = extractSection(text, '夜');
        result.meals.snack = extractSection(text, '間食');
        return result;
    };

    const labelToMealKey = (label) => {
        if (!label) return null;
        if (label.startsWith('朝')) return 'breakfast';
        if (label.startsWith('昼')) return 'lunch';
        if (label.startsWith('夕') || label.startsWith('夜')) return 'dinner';
        if (label.includes('間食') || label.includes('おやつ') || label.includes('補食')) return 'snack';
        return null;
    };

    const parseQuickMealText = (text) => {
        const result = { breakfast: '', lunch: '', dinner: '', snack: '' };
        const raw = (text || '').replace(/\r/g, '').trim();
        if (!raw) return result;

        // If already in header format, reuse existing parser
        if (/【(朝|昼|夜|間食)】/.test(raw)) {
            return parseMealText(raw).meals;
        }

        // Try to split by labels in the text
        const labelRegex = /(朝食?|昼食?|夕食?|夜食?|夜|夕|間食|おやつ|補食)\s*[:：\-ー]?\s*/g;
        const matches = Array.from(raw.matchAll(labelRegex));

        if (matches.length > 0) {
            matches.forEach((match, idx) => {
                const label = match[1];
                const key = labelToMealKey(label);
                if (!key) return;
                const start = match.index + match[0].length;
                const end = idx + 1 < matches.length ? matches[idx + 1].index : raw.length;
                const segment = raw.slice(start, end).trim();
                if (!segment) return;
                result[key] = result[key] ? `${result[key]}\n${segment}` : segment;
            });
            return result;
        }

        // Fallback: split by lines in order
        const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) {
            return result;
        }
        if (lines.length === 1) {
            result.breakfast = lines[0];
            return result;
        }
        result.breakfast = lines[0] || '';
        result.lunch = lines[1] || '';
        result.dinner = lines[2] || '';
        if (lines.length > 3) {
            result.snack = lines.slice(3).join('\n');
        }
        return result;
    };

    const syncMealsToTextarea = () => {
        if (!todoTextarea) return;
        todoTextarea.value = buildMealText();
    };

    window.initMealUI = function () {
        if (!mealContainer || !todoTextarea) return;
        const parsed = parseMealText(todoTextarea.value || '');
        if (mealInputs.breakfast) mealInputs.breakfast.value = parsed.meals.breakfast || '';
        if (mealInputs.lunch) mealInputs.lunch.value = parsed.meals.lunch || '';
        if (mealInputs.dinner) mealInputs.dinner.value = parsed.meals.dinner || '';
        if (mealInputs.snack) mealInputs.snack.value = parsed.meals.snack || '';
    };
    window.initTodoUI = window.initMealUI;

    if (mealContainer) {
        Object.values(mealInputs).forEach(el => {
            if (!el) return;
            el.addEventListener('input', syncMealsToTextarea);
            el.addEventListener('change', syncMealsToTextarea);
        });
        setTimeout(window.initMealUI, 100);
    }

    if (mealQuickBtn && mealQuickPanel) {
        mealQuickBtn.addEventListener('click', () => {
            mealQuickPanel.classList.toggle('open');
            if (mealQuickPanel.classList.contains('open')) {
                setTimeout(() => mealQuickText?.focus(), 0);
            }
        });
    }

    if (mealQuickApplyBtn) {
        mealQuickApplyBtn.addEventListener('click', () => {
            const raw = mealQuickText?.value || '';
            if (!raw.trim()) {
                alert('一括入力が空です');
                return;
            }
            const hasExisting = Object.values(mealInputs).some(el => el && el.value && el.value.trim().length > 0);
            if (hasExisting) {
                if (!confirm('既存の食事入力を上書きしますか？')) return;
            }
            const parsed = parseQuickMealText(raw);
            if (mealInputs.breakfast) mealInputs.breakfast.value = parsed.breakfast || '';
            if (mealInputs.lunch) mealInputs.lunch.value = parsed.lunch || '';
            if (mealInputs.dinner) mealInputs.dinner.value = parsed.dinner || '';
            if (mealInputs.snack) mealInputs.snack.value = parsed.snack || '';
            if (typeof syncMealsToTextarea === 'function') syncMealsToTextarea();
            updateJournalStatus('一括入力を反映しました');
            if (mealQuickPanel) mealQuickPanel.classList.remove('open');
        });
    }

    if (mealQuickClearBtn) {
        mealQuickClearBtn.addEventListener('click', () => {
            if (mealQuickText) mealQuickText.value = '';
        });
    }

    const renderNutritionChips = (nutrition) => {
        if (!mealAiNutritionEl) return;
        mealAiNutritionEl.innerHTML = '';
        const entries = [
            ['カロリー', nutrition?.calories_kcal, 'kcal'],
            ['たんぱく質', nutrition?.protein_g, 'g'],
            ['炭水化物', nutrition?.carbs_g, 'g'],
            ['脂質', nutrition?.fat_g, 'g'],
            ['食物繊維', nutrition?.fiber_g, 'g'],
            ['塩分', nutrition?.salt_g, 'g']
        ];
        const toNumber = (val) => {
            if (val === null || val === undefined || val === '') return null;
            const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.\-]/g, ''));
            return Number.isFinite(n) ? n : null;
        };
        entries.forEach(([label, val, unit]) => {
            const num = toNumber(val);
            const v = num !== null ? num : (val === null || val === undefined || val === '' ? '-' : String(val));
            const suffix = num !== null ? unit : '';
            const item = document.createElement('div');
            item.className = 'nutri-item';
            item.textContent = `${label}: ${v}${v === '-' ? '' : suffix}`;
            mealAiNutritionEl.appendChild(item);
        });
    };

    const openMealAiModal = (mealAi) => {
        if (!mealAiModal) return;
        if (mealAiSummaryEl) mealAiSummaryEl.textContent = mealAi?.summary || '-';
        if (mealAiJsonEl) mealAiJsonEl.value = mealAi?.json || '';
        renderNutritionChips(mealAi?.nutrition || {});
        mealAiModal.classList.add('open');
    };

    const closeMealAiModal = () => {
        if (mealAiModal) mealAiModal.classList.remove('open');
    };

    if (mealAiModal) {
        mealAiModal.addEventListener('click', (e) => {
            if (e.target === mealAiModal) closeMealAiModal();
        });
    }
    if (mealAiCloseBtn) mealAiCloseBtn.addEventListener('click', closeMealAiModal);
    if (mealAiCopyBtn) {
        mealAiCopyBtn.addEventListener('click', async () => {
            if (!mealAiJsonEl) return;
            try {
                await navigator.clipboard.writeText(mealAiJsonEl.value || '');
                updateJournalStatus('JSONをコピーしました');
            } catch (e) {
                alert('コピーに失敗しました');
            }
        });
    }

    if (mealTempBtn) {
        mealTempBtn.addEventListener('click', () => {
            if (typeof syncMealsToTextarea === 'function') syncMealsToTextarea();
            if (typeof saveJournalToState === 'function') saveJournalToState();
            updateJournalStatus('食事メモを一時保存しました');
        });
    }

    if (mealAiBtn) {
        mealAiBtn.addEventListener('click', () => {
            if (!checkExtensionEnvironment()) return;
            const rawText = buildMealTextFromInputs();
            if (todoTextarea) todoTextarea.value = rawText;
            if (!rawText || rawText.trim().length === 0) {
                alert('食事内容が空です');
                return;
            }

            const dateKey = journalElements.date ? journalElements.date.value : new Date().toISOString().split('T')[0];
            const currentLog = appState.logs[dateKey] || {};

            const hasNutrition = (mealAi) => {
                if (!mealAi || !mealAi.nutrition) return false;
                const n = mealAi.nutrition;
                return ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g']
                    .some(k => Number(n[k]) > 0);
            };
            if (currentLog.mealAi && currentLog.mealRaw === rawText && hasNutrition(currentLog.mealAi)) {
                currentMealAi = currentLog.mealAi;
                openMealAiModal(currentMealAi);
                return;
            }

            updateJournalStatus('食事AI整形中...');
            chrome.runtime.sendMessage({ type: 'format-meal', text: rawText }, (res) => {
                if (chrome.runtime.lastError) {
                    updateJournalStatus('食事AI整形失敗', true);
                    alert('食事AI整形失敗: ' + chrome.runtime.lastError.message);
                    return;
                }
                if (res && res.success) {
                    const mealAi = {
                        raw: rawText,
                        summary: res.meal?.summary || '',
                        meals: res.meal?.meals || {},
                        nutrition: res.meal?.nutrition || {},
                        json: res.mealJson || ''
                    };

                    currentMealAi = mealAi;
                    openMealAiModal(mealAi);
                    updateJournalStatus('食事AI整形完了');
                } else {
                    updateJournalStatus('食事AI整形失敗', true);
                    alert('食事AI整形失敗: ' + (res?.error || '不明'));
                }
            });
        });
    }

    if (mealAiSaveBtn) {
        mealAiSaveBtn.addEventListener('click', () => {
            if (!currentMealAi) {
                alert('保存するAI結果がありません');
                return;
            }
            const dateKey = journalElements.date ? journalElements.date.value : new Date().toISOString().split('T')[0];
            const currentLog = appState.logs[dateKey] || {};
            currentLog.mealAi = currentMealAi;
            currentLog.mealRaw = currentMealAi.raw || (todoTextarea ? todoTextarea.value : '');
            appState.logs[dateKey] = currentLog;
            saveState();
            updateJournalStatus('食事AI結果を保存しました');
            if (mealAiModal) mealAiModal.classList.remove('open');
        });
    }
    function setupChipUI(containerId, savedValue, onChange) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const chips = container.querySelectorAll('.chip');
        const selectedValues = (savedValue || '').split(',').map(s => s.trim());
        chips.forEach(chip => {
            if (selectedValues.includes(chip.getAttribute('data-value'))) chip.classList.add('active');
            else chip.classList.remove('active');

            // Click handler for chip selection (avoid delete button)
            chip.onclick = (e) => {
                if (e.target.classList.contains('chip-delete')) return;
                chip.classList.toggle('active');
                if (onChange) onChange();
            };
        });
    }

    // Chip editing: delete and add
    function initChipEditing() {
        // Delete chip
        document.querySelectorAll('.chip-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chip = btn.closest('.chip');
                if (chip && confirm(`「${chip.getAttribute('data-value')}」を削除しますか？`)) {
                    chip.remove();
                }
            });
        });

        // Add chip
        document.querySelectorAll('.chip-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const containerId = btn.dataset.container;
                const container = document.getElementById(containerId);
                if (!container) return;

                const newValue = prompt('新しい項目名を入力してください:');
                if (newValue && newValue.trim()) {
                    const trimmedValue = newValue.trim();

                    // Check if already exists
                    const existingChip = container.querySelector(`.chip[data-value="${trimmedValue}"]`);
                    if (existingChip) {
                        alert('同じ名前の項目が既に存在します。');
                        return;
                    }

                    // Create new chip
                    const newChip = document.createElement('span');
                    newChip.className = 'chip';
                    newChip.setAttribute('data-value', trimmedValue);
                    newChip.innerHTML = `${trimmedValue}<button class="chip-delete">×</button>`;

                    // Insert before the add button
                    container.insertBefore(newChip, btn);

                    // Add event listeners
                    newChip.onclick = (e) => {
                        if (e.target.classList.contains('chip-delete')) return;
                        newChip.classList.toggle('active');
                    };

                    newChip.querySelector('.chip-delete').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`「${trimmedValue}」を削除しますか？`)) {
                            newChip.remove();
                        }
                    });
                }
            });
        });
    }

    // Star Rating UI
    function initStarRating() {
        document.querySelectorAll('.star-rating').forEach(container => {
            const targetId = container.dataset.target;
            const hiddenInput = document.getElementById(targetId);
            const stars = container.querySelectorAll('.star');

            // Set initial state (default 5)
            updateStars(container, 5);

            stars.forEach(star => {
                // Hover preview
                star.addEventListener('mouseenter', () => {
                    const val = parseInt(star.dataset.value);
                    stars.forEach(s => {
                        const sVal = parseInt(s.dataset.value);
                        s.classList.toggle('hover-preview', sVal <= val && !s.classList.contains('active'));
                    });
                });

                star.addEventListener('mouseleave', () => {
                    stars.forEach(s => s.classList.remove('hover-preview'));
                });

                // Click to set
                star.addEventListener('click', () => {
                    const val = parseInt(star.dataset.value);
                    updateStars(container, val);
                    if (hiddenInput) hiddenInput.value = val;
                });
            });
        });
    }

    function updateStars(container, value) {
        const stars = container.querySelectorAll('.star');
        stars.forEach(star => {
            const starVal = parseInt(star.dataset.value);
            star.classList.toggle('active', starVal <= value);
        });
    }

    // Helper to set star rating from loaded data
    function setStarRating(targetId, value) {
        const container = document.querySelector(`.star-rating[data-target="${targetId}"]`);
        const hiddenInput = document.getElementById(targetId);
        if (container && value) {
            const numVal = parseInt(value) || 5;
            updateStars(container, numVal);
            if (hiddenInput) hiddenInput.value = numVal;
        }
    }

    function getChipValues(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return '';
        const activeChips = container.querySelectorAll('.chip.active');
        return Array.from(activeChips).map(c => c.getAttribute('data-value')).join(',');
    }

    function updateMuscleDetails(initialData) {
        const container = document.getElementById('habit-muscle-menu');
        const detailContainer = document.getElementById('muscle-details-container');
        if (!container || !detailContainer) return;

        const activeChips = Array.from(container.querySelectorAll('.chip.active'));
        const activeValues = activeChips.map(c => c.getAttribute('data-value'));

        const currentData = initialData || {};
        if (!initialData) {
            Array.from(detailContainer.children).forEach(row => {
                const w = row.querySelector('.weight-select')?.value;
                const s = row.querySelector('.sets-select')?.value;
                if (row.dataset.name) currentData[row.dataset.name] = { w, s };
            });
        }

        detailContainer.innerHTML = '';

        activeValues.forEach(val => {
            if (val === 'その他') return;

            const row = document.createElement('div');
            row.className = 'muscle-detail-row';
            row.dataset.name = val;

            const nameDiv = document.createElement('div');
            nameDiv.className = 'muscle-detail-name';
            nameDiv.textContent = val;

            const wSel = document.createElement('select');
            wSel.className = 'muscle-detail-select weight-select';
            const bw = document.createElement('option'); bw.value = '自重'; bw.textContent = '自重';
            wSel.appendChild(bw);
            for (let i = 10; i <= 140; i += 2.5) {
                const opt = document.createElement('option');
                opt.value = i + 'kg'; opt.textContent = i + 'kg';
                if (opt.value === (currentData[val]?.w || '60kg')) opt.selected = true;
                wSel.appendChild(opt);
            }
            if (currentData[val]?.w === '自重') wSel.value = '自重';

            const sSel = document.createElement('select');
            sSel.className = 'muscle-detail-select sets-select';
            for (let i = 1; i <= 10; i++) {
                const opt = document.createElement('option');
                opt.value = i + 'set'; opt.textContent = i + ' set';
                if (opt.value === (currentData[val]?.s || '3set')) opt.selected = true;
                sSel.appendChild(opt);
            }

            row.appendChild(nameDiv);
            row.appendChild(wSel);
            row.appendChild(sSel);
            detailContainer.appendChild(row);
        });
    }

    // --- English Learning Details (similar to muscle) ---
    function updateEnglishDetails(initialData) {
        const container = document.getElementById('habit-english-content');
        const detailContainer = document.getElementById('english-details-container');
        if (!container || !detailContainer) return;

        const activeChips = Array.from(container.querySelectorAll('.chip.active'));
        const activeValues = activeChips.map(c => c.getAttribute('data-value'));

        // Collect current data before re-rendering
        const currentData = initialData || {};
        if (!initialData) {
            Array.from(detailContainer.children).forEach(row => {
                const time = row.querySelector('.english-time-select')?.value;
                const note = row.querySelector('.english-note-input')?.value;
                if (row.dataset.name) currentData[row.dataset.name] = { time, note };
            });
        }

        detailContainer.innerHTML = '';

        activeValues.forEach(val => {
            const row = document.createElement('div');
            row.className = 'english-detail-row';
            row.dataset.name = val;

            const nameDiv = document.createElement('div');
            nameDiv.className = 'english-detail-name';
            nameDiv.textContent = val;

            // Time selector (10min ~ 120min)
            const timeSel = document.createElement('select');
            timeSel.className = 'english-detail-select english-time-select';
            const times = [10, 15, 20, 30, 45, 60, 90, 120];
            times.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t + '分';
                opt.textContent = t + '分';
                if (opt.value === (currentData[val]?.time || '30分')) opt.selected = true;
                timeSel.appendChild(opt);
            });

            // Note input
            const noteInput = document.createElement('input');
            noteInput.type = 'text';
            noteInput.className = 'english-note-input';
            noteInput.placeholder = 'メモ';
            noteInput.value = currentData[val]?.note || '';

            row.appendChild(nameDiv);
            row.appendChild(noteInput);
            row.appendChild(timeSel);
            detailContainer.appendChild(row);
        });
    }

    // --- Habit Card State Helper ---
    function applyHabitCardStates(dateStr, logOverride) {
        const log = logOverride || appState.logs[dateStr] || {};
        const sh = log.habits || {};
        const habitStates = sh.states || {};

        // 全習慣カードの状態を復元（デフォルトは「休み」）
        appState.habitDefinitions.forEach(habit => {
            const raw = habitStates[habit.id];
            const state = !raw || raw === 'none' ? 'rest' : raw;
            HabitHelper.setCardState(habit.id, state);
        });
    }

    // --- LOAD DATA LOGIC ---
    const loadDiaryData = (dateStr) => {
        currentJournalDate = new Date(dateStr);
        const log = appState.logs[dateStr] || {};

        // Journal
        if (journalElements.title) journalElements.title.value = log.title || '';
        if (journalElements.tags) journalElements.tags.value = log.tags || '';
        const defaultContent = `①新しい変化・気づき
・
・
②嬉しかった出来事・後悔
・
・`;
        if (journalElements.content) journalElements.content.value = log.content || defaultContent;
        if (journalElements.declaration) journalElements.declaration.value = log.declaration || '';
        if (journalElements.calendar) journalElements.calendar.value = log.calendar || '';
        if (journalElements.todo) journalElements.todo.value = log.mealRaw || log.tasks || '';
        if (journalElements.activity) journalElements.activity.value = log.activity || '';
        if (journalElements.redo) journalElements.redo.value = log.redo || '';
        if (journalElements.confidence) journalElements.confidence.value = log.confidence || '';

        // Refresh Meal UI
        if (window.initMealUI) window.initMealUI();
        currentMealAi = log.mealAi || null;

        // Scores
        if (log.scores) {
            try {
                const s = typeof log.scores === 'string' ? JSON.parse(log.scores) : log.scores;
                if (journalElements.scores.heart) journalElements.scores.heart.value = s.heart || '5';
                if (journalElements.scores.skill) journalElements.scores.skill.value = s.skill || '5';
                if (journalElements.scores.body) journalElements.scores.body.value = s.body || '5';
                if (journalElements.scores.life) journalElements.scores.life.value = s.life || '5';
                // Update star UI
                setStarRating('score-heart', s.heart || 5);
                setStarRating('score-skill', s.skill || 5);
                setStarRating('score-body', s.body || 5);
                setStarRating('score-life', s.life || 5);
            } catch (e) { }
        } else {
            if (journalElements.scores.heart) journalElements.scores.heart.value = '5';
            if (journalElements.scores.skill) journalElements.scores.skill.value = '5';
            if (journalElements.scores.body) journalElements.scores.body.value = '5';
            if (journalElements.scores.life) journalElements.scores.life.value = '5';
            // Reset star UI to 5
            setStarRating('score-heart', 5);
            setStarRating('score-skill', 5);
            setStarRating('score-body', 5);
            setStarRating('score-life', 5);
        }

        // ========================================
        // 習慣カードの状態を復元
        // ========================================
        const h = habitElements;
        const sh = log.habits || {};
        applyHabitCardStates(dateStr, log);

        // 詳細データの復元（ビルトイン習慣用）
        if (h.wakeup && window.refreshModernTimePicker) {
            window.refreshModernTimePicker('habit-wakeup', sh.wakeup || '');
        }
        if (h.bedtime && window.refreshModernTimePicker) {
            window.refreshModernTimePicker('habit-bedtime', sh.bedtime || '');
        }

        // English
        setupChipUI(h.englishContentId, sh.englishContent, () => { });
        const englishMemo = document.getElementById('habit-english-memo');
        if (englishMemo) englishMemo.value = sh.englishMemo || '';

        // Muscle
        setupChipUI(h.muscleMenuId, sh.muscleMenu, () => { });
        if (h.muscleDetail) h.muscleDetail.value = sh.muscleDetail || '';

        // Jogging
        if (h.joggingDist) h.joggingDist.value = sh.joggingDist || '0';
        if (h.joggingTime) h.joggingTime.value = sh.joggingTime || '0';

        // Social
        setupChipUI(h.socialMenuId, sh.socialMenu, () => { });

        // Mental
        setupChipUI(h.mentalMenuId, sh.mentalMenu, () => { });

        // Render Routine Matrix for selected date
        renderRoutineMatrix(dateStr);
    };

    const updateJournalDateDisplay = () => {
        if (journalElements.date) {
            const y = currentJournalDate.getFullYear();
            const m = String(currentJournalDate.getMonth() + 1).padStart(2, '0');
            const d = String(currentJournalDate.getDate()).padStart(2, '0');
            const daStr = `${y}-${m}-${d}`;
            if (journalElements.date.value !== daStr) journalElements.date.value = daStr;
            loadDiaryData(daStr);
        }
    };

    // Initialize date
    updateJournalDateDisplay();

    if (journalElements.date) {
        journalElements.date.addEventListener('change', (e) => {
            loadDiaryData(e.target.value);
        });
    }
    if (journalElements.prevDate) {
        journalElements.prevDate.addEventListener('click', () => {
            currentJournalDate.setDate(currentJournalDate.getDate() - 1);
            updateJournalDateDisplay();
        });
    }
    if (journalElements.nextDate) {
        journalElements.nextDate.addEventListener('click', () => {
            currentJournalDate.setDate(currentJournalDate.getDate() + 1);
            updateJournalDateDisplay();
        });
    }

    // ========================================
    // 日記の自動保存（入力時にLocalStorageへ保存）
    // ========================================
    const saveJournalToState = () => {
        const dateKey = journalElements.date ? journalElements.date.value : new Date().toISOString().split('T')[0];
        let currentLog = appState.logs[dateKey] || {};

        // 日記関連フィールドを保存
        currentLog.title = journalElements.title?.value || '';
        currentLog.tags = journalElements.tags?.value || '';
        currentLog.content = journalElements.content?.value || '';
        currentLog.declaration = journalElements.declaration?.value || '';
        currentLog.calendar = journalElements.calendar?.value || '';
        currentLog.tasks = journalElements.todo?.value || '';
        currentLog.mealRaw = journalElements.todo?.value || '';
        currentLog.activity = journalElements.activity?.value || '';
        currentLog.redo = journalElements.redo?.value || '';
        currentLog.confidence = journalElements.confidence?.value || '';

        // スコアも保存
        if (journalElements.scores) {
            currentLog.scores = JSON.stringify({
                heart: journalElements.scores.heart?.value || '5',
                skill: journalElements.scores.skill?.value || '5',
                body: journalElements.scores.body?.value || '5',
                life: journalElements.scores.life?.value || '5'
            });
        }

        appState.logs[dateKey] = currentLog;
        saveState();
    };

    // 各テキストエリアに自動保存リスナーを追加（即座に保存）
    const journalInputs = [
        journalElements.title,
        journalElements.tags,
        journalElements.content,
        journalElements.declaration,
        journalElements.calendar,
        journalElements.todo,
        journalElements.activity,
        journalElements.redo,
        journalElements.confidence,
        mealInputs.breakfast,
        mealInputs.lunch,
        mealInputs.dinner,
        mealInputs.snack
    ];

    journalInputs.forEach(el => {
        if (el) {
            el.addEventListener('input', saveJournalToState);
            el.addEventListener('change', saveJournalToState);
        }
    });

    const updateJournalStatus = (msg, isError = false) => {
        if (!journalElements.status) return;
        journalElements.status.textContent = msg;
        journalElements.status.style.color = isError ? '#ff6b6b' : 'var(--accent-gold)';
    };

    const checkExtensionEnvironment = () => {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            updateJournalStatus('拡張機能環境ではありません', true);
            alert('この機能はChrome拡張機能として実行中のみ使用できます。');
            return false;
        }
        return true;
    };

    if (journalElements.btnSchedule) {
        journalElements.btnSchedule.addEventListener('click', () => {
            if (!checkExtensionEnvironment()) return;
            const status = journalElements.status;
            const targetDate = journalElements.date ? journalElements.date.value : new Date().toISOString().split('T')[0];

            if (status) {
                status.textContent = '予定取得中...';
                status.style.color = 'var(--accent-gold)';
            }

            chrome.runtime.sendMessage({ type: 'get-schedule', date: targetDate }, (res) => {
                if (res && res.success) {
                    let hasData = false;
                    if (res.calendar && res.calendar.length > 0) {
                        if (journalElements.calendar) journalElements.calendar.value = res.calendar.join('\n');
                        hasData = true;
                    } else {
                        if (journalElements.calendar) journalElements.calendar.value = '(予定なし)';
                    }

                    if (status) status.textContent = hasData ? '予定取得完了' : '予定なし';
                } else {
                    console.error("Schedule Error:", res);
                    if (status) {
                        status.textContent = '取得失敗';
                        status.style.color = '#ff6b6b';
                    }
                    alert('予定の取得に失敗しました。\n以下の原因が考えられます:\n1. GASデプロイURLが古い (再デプロイし、新URLを貼り付けてください)\n2. 権限設定ミス (全員/Anyoneになっていない)\n\nエラー詳細: ' + (res?.error || '不明'));
                }
            });
        });
    }

    if (journalElements.btnHistory) {
        journalElements.btnHistory.addEventListener('click', () => {
            const status = journalElements.status;
            if (status) {
                status.textContent = '履歴取得中...';
                status.style.color = '#eab308';
            }

            // Use background script handler which handles date range properly and fixes TZ
            const targetDateStr = journalElements.date ? journalElements.date.value : new Date().toISOString().split('T')[0];

            chrome.runtime.sendMessage({ type: 'get-history', date: targetDateStr }, (response) => {
                // Check for runtime errors
                if (chrome.runtime.lastError) {
                    console.error('Runtime Error:', chrome.runtime.lastError);
                    if (status) {
                        status.textContent = '通信エラー';
                        status.style.color = '#ff6b6b';
                    }
                    return;
                }

                if (response && response.success) {
                    if (journalElements.activity) {
                        journalElements.activity.value = response.history;
                        journalElements.activity.style.height = 'auto';
                        journalElements.activity.style.height = (journalElements.activity.scrollHeight) + 'px';
                    }
                    if (status) {
                        status.textContent = '履歴取得完了';
                        status.style.color = 'var(--text-secondary)';
                    }
                } else {
                    if (journalElements.activity) journalElements.activity.value = '(履歴取得失敗: ' + (response?.error || '不明') + ')';
                    if (status) {
                        status.textContent = 'エラー';
                        status.style.color = '#ff6b6b';
                    }
                }
            });
        });
    }

    // Temp Save (Local only)
    if (journalElements.btnTempSave) {
        journalElements.btnTempSave.addEventListener('click', () => {
            const data = {
                date: journalElements.date.value,
                title: journalElements.title ? journalElements.title.value : '',
                tags: journalElements.tags ? journalElements.tags.value : '',
                declaration: journalElements.declaration ? journalElements.declaration.value : '',
                content: journalElements.content.value,
                redo: journalElements.redo ? journalElements.redo.value : '',
                confidence: journalElements.confidence ? journalElements.confidence.value : '',
                calendar: journalElements.calendar.value,
                todo: journalElements.todo.value,
                activity: journalElements.activity.value,
                scores: {
                    heart: journalElements.scores.heart.value,
                    skill: journalElements.scores.skill.value,
                    body: journalElements.scores.body.value,
                    life: journalElements.scores.life.value
                }
            };
            localStorage.setItem('temp_journal_autosave', JSON.stringify(data));
            updateJournalStatus('一時保存しました');
        });
    }

    // AI Format Button
    if (journalElements.btnAiFormat) {
        journalElements.btnAiFormat.addEventListener('click', async () => {
            if (!checkExtensionEnvironment()) return;
            // Get content from everywhere
            const rawContent = `
                【朝の宣言】: ${journalElements.declaration.value}
                【予定】: ${journalElements.calendar.value}
                【やるべきこと】: ${journalElements.todo.value}
                【活動履歴】: ${journalElements.activity.value}
                【改善点・やり直し】: ${journalElements.redo ? journalElements.redo.value : ''}
                【良かったこと・自信】: ${journalElements.confidence ? journalElements.confidence.value : ''}
                【感想・自由記述】: ${journalElements.content.value}
            `;

            if (!rawContent.trim()) { alert('内容が空です'); return; }

            updateJournalStatus('AI整形中...');

            let customPrompt = '';
            if (chrome.storage) {
                const result = await chrome.storage.local.get(CONFIG_KEY);
                const config = result[CONFIG_KEY] || {};
                customPrompt = config.customPrompt || '';
            }

            chrome.runtime.sendMessage({
                type: 'format-text',
                text: rawContent,
                userPrompt: customPrompt || '以下の日記・活動記録を、読みやすい日誌形式（Markdown）に整形してください。タイトルやタグも提案してください。'
            }, (res) => {
                if (res && res.success) {
                    if (res.title && journalElements.title) journalElements.title.value = res.title;
                    if (res.tags && journalElements.tags) journalElements.tags.value = res.tags;

                    // Put result in main textarea? Or keep split?
                    // AI formatting usually merges everything. Let's ask user or just put in main content for now.
                    // But here we might want to keep the structured inputs as is, and just output a summary?
                    // The prompt asks to format as "Text". 
                    // Let's put the formatted text into the "Free" area for now, or alert it?
                    // No, usually it replaces the content.
                    if (res.content) {
                        if (confirm('整形結果を「自由記述」欄に上書きしますか？\n（元の入力内容は保持されますが、AI結果はこの欄に統合されます）')) {
                            journalElements.content.value = res.content;
                        }
                    }

                    updateJournalStatus('AI整形完了！');
                } else {
                    updateJournalStatus('AI整形失敗', true);
                    alert('AI整形失敗: ' + (res?.error || '不明'));
                }
            });
        });
    }

    if (journalElements.btnSave) {
        journalElements.btnSave.addEventListener('click', () => {
            if (!checkExtensionEnvironment()) return;
            if (typeof syncMealsToTextarea === 'function') syncMealsToTextarea();

            // 1. Sync CURRENT Habit UI to State (so user doesn't need to press "Save Habits" separately)
            const dateKey = journalElements.date ? journalElements.date.value : new Date().toISOString().split('T')[0];
            let currentLog = appState.logs[dateKey] || {};

            // Re-fetch elements directly to ensure freshness and avoid caching issues
            const hEl = {
                wakeup: document.getElementById('habit-wakeup'),
                bedtime: document.getElementById('habit-bedtime'),
                englishContentId: 'habit-english-content',
                englishTime: document.getElementById('habit-english-time'),
                muscleMenuId: 'habit-muscle-menu',
                muscleDetail: document.getElementById('habit-muscle-detail'),
                joggingDist: document.getElementById('habit-jogging-dist'),
                joggingTime: document.getElementById('habit-jogging-time'),
                mentalMenuId: 'habit-mental-menu',
                socialMenuId: 'habit-social-menu'
            };

            if (hEl) {
                // Collect muscle details
                let genText = '';
                const detailContainer = document.getElementById('muscle-details-container');
                if (detailContainer) {
                    detailContainer.querySelectorAll('.muscle-detail-row').forEach(row => {
                        const w = row.querySelector('.weight-select')?.value || '';
                        const s = row.querySelector('.sets-select')?.value || '';
                        if (row.dataset.name) genText += `${row.dataset.name}: ${w} ${s} \n`;
                    });
                }
                const memo = hEl.muscleDetail?.value || '';
                const finalDetail = (genText.trim() + (memo ? `\n-- - メモ-- -\n${memo} ` : '')).trim();

                // Collect English details
                let englishDetailText = '';
                const englishDetailContainer = document.getElementById('english-details-container');
                if (englishDetailContainer) {
                    englishDetailContainer.querySelectorAll('.english-detail-row').forEach(row => {
                        const time = row.querySelector('.english-time-select')?.value || '';
                        const note = row.querySelector('.english-note-input')?.value || '';
                        if (row.dataset.name) {
                            englishDetailText += `${row.dataset.name}: ${time}${note ? ' - ' + note : ''} \n`;
                        }
                    });
                }
                const englishMemoEl = document.getElementById('habit-english-memo');

                const getRestVal = (id, val) => document.getElementById(`card-${id}`)?.classList.contains('resting') ? 'お休み' : val;
                const isRest = (id) => document.getElementById(`card-${id}`)?.classList.contains('resting');

                currentLog.habits = {
                    wakeup: getRestVal('sleep', hEl.wakeup?.value || ''),
                    bedtime: getRestVal('sleep', hEl.bedtime?.value || ''),
                    englishContent: getRestVal('english', getChipValues(hEl.englishContentId)),
                    englishDetail: isRest('english') ? '' : englishDetailText.trim(),
                    englishMemo: isRest('english') ? '' : (englishMemoEl?.value || ''),
                    muscleMenu: getRestVal('muscle', getChipValues(hEl.muscleMenuId)),
                    muscleDetail: isRest('muscle') ? '' : finalDetail,
                    joggingDist: getRestVal('jogging', hEl.joggingDist?.value || ''),
                    joggingTime: isRest('jogging') ? '' : (hEl.joggingTime?.value || ''),
                    mental: isRest('mental') ? 'お休み' : '',
                    mentalMenu: getRestVal('mental', getChipValues(hEl.mentalMenuId)),
                    socialMenu: getRestVal('social', getChipValues(hEl.socialMenuId))
                };
                appState.logs[dateKey] = currentLog;
                saveState();
            }

            // 2. Calculate Done Routines (Matrix)
            const doneRoutines = appState.routines
                .filter(r => currentLog[r.id])
                .map(r => r.text)
                .join(', ');

            // 3. Generate Full Routine Text
            const h = currentLog.habits || {};
            let habitItems = [];

            // Helper: Check if habit card is completed (やった！)
            const isCompleted = (habitId) => {
                const card = document.getElementById(`card-${habitId}`);
                return card ? card.classList.contains('completed') : false;
            };

            // Helper for formatting
            const formatHabit = (name, val, detailSuffix = '') => {
                if (val === 'お休み') return `[${name}] お休み`;
                if (!val && val !== 0 && val !== false) return null;
                if (val === false) return null; // Checkbox unchecked
                if (val === true) return `[${name}] 実施`; // Checkbox checked
                return `[${name}] ${val}${detailSuffix}`;
            };

            // Sleep is special (2 values)
            if (h.wakeup === 'お休み') {
                habitItems.push(`[早寝早起き] お休み`);
            } else if (h.wakeup || h.bedtime) {
                habitItems.push(`[早寝早起き] 起床:${h.wakeup || '-'} / 就寝:${h.bedtime || '-'}`);
            } else if (isCompleted('sleep')) {
                habitItems.push(`[早寝早起き] やった！`);
            }

            // English
            if (h.englishContent) {
                habitItems.push(formatHabit('英語', h.englishContent, h.englishDetail ? '\n' + h.englishDetail : ''));
            } else if (h.englishContent === 'お休み') {
                habitItems.push(`[英語] お休み`);
            } else if (isCompleted('english')) {
                habitItems.push(`[英語] やった！`);
            }

            // Muscle
            if (h.muscleMenu) {
                habitItems.push(formatHabit('筋トレ', h.muscleMenu, h.muscleDetail ? '\n' + h.muscleDetail : ''));
            } else if (h.muscleMenu === 'お休み') {
                habitItems.push(`[筋トレ] お休み`);
            } else if (isCompleted('muscle')) {
                habitItems.push(`[筋トレ] やった！`);
            }

            // Jogging
            if (h.joggingDist) {
                if (h.joggingDist === 'お休み') habitItems.push(`[ジョギング] お休み`);
                else habitItems.push(`[ジョギング] ${h.joggingDist}km (${h.joggingTime || '-'}分)`);
            } else if (isCompleted('jogging')) {
                habitItems.push(`[ジョギング] やった！`);
            }

            // Stretch
            if (h.stretchCheck) habitItems.push(formatHabit('ストレッチ', h.stretchCheck));

            // Mental
            if (h.mentalMenu) {
                habitItems.push(formatHabit('メンタルケア', h.mentalMenu));
            } else if (h.mental === 'お休み') {
                habitItems.push(`[メンタルケア] お休み`);
            } else if (isCompleted('mental')) {
                habitItems.push(`[メンタルケア] やった！`);
            }

            // Social/発信
            if (h.socialMenu) {
                habitItems.push(formatHabit('発信活動', h.socialMenu));
            } else if (h.socialMenu === 'お休み') {
                habitItems.push(`[発信活動] お休み`);
            } else if (isCompleted('social')) {
                habitItems.push(`[発信活動] やった！`);
            }

            // カスタム習慣（ユーザーが追加した習慣）
            const builtInIds = ['sleep', 'english', 'muscle', 'jogging', 'mental', 'social'];
            appState.habitDefinitions
                .filter(habit => !builtInIds.includes(habit.id))
                .forEach(habit => {
                    const card = document.getElementById(`card-${habit.id}`);
                    if (!card) return;

                    if (card.classList.contains('resting')) {
                        habitItems.push(`[${habit.name}] お休み`);
                    } else if (card.classList.contains('completed')) {
                        habitItems.push(`[${habit.name}] やった！`);
                    }
                });

            const fullRoutineLog = [doneRoutines, ...habitItems].filter(s => s).join('\n');

            const scoresJson = JSON.stringify({
                heart: journalElements.scores.heart.value,
                skill: journalElements.scores.skill.value,
                body: journalElements.scores.body.value,
                life: journalElements.scores.life.value
            });

            const payload = {
                diaryDate: journalElements.date ? journalElements.date.value : null,
                title: journalElements.title ? journalElements.title.value : '無題',
                content: journalElements.content.value,
                calendar: journalElements.calendar ? journalElements.calendar.value : '',
                activity: journalElements.activity ? journalElements.activity.value : '',
                scores: scoresJson,
                confidence: journalElements.confidence ? journalElements.confidence.value : '',
                routine: fullRoutineLog
            };

            const mealRaw = journalElements.todo ? journalElements.todo.value : '';
            const mealAi = currentLog.mealAi || {};
            payload.mealRaw = mealRaw;
            payload.mealJson = mealAi.json || '';
            payload.mealSummary = mealAi.summary || '';
            payload.mealNutrition = mealAi.nutrition ? JSON.stringify(mealAi.nutrition) : '';

            updateJournalStatus('保存中...');
            chrome.runtime.sendMessage({ type: 'save-diary', ...payload }, (res) => {
                if (res && res.success) {
                    // DEBUG message removed

                    updateJournalStatus('GAS保存完了。同期中...');
                    chrome.runtime.sendMessage({ type: 'sync-notebooklm' }, (sRes) => {
                        if (sRes && sRes.success) {
                            updateJournalStatus('完了！');
                            alert('保存・同期完了');
                        } else {
                            updateJournalStatus('同期失敗', true);
                            alert('GASへの保存は成功しましたが、NotebookLMへの同期に失敗しました。\n設定などを確認してください。');
                        }
                    });
                } else {
                    updateJournalStatus('保存失敗', true);
                    alert('GASへの保存に失敗しました: ' + (res?.error || '不明'));
                }
            });
        });
    }
    // ========================================
    // SUPPORTERS SECTION
    // ========================================
    function initSupporters() {
        // Load saved data
        for (let i = 1; i <= 4; i++) {
            const supporter = appState.supporters[i - 1] || { name: '', do: '', dont: '' };
            const nameEl = document.getElementById(`supporter-${i}-name`);
            const doEl = document.getElementById(`supporter-${i}-do`);
            const dontEl = document.getElementById(`supporter-${i}-dont`);

            if (nameEl) nameEl.value = supporter.name || '';
            if (doEl) doEl.value = supporter.do || '';
            if (dontEl) dontEl.value = supporter.dont || '';
        }

        // Save button
        const saveBtn = document.getElementById('save-supporters');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                for (let i = 1; i <= 4; i++) {
                    const nameEl = document.getElementById(`supporter-${i}-name`);
                    const doEl = document.getElementById(`supporter-${i}-do`);
                    const dontEl = document.getElementById(`supporter-${i}-dont`);

                    appState.supporters[i - 1] = {
                        name: nameEl?.value || '',
                        do: doEl?.value || '',
                        dont: dontEl?.value || ''
                    };
                }
                saveState();
                alert('支援者情報を保存しました！');
            });
        }
    }

    // ========================================
    // MENTAL CONTROL SECTION
    // ========================================
    function initMental() {
        // Load saved data
        const declarationEl = document.getElementById('mental-declaration');
        const selftalkEl = document.getElementById('mental-selftalk');
        const improvementEl = document.getElementById('mental-improvement');
        const resetEl = document.getElementById('mental-reset');

        if (declarationEl) declarationEl.value = appState.mental?.declaration || '';
        if (selftalkEl) selftalkEl.value = appState.mental?.selftalk || '';
        if (improvementEl) improvementEl.value = appState.mental?.improvement || '';
        if (resetEl) resetEl.value = appState.mental?.reset || '';

        // Save button
        const saveBtn = document.getElementById('save-mental');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                appState.mental = {
                    declaration: declarationEl?.value || '',
                    selftalk: selftalkEl?.value || '',
                    improvement: improvementEl?.value || '',
                    reset: resetEl?.value || ''
                };
                saveState();
                alert('メンタル管理設定を保存しました！');
            });
        }
    }

    // ========================================
    // HABIT LOG SECTION
    // ========================================
    function initHabitLog() {
        // Custom Time Dropdown Logic
        document.querySelectorAll('.time-dropdown').forEach(dropdown => {
            const valDisplay = dropdown.querySelector('.time-val');
            const menu = dropdown.querySelector('.time-menu');
            const items = menu.querySelectorAll('div');
            const baseId = dropdown.dataset.baseId;
            const hidden = document.getElementById(baseId);

            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close others
                document.querySelectorAll('.time-menu.open').forEach(m => {
                    if (m !== menu) m.classList.remove('open');
                });
                menu.classList.toggle('open');
            });

            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    valDisplay.textContent = item.textContent;
                    items.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    menu.classList.remove('open');
                    updateHidden(dropdown);
                });
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.time-menu.open').forEach(m => m.classList.remove('open'));
        });

        const ampmToggles = document.querySelectorAll('.modern-time-picker .ampm-toggle');
        ampmToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle.textContent = toggle.textContent === '午前' ? '午後' : '午前';
                // Find the hidden input and update it
                const picker = toggle.closest('.modern-time-picker');
                const dropdown = picker.querySelector('.time-dropdown');
                if (dropdown) updateHidden(dropdown);
            });
        });

        function updateHidden(someChildOfPicker) {
            const picker = someChildOfPicker.closest('.modern-time-picker');
            if (!picker) return;
            const toggle = picker.querySelector('.ampm-toggle');
            const hourDropdown = picker.querySelector('.time-dropdown[data-type="hour"]');
            const minDropdown = picker.querySelector('.time-dropdown[data-type="min"]');
            const hiddenInput = picker.querySelector('.habit-input');

            let h = parseInt(hourDropdown.querySelector('.time-val').textContent);
            const m = hourDropdown.closest('.modern-time-picker').querySelector('.time-dropdown[data-type="min"] .time-val').textContent;
            const isPM = toggle.textContent === '午後';

            if (isPM && h < 12) h += 12;
            if (!isPM && h === 12) h = 0;

            hiddenInput.value = `${String(h).padStart(2, '0')}:${m}`;
        }

        window.refreshModernTimePicker = (id, timeStr) => {
            if (!timeStr || timeStr === "--:--" || timeStr === "お休み") return;
            const hidden = document.getElementById(id);
            if (!hidden) return;
            const picker = hidden.closest('.modern-time-picker');
            if (!picker) return;

            const [h24, m] = timeStr.split(':').map(Number);
            const isPM = h24 >= 12;
            let h12 = h24 % 12;
            if (h12 === 0) h12 = 12;

            const toggle = picker.querySelector('.ampm-toggle');
            toggle.textContent = isPM ? '午後' : '午前';

            const hourDropdown = picker.querySelector('.time-dropdown[data-type="hour"]');
            const minDropdown = picker.querySelector('.time-dropdown[data-type="min"]');

            const hourValStr = String(h12).padStart(2, '0');
            const minValStr = String(m).padStart(2, '0');

            hourDropdown.querySelector('.time-val').textContent = hourValStr;
            minDropdown.querySelector('.time-val').textContent = minValStr;

            // Update active class in menu
            [hourDropdown, minDropdown].forEach(d => {
                const targetVal = d.querySelector('.time-val').textContent;
                d.querySelectorAll('.time-menu div').forEach(item => {
                    if (item.textContent === targetVal) item.classList.add('active');
                    else item.classList.remove('active');
                });
            });

            hidden.value = timeStr;
        };

        // Stretch Checkbox Listener (UI Toggle)
        const h = habitElements;
        if (h.stretchCheck) {
            h.stretchCheck.addEventListener('change', (e) => {
                if (h.stretchLabel) {
                    h.stretchLabel.textContent = e.target.checked ? '実施済み' : '未実施';
                }
            });
        }

        // Save Button
        const saveBtn = document.getElementById('save-habits');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // Use currently selected date
                const dateKey = journalElements.date ? journalElements.date.value : new Date().toISOString().split('T')[0];
                const currentLog = appState.logs[dateKey] || {};

                // Generate Muscle Text
                let genText = '';
                const detailContainer = document.getElementById('muscle-details-container');
                if (detailContainer) {
                    detailContainer.querySelectorAll('.muscle-detail-row').forEach(row => {
                        const w = row.querySelector('.weight-select')?.value || '';
                        const s = row.querySelector('.sets-select')?.value || '';
                        if (row.dataset.name) genText += `${row.dataset.name}: ${w} ${s}\n`;
                    });
                }

                const memo = h.muscleDetail?.value || '';
                const finalDetail = (genText.trim() + (memo ? `\n--- メモ ---\n${memo}` : '')).trim();

                currentLog.habits = {
                    wakeup: h.wakeup?.value || '',
                    bedtime: h.bedtime?.value || '',
                    englishContent: getChipValues(h.englishContentId),
                    englishTime: h.englishTime?.value || '',
                    muscleMenu: getChipValues(h.muscleMenuId),
                    muscleDetail: finalDetail,
                    joggingDist: h.joggingDist?.value || '',
                    joggingTime: h.joggingTime?.value || '',
                    stretchCheck: h.stretchCheck?.checked || false,
                    socialMenu: getChipValues(h.socialMenuId)
                };

                appState.logs[dateKey] = currentLog;
                saveState();
                alert(`習慣ログを保存しました！ (${dateKey})`);
            });
        }
    }

    // Init
    loadState();
    initGoalForm();
    renderSprintGoals();
    updateDashboard();
    renderMandala();
    // renderRoutines(); // replaced by matrix
    renderRoutineMatrix();
    initSupporters();
    initMental();
    initHabitLog();

    // --- Dashboard / Analysis Manager ---
    const dashboardManager = {
        data: [], // Cache for fetched data
        chartInstance: null,
        streakSortOrder: 'desc',

        habits: [
            { id: 'muscle', name: '筋トレ', key: '[筋トレ]' },
            { id: 'english', name: '英会話/学習', key: ['[英語]', '[English]'] },
            { id: 'note', name: '発信活動', key: ['[発信活動]', '[発信]', '[Note]', 'note'] },
            { id: 'early', name: '早寝早起き', key: ['[早寝早起き]', '[睡眠]'] },
            { id: 'jog', name: 'ジョギング', key: ['[ジョギング]', '[Jog]'] },
            { id: 'mental', name: 'メンタルケア', key: ['[メンタルケア]', '[メンタル]', '[ストレッチ]', 'nap', 'meditation'] }
        ],

        init: function () {
            this.setupTabs();
            this.setupRefresh();
            this.setupMatrixInteractions();
            this.setupStreakSort();
        },

        setupStreakSort: function () {
            const btn = document.getElementById('btn-streak-sort');
            if (!btn) return;
            const saved = localStorage.getItem('harada_streak_sort_order');
            this.streakSortOrder = saved === 'asc' ? 'asc' : 'desc';
            const updateLabel = () => {
                btn.textContent = this.streakSortOrder === 'desc' ? '多→少' : '少→多';
            };
            updateLabel();
            btn.addEventListener('click', () => {
                this.streakSortOrder = this.streakSortOrder === 'desc' ? 'asc' : 'desc';
                localStorage.setItem('harada_streak_sort_order', this.streakSortOrder);
                updateLabel();
                this.renderStreaks();
            });
        },

        setupMatrixInteractions: function () {
            const container = document.getElementById('habit-matrix-view');
            if (!container) return;
            container.addEventListener('click', (e) => {
                const target = e.target.closest('.matrix-cell-wrapper');
                if (target) {
                    const date = target.dataset.date;
                    const id = target.dataset.id;
                    // Only allow toggling if date and id are present
                    if (date && id) {
                        this.toggleHabit(date, id);
                    }
                }
            });
        },

        toggleHabit: async function (dateStr, habitId) {
            // UI Feedback
            const cell = document.querySelector(`.matrix-cell-wrapper[data-date="${dateStr}"][data-id="${habitId}"]`);
            if (cell) cell.style.opacity = '0.5';

            try {
                // 1. Fetch full data for the date
                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ type: 'get-history', date: dateStr }, resolve);
                });

                if (!response || !response.success) {
                    if (cell) cell.style.opacity = '1';
                    alert('データの取得に失敗しました。');
                    return;
                }

                const data = response.data || {};
                let routine = data.routine || '';

                const habit = this.habits.find(h => h.id === habitId);
                if (!habit) {
                    if (cell) cell.style.opacity = '1';
                    return;
                }

                const primaryKey = Array.isArray(habit.key) ? habit.key[0] : habit.key;
                const allKeys = Array.isArray(habit.key) ? habit.key : [habit.key];

                // 2. Determine Current Status
                let currentStatus = 'OFF';
                let isRest = false;
                let isDone = false;

                for (const k of allKeys) {
                    // Check for rest first (more specific)
                    if (routine.includes(k + ' お休み') || routine.includes(k + 'お休み')) {
                        isRest = true;
                    } else if (routine.includes(k)) {
                        isDone = true;
                    }
                }

                if (isRest) currentStatus = 'REST';
                else if (isDone) currentStatus = 'DONE';

                // 3. Cycle Status: OFF -> DONE -> REST -> OFF
                let nextStatus = 'OFF';
                if (currentStatus === 'OFF') nextStatus = 'DONE';
                else if (currentStatus === 'DONE') nextStatus = 'REST';
                else nextStatus = 'OFF';

                // 4. Update Routine String
                let lines = routine.split('\n').map(l => l.trim()).filter(l => l);
                // Remove existing lines for this habit
                lines = lines.filter(line => {
                    return !allKeys.some(k => line.includes(k));
                });

                // Add new status line
                if (nextStatus === 'DONE') {
                    lines.push(`${primaryKey} やった`);
                } else if (nextStatus === 'REST') {
                    lines.push(`${primaryKey} お休み`);
                }

                const newRoutine = lines.join('\n');

                // 5. Optimistic UI Update
                const localEntry = this.data.find(d => d.date && d.date.startsWith(dateStr));
                if (localEntry) {
                    localEntry.routine = newRoutine;
                } else {
                    this.data.push({
                        date: dateStr,
                        routine: newRoutine,
                        scores: data.scores
                    });
                }
                this.renderMatrix();

                // 6. Save to Backend
                const payload = {
                    ...data,
                    routine: newRoutine,
                    diaryDate: dateStr // Explicitly set for save-diary
                };

                chrome.runtime.sendMessage({ type: 'save-diary', ...payload }, (res) => {
                    if (!res || !res.success) {
                        alert('保存に失敗しました: ' + (res?.error || 'Unknown'));
                        this.fetchData(); // Revert on failure
                    }
                });

            } catch (e) {
                console.error(e);
                if (cell) cell.style.opacity = '1';
                alert('エラー: ' + e.message);
            }
        },

        setupTabs: function () {
            const tabs = document.querySelectorAll('.dash-tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Switch UI
                    document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
                    tab.classList.add('active');

                    const targetId = tab.dataset.tab;
                    // Hide all panels
                    document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));
                    // Show target
                    const panel = document.getElementById(`panel-${targetId}`);
                    if (panel) panel.classList.add('active');

                    // If analysis tab, fetch data if empty
                    if (targetId === 'analysis' && this.data.length === 0) {
                        this.fetchData();
                    }
                });
            });
        },

        setupRefresh: function () {
            const btn = document.getElementById('btn-refresh-data');
            if (btn) {
                btn.addEventListener('click', () => {
                    this.fetchData();
                });
            }
        },

        fetchData: async function () {
            const container = document.getElementById('habit-matrix-view');
            // Use a spinner
            if (container) container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> データを読み込み中...</div>';

            try {
                // Fetch URL from Chrome Storage (shared with background.js)
                const storage = await chrome.storage.local.get('nld_config');
                const config = storage.nld_config;

                if (!config || !config.gasUrl) {
                    if (container) container.innerHTML = '<div style="color:red; padding:20px;">GAS URLが未設定です。拡張機能の設定画面を確認してください。</div>';
                    throw new Error('GAS URL not found in storage');
                }

                const response = await fetch(`${config.gasUrl}?action=getAllHabitData`);
                const result = await response.json();

                if (result.success) {
                    this.data = result.data; // [{date, scores, routine}, ...]
                    console.log('=== GAS Data Loaded ===');
                    console.log('Total records:', this.data.length);
                    this.data.slice(0, 5).forEach((d, i) => {
                        console.log(`Record ${i}:`, { date: d.date, routine: d.routine?.substring(0, 50) });
                    });
                    this.renderAll();
                } else {
                    throw new Error(result.message || 'Unknown error');
                }

            } catch (e) {
                console.error('Fetch error:', e);
                if (container) container.innerHTML = `<div class="error-msg" style="text-align:center; padding:2rem; color:#ff6b6b">データの取得に失敗しました。<br>${e.message}</div>`;
            }
        },

        renderAll: function () {
            this.renderMatrix();
            this.renderRadar();
            this.renderStreaks();
        },

        // --- 1. Habit Matrix ---
        renderMatrix: function () {
            const container = document.getElementById('habit-matrix-view');
            if (!container) return;

            // Prepare Columns: Last 14 days
            const headerDates = [];

            for (let i = 13; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);

                // Formats
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const fullDate = `${yyyy}-${mm}-${dd}`;
                const dateStr = this.formatDateShort(d); // M/D

                const dayOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
                headerDates.push({ date: dateStr, day: dayOfWeek, fullDate: fullDate });
            }

            // Build Table HTML
            let html = '<div class="matrix-wrapper"><table class="habit-matrix-table"><thead><tr><th class="habit-col">Habit</th>';
            headerDates.forEach(h => {
                html += `<th><div class="th-date">${h.date}</div><div class="th-day">${h.day}</div></th>`;
            });
            html += '</tr></thead><tbody>';

            this.habits.forEach(habit => {
                html += `<tr><td class="habit-col">${habit.name}</td>`;

                headerDates.forEach(h => {
                    const log = this.findLogByDate(h.fullDate);

                    let cellContent = '<i class="fa-regular fa-circle matrix-cell miss"></i>';

                    if (log) {
                        const routineText = (log.routine || '').toString();
                        if (routineText.includes('お休み')) {
                            // Check if it's THIS habit resting
                            const keys = Array.isArray(habit.key) ? habit.key : [habit.key];
                            let isRest = false;
                            for (const k of keys) {
                                if (routineText.includes(k + ' お休み') || routineText.includes(k + 'お休み')) {
                                    isRest = true;
                                    break;
                                }
                            }

                            if (isRest) {
                                cellContent = '<i class="fa-solid fa-moon matrix-cell rest"></i>';
                            } else {
                                // Check done
                                let isDone = false;
                                for (const k of keys) {
                                    if (routineText.includes(k)) {
                                        isDone = true;
                                        break;
                                    }
                                }
                                if (isDone) cellContent = '<i class="fa-solid fa-circle-check matrix-cell done"></i>';
                            }
                        } else {
                            let isDone = false;
                            const keys = Array.isArray(habit.key) ? habit.key : [habit.key];
                            for (const k of keys) {
                                if (routineText.includes(k)) {
                                    isDone = true;
                                    break;
                                }
                            }

                            if (isDone) {
                                cellContent = '<i class="fa-solid fa-circle-check matrix-cell done"></i>';
                            }
                        }
                    }

                    // Wrap in clickable div
                    html += `<td><div class="matrix-cell-wrapper" data-date="${h.fullDate}" data-id="${habit.id}" style="cursor:pointer; padding: 5px;">${cellContent}</div></td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>'; // Added closing div

            container.innerHTML = html;
        },

        findLogByDate: function (fullDate) {
            // fullDate "2026-01-23". log.date "2026-01-23", "2026/01/23", or Date object
            return this.data.find(d => {
                if (!d.date) return false;
                const normalized = this.normalizeDateString(d.date);
                return normalized === fullDate;
            });
        },

        normalizeDateString: function (value) {
            if (!value) return '';
            if (Object.prototype.toString.call(value) === '[object Date]') {
                const y = value.getFullYear();
                const m = String(value.getMonth() + 1).padStart(2, '0');
                const d = String(value.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
            if (typeof value === 'string') {
                const match = value.match(/^(\d{4})[\\/-](\d{1,2})[\\/-](\d{1,2})/);
                if (match) {
                    const y = match[1];
                    const m = String(parseInt(match[2], 10)).padStart(2, '0');
                    const d = String(parseInt(match[3], 10)).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                }
            }
            const dObj = new Date(value);
            if (isNaN(dObj)) return '';
            const y = dObj.getFullYear();
            const m = String(dObj.getMonth() + 1).padStart(2, '0');
            const d = String(dObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        },

        formatDateShort: function (dateObj) {
            return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        },

        // --- 2. Radar Chart ---
        // --- 2. Chart Rendering ---
        renderRadar: function () {
            const ctx = document.getElementById('radarChart');
            if (!ctx) return;

            const parseScores = (raw) => {
                if (!raw) return null;
                let s = raw;
                if (typeof s === 'string') {
                    try { s = JSON.parse(s); } catch (ex) { return null; }
                }
                if (!s || typeof s !== 'object') return null;
                const toNum = (v) => {
                    const n = parseInt(v, 10);
                    return Number.isFinite(n) ? n : 0;
                };
                return {
                    heart: toNum(s.heart),
                    skill: toNum(s.skill),
                    body: toNum(s.body),
                    life: toNum(s.life)
                };
            };

            const scoredLogs = this.data
                .map(log => {
                    const scores = parseScores(log.scores);
                    if (!scores) return null;
                    const dateKey = this.normalizeDateString(log.date);
                    return { date: dateKey, scores };
                })
                .filter(Boolean)
                .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

            const last7 = scoredLogs.slice(-7);
            let sums = { heart: 0, skill: 0, body: 0, life: 0, count: 0 };

            last7.forEach(log => {
                sums.heart += log.scores.heart;
                sums.skill += log.scores.skill;
                sums.body += log.scores.body;
                sums.life += log.scores.life;
                sums.count++;
            });

            const avg = (val) => sums.count > 0 ? Number((val / sums.count).toFixed(1)) : 0;
            const dataset = [avg(sums.heart), avg(sums.skill), avg(sums.body), avg(sums.life)];

            if (this.chartInstance) {
                this.chartInstance.destroy();
            }

            // Chart.js Theme Colors
            const accentColor = '#FFD700'; // Gold
            const gridColor = 'rgba(255, 255, 255, 0.1)';
            const textColor = '#e2e8f0';

            this.chartInstance = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['心 (Heart)', '技 (Skill)', '体 (Body)', '生活 (Life)'],
                    datasets: [{
                        label: '週間平均',
                        data: dataset,
                        backgroundColor: 'rgba(46, 204, 113, 0.15)', // Green tint
                        borderColor: '#2ecc71', // Emerald green border
                        pointBackgroundColor: '#2ecc71', // pure green for points
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#2ecc71',
                        borderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                    }]
                },
                options: {
                    scales: {
                        r: {
                            angleLines: { color: gridColor },
                            grid: { color: gridColor },
                            pointLabels: {
                                color: textColor,
                                font: { size: 15, family: "'Inter', sans-serif" },
                                padding: 20
                            },
                            min: 0,
                            max: 5,
                            ticks: {
                                stepSize: 1,
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    },
                    layout: {
                        padding: { top: 4, right: 18, bottom: 18, left: 18 }
                    },
                    maintainAspectRatio: false
                }
            });
        },

        // --- 3. Streak Calculation (Rich Cards) ---
        renderStreaks: function () {
            const container = document.getElementById('streak-list-view');
            if (!container) return;

            // Add grid class if not present
            if (!container.classList.contains('streak-grid')) {
                container.className = 'streak-grid';
            }

            const habits = [
                { id: 'english', name: '英語学習', key: ['[英語]', '[English]'], icon: 'fa-language' },
                { id: 'muscle', name: '筋トレ', key: '[筋トレ]', icon: 'fa-dumbbell' },
                { id: 'jog', name: 'ジョギング', key: ['[ジョギング]', '[Jog]'], icon: 'fa-person-running' },
                { id: 'early', name: '早寝早起き', key: ['[早寝早起き]', '[睡眠]'], icon: 'fa-bed' },
                { id: 'mental', name: 'メンタルケア', key: ['[メンタルケア]', '[メンタル]'], icon: 'fa-brain' },
                { id: 'note', name: '発信活動', key: ['[発信活動]', '[発信]'], icon: 'fa-bullhorn' },
                { id: 'daily', name: '日誌記入', key: null, icon: 'fa-pen-nib' }
            ];

            let html = '';
            const reversedData = [...this.data].reverse();
            const streakData = [];

            habits.forEach(h => {
                // Helper to check if a specific log counts as done for this habit
                const checkIsDone = (log) => {
                    if (!log) return false;
                    const routineText = (log.routine || '').toString();
                    if (h.key === null) return !!log.date;

                    const keys = Array.isArray(h.key) ? h.key : [h.key];
                    for (const k of keys) {
                        // この習慣がRoutineに含まれていて、かつ「この習慣 + お休み」ではない
                        const isResting = routineText.includes(k + ' お休み') || routineText.includes(k + 'お休み');
                        if (routineText.includes(k) && !isResting) {
                            return true;
                        }
                    }
                    return false;
                };

                let streak = 0;
                let startIndex = 0;

                // Lenient Logic:
                // If today (index 0) is NOT done, check yesterday (index 1).
                // If yesterday is done, start counting from yesterday (streak continues).
                if (reversedData.length > 0 && !checkIsDone(reversedData[0])) {
                    if (reversedData.length > 1 && checkIsDone(reversedData[1])) {
                        startIndex = 1;
                    }
                }

                // Note: If startIndex is 0 but checkIsDone(0) is false, loop breaks immediately -> streaks 0.
                // This handles the "Break" case correctly.

                for (let i = startIndex; i < reversedData.length; i++) {
                    if (checkIsDone(reversedData[i])) streak++;
                    else break;
                }

                streakData.push({ ...h, streak });
            });

            const order = this.streakSortOrder === 'asc' ? 1 : -1;
            streakData.sort((a, b) => {
                if (a.streak !== b.streak) return (a.streak - b.streak) * order;
                return a.name.localeCompare(b.name, 'ja');
            });

            streakData.forEach(h => {
                const isFire = h.streak > 0;
                const statusClass = isFire ? 'active-streak' : 'no-streak';
                const statusIcon = isFire ? 'fa-fire' : 'fa-snowflake';

                html += `
                    <div class="streak-card ${statusClass}">
                        <div class="streak-card-header">
                            <div class="streak-icon-box">
                                <i class="fa-solid ${h.icon}"></i>
                            </div>
                            <div class="streak-label">${h.name}</div>
                        </div>
                        <div class="streak-body">
                            <div class="streak-number">${h.streak}</div>
                            <div class="streak-unit">Days</div>
                        </div>
                        <div class="streak-footer">
                            <i class="fa-solid ${statusIcon}"></i> ${isFire ? 'Keep it up!' : 'Start today!'}
                        </div>
                    </div>`;
            });

            container.innerHTML = html;
        }
    };

    // Init Dashboard
    dashboardManager.init();




    // --- Dynamic Habit Rendering ---
    function renderHabits() {
        const grid = document.querySelector('.habit-grid');
        if (!grid) return;

        grid.innerHTML = ''; // Clear existing static html

        appState.habitDefinitions.forEach(habit => {
            const cardHtml = `
                    <div class="habit-card card simple-habit" id="card-${habit.id}">
                        <div class="habit-header-simple">
                            <div class="header-main">
                                <span class="habit-icon"><i class="${habit.icon}"></i></span>
                                <h3>${habit.name}</h3>
                            </div>
                            <button class="delete-habit-btn" data-id="${habit.id}" title="削除" style="position: absolute; right: 10px; top: 10px; background: none; border: none; color: #666; cursor: pointer; opacity: 0;">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                        <div class="habit-actions-simple">
                            <button class="action-btn done-btn" data-habit="${habit.id}">
                                <i class="fa-solid fa-check"></i>
                                <span>やった！</span>
                            </button>
                            <button class="action-btn rest-btn-simple" data-habit="${habit.id}">
                                <i class="fa-solid fa-moon"></i>
                                <span>休み</span>
                            </button>
                        </div>
                        <div class="habit-feedback">
                            <div class="feedback-text">${habit.feedback || 'Great Job!'}</div>
                            <button class="undo-btn" data-habit="${habit.id}" title="元に戻す"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="habit-rest-feedback">
                            <div class="rest-text">Rest & Recover 🌙</div>
                            <button class="undo-btn" data-habit="${habit.id}" title="元に戻す"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="habit-details-hidden" style="display:none;">
                             <div class="chip-container"><span class="chip" data-value="やった">やった</span></div>
                        </div>
                    </div>
                `;
            grid.insertAdjacentHTML('beforeend', cardHtml);
        });

        // Add "New Habit" Button Card
        const addBtnHtml = `
                <div class="habit-card card add-habit-card" id="add-new-habit" style="display: flex; align-items: center; justify-content: center; cursor: pointer; min-height: 140px; border: 2px dashed rgba(255, 255, 255, 0.1);">
                    <div style="text-align: center; color: var(--text-secondary);">
                        <i class="fa-solid fa-plus" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                        <span>習慣を追加</span>
                    </div>
                </div>
            `;
        grid.insertAdjacentHTML('beforeend', addBtnHtml);
        const y = currentJournalDate.getFullYear();
        const m = String(currentJournalDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentJournalDate.getDate()).padStart(2, '0');
        const currentDateStr = `${y}-${m}-${d}`;
        applyHabitCardStates(currentDateStr);
    }

    // --- Save Diary Data (Habit Cards State) ---
    function saveDiaryData() {
        const dateKey = journalElements.date ? journalElements.date.value : new Date().toISOString().split('T')[0];
        let currentLog = appState.logs[dateKey] || {};

        // Helper: Get chip values from container
        const getChipVals = (containerId) => {
            const container = document.getElementById(containerId);
            if (!container) return '';
            const activeChips = container.querySelectorAll('.chip.active');
            return Array.from(activeChips).map(c => c.getAttribute('data-value')).join(',');
        };

        // Generate Muscle Detail Text
        let muscleGenText = '';
        const muscleDetailContainer = document.getElementById('muscle-details-container');
        if (muscleDetailContainer) {
            muscleDetailContainer.querySelectorAll('.muscle-detail-row').forEach(row => {
                const w = row.querySelector('.weight-select')?.value || '';
                const s = row.querySelector('.sets-select')?.value || '';
                if (row.dataset.name) muscleGenText += `${row.dataset.name}: ${w} ${s}\n`;
            });
        }
        const muscleMemo = habitElements.muscleDetail?.value || '';
        const finalMuscleDetail = (muscleGenText.trim() + (muscleMemo ? `\n--- メモ ---\n${muscleMemo}` : '')).trim();

        // ========================================
        // 全習慣カードの状態を保存（シンプル版）
        // ========================================
        const habitStates = {};
        appState.habitDefinitions.forEach(habit => {
            const state = HabitHelper.getCardState(habit.id);
            habitStates[habit.id] = state === 'none' ? 'rest' : state;
        });

        // Build habits object from current UI state
        currentLog.habits = {
            // 各習慣カードの状態（done/rest/none）
            states: habitStates,

            // 詳細データ（ビルトイン習慣用）
            wakeup: habitElements.wakeup?.value || '',
            bedtime: habitElements.bedtime?.value || '',
            englishContent: getChipVals(habitElements.englishContentId),
            englishTime: habitElements.englishTime?.value || '',
            muscleMenu: getChipVals(habitElements.muscleMenuId),
            muscleDetail: finalMuscleDetail,
            joggingDist: habitElements.joggingDist?.value || '',
            joggingTime: habitElements.joggingTime?.value || '',
            mentalMenu: getChipVals(habitElements.mentalMenuId),
            socialMenu: getChipVals(habitElements.socialMenuId)
        };

        appState.logs[dateKey] = currentLog;
        saveState();
    }

    // --- Habit Event Delegation (Robust Interaction) ---
    function setupHabitDelegation() {
        const grid = document.querySelector('.habit-grid');
        if (!grid) return;

        grid.addEventListener('click', (e) => {
            const target = e.target;

            // --- 1. DONE Button ---
            const doneBtn = target.closest('.done-btn');
            if (doneBtn) {
                e.stopPropagation();
                const habitId = doneBtn.dataset.habit;
                const card = document.getElementById(`card-${habitId}`);
                if (!card) return;

                // Toggle if already completed (Undo via Button)
                if (card.classList.contains('completed')) {
                    undoHabit(card, habitId);
                } else {
                    completeHabit(card, habitId);
                }
                saveDiaryData();
                return;
            }

            // --- 2. REST Button ---
            const restBtn = target.closest('.rest-btn-simple');
            if (restBtn) {
                e.stopPropagation();
                const habitId = restBtn.dataset.habit;
                const card = document.getElementById(`card-${habitId}`);
                if (!card) return;

                // Toggle Rest
                if (card.classList.contains('resting')) {
                    card.classList.remove('resting');
                } else {
                    card.classList.add('resting');
                    card.classList.remove('completed');

                    // Clear "Done" data
                    if (habitId !== 'sleep') {
                        const chipContainer = card.querySelector('.chip-container');
                        if (chipContainer) {
                            const doneChip = chipContainer.querySelector('.chip[data-value="やった"]');
                            if (doneChip) doneChip.classList.remove('active');
                        }
                    }
                }
                saveDiaryData();
                return;
            }

            // --- 3. UNDO Button (X mark) ---
            const undoBtn = target.closest('.undo-btn');
            if (undoBtn) {
                e.stopPropagation();
                const habitId = undoBtn.dataset.habit;
                const card = document.getElementById(`card-${habitId}`);
                if (card) {
                    undoHabit(card, habitId);
                    saveDiaryData();
                }
                return;
            }

            // --- 4. DELETE Habit Button ---
            const deleteBtn = target.closest('.delete-habit-btn');
            if (deleteBtn) {
                e.stopPropagation();
                if (!confirm('この習慣を削除しますか？ (過去の記録は残ります)')) return;

                const id = deleteBtn.dataset.id;
                appState.habitDefinitions = appState.habitDefinitions.filter(h => h.id !== id);
                saveState();
                renderHabits();
                loadDiaryData(document.getElementById('journal-date').value);
                return;
            }

            // --- 5. ADD Habit Card ---
            const addCard = target.closest('#add-new-habit');
            if (addCard) {
                const name = prompt('新しい習慣の名前を入力してください:');
                if (!name) return;

                const icon = 'fa-solid fa-star';
                const feedback = 'Awesome!';
                const id = 'custom_' + Date.now();

                appState.habitDefinitions.push({ id, name, icon, feedback });
                saveState();
                renderHabits();
                loadDiaryData(document.getElementById('journal-date').value);
                return;
            }

            // --- 6. Card Toggle Logic (Click background to cycle status) ---
            const habitCard = target.closest('.simple-habit');
            if (habitCard) {
                const habitId = habitCard.id.replace('card-', '');

                if (habitCard.classList.contains('completed')) {
                    // 1. Done -> Rest
                    undoHabit(habitCard, habitId); // Clear Done status/data
                    habitCard.classList.add('resting'); // Visual Rest state
                    habitCard.classList.remove('completed');
                } else if (habitCard.classList.contains('resting')) {
                    // 2. Rest -> None
                    habitCard.classList.remove('resting');
                } else {
                    // 3. None -> Done
                    completeHabit(habitCard, habitId);
                }
                saveDiaryData();
            }
        });

        // Helper: Hover effect for delete button
        grid.addEventListener('mouseover', (e) => {
            const card = e.target.closest('.habit-card');
            if (card && !card.id.includes('add-new')) {
                const btn = card.querySelector('.delete-habit-btn');
                if (btn) btn.style.opacity = '1';
            }
        });
        grid.addEventListener('mouseout', (e) => {
            const card = e.target.closest('.habit-card');
            if (card) {
                const btn = card.querySelector('.delete-habit-btn');
                if (btn) btn.style.opacity = '0';
            }
        });
    }

    // Helper: Complete Habit (Defined here to be accessible by delegation)
    function completeHabit(card, habitId) {
        card.classList.add('completed');
        card.classList.remove('resting');

        if (habitId === 'sleep') {
            // Sleep logic
        } else {
            const chipContainer = card.querySelector('.chip-container');
            if (chipContainer) {
                const doneChip = chipContainer.querySelector('.chip[data-value="やった"]');
                if (doneChip && !doneChip.classList.contains('active')) {
                    doneChip.classList.add('active');
                }
            }
        }
    }

    // Helper: Undo Habit
    function undoHabit(card, habitId) {
        card.classList.remove('completed');
        card.classList.remove('resting');

        if (habitId === 'sleep') {
            // Sleep logic
        } else {
            const chipContainer = card.querySelector('.chip-container');
            if (chipContainer) {
                const doneChip = chipContainer.querySelector('.chip[data-value="やった"]');
                if (doneChip) doneChip.classList.remove('active');
            }
        }
    }

    // Initialize listeners
    setupHabitDelegation();
});

// Smooth Scroll Function for Speed Review
window.smoothScrollTo = function (targetId) {
    const container = document.querySelector('.main-content');
    const target = document.getElementById(targetId);
    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // Calculate distance to scroll
    const relativeTop = targetRect.top - containerRect.top;
    const startScrollTop = container.scrollTop;
    const targetScrollTop = startScrollTop + relativeTop - 60; // Offset for header/margin
    const distance = targetScrollTop - startScrollTop;

    const duration = 1200; // 1.2 seconds for slower "shoon" effect
    let start = null;

    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percent = Math.min(progress / duration, 1);

        // Ease Out Quart function for "Shoon" feeling
        const ease = 1 - Math.pow(1 - percent, 4);

        container.scrollTop = startScrollTop + distance * ease;

        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
};

// AI Writer Button Handler with Gemini API
function initAiWriter() {
    const aiWriterBtn = document.getElementById('btn-ai-writer');
    if (!aiWriterBtn) return;

    aiWriterBtn.addEventListener('click', async () => {
        const textarea = document.getElementById('journal-textarea');
        if (!textarea) return;

        const content = textarea.value;
        if (!content.trim()) {
            alert('日記の内容を入力してからAIライターを実行してください。');
            return;
        }

        // Load Settings (Checking Chrome Storage first, then LocalStorage)
        let config = {};
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await chrome.storage.local.get('nld_config');
                config = result['nld_config'] || {};
            } else {
                const stored = localStorage.getItem('nld_config');
                if (stored) config = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load config', e);
        }

        const apiKey = config.geminiApiKey;
        // Default prompt if not set
        const defaultPrompt = "以下の文章を日記として読みやすく整形してください。内容は変えず、誤字脱字の修正や言い回しの改善のみを行ってください。アドバイスや感想、追加の質問は一切不要です。出力は整形後の本文のみにしてください。";
        const customPrompt = config.customPrompt || defaultPrompt;

        if (!apiKey) {
            alert('Gemini APIキーが設定されていません。画面右上のユーザーアイコンから設定画面を開き、APIキーを設定してください。');
            return;
        }

        const originalText = aiWriterBtn.innerHTML;
        aiWriterBtn.disabled = true;
        aiWriterBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 生成中...';

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${customPrompt}\n\n【日記本文】\n${content}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 8192
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API Error');
            }

            const data = await response.json();
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (generatedText) {
                textarea.value = generatedText;
            } else {
                throw new Error('No content generated');
            }

        } catch (error) {
            console.error('AI Writer Error:', error);
            alert('AI生成中にエラーが発生しました:\n' + error.message);
        } finally {
            aiWriterBtn.disabled = false;
            aiWriterBtn.innerHTML = originalText;
        }
    });
}

// Initialize AI Writer when DOM is ready
initAiWriter();

// --- AI Mandala Generation Logic (Clean) ---
const startAiMandalaLogic = async (e) => {
    e.preventDefault();

    // UI Feedback immediately
    const btnM = e.currentTarget; // The button itself

    // Check Goal
    const goal = appState.goal || (appState.mandala && appState.mandala[4] ? appState.mandala[4][4] : '');
    if (!goal) {
        alert('まずは中央の目標（設定画面の目標、または曼荼羅の中央）を入力してください');
        return;
    }

    if (!confirm(`目標「${goal}」でマンダラートを生成しますか？\n（既存の内容は上書きされます）`)) return;

    const orgText = btnM.innerHTML;
    btnM.disabled = true;
    btnM.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 生成中...';

    try {
        // Config
        let config = {};
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const r = await chrome.storage.local.get('nld_config');
                config = r['nld_config'] || {};
            } else {
                const s = localStorage.getItem('nld_config');
                if (s) config = JSON.parse(s);
            }
        } catch (e) { }

        const apiKey = config.geminiApiKey;
        if (!apiKey) throw new Error('APIキーが未設定です');

        // API Call
        const prompt = `目標「${goal}」を達成するためのマンダラート（オープンウィンドウ64）を作成してください。
大谷翔平のマンダラートのように、簡潔で具体的な短い言葉（単語や短いフレーズ）にしてください。
JSON形式で、以下の構造のみを出力してください。
{
  "sub_goals": [
    {
      "title": "要素1",
      "actions": ["行動1", "行動2", "行動3", "行動4", "行動5", "行動6", "行動7", "行動8"]
    },
    ... (要素は計8つ、各actionsも必ず8つ)
  ]
}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No content');

        const json = JSON.parse(text);

        // Render
        if (!appState.mandala) appState.mandala = Array(9).fill(null).map(() => Array(9).fill(''));
        const tBlocks = [0, 1, 2, 3, 5, 6, 7, 8];
        const tCells = [0, 1, 2, 3, 5, 6, 7, 8];
        appState.mandala[4][4] = goal;

        json.sub_goals.forEach((sub, i) => {
            if (i >= 8) return;
            const bi = tBlocks[i];
            appState.mandala[bi][4] = sub.title;
            appState.mandala[4][bi] = sub.title;
            if (sub.actions) {
                sub.actions.forEach((act, j) => {
                    if (j >= 8) return;
                    appState.mandala[bi][tCells[j]] = act;
                });
            }
        });

        saveState();
        renderMandala();
        alert('生成完了！');

    } catch (e) {
        console.error(e);
        alert('エラー: ' + e.message);
    } finally {
        if (btnM) {
            btnM.disabled = false;
            btnM.innerHTML = orgText;
        }
    }
};

// Force Attach Listener
const attachAiMandala = () => {
    const btn = document.getElementById('btn-ai-mandala');
    if (btn) {
        // Clone to remove all previous listeners (including broken ones)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', startAiMandalaLogic);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAiMandala);
} else {
    attachAiMandala();
}
