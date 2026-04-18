const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static('./')); // Serve frontend files

// NOAA Tides & Currents API Endpoint
// Station 8454000 (Providence, RI) used as default high-frequency data example
app.get('/api/sea-level', async (req, res) => {
    try {
        const station = req.query.station || '8454000';
        const response = await axios.get(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter`, {
            params: {
                begin_date: '20260417', // Dynamic date could be added
                range: '24',
                station: station,
                product: 'water_level',
                datum: 'mllw',
                units: 'metric',
                time_zone: 'gmt',
                application: 'TsunamiShield_AI',
                format: 'json'
            }
        });
        
        // Mock data for anomaly detection if real data is flat (simulated for dev)
        const data = response.data.data.map(d => ({
            t: d.t,
            v: parseFloat(d.v) + (Math.random() > 0.95 ? 2.5 : 0) // Simulating random anomalies
        }));

        res.json({ station, data });
    } catch (error) {
        console.error("Error fetching NOAA data:", error.message);
        res.status(500).json({ error: "Failed to fetch sea level data" });
    }
});

app.listen(PORT, () => {
    console.log(`TsunamiShield AI Backend running on http://localhost:${PORT}`);
});
