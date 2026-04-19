document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let timerInterval = null;
    let isDisasterMode = false;
    const siren = new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c352709292.mp3');

    // --- DOM Elements ---
    const simulateBtn = document.getElementById('simulateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const clockDisplay = document.getElementById('clock');

    // --- Map Initialization ---
    let map;
    function initMap() {
        if (document.title.includes("Shelter")) return; // Skip global map on shelters page
        try {
            map = L.map('map', { zoomControl: false, attributionControl: false }).setView([13.0827, 80.2707], 11);
            window.map = map;
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

            // Coastal markers and risk zones
            L.circle([13.05, 80.28], { color: '#ef4444', fillOpacity: 0.35, radius: 3500 }).addTo(map);
            L.circle([13.12, 80.20], { color: '#22c55e', fillOpacity: 0.2, radius: 3000 }).addTo(map);

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
            L.circle([13.0827, 80.2707], { color: 'red', fillColor: '#f03', fillOpacity: 0.5, radius: 10000 }).addTo(map);
            map.setView([13.0827, 80.2707], 10);
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
