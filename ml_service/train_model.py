import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import pickle
import os

print("--- Starting Tsunami AI Training ---")

# 1. Generate Synthetic Sea Level Data (Training set)
# Normal data consists of high and low tides (sine waves)
time_points = np.linspace(0, 100, 5000)
# Base tide
normal_tide = np.sin(time_points) * 1.5 + np.random.normal(0, 0.1, 5000) 

# Inject anomalous "Tsunami" events (sudden extreme drop followed by spike)
anomaly_indices = [1000, 2500, 4000]
data = normal_tide.copy()
for idx in anomaly_indices:
    data[idx:idx+10] -= 5.0 # Sudden recede
    data[idx+10:idx+20] += 8.0 # Tsunami wave

# Format for scikit-learn training
X_train = pd.DataFrame({'water_level': data})

# 2. Initialize and Train the Isolation Forest Model
print("Training Isolation Forest Anomaly Detector...")
# contamination is the expected proportion of outliers
model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
model.fit(X_train[['water_level']])

# 3. Save the Model
os.makedirs('models', exist_ok=True)
model_path = os.path.join('models', 'tsunami_anomaly_model.pkl')
with open(model_path, 'wb') as f:
    pickle.dump(model, f)

print(f"✅ Model successfully trained and saved to {model_path}!")
print("The AI is now ready to detect sudden sea-level recessions and surges.")
