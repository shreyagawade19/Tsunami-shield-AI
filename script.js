document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let isSimulating = false;
    let timerInterval = null;
    let impactTime = 3600; // 1 hour in seconds
    const siren = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3'); // Fallback or real siren link
    
    // --- DOM Elements ---
    const mapElement = document.getElementById('map');
    const startBtn = document.getElementById('start-sim');
    const waveSlider = document.getElementById('wave-height');
    const waveValDisplay = document.getElementById('wave-val');
    const impactTimer = document.getElementById('impact-timer');
    const clockDisplay = document.getElementById('clock');
    const riskVal = document.getElementById('risk-val');
    const popRisk = document.getElementById('pop-risk');
    const evacTimeDisplay = document.getElementById('evac-time');
    const alarmOverlay = document.getElementById('alarm-overlay');
    const alertBox = document.getElementById('emergency-alert');
    const globalStatus = document.getElementById('global-status');
    const notifList = document.getElementById('notif-list');
    const smsText = document.getElementById('sms-text');
    const timelineProg = document.getElementById('timeline-prog');

    // --- Initialize Map ---
    const chennaiCoords = [13.0475, 80.2824]; // Centered near Marina Beach
    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView(chennaiCoords, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Zoom control position
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // --- Define Risk Zones ---
    const zones = {
        high: L.polygon([
            [13.055, 80.280], [13.040, 80.275], [13.030, 80.272], [13.030, 80.285], [13.055, 80.290]
        ], { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }).addTo(map),
        
        medium: L.polygon([
            [13.060, 80.270], [13.040, 80.265], [13.020, 80.265], [13.020, 80.295], [13.060, 80.300]
        ], { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.1, weight: 1 }).addTo(map)
    };

    // User Location Marker
    const userMarker = L.marker([13.0475, 80.275]).addTo(map)
        .bindPopup("Your Current Location: Marina Beach Area")
        .openPopup();

    // Safe Zones (Static Markers)
    const safeZones = [
        [13.055, 80.250], [13.030, 80.245], [13.070, 80.260]
    ];
    safeZones.forEach(coord => {
        L.circleMarker(coord, {
            radius: 8,
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.8
        }).addTo(map).bindPopup("Designated Safe Zone: High Elevation");
    });

    let activeRoute = null;

    // --- Clock Logic ---
    function updateClock() {
        const now = new Date();
        clockDisplay.innerText = now.toLocaleTimeString();
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- Range Slider Update ---
    waveSlider.addEventListener('input', (e) => {
        waveValDisplay.innerText = `${e.target.value}m`;
    });

    // --- Simulation Core ---
    startBtn.addEventListener('click', () => {
        if (isSimulating) return;
        
        const height = parseInt(waveSlider.value);
        if (height === 0) {
            alert("Please select a wave height above 0m to simulate.");
            return;
        }

        triggerSimulation(height);
    });

    function triggerSimulation(height) {
        isSimulating = true;
        startBtn.disabled = true;
        startBtn.innerHTML = `<i data-lucide="loader"></i> Monitoring...`;
        lucide.createIcons();

        // 1. Show Alarm Overlay
        alarmOverlay.classList.remove('hidden');
        try { siren.play(); } catch(e) {}
        
        setTimeout(() => {
            alarmOverlay.classList.add('hidden');
        }, 4000);

        // 2. Update Global Status
        globalStatus.querySelector('.status-dot').className = 'status-dot pulse';
        globalStatus.querySelector('.status-text').innerText = 'Status: EMERGENCY';

        // 3. Update Alert Box
        alertBox.classList.add('active');
        alertBox.querySelector('.alert-header h3').innerText = 'Tsunami Warning: CRITICAL';
        alertBox.querySelector('.alert-content').innerHTML = `
            <p><strong>Wave Height:</strong> ${height}m detected.</p>
            <p><strong>ETA:</strong> 45 minutes to coastal impact.</p>
            <p class="text-red">Action: Immediate Evacuation ordered for all zones.</p>
        `;

        // 4. Update Stats
        riskVal.innerText = height > 15 ? 'Critical' : 'High';
        riskVal.className = 'stat-value text-red';
        popRisk.innerText = (height * 12500).toLocaleString();
        evacTimeDisplay.innerText = '18 mins';

        // 5. Start Countdown
        startTimer(height * 120); // Simulated time based on height

        // 6. Draw Evacuation Route
        drawEvacRoute();

        // 7. Add Notification
        addNotification("ALERT: Seismic activity detected. Automated warning broadcasted.");
        
        // 8. Update SMS
        smsText.innerText = `⚠️ TSUNAMI ALERT: ${height}m wave expected. Move to safe zones inland immediately. Route: Mount Road High Elevation.`;

        // 9. Timeline Animation
        timelineProg.style.width = '75%';
    }

    function startTimer(duration) {
        let timer = duration;
        timerInterval = setInterval(() => {
            let hours = Math.floor(timer / 3600);
            let minutes = Math.floor((timer % 3600) / 60);
            let seconds = timer % 60;

            impactTimer.innerText = 
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (--timer < 0) {
                clearInterval(timerInterval);
                impactTimer.innerText = "IMPACT";
                addNotification("IMPACT: Coastal surge reaching inland points.");
                timelineProg.style.width = '100%';
            }
        }, 1000);
    }

    function drawEvacRoute() {
        if (activeRoute) map.removeLayer(activeRoute);

        // Path from Marina Beach to High Elevation Inland
        const routeCoords = [
            [13.0475, 80.275], // Start
            [13.048, 80.270],
            [13.050, 80.265],
            [13.052, 80.260],
            [13.055, 80.250]  // End (Safe Zone)
        ];

        activeRoute = L.polyline(routeCoords, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 10',
            lineJoin: 'round'
        }).addTo(map);

        map.fitBounds(activeRoute.getBounds(), { padding: [50, 50] });

        // Update Route Info Module
        document.getElementById('route-info').innerHTML = `
            <div class="route-step">
                <span class="step-label">Destination</span>
                <span class="step-val">Mount Road Multi-Story Shelter</span>
            </div>
            <div class="route-step">
                <span class="step-label">Est. Time</span>
                <span class="step-val">12 mins (Driving) / 25 mins (Walking)</span>
            </div>
            <div class="route-step">
                <span class="step-label">Traffic Status</span>
                <span class="step-val text-yellow">Congested</span>
            </div>
        `;
    }

    function addNotification(msg) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const item = document.createElement('div');
        item.className = 'notif-item';
        item.innerHTML = `<span class="time">${time}</span><p>${msg}</p>`;
        notifList.prepend(item);
    }
});
