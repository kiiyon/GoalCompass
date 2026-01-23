
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('App initialized');
        // --- Init Helpers ---
        initRestButtons();
        // Initialize Sliders
        initSliders();
        // Initialize Chip Editing (add/delete)
        initChipEditing();
        // Initialize Star Rating UI
        initStarRating();
        // --- State Management ---

        const STORAGE_KEY = 'harada_method_app_data_v1';

        let appState = {
            goal: '',
            deadline: '',
            fourViews: {
                selfTangible: '',
                selfIntangible: '',
                societyTangible: '',
                societyIntangible: ''
            },
            milestones: { // New
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
                console.log('User Profile Clicked');

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
                if (configCustomPrompt) configCustomPrompt.value = config.customPrompt || '';

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
                appState.kpis = [{ name: '', current: '', target: '', unit: '', history: [] }];
            }

            appState.kpis.forEach((kpi, index) => {
                const element = createKpiElement(index, kpi);
                kpiContainer.appendChild(element);
            });
        }

        function addKpi() {
            if (!appState.kpis) appState.kpis = [];
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
            title: document.getElementById('journal-title'), // Keeping for AI even if hidden
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

        // --- To-Do Default List ---

        // --- Interactive To-Do List (Checkboxes) ---
        const todoContainer = document.getElementById('todo-ui-container');
        const todoTextarea = document.getElementById('journal-todo');

        window.initTodoUI = function () {
            if (!todoContainer || !todoTextarea) return;

            // Parse existing text
            const raw = todoTextarea.value || '';
            const lines = raw.split('\n').filter(l => l.trim() !== '');
            let items = [];

            if (lines.length > 0) {
                items = lines.map(line => {
                    const checked = line.includes('[x]');
                    // Clean text: remove marks and leading numbers
                    let text = line.replace(/\[[x ]\]/g, '').trim();
                    text = text.replace(/^\d+\.\s*/, '');
                    return { checked, text };
                });
            }

            // Ensure minimum 3 items
            while (items.length < 3) {
                items.push({ checked: false, text: '' });
            }

            renderTodoUI(items);
        };

        function renderTodoUI(items) {
            todoContainer.innerHTML = '';
            items.forEach((item, index) => {
                const row = document.createElement('div');
                row.className = 'todo-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'todo-checkbox';
                checkbox.checked = item.checked;
                checkbox.addEventListener('change', syncTodoToTextarea);

                const inputContainer = document.createElement('div');
                inputContainer.className = 'todo-input-container';

                const number = document.createElement('span');
                number.className = 'todo-number';
                number.innerText = `${index + 1}.`;

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'todo-input';
                input.value = item.text;
                input.addEventListener('input', syncTodoToTextarea);
                // Enter key adds new item
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const currentItems = collectTodoItems();
                        currentItems.splice(index + 1, 0, { checked: false, text: '' });
                        renderTodoUI(currentItems);
                        // Focus next input
                        setTimeout(() => {
                            const inputs = todoContainer.querySelectorAll('.todo-input');
                            if (inputs[index + 1]) inputs[index + 1].focus();
                        }, 10);
                        syncTodoToTextarea();
                    }
                    // Backspace on empty deletes item (if count > 3)
                    if (e.key === 'Backspace' && input.value === '' && items.length > 3) {
                        e.preventDefault();
                        const currentItems = collectTodoItems();
                        currentItems.splice(index, 1);
                        renderTodoUI(currentItems);
                        setTimeout(() => {
                            const inputs = todoContainer.querySelectorAll('.todo-input');
                            // Focus previous
                            if (inputs[index - 1]) inputs[index - 1].focus();
                        }, 10);
                        syncTodoToTextarea();
                    }
                });

                inputContainer.appendChild(number);
                inputContainer.appendChild(input);

                // Delete Button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'todo-delete-btn';
                deleteBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
                deleteBtn.title = '削除';
                deleteBtn.onclick = () => {
                    const currentItems = collectTodoItems();
                    if (currentItems.length <= 1) {
                        // Optional: prevent deleting the last item or clear it instead
                        currentItems[index].text = '';
                        currentItems[index].checked = false;
                    } else {
                        currentItems.splice(index, 1);
                    }
                    renderTodoUI(currentItems);
                    syncTodoToTextarea();
                };

                row.appendChild(checkbox);
                row.appendChild(inputContainer);
                row.appendChild(deleteBtn);
                todoContainer.appendChild(row);
            });

            // Add Item Button
            const addBtn = document.createElement('button');
            addBtn.className = 'todo-btn-add';
            addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> タスクを追加';
            addBtn.onclick = () => {
                const currentItems = collectTodoItems();
                currentItems.push({ checked: false, text: '' });
                renderTodoUI(currentItems);
                // Focus new
                setTimeout(() => {
                    const inputs = todoContainer.querySelectorAll('.todo-input');
                    if (inputs[inputs.length - 1]) inputs[inputs.length - 1].focus();
                }, 10);
                syncTodoToTextarea();
            };
            todoContainer.appendChild(addBtn);
        }

        function collectTodoItems() {
            const items = [];
            todoContainer.querySelectorAll('.todo-item').forEach(row => {
                items.push({
                    checked: row.querySelector('.todo-checkbox').checked,
                    text: row.querySelector('.todo-input').value
                });
            });
            return items;
        }

        function syncTodoToTextarea() {
            const items = collectTodoItems();
            const text = items.map((item, idx) => {
                const mark = item.checked ? '[x]' : '[ ]';
                // Save format: "[ ] 1. Task Name"
                return `${mark} ${idx + 1}. ${item.text}`;
            }).join('\n');
            todoTextarea.value = text;
        }

        // Init on load
        if (todoContainer) {
            // Wait briefly for textarea to be potentially populated if coming from legacy
            setTimeout(window.initTodoUI, 100);
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

        // --- LOAD DATA LOGIC ---
        const loadDiaryData = (dateStr) => {
            currentJournalDate = new Date(dateStr);
            console.log('Loading data for:', dateStr);
            const log = appState.logs[dateStr] || {};

            // Journal
            if (journalElements.title) journalElements.title.value = log.title || '';
            if (journalElements.tags) journalElements.tags.value = log.tags || '';
            if (journalElements.content) journalElements.content.value = log.content || '';
            if (journalElements.declaration) journalElements.declaration.value = log.declaration || '';
            if (journalElements.calendar) journalElements.calendar.value = log.calendar || '';
            if (journalElements.todo) journalElements.todo.value = log.tasks || '';
            if (journalElements.activity) journalElements.activity.value = log.activity || '';
            if (journalElements.redo) journalElements.redo.value = log.redo || '';
            if (journalElements.confidence) journalElements.confidence.value = log.confidence || '';

            // Refresh Todo UI
            if (window.initTodoUI) window.initTodoUI();

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

            // Habits
            const h = habitElements;
            const sh = log.habits || {};

            // Sleep
            const isSleepRest = sh.wakeup === 'お休み';
            setRestMode('sleep', isSleepRest);
            if (!isSleepRest) {
                if (h.wakeup && window.refreshModernTimePicker) window.refreshModernTimePicker('habit-wakeup', sh.wakeup || '');
                if (h.bedtime && window.refreshModernTimePicker) window.refreshModernTimePicker('habit-bedtime', sh.bedtime || '');
            }

            // English
            const isEnglishRest = sh.englishContent === 'お休み';
            setRestMode('english', isEnglishRest);

            setupChipUI(h.englishContentId, isEnglishRest ? null : sh.englishContent, updateEnglishDetails);

            let englishDetailData = {};
            if (!isEnglishRest && sh.englishDetail) {
                sh.englishDetail.split('\n').forEach(line => {
                    const match = line.match(/^(.+?): (\d+分)(?: - (.*))?$/);
                    if (match) {
                        englishDetailData[match[1]] = { time: match[2], note: match[3] || '' };
                    }
                });
            }
            updateEnglishDetails(englishDetailData);

            const englishMemo = document.getElementById('habit-english-memo');
            if (englishMemo) englishMemo.value = (!isEnglishRest && sh.englishMemo) ? sh.englishMemo : '';

            // Muscle
            const isMuscleRest = sh.muscleMenu === 'お休み';
            setRestMode('muscle', isMuscleRest);

            let muscleDataText = (!isMuscleRest && sh.muscleDetail) ? sh.muscleDetail : '';
            let memoText = '';
            if (muscleDataText.includes('--- メモ ---')) {
                const parts = muscleDataText.split('--- メモ ---');
                muscleDataText = parts[0].trim();
                memoText = parts[1].trim();
            } else if (!muscleDataText.includes(':') && muscleDataText.length > 0) {
                memoText = muscleDataText;
                muscleDataText = '';
            }
            const initialMuscleData = {};
            muscleDataText.split('\n').forEach(line => {
                const p = line.split(':');
                if (p.length >= 2) {
                    const vals = p[1].trim().split(' ');
                    initialMuscleData[p[0].trim()] = { w: vals[0], s: vals[1] || '3set' };
                }
            });
            setupChipUI(h.muscleMenuId, isMuscleRest ? null : sh.muscleMenu, () => updateMuscleDetails(null));
            updateMuscleDetails(initialMuscleData);

            if (h.muscleDetail) h.muscleDetail.value = memoText;

            // Jogging
            const isJogRest = sh.joggingDist === 'お休み';
            setRestMode('jogging', isJogRest);
            if (!isJogRest) {
                if (h.joggingDist) {
                    h.joggingDist.value = sh.joggingDist || '0';
                    updateSliderDisplay(h.joggingDist);
                }
                if (h.joggingTime) {
                    h.joggingTime.value = sh.joggingTime || '0';
                    updateSliderDisplay(h.joggingTime);
                }
            } else {
                if (h.joggingDist) {
                    h.joggingDist.value = '0';
                    updateSliderDisplay(h.joggingDist);
                }
                if (h.joggingTime) {
                    h.joggingTime.value = '0';
                    updateSliderDisplay(h.joggingTime);
                }
            }

            // Social
            const isSocialRest = sh.socialMenu === 'お休み';
            setRestMode('social', isSocialRest);
            setupChipUI(h.socialMenuId, isSocialRest ? null : sh.socialMenu);

            // Mental Care
            const isMentalRest = sh.mental === 'お休み';
            setRestMode('mental', isMentalRest);
            setupChipUI(h.mentalMenuId, isMentalRest ? null : sh.mentalMenu);

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

                        if (res.tasks && res.tasks.length > 0) {
                            const t = journalElements.todo ? journalElements.todo.value : '';
                            if (journalElements.todo) journalElements.todo.value = (t ? t + '\n' : '') + res.tasks.join('\n');
                            hasData = true;
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
                    habitItems.push(`[睡眠] お休み`);
                } else if (h.wakeup || h.bedtime) {
                    habitItems.push(`[睡眠] 起床:${h.wakeup || '-'} / 就寝:${h.bedtime || '-'}`);
                }

                if (h.englishContent) habitItems.push(formatHabit('英語', h.englishContent, h.englishDetail ? '\n' + h.englishDetail : ''));
                if (h.muscleMenu) habitItems.push(formatHabit('筋トレ', h.muscleMenu, h.muscleDetail ? '\n' + h.muscleDetail : ''));
                if (h.joggingDist) {
                    if (h.joggingDist === 'お休み') habitItems.push(`[Jog] お休み`);
                    else habitItems.push(`[Jog] ${h.joggingDist}km (${h.joggingTime || '-'}分)`);
                }
                if (h.stretchCheck) habitItems.push(formatHabit('ストレッチ', h.stretchCheck));
                if (h.socialMenu) habitItems.push(formatHabit('発信', h.socialMenu));

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
                    tags: journalElements.tags ? journalElements.tags.value : '',
                    content: journalElements.content.value,
                    declaration: journalElements.declaration ? journalElements.declaration.value : '',
                    calendar: journalElements.calendar ? journalElements.calendar.value : '',
                    tasks: journalElements.todo ? journalElements.todo.value : '',
                    activity: journalElements.activity ? journalElements.activity.value : '',
                    redo: journalElements.redo ? journalElements.redo.value : '',
                    confidence: journalElements.confidence ? journalElements.confidence.value : '',
                    routine: fullRoutineLog,
                    scores: scoresJson
                };

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

            init: function () {
                this.setupTabs();
                this.setupRefresh();
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
                const dateKeys = [];

                for (let i = 13; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateStr = this.formatDateShort(d);
                    const dayOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
                    headerDates.push({ date: dateStr, day: dayOfWeek });
                    dateKeys.push(dateStr);
                }

                // Habits Definition
                const habits = [
                    { id: 'muscle', name: '筋トレ', key: '[筋トレ]' },
                    { id: 'english', name: '英会話/学習', key: ['[英語]', '[English]'] },
                    { id: 'note', name: '発信活動', key: ['[Note]', '[発信]', 'note'] },
                    { id: 'early', name: '早寝早起き', key: '[睡眠]' },
                    { id: 'jog', name: 'ジョギング', key: '[Jog]' },
                    { id: 'mental', name: 'メンタルケア', key: ['[ストレッチ]', '[メンタル]', 'nap', 'meditation'] }
                ];

                // Build Table HTML
                let html = '<div class="matrix-wrapper"><table class="habit-matrix-table"><thead><tr><th class="habit-col">Habit</th>';
                headerDates.forEach(h => {
                    html += `<th><div class="th-date">${h.date}</div><div class="th-day">${h.day}</div></th>`;
                });
                html += '</tr></thead><tbody>';

                habits.forEach(habit => {
                    html += `<tr><td class="habit-col">${habit.name}</td>`;

                    dateKeys.forEach(dateStr => {
                        const log = this.findLogByDate(dateStr);

                        let cellContent = '<i class="fa-regular fa-circle matrix-cell miss"></i>';

                        if (log) {
                            const routineText = (log.routine || '').toString();
                            if (routineText.includes('お休み')) {
                                cellContent = '<i class="fa-solid fa-moon matrix-cell rest"></i>';
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
                        html += `<td>${cellContent}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';

                container.innerHTML = html;
            },

            findLogByDate: function (shortDate) {
                // shortDate "1/23". log.date "2026-01-23T..." or "2026-01-23"
                // Match M/D
                return this.data.find(d => {
                    if (!d.date) return false;
                    const dObj = new Date(d.date);
                    const md = `${dObj.getMonth() + 1}/${dObj.getDate()}`;
                    return md === shortDate;
                });
            },

            formatDateShort: function (dateObj) {
                return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            },

            // --- 2. Radar Chart ---
            // --- 2. Chart Rendering ---
            renderRadar: function () {
                const ctx = document.getElementById('radarChart');
                if (!ctx) return;

                const last7 = this.data.slice(-7);
                let sums = { heart: 0, skill: 0, body: 0, life: 0, count: 0 };

                last7.forEach(log => {
                    if (log.scores) {
                        try {
                            let s = log.scores;
                            if (typeof s === 'string') {
                                try { s = JSON.parse(s); } catch (ex) { }
                            }
                            sums.heart += parseInt(s.heart || 0);
                            sums.skill += parseInt(s.skill || 0);
                            sums.body += parseInt(s.body || 0);
                            sums.life += parseInt(s.life || 0);
                            sums.count++;
                        } catch (e) { }
                    }
                });

                const avg = (val) => sums.count > 0 ? (val / sums.count).toFixed(1) : 0;
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
                            padding: 30
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
                    { id: 'jog', name: 'ジョギング', key: '[Jog]', icon: 'fa-person-running' },
                    { id: 'daily', name: '日誌記入', key: null, icon: 'fa-pen-nib' }
                ];

                let html = '';
                const reversedData = [...this.data].reverse();

                habits.forEach(h => {
                    // Helper to check if a specific log counts as done for this habit
                    const checkIsDone = (log) => {
                        if (!log) return false;
                        const routineText = (log.routine || '').toString();
                        if (h.key === null) return !!log.date;

                        const keys = Array.isArray(h.key) ? h.key : [h.key];
                        for (const k of keys) {
                            if (routineText.includes(k) && !routineText.includes('お休み')) {
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

                    const isFire = streak > 0;
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
                            <div class="streak-number">${streak}</div>
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

    } catch (e) {
        console.error('Fatal Init Error:', e);
        alert('起動エラー: ' + e.message);
    }
});
