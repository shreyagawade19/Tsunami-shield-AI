document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let timerInterval = null;
    let isDisasterMode = false;
    const siren = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c352709292.mp3');

    // --- DOM Elements ---
    const simulateBtn = document.getElementById('simulateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const clockDisplay = document.getElementById('clock');
    
    // --- Theme Toggling ---
    const themeBtn = document.getElementById('themeToggleBtn');
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.classList.add('light-theme');
    }
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('light-theme');
            if (document.documentElement.classList.contains('light-theme')) {
                localStorage.setItem('theme', 'light');
                themeBtn.innerHTML = '<i data-lucide="moon"></i> Theme';
            } else {
                localStorage.setItem('theme', 'dark');
                themeBtn.innerHTML = '<i data-lucide="sun"></i> Theme';
            }
            if (window.lucide) lucide.createIcons();
        });
    }

    // --- Global Button Interactivity (Prototype Wiring) ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.toggle('active');
        });
    }

    document.querySelectorAll('button:not(#simulateBtn):not(#resetBtn):not(#themeToggleBtn):not(#trigger-wave-sim)').forEach(btn => {
        // Skip map controls, existing scripts, or inline onclick handlers
        if (btn.hasAttribute('onclick') || btn.classList.contains('menu-toggle') || btn.classList.contains('map-control-btn') || btn.classList.contains('filter-btn')) return;

        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const text = this.innerText.trim();
            
            if (text.includes('SOS')) {
                alert("🚨 EMERGENCY SOS BROADCAST DEPLOYED.\nLocal emergency services have been pinged with your exact coordinates.");
                return;
            }

            const originalHTML = this.innerHTML;
            this.innerHTML = `<i data-lucide="loader-2"></i> Wait...`;
            this.style.opacity = '0.7';
            if (window.lucide) lucide.createIcons();

            setTimeout(() => {
                this.innerHTML = originalHTML;
                this.style.opacity = '1';
                alert(`System Action: [ ${text || 'Command'} ] executed successfully in the simulated environment.`);
                if (window.lucide) lucide.createIcons();
            }, 600);
        });
    });

    // --- Map Initialization ---
    let map;
    function initMap() {
        if (document.title.includes("Shelter")) return; // Skip global map on shelters page
        try {
            map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20.5937, 78.9629], 4.8);
            window.map = map;
            
            // Load Google Maps Tile Layer
            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20
            }).addTo(map);

            // Coastal markers and risk zones
            L.circle([13.05, 80.28], { 
                color: '#991b1b', // Dark Red outline
                fillColor: '#ef4444', // Bright Red fill
                fillOpacity: 0.6, 
                weight: 3,
                radius: 12000 
            }).addTo(map).bindPopup("<b style='color:red;'>⚠️ DANGER ZONE</b><br>High Tsunami Inundation Risk");
            
            L.circle([13.12, 80.12], { 
                color: '#166534', // Dark Green outline
                fillColor: '#22c55e', // Bright Green fill
                fillOpacity: 0.6, 
                weight: 3,
                radius: 12000 
            }).addTo(map).bindPopup("<b style='color:green;'>✅ SAFE ZONE</b><br>High Ground Area");
            
            // System Monitoring Active Popup
            L.popup().setLatLng([13.0827, 80.2707]).setContent("System Monitoring Active").openOn(map);
        } catch (e) {
            console.error("Map error:", e);
        }

        // Add Real-time Geospatial Risk Data (Earthquakes M4.5+)
        fetch('http://localhost:5001/api/geospatial/earthquakes')
            .then(response => response.json())
            .then(data => {
                data.features.forEach(quake => {
                    const mag = quake.properties.mag;
                    const coords = [quake.geometry.coordinates[1], quake.geometry.coordinates[0]];

                    // Only plot significant events that could trigger tsunamis near coastal faults
                    if (mag > 5.0) {
                        L.circle(coords, {
                            color: '#f59e0b', // Warning Amber
                            fillColor: '#f59e0b',
                            fillOpacity: 0.4,
                            radius: mag * 10000 // Circle size based on magnitude
                        }).bindPopup(`<b>Magnitude: ${mag}</b><br>${quake.properties.place}`).addTo(map);
                    }
                });
            })
            .catch(err => console.error("Error fetching live map data:", err));

    }

    // --- Clock System ---
    function updateClock() {
        if (clockDisplay) clockDisplay.innerText = new Date().toLocaleTimeString();
    }

    // --- Chart System ---
    let dashboardChart = null;
    function initChart() {
        const ctx = document.getElementById('dashboardChart')?.getContext('2d');
        if (!ctx) return;
        dashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['-5m', '-4m', '-3m', '-2m', '-1m', 'Now'],
                datasets: [{
                    data: [12, 18, 15, 22, 19, 21],
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
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }

    // --- AUTONOMOUS DISASTER LOGIC ---
    function triggerDisaster(reason = "Tsunami simulation triggered") {
        if (isDisasterMode) return; // Prevent double trigger
        isDisasterMode = true;

        // 1. Change Threat Level
        const threatLevel = document.querySelector(".threat-level");
        if (threatLevel) {
            threatLevel.innerText = "CRITICAL";
            threatLevel.style.color = "red";
        }

        // 2. Increase Alerts
        const activeAlerts = document.querySelector(".active-alerts");
        if (activeAlerts) activeAlerts.innerText = "5";

        // 3. Start Countdown
        let time = 60;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            let minutes = Math.floor(time / 60);
            let seconds = time % 60;
            const timeImpact = document.querySelector(".time-impact");
            if (timeImpact) {
                timeImpact.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }
            time--;
            if (time < 0) clearInterval(timerInterval);
        }, 1000);

        // 4. Add Log Entry
        const logContainer = document.querySelector(".logs-container");
        if (logContainer) {
            const newLog = document.createElement("div");
            newLog.classList.add("log-entry", "critical"); // Use existing styles
            newLog.innerHTML = `
                <span class="log-time">${new Date().toLocaleTimeString()}</span>
                <p>🚨 ${reason}</p>
            `;
            logContainer.prepend(newLog);
        }

        // 5. Trigger Alert Sound
        const audio = new Audio("https://www.soundjay.com/button/beep-07.wav");
        audio.play().catch(() => { });
        siren.play().catch(() => { });

        // 6. Map Visuals (Enhanced)
        if (map) {
            L.circle([13.0827, 80.2707], { color: 'red', fillColor: '#f03', fillOpacity: 0.5, radius: 50000 }).addTo(map);
            map.setView([20.5937, 78.9629], 5);
        }

        // UI Transformation (Enhanced)
        const statusTxt = document.getElementById('status-txt');
        const dot = document.getElementById('dot');
        const banner = document.getElementById('map-banner');
        if (statusTxt) {
            statusTxt.innerText = "EMERGENCY MODE";
            statusTxt.style.color = "var(--emergency-red)";
        }
        if (dot) {
            dot.style.background = "var(--emergency-red)";
            dot.style.boxShadow = "var(--glow-red)";
        }
        if (banner) {
            banner.classList.add('blink-red');
            banner.querySelector('span').innerText = "TSUNAMI THREAT DETECTED";
        }
    }

    // Connect Manual Simulation Button
    simulateBtn?.addEventListener('click', () => triggerDisaster("Manual Tsunami simulation triggered"));

    // --- BACKGROUND ML POLLING ---
    async function pollMLData() {
        if (isDisasterMode) return; // Stop polling if already in disaster mode

        try {
            const response = await fetch('http://localhost:5000/api/sea-level');
            const data = await response.json();

            if (data.ml_analysis) {
                // Update Log silently with threat score if normal
                if (!data.ml_analysis.is_anomaly) {
                    console.log(`ML Threat Score: ${data.ml_analysis.threat_score.toFixed(2)} - System Nominal`);
                } else {
                    // AUTONOMOUS TRIGGER!
                    console.error("CRITICAL: ML ANOMALY DETECTED!");
                    triggerDisaster("AI Detected Critical Sea Level Anomaly!");
                }
            }
        } catch (error) {
            console.error("Error polling ML data:", error);
        }
    }

    // --- RESET SYSTEM ---
    resetBtn?.addEventListener('click', function () {
        location.reload();
    });

    // --- Initialization ---
    function init() {
        initMap();
        initChart();
        updateClock();
        setInterval(updateClock, 1000);

        // Start ML Polling
        setInterval(pollMLData, 5000); // Poll every 5 seconds
        pollMLData(); // Initial call

        // Random background telemetry (only if not in disaster mode)
        setInterval(() => {
            if (isDisasterMode) return;
            if (dashboardChart) {
                dashboardChart.data.datasets[0].data.shift();
                dashboardChart.data.datasets[0].data.push(15 + Math.random() * 10);
                dashboardChart.update();
            }
        }, 5000);
    }

    init();
});
