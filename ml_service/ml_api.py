from flask import Flask, jsonify, request
from flask_cors import CORS
import math
import random
import pickle
import pandas as pd
import numpy as np
import requests
import os

app = Flask(__name__)
CORS(app) # Allow Express server to communicate with this

# Load the trained Isolation Forest model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'tsunami_anomaly_model.pkl')
try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"⚠️ Failed to load model: {e}")
    model = None

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "ML Service is Online", "model_loaded": model is not None}), 200

@app.route('/api/analyze-sea-level', methods=['POST'])
def analyze_sea_level():
    req_data = request.json
    points = req_data.get('data', [])
    
    if not points or model is None:
        return jsonify({"status": "error", "message": "No data or model offline", "is_anomaly": False}), 400
        
    try:
        # Extract water levels
        water_levels = [float(p['v']) for p in points]
        df = pd.DataFrame({'water_level': water_levels})
        
        # Predict anomalies (-1 for anomalies, 1 for normal)
        predictions = model.predict(df[['water_level']])
        
        # We consider it a tsunami anomaly if the final data points are flagged (-1)
        is_anomaly = bool(predictions[-1] == -1)
        
        # Threat score calculation
        variance = np.var(water_levels[-5:]) if len(water_levels) >= 5 else 0
        threat_score = min(0.99, (variance / 5.0)) if is_anomaly else random.uniform(0.1, 0.3)
        
        return jsonify({
            "status": "success",
            "threat_score": threat_score,
            "is_anomaly": is_anomaly,
            "message": "AI Detected Sea Level Anomaly!" if is_anomaly else "Normal levels"
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e), "is_anomaly": False}), 500

@app.route('/api/geospatial/earthquakes', methods=['GET'])
def get_earthquakes():
    """Fetches real-time M4.5+ earthquake data from USGS to map tsunami origins."""
    try:
        url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
        response = requests.get(url)
        return jsonify(response.json()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Running on port 5001 so it doesn't conflict with Node.js on 5000
    app.run(host='0.0.0.0', port=5001, debug=True)
