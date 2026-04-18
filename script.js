document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let timerInterval = null;
    let waveInterval = null;
    const siren = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c352709292.mp3');
    const synth = window.speechSynthesis;

    // --- Resources State ---
    let adminResources = [
        { id: 'amb', name: 'Ambulances', total: 50, used: 12, color: '#3b82f6' },
        { id: 'rescue', name: 'Rescue Teams', total: 20, used: 4, color: '#22c55e' },
        { id: 'food', name: 'Food Supplies', total: 5000, used: 800, color: '#facc15' },
        { id: 'med', name: 'Medical Kits', total: 1000, used: 150, color: '#ef4444' }
    ];

    // --- DOM Elements ---
    const startBtn = document.getElementById('start-sim');
    const findRouteBtn = document.getElementById('find-route');
    const reportShelterBtn = document.getElementById('report-shelter');
    const alertBanner = document.getElementById('alert-banner');
    const alertModal = document.getElementById('alert-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const liveWave = document.getElementById('live-wave');
    const liveImpact = document.getElementById('live-impact');
    const impactTimerDisplay = document.getElementById('impact-timer');
    const clockDisplay = document.getElementById('clock');
    const notifList = document.getElementById('notif-list');
    const toastContainer = document.getElementById('toast-container');
    const bestShelterPanel = document.getElementById('best-shelter-info');
    const routeInfo = document.getElementById('route-info');
    const markSafeBtn = document.getElementById('mark-safe');
    const safeUsersList = document.getElementById('safe-users-list');
    const trackFamilyBtn = document.getElementById('track-family');
    const familyNameInput = document.getElementById('family-name');
    const familyStatus = document.getElementById('family-status');
    const alertContactsBtn = document.getElementById('alert-contacts');
    const connectivityBadge = document.getElementById('connectivity-badge');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    
    // --- Overlays ---
    const toggleAnalyticsBtn = document.getElementById('toggle-analytics');
    const closeAnalyticsBtn = document.getElementById('close-analytics');
    const analyticsOverlay = document.getElementById('analytics-overlay');
    const togglePrepBtn = document.getElementById('toggle-preparedness');
    const closePrepBtn = document.getElementById('close-preparedness');
    const prepOverlay = document.getElementById('preparedness-overlay');
    const toggleAdminBtn = document.getElementById('toggle-admin');
    const closeAdminBtn = document.getElementById('close-admin');
    const adminOverlay = document.getElementById('admin-overlay');

    // --- Admin Elements ---
    const adminNavItems = document.querySelectorAll('.nav-menu .nav-item');
    const adminViews = document.querySelectorAll('.nav-menu .nav-item'); // Simplified for sidebar
    const resourceGrid = document.getElementById('admin-resource-grid');
    const btnTriggerAlert = document.getElementById('btn-trigger-manual');
    const activeAlertsVal = document.getElementById('admin-active-alerts');
    const evacPctVal = document.getElementById('admin-evac-pct');
    const riskCountVal = document.getElementById('admin-risk-count');

    // --- Preparedness Elements ---
    const familyForm = document.getElementById('family-form');
    const familySummary = document.getElementById('family-summary');
    const planText = document.getElementById('plan-text');
    const prepProgress = document.getElementById('prep-progress');
    const prepStatus = document.getElementById('prep-status');
    const checklistItems = document.querySelectorAll('#survival-kit input');
    const fetchOceanBtn = document.getElementById('fetch-ocean-data');
    const anomalyStatus = document.getElementById('anomaly-status');
    const anomalyBadge = document.getElementById('anomaly-badge');
    const tidePhase = document.getElementById('tide-phase');

    // --- Configuration ---
    let map;
    let oceanChart = null;
    let riskZones = { red: [], yellow: [] };
    let activeRoutes = [];
    let shelterMarkers = [];
    let familyMarker = null;
    const chennaiCoords = [13.0475, 80.2824];
    const userLocation = [13.045, 80.278];

    let shelters = [
        { id: 1, name: "Marina High School", coords: [13.055, 80.230], capacity: 500, occupancy: 120, facilities: { medical: true, food: true, access: true } },
        { id: 2, name: "Mylapore Community Center", coords: [13.015, 80.235], capacity: 300, occupancy: 245, facilities: { medical: false, food: true, access: true } },
        { id: 3, name: "Besant Nagar Shelter", coords: [12.990, 80.240], capacity: 400, occupancy: 395, facilities: { medical: true, food: true, access: false } }
    ];

    // --- Initialization ---

    function init() {
        initMap();
        updateClock();
        setInterval(updateClock, 1000);
        loadPreparednessData();
        renderAdminResources();
        updateAdminStats();
        handleConnectivity();
        fetchOceanData();
        calculateRiskIndex();
        calculateTidePredictions();
        loadLocalCrisisData();
        window.addEventListener('online', handleConnectivity);
        window.addEventListener('offline', handleConnectivity);
        handleConnectivity(); // Run once at start
        document.getElementById('simulate-quake')?.addEventListener('click', simulateEarthquake);
        document.querySelectorAll('.card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
        showToast("System Secured", "info");
        setupNavigation();
        setupMobileMenu();
        startDashboardSimulation();
        initMiniChart();
    }

    function setupMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        
        menuBtn?.addEventListener('click', () => {
            sidebar?.classList.toggle('active');
        });
    }

    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-menu .nav-item');
        const sections = document.querySelectorAll('.page-section');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetSection = item.dataset.section;
                if (!targetSection) return;

                // Toggle Item UI
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Toggle Section UI
                sections.forEach(s => s.classList.remove('active'));
                const activeSec = document.getElementById(targetSection);
                if (activeSec) {
                    activeSec.classList.add('active');
                    // Mobile Cleanup: Close sidebar after click
                    if (window.innerWidth <= 1024) {
                        document.querySelector('.sidebar')?.classList.remove('active');
                    }
                    // Special Handling for Map
                    if ((targetSection === 'dashboard' || targetSection === 'risk-map') && map) {
                        setTimeout(() => map.invalidateSize(), 100);
                    }
                    // Handle Charts if Analytics
                    if (targetSection === 'analytics') {
                        setTimeout(initAnalytics, 100);
                    }
                }
            });
        });
    }

    // --- Accessibility: Voice Systems ---

    function speakAlert(message) {
        if (!synth) return;
        synth.cancel(); // Stop any current speech
        const utter = new SpeechSynthesisUtterance(message);
        utter.rate = 0.9;
        utter.pitch = 1;
        synth.speak(utter);
    }

    function handleConnectivity() {
        if (navigator.onLine) {
            statusText.innerText = "Status: Online";
            statusDot.className = "status-dot green";
            connectivityBadge?.classList.add('hidden');
            showToast("System Online", "info");
        } else {
            statusText.innerText = "Status: Offline (Cached)";
            statusDot.className = "status-dot yellow";
            connectivityBadge?.classList.remove('hidden');
            showToast("Running in Offline Mode", "warning");
        }
    }

    function initMap() {
        try {
            // Chennai Center: 13.0827, 80.2707 | Zoom: 11
            map = L.map('map', { zoomControl: false, attributionControl: false }).setView([13.0827, 80.2707], 11);
            window.map = map;
            
            // High-Contrast Dark Matter Tiles
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

            // 1. User Location (Command Center)
            const userIcon = L.divIcon({ className: 'user-marker-pulse', iconSize: [12, 12] });
            L.marker([13.0475, 80.2707], { icon: userIcon }).addTo(map).bindPopup("<b>Command Center (You)</b>").openPopup();

            // 2. Coastal Surveillance Marker
            const coastalIcon = L.divIcon({ className: 'coastal-marker', html: '<i data-lucide="waves" color="#3b82f6"></i>' });
            L.marker([13.11, 80.30], { icon: coastalIcon }).addTo(map).bindPopup("<b>Primary Coastal Sector</b><br>Tide Sensor Active");

            // 3. Risk Zones (Vulnerability Envelopes)
            L.circle([13.05, 80.28], {
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.35,
                radius: 3500
            }).addTo(map).bindPopup("<b>Critical Risk Zone A</b><br>Immediate Surge Vulnerability");

            L.circle([13.15, 80.31], {
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.2,
                radius: 4000
            }).addTo(map).bindPopup("<b>Moderate Risk Zone B</b><br>Secondary Inundation Risk");

            // 4. Safe Zone (Inland)
            L.circle([13.08, 80.20], {
                color: '#22c55e',
                fillColor: '#22c55e',
                fillOpacity: 0.2,
                radius: 3000
            }).addTo(map).bindPopup("<b>Primary Safe Zone</b><br>Evacuation Hub Alpha");

            // Load Existing Assets
            createRiskZones();
            loadShelters();
            recommendBestShelter();
            lucide.createIcons();
            
            // Sync Map Size
            setTimeout(() => map.invalidateSize(), 500);
        } catch (e) {
            console.log("Map loading deferred: Offline session detected.", e);
        }
    }

    function createRiskZones() {
        const redCoords = [[13.055, 80.280], [13.030, 80.272], [13.010, 80.270], [13.010, 80.285], [13.055, 80.295]];
        riskZones.red.push(L.polygon(redCoords, { color: '#ff3b3b', fillOpacity: 0.3, weight: 2 }).addTo(map));
        const yellowCoords = [[13.065, 80.260], [13.040, 80.255], [13.010, 80.255], [13.010, 80.270], [13.065, 80.280]];
        riskZones.yellow.push(L.polygon(yellowCoords, { color: '#facc15', fillOpacity: 0.1, weight: 1 }).addTo(map));
    }

    // --- Admin Control Room Logic ---

    function triggerManualAlert() {
        const level = document.getElementById('manual-alert-level').value;
        const height = document.getElementById('manual-wave-height').value || 5;
        const impact = document.getElementById('manual-time-impact').value || 20;

        if (liveWave) liveWave.innerText = `${height}m`;
        if (liveImpact) liveImpact.innerText = `${impact} mins`;

        // Update Alert Modal Data
        const modalWave = document.getElementById('modal-wave');
        const modalImpact = document.getElementById('modal-impact');
        if (modalWave) modalWave.innerText = `${height}m`;
        if (modalImpact) modalImpact.innerText = `${impact} mins`;

        // Update Dashboard Stats
        const evacTimeVal = document.getElementById('evac-time');
        if (evacTimeVal) evacTimeVal.innerText = `${impact} mins`;
        
        if (level === 'RED') {
            alertBanner.className = "alert-banner critical blink";
            alertBanner.innerText = "🚨 🔴 CRITICAL: NATIONAL EMERGENCY DECLARED";
            alertModal.classList.add('show');
            siren.play().catch(()=>{});
            animateWave();
            speakAlert("Emergency Warning. A critical tsunami threat has been detected. Please evacuate to the nearest safe zone immediately.");
            showToast("RED LEVEL ALERT TRIGGERED", "critical");
        } else if (level === 'YELLOW') {
            alertBanner.className = "alert-banner warning";
            alertBanner.innerText = "⚠️ YELLOW: COASTAL WARNING ISSUED";
            speakAlert("System Warning. A coastal advisory has been issued. Stay tuned for further instructions.");
            showToast("YELLOW LEVEL ALERT TRIGGERED", "warning");
        } else {
            alertBanner.className = "alert-banner safe";
            alertBanner.innerText = "System Status: SAFE";
            speakAlert("System Status: Safe. All threats have cleared.");
            showToast("SYSTEM RETURNED TO GREEN", "info");
        }
        updateAdminStats();
    }

    function renderAdminResources() {
        resourceGrid.innerHTML = adminResources.map(r => {
            const pct = (r.used / r.total) * 100;
            return `
                <div class="res-card">
                    <div class="res-header">
                        <strong>${r.name}</strong>
                        <span>${r.used} / ${r.total}</span>
                    </div>
                    <div class="res-meter"><div class="res-fill" style="width: ${pct}%; background: ${r.color};"></div></div>
                    <div class="res-controls">
                        <button class="btn-icon" onclick="updateResource('${r.id}', -1)"><i data-lucide="minus"></i></button>
                        <button class="btn-icon" onclick="updateResource('${r.id}', 1)"><i data-lucide="plus"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    window.updateResource = function(id, delta) {
        const r = adminResources.find(res => res.id === id);
        if (r) {
            r.used = Math.max(0, Math.min(r.total, r.used + delta));
            renderAdminResources();
        }
    };

    function updateAdminStats() {
        const level = document.getElementById('manual-alert-level')?.value;
        activeAlertsVal.innerText = level === 'RED' ? "1" : "0";
        evacPctVal.innerText = level === 'RED' ? "64%" : "0%";
        riskCountVal.innerText = level === 'RED' ? "14,205" : "0";
        document.getElementById('admin-report-text').innerText = level === 'RED' 
            ? "CRITICAL: Evacuation speed is 12% faster than baseline. Resource deployment in progress." 
            : "Stationary. No active threats detected.";
    }

    function initAdminCharts() {
        const sCtx = document.getElementById('adminShelterChart').getContext('2d');
        const pCtx = document.getElementById('adminPerformanceChart').getContext('2d');

        new Chart(sCtx, { 
            type: 'doughnut', 
            data: { 
                labels: ['Available', 'In-Use', 'Critical'], 
                datasets: [{ data: [65, 25, 10], backgroundColor: ['#22c55e', '#3b82f6', '#ef4444'], borderWidth: 0 }] 
            }, 
            options: { cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } } 
        });

        new Chart(pCtx, {
            type: 'line',
            data: {
                labels: ['01:00', '02:00', '03:00', '04:00', '05:00'],
                datasets: [{ label: 'Evac Success Rate (%)', data: [0, 45, 78, 92, 95], borderColor: '#3b82f6', tension: 0.4 }]
            },
            options: { scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } } }
        });
    }

    // --- Oceanic Monitoring Hub Logic ---

    async function fetchOceanData() {
        try {
            const response = await fetch('http://localhost:5000/api/sea-level');
            const result = await response.json();
            renderOceanChart(result.data);
            detectOceanAnomalies(result.data);
            showToast("Ocean Data Synced", "info");
        } catch (error) {
            console.error("Ocean API fail (Static Fallback active):", error);
            const mock = Array.from({length: 24}, (_, i) => ({ t: `${i}:00`, v: 0.5 + Math.random() * 0.5 }));
            renderOceanChart(mock);
        }
    }

    function renderOceanChart(data) {
        const ctx = document.getElementById('tideChart').getContext('2d');
        if (oceanChart) oceanChart.destroy();
        
        oceanChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.t.split(' ')[1] || d.t),
                datasets: [{
                    label: 'Sea Level (m)',
                    data: data.map(d => d.v),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } }
                }
            }
        });
    }

    function detectOceanAnomalies(data) {
        const maxLevel = Math.max(...data.map(d => d.v));
        const latest = data[data.length - 1].v;
        
        if (tidePhase) tidePhase.innerText = latest > 0.8 ? "High Tide" : "Low Tide";
        const hudTide = document.getElementById('hud-tide-val');
        if (hudTide) hudTide.innerText = `${latest.toFixed(1)}m`;
        if (liveWave) liveWave.innerText = `${latest.toFixed(1)}m`;

        const sidebarNext = document.getElementById('sidebar-next-tide');
        if (sidebarNext && !sidebarNext.innerText.includes(':')) {
             calculateTidePredictions();
        }

        if (maxLevel > 2.0) {
            if (anomalyStatus) anomalyStatus.innerText = "CRITICAL SURGE";
            if (anomalyBadge) anomalyBadge.classList.add('warning');
            speakAlert("Warning: Abnormal sea level rise detected at primary station. Assessing risk zones.");
            showToast("ABNORMAL SEA LEVEL RISE", "critical");
            // Auto-trigger yellow alert if surge is extreme
            const alertSelect = document.getElementById('manual-alert-level');
            if (alertSelect) {
                alertSelect.value = "YELLOW";
                triggerManualAlert();
            }
        } else {
            if (anomalyStatus) anomalyStatus.innerText = "Stable";
            if (anomalyBadge) anomalyBadge.classList.remove('warning');
        }
    }

    // --- AI Risk Intelligence Logic ---

    function calculateRiskIndex() {
        const mag = parseFloat(document.getElementById('risk-mag').value) || 0;
        const dist = parseFloat(document.getElementById('risk-dist').value) || 1;
        const tide = parseFloat(document.getElementById('risk-tide').value) || 0;
        const scoreVal = document.getElementById('risk-score-value');
        const gaugeFill = document.getElementById('risk-gauge-fill');
        const badge = document.getElementById('risk-level-badge');

        // Formula: Weighted risk based on energy (mag^2), decay over distance, and tidal multiplier
        let score = (Math.pow(mag, 2.5) / (dist * 0.1)) + (tide * 3);
        score = Math.min(100, Math.max(0, score)).toFixed(1);

        scoreVal.innerText = score;
        const deg = (score / 100) * 360;
        
        // Color Determination
        let color = '#3b82f6';
        let level = 'STABLE';
        let cls = 'low';

        if (score > 40) {
            color = '#ef4444';
            level = 'CRITICAL';
            cls = 'high';
        } else if (score > 15) {
            color = '#facc15';
            level = 'ELEVATED';
            cls = 'medium';
        }

        gaugeFill.style.background = `conic-gradient(${color} ${deg}deg, transparent ${deg}deg)`;
        badge.innerText = `LEVEL: ${level}`;
        badge.className = `risk-status-pill ${cls}`;
        
        if (cls === 'high') {
            showToast("Risk Index: CRITICAL", "critical");
            speakAlert("Warning. AI Risk Assessment has reached critical levels. Total coastal vulnerability detected.");
        }
    }

    // --- Seismic Monitoring Logic ---

    function simulateEarthquake() {
        // Simulated Data
        const quakes = [
            { loc: "Shelf Sector B (Offshore)", mag: 7.8, depth: 15, dist: 45, coords: [13.0475, 80.45] },
            { loc: "Eastern Fault Line", mag: 5.2, depth: 120, dist: 200, coords: [13.5, 81.0] },
            { loc: "Subduction Zone A", mag: 8.4, depth: 10, dist: 30, coords: [13.0, 80.8] },
            { loc: "Inland Plate Boundary", mag: 4.5, depth: 40, dist: 150, coords: [12.8, 79.5] }
        ];
        
        const event = quakes[Math.floor(Math.random() * quakes.length)];
        
        // Update UI
        document.getElementById('quake-mag-val').innerText = event.mag;
        document.getElementById('quake-loc').innerText = event.loc;
        document.getElementById('quake-depth').innerText = event.depth;
        document.getElementById('quake-dist').innerText = event.dist;
        document.getElementById('quake-mag-val').classList.add('active');
        
        const triggerBadge = document.getElementById('trigger-status-badge');
        
        // Epicenter on Map
        const epicenter = L.circle(event.coords, {
            radius: 2000,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.5,
            className: 'pulsing-epicenter'
        }).addTo(map);
        map.setView(event.coords, 9);
        
        // Auto-Trigger Logic
        if (event.mag > 6.5 && event.depth < 70) {
            triggerBadge.classList.add('active');
            triggerBadge.querySelector('span').innerText = "TSUNAMI TRIGGERED";
            showToast("UNDERWATER QUAKE DETECTED: TRIGGERING ALERTS", "critical");
            speakAlert(`Seismic alert. A magnitude ${event.mag} earthquake has been detected at depth ${event.depth} kilometers near the coast. Automated tsunami protocols are now active.`);
            
            // Set Admin panel then trigger
            const alertSelect = document.getElementById('manual-alert-level');
            const hInput = document.getElementById('manual-wave-height');
            if (alertSelect) alertSelect.value = "RED";
            if (hInput) hInput.value = (event.mag - 4) * 2; // Logic for height
            
            setTimeout(() => {
                triggerManualAlert();
            }, 1000);
        } else {
            triggerBadge.classList.remove('active');
            triggerBadge.querySelector('span').innerText = "NO TSUNAMI THREAT";
            showToast("Seismic event detected. No immediate threat.", "info");
        }
        
        setTimeout(() => epicenter.remove(), 10000);
    }

    // --- Preparedness Module Logic ---

    function updateChecklistProgress() {
        const checked = Array.from(checklistItems).filter(i => i.checked).length;
        const total = checklistItems.length;
        const percent = (checked / total) * 100;
        prepProgress.style.width = `${percent}%`;
        prepStatus.innerText = `${checked}/${total} items ready`;
        
        const checklistData = Array.from(checklistItems).map(i => ({ item: i.dataset.item, checked: i.checked }));
        localStorage.setItem('tsunami_checklist', JSON.stringify(checklistData));
    }

    function saveFamilyPlan(e) {
        e.preventDefault();
        const formData = new FormData(familyForm);
        const plan = {
            names: formData.get('names'),
            meeting: formData.get('meeting'),
            emergency: formData.get('emergency')
        };
        localStorage.setItem('tsunami_family_plan', JSON.stringify(plan));
        renderFamilyPlan(plan);
        showToast("Family Plan Saved", "info");
    }

    function renderFamilyPlan(plan) {
        if (!plan.names) return;
        familySummary.classList.remove('hidden');
        planText.innerHTML = `<strong>Members:</strong> ${plan.names}<br><strong>Meeting:</strong> ${plan.meeting}<br><strong>Contact:</strong> ${plan.emergency}`;
    }

    function loadPreparednessData() {
        const savedChecklist = JSON.parse(localStorage.getItem('tsunami_checklist'));
        if (savedChecklist) {
            savedChecklist.forEach(itemData => {
                const checkbox = Array.from(checklistItems).find(i => i.dataset.item === itemData.item);
                if (checkbox) checkbox.checked = itemData.checked;
            });
            updateChecklistProgress();
        }

        const savedPlan = JSON.parse(localStorage.getItem('tsunami_family_plan'));
        if (savedPlan) renderFamilyPlan(savedPlan);
    }

    // --- Analytics Hub ---

    function initAnalytics() {
        const hCtx = document.getElementById('historyChart').getContext('2d');
        const sCtx = document.getElementById('seasonalChart').getContext('2d');
        const pCtx = document.getElementById('predictionChart').getContext('2d');

        new Chart(hCtx, { type: 'line', data: { labels: ['2000', '2005', '2010', '2015', '2020'], datasets: [{ label: 'Events', data: [5, 12, 8, 15, 10], borderColor: '#3b82f6', tension: 0.4 }] } });
        new Chart(sCtx, { type: 'bar', data: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [{ label: 'Risk', data: [20, 40, 60, 90], backgroundColor: '#ff3b3b' }] } });
        renderTideAnalyticsChart();
        renderCorrelationChart();
        calculateTidePredictions();
    }

    function renderTideAnalyticsChart() {
        const ctx = document.getElementById('tideAnalyticsChart')?.getContext('2d');
        if (!ctx) return;
        
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        const tideData = hours.map((_, i) => Math.sin((i / 12) * Math.PI * 2) * 1.5 + 2);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Predicted Tide Level (m)',
                    data: tideData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#fff' } },
                    x: { grid: { display: false }, ticks: { color: '#fff', font: { size: 10 } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderCorrelationChart() {
        const ctx = document.getElementById('correlationChart')?.getContext('2d');
        if (!ctx) return;

        const data = [
            { x: 0.2, y: 1.2 }, { x: 0.5, y: 1.8 }, { x: 0.8, y: 2.5 },
            { x: 1.2, y: 3.4 }, { x: 1.5, y: 4.8 }, { x: 1.8, y: 6.2 },
            { x: 2.1, y: 8.5 }, { x: 2.4, y: 11.2 }, { x: 2.8, y: 14.5 }
        ];

        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Past Events',
                    data: data,
                    backgroundColor: data.map(d => d.x > 1.5 ? '#ef4444' : '#3b82f6'),
                    pointRadius: 8,
                    pointHoverRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Tide Level at Impact (m)', color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#fff' } },
                    y: { title: { display: true, text: 'Final Run-up Height (m)', color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#fff' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function calculateTidePredictions() {
        const predictionEl = document.getElementById('next-tide-prediction');
        if (!predictionEl) return;
        
        const now = new Date();
        const hour = now.getHours();
        const nextHigh = (6 - (hour % 6)) || 6;
        
        const text = `Next <strong>High Tide</strong> expected in <strong>${nextHigh} hours</strong>. Current phase is ${hour % 6 < 3 ? 'Rising' : 'Ebbing'}.`;
        predictionEl.innerHTML = text;
        
        const sidebarNext = document.getElementById('sidebar-next-tide');
        if (sidebarNext) {
            const nextTime = new Date(now.getTime() + nextHigh * 3600000);
            sidebarNext.innerText = nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }

    // --- Community Intel ---

    window.reportIssue = function(type) {
        const coords = [userLocation[0] + (Math.random()-0.5)*0.02, userLocation[1] + (Math.random()-0.5)*0.02];
        L.marker(coords, { icon: L.divIcon({ className: 'community-marker roadblock', html: '<i data-lucide="construction"></i>', iconSize:[32,32] }) }).addTo(map).bindPopup(type).openPopup();
        lucide.createIcons();
        showToast(`Reported: ${type}`, "info");
    };

    function locateFamilyMember() {
        const coords = [userLocation[0] + 0.012, userLocation[1] - 0.015];
        if (familyMarker) map.removeLayer(familyMarker);
        familyMarker = L.marker(coords, { icon: L.divIcon({ className: 'family-marker', html: '<i data-lucide="user"></i>', iconSize:[32,32] }) }).addTo(map);
        map.setView(coords, 14);
        familyStatus.innerText = "Location Found: Safe at North Relief Hub.";
        showToast("Family Located", "info");
        lucide.createIcons();
    }

    // --- Core Systems ---

    function loadShelters() {
        shelterMarkers.forEach(m => map.removeLayer(m));
        shelterMarkers = [];
        shelters.forEach(s => {
            const icon = L.divIcon({ className: 'shelter-marker available', iconSize:[30,30], html:'<i class="fas fa-home"></i>' });
            const m = L.marker(s.coords, { icon }).addTo(map).bindPopup(`<h3>${s.name}</h3>`);
            shelterMarkers.push(m);
            s.marker = m;
        });
    }

    function recommendBestShelter() {
        const best = shelters[0];
        best.marker?.getElement()?.classList.add('best-choice');
        bestShelterPanel.innerHTML = `<h4>${best.name}</h4><p>Recommended by AI</p>`;
        return best;
    }

    function animateWave() {
        let r = 100;
        const w = L.circle([13.0475, 80.35], { radius: r, color: '#3b82f6', fillOpacity: 0.2 }).addTo(map);
        deployRescueAssets();
        const i = setInterval(() => {
            r += 100; w.setRadius(r);
            if (r > 5000 && r < 5200) {
                const target = recommendBestShelter();
                L.polyline([userLocation, target.coords], { color: '#22c55e', weight: 6, className: 'leaflet-ant-path' }).addTo(map);
            }
            if (r > 15000) { map.removeLayer(w); clearInterval(i); }
        }, 50);
    }

    function deployRescueAssets() {
        const drones = [
            { id: 1, start: [13.06, 80.25], name: "Drone-Alpha" },
            { id: 2, start: [13.02, 80.22], name: "Drone-Beta" }
        ];

        drones.forEach(d => {
            const icon = L.divIcon({ className: 'drone-marker', html: '<i data-lucide="navigation"></i>', iconSize: [24,24] });
            const m = L.marker(d.start, { icon }).addTo(map).bindPopup(`Live Feed: ${d.name}`);
            lucide.createIcons();
            
            let frame = 0;
            const move = setInterval(() => {
                frame++;
                const lat = d.start[0] + (13.045 - d.start[0]) * (frame / 100);
                const lng = d.start[1] + (80.278 - d.start[1]) * (frame / 100);
                m.setLatLng([lat, lng]);
                if (frame >= 100) clearInterval(move);
            }, 100);
            
            setTimeout(() => m.remove(), 10000);
        });
    }

    function startCountdown(mins) {
        if (timerInterval) clearInterval(timerInterval);
        let seconds = mins * 60;
        
        timerInterval = setInterval(() => {
            seconds--;
            if (seconds < 0) {
                clearInterval(timerInterval);
                return;
            }
            
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            const display = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            
            if (impactTimerDisplay) impactTimerDisplay.innerText = display;
        }, 1000);
    }

    // --- Listeners ---
    document.getElementById('waveSlider')?.addEventListener('input', (e) => {
        const val = document.getElementById('wave-val');
        if (val) val.innerText = `${e.target.value}m`;
    });

    document.getElementById('simulateBtn')?.addEventListener('click', () => {
        const height = document.getElementById('waveSlider').value || 5;
        const impact = 20; 

        // Update risk level requested logic
        let riskText = "LOW";
        if (height > 6) riskText = "HIGH";
        else if (height > 3) riskText = "MEDIUM";
        
        const riskLevelDisplay = document.querySelector(".risk-value");
        if (riskLevelDisplay) {
            riskLevelDisplay.innerText = riskText;
            riskLevelDisplay.style.color = height > 6 ? 'var(--emergency-red)' : (height > 3 ? '#f59e0b' : 'var(--safe-green)');
        }

        // Add circle to map requested logic
        if (map) {
            L.circle([13.0827, 80.2707], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5,
                radius: height * 1000
            }).addTo(map);
        }

        if (liveWave) liveWave.innerText = `${height}m`;
        const modalWave = document.getElementById('modal-wave');
        const modalImpact = document.getElementById('modal-impact');
        if (modalWave) modalWave.innerText = `${height}m`;
        if (modalImpact) modalImpact.innerText = `${impact} mins`;

        if (alertBanner) {
            alertBanner.className = "alert-banner critical blink";
            alertBanner.innerText = "🚨 🔴 CRITICAL: TSUNAMI SIMULATION ACTIVE";
        }
        if (alertModal) alertModal.classList.add('show');
        
        siren.play().catch(()=>{});
        animateWave();
        startCountdown(impact);
        
        saveLocalCrisisData('latest_alert', { active: true, text: "🚨 🔴 CRITICAL: TSUNAMI SIMULATION ACTIVE" });
    });

    function updateDashboardData() {
        const riskLevels = ["LOW", "MEDIUM", "HIGH"];
        const riskVal = document.getElementById('risk-val');
        const alertCount = document.getElementById('active-alerts-count');
        const shelterCount = document.getElementById('safe-shelters-count');
        
        // Randomly nudge data unless in disaster mode
        if (!window.isDisasterMode) {
            // Update Risk Level (Occasionally change)
            if (Math.random() > 0.8) {
                const newRisk = riskLevels[Math.floor(Math.random() * 2)]; // Keep it LOW/MEDIUM
                if (riskVal) {
                    riskVal.innerText = newRisk;
                    riskVal.style.color = newRisk === "MEDIUM" ? "#f59e0b" : "var(--safe-green)";
                }
            }

            // Update Alerts
            if (alertCount) {
                const current = parseInt(alertCount.innerText);
                const next = Math.max(0, current + (Math.random() > 0.7 ? 1 : (Math.random() > 0.8 ? -1 : 0)));
                alertCount.innerText = next;
            }

            // Update Shelters
            if (shelterCount) {
                const current = parseInt(shelterCount.innerText);
                const next = Math.max(10, Math.min(15, current + (Math.random() > 0.9 ? 1 : (Math.random() > 0.9 ? -1 : 0))));
                shelterCount.innerText = next;
            }
            
            // Random Logs
            const logs = [
                "Scanning coastal sector 4...",
                "Sea level telemetry synced.",
                "Buoy #12 heartbeat received.",
                "Sensor recalibration complete.",
                "Atmospheric pressure stable."
            ];
            if (Math.random() > 0.6) {
                updateLogs(logs[Math.floor(Math.random() * logs.length)], "system");
            }
        }

        // Update Chart
        if (miniChart) {
            const newVal = Math.floor(Math.random() * 30) + (window.isDisasterMode ? 60 : 10);
            miniChart.data.datasets[0].data.shift();
            miniChart.data.datasets[0].data.push(newVal);
            miniChart.update();
        }
    }

    window.updateLogs = function(message, type = "system") {
        const list = document.getElementById('notif-list');
        if (!list) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry = document.createElement('div');
        entry.className = `notif-entry ${type}`;
        entry.innerHTML = `
            <span class="time">${time}</span>
            <p>${message}</p>
        `;
        
        list.insertBefore(entry, list.firstChild);
        
        // Keep logs manageable
        if (list.children.length > 20) {
            list.removeChild(list.lastChild);
        }
    };

    window.simulateDisaster = function() {
        window.isDisasterMode = true;
        
        // 1. Change Risk to HIGH
        const riskVal = document.getElementById('risk-val');
        if (riskVal) {
            riskVal.innerText = "HIGH";
            riskVal.style.color = "var(--emergency-red)";
        }

        // 2. Increase Alerts
        const alertCount = document.getElementById('active-alerts-count');
        if (alertCount) alertCount.innerText = "14";

        // 3. Update Logs
        updateLogs("⚠️ CRITICAL: SEISMIC ANOMALY DETECTED!", "critical");
        updateLogs("⚠️ Tidal surge confirmed in Sector 7.", "critical");
        updateLogs("🚨 Evacuation recommended for coastal zones.", "critical");

        // 4. Update Map Zones
        updateMapDisaster();

        // 5. Banner Update
        const banner = document.getElementById('alert-banner');
        if (banner) {
            banner.className = "alert-banner critical blink alert-pulse";
            banner.innerText = "🚨 EMERGENCY";
        }

        // 6. Impact Timer
        startCountdown(25);
        
        // 7. Status Indicator
        const statusText = document.getElementById('status-text');
        const statusDot = document.getElementById('status-dot');
        if (statusText) statusText.innerText = "EMERGENCY MODE";
        if (statusDot) statusDot.className = "status-dot red";

        showToast("DISASTER MODE ACTIVATED", "critical");
        siren.play().catch(()=>{});
        speakAlert("Emergency Warning. A critical tsunami threat has been detected. Please activate evacuation protocols.");
    };

    function updateMapDisaster() {
        if (!map) return;
        
        // Highlight zones in red
        L.circle([13.0827, 80.2707], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.6,
            radius: 8000
        }).addTo(map).bindPopup("<b>IMPACT ZONE</b>").openPopup();
        
        // Add more markers
        L.marker([13.045, 80.32], { 
            icon: L.divIcon({ className: 'emergency-marker', html: '<i data-lucide="alert-triangle" color="#ef4444"></i>' }) 
        }).addTo(map).bindPopup("<b>Sea level rising fast!</b>");
        
        lucide.createIcons();
    }

    toggleAnalyticsBtn.addEventListener('click', () => { analyticsOverlay.classList.add('show'); setTimeout(initAnalytics, 100); });
    closeAnalyticsBtn.addEventListener('click', () => analyticsOverlay.classList.remove('show'));
    checklistItems.forEach(i => i.addEventListener('change', updateChecklistProgress));
    familyForm.addEventListener('submit', saveFamilyPlan);
    trackFamilyBtn.addEventListener('click', locateFamilyMember);
    markSafeBtn.addEventListener('click', () => { showToast("Marked Safe", "info"); markSafeBtn.disabled = true; });
    alertContactsBtn.addEventListener('click', () => {
        const h = liveWave.innerText || "5m";
        const sms = `URGENT TSUNAMI ALERT: ${h} wave detected. Evacuate to higher ground immediately. My GPS: ${userLocation[0]}, ${userLocation[1]}. -TsunamiShield AI`;
        showToast("SOS Broadcast Active", "critical");
        // Update feature phone fallback preview
        const fallback = document.getElementById('sms-fallback-text');
        if (fallback) fallback.innerText = sms;
        speakAlert("Emergency SOS Shared with all contacts.");
    });
    closeModalBtn.addEventListener('click', () => alertModal.classList.remove('show'));
    fetchOceanBtn.addEventListener('click', fetchOceanData);
    document.getElementById('recalc-risk').addEventListener('click', calculateRiskIndex);

    // Admin & Overlay Toggles (Redirected to new Nav Engine)
    toggleAnalyticsBtn?.addEventListener('click', () => document.querySelector('[data-section="analytics"]')?.click());
    togglePrepBtn?.addEventListener('click', () => document.querySelector('[data-section="preparedness"]')?.click());
    toggleAdminBtn?.addEventListener('click', () => document.querySelector('[data-section="admin"]')?.click());

    const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1[0]-p2[0], 2) + Math.pow(p1[1]-p2[1], 2)) * 111;
    const updateClock = () => clockDisplay.innerText = new Date().toLocaleTimeString();
    function showToast(m, t) {
        const toast = document.createElement('div');
        toast.className = `toast ${t}`;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        toast.innerHTML = `<span style="opacity:0.6; font-size:0.7rem; display:block; margin-bottom:2px;">${time}</span><span>${m}</span>`;
        toastContainer.appendChild(toast);
        
        // Add to global logs too
        const notifList = document.getElementById('notif-list');
        if (notifList) {
            const entry = document.createElement('div');
            entry.className = `notif-entry ${t === 'critical' ? 'critical' : 'system'}`;
            entry.innerHTML = `<span class="time">${time}</span><p>${m}</p>`;
            notifList.prepend(entry);
            if (notifList.children.length > 20) notifList.lastElementChild.remove();
        }

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }

    function handleConnectivity() {
        const isOnline = navigator.onLine;
        const offlineBanner = document.getElementById('offline-banner');
        
        if (!isOnline) {
            if (offlineBanner) offlineBanner.classList.add('active');
            if (statusText) statusText.innerText = "Status: Local Data Mode";
            if (statusDot) statusDot.className = "status-dot orange";
            if (connectivityBadge) connectivityBadge.classList.remove('hidden');
            showToast("System: Offline Mode Active", "warning");
        } else {
            if (offlineBanner) offlineBanner.classList.remove('active');
            if (statusText) statusText.innerText = "Status: Online";
            if (statusDot) statusDot.className = "status-dot green";
            if (connectivityBadge) connectivityBadge.classList.add('hidden');
        }
    }

    function saveLocalCrisisData(key, data) {
        localStorage.setItem(`ts_crisis_${key}`, JSON.stringify(data));
    }

    function loadLocalCrisisData() {
        const lastAlert = localStorage.getItem('ts_crisis_latest_alert');
        if (lastAlert && !navigator.onLine) {
             const data = JSON.parse(lastAlert);
             if (data.active) {
                 alertBanner.className = "alert-banner critical";
                 alertBanner.innerText = data.text;
             }
        }
    }

    init();
});

