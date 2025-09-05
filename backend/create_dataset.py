import pandas as pd
import numpy as np
from sklearn.datasets import make_classification
import joblib
import os

def create_heart_disease_dataset():
    """
    Create a realistic heart disease dataset based on Cleveland Heart Disease dataset structure
    """
    np.random.seed(42)
    n_samples = 1000
    
    # Generate base features using make_classification for realistic correlations
    X_base, y = make_classification(
        n_samples=n_samples,
        n_features=8,
        n_informative=6,
        n_redundant=1,
        n_clusters_per_class=1,
        weights=[0.7, 0.3],  # 30% have heart disease
        flip_y=0.02,
        random_state=42
    )
    
    # Transform features to match realistic heart disease risk factors
    data = {}
    
    # Age: 29-77 years, with higher risk for older ages
    data['age'] = np.clip(
        np.round(45 + X_base[:, 0] * 15 + np.random.normal(0, 3, n_samples)), 
        29, 77
    ).astype(int)
    
    # Sex: 1=male, 0=female (males have higher risk)
    data['sex'] = np.random.choice([0, 1], n_samples, p=[0.4, 0.6])
    
    # Chest pain type: 1-4 (higher values = more concerning)
    data['cp'] = np.random.choice([1, 2, 3, 4], n_samples, p=[0.1, 0.2, 0.3, 0.4])
    
    # Resting blood pressure: 94-200 mmHg
    data['trestbps'] = np.clip(
        120 + X_base[:, 1] * 25 + np.random.normal(0, 10, n_samples),
        94, 200
    ).astype(int)
    
    # Cholesterol: 126-564 mg/dl
    data['chol'] = np.clip(
        200 + X_base[:, 2] * 80 + np.random.normal(0, 30, n_samples),
        126, 564
    ).astype(int)
    
    # Fasting blood sugar: 1 if >120 mg/dl, 0 otherwise
    data['fbs'] = np.random.choice([0, 1], n_samples, p=[0.85, 0.15])
    
    # Resting ECG: 0=normal, 1=ST-T abnormality, 2=LV hypertrophy
    data['restecg'] = np.random.choice([0, 1, 2], n_samples, p=[0.5, 0.4, 0.1])
    
    # Max heart rate: 71-202 bpm
    data['thalach'] = np.clip(
        150 - X_base[:, 3] * 30 + np.random.normal(0, 15, n_samples),
        71, 202
    ).astype(int)
    
    # Exercise induced angina: 1=yes, 0=no
    data['exang'] = np.random.choice([0, 1], n_samples, p=[0.68, 0.32])
    
    # ST depression: 0.0-6.2
    data['oldpeak'] = np.clip(
        np.abs(X_base[:, 4]) * 2 + np.random.exponential(0.5, n_samples),
        0.0, 6.2
    ).round(1)
    
    # Slope: 1=upsloping, 2=flat, 3=downsloping
    data['slope'] = np.random.choice([1, 2, 3], n_samples, p=[0.5, 0.4, 0.1])
    
    # Number of major vessels: 0-3
    data['ca'] = np.random.choice([0, 1, 2, 3], n_samples, p=[0.6, 0.2, 0.15, 0.05])
    
    # Thalassemia: 3=normal, 6=fixed defect, 7=reversible defect
    data['thal'] = np.random.choice([3, 6, 7], n_samples, p=[0.55, 0.18, 0.27])
    
    # Create DataFrame
    df = pd.DataFrame(data)
    df['target'] = y
    
    # Adjust correlations to make them more realistic
    # Older people more likely to have heart disease
    age_risk_boost = (df['age'] > 55).astype(int) * 0.3
    
    # Males more likely to have heart disease
    sex_risk_boost = df['sex'] * 0.2
    
    # High cholesterol increases risk
    chol_risk_boost = (df['chol'] > 240).astype(int) * 0.25
    
    # High blood pressure increases risk
    bp_risk_boost = (df['trestbps'] > 140).astype(int) * 0.2
    
    # Calculate total risk boost
    total_risk_boost = age_risk_boost + sex_risk_boost + chol_risk_boost + bp_risk_boost
    
    # Apply risk adjustments
    risk_probability = np.random.random(n_samples) + total_risk_boost
    df['target'] = (risk_probability > 1.2).astype(int)
    
    return df

def save_dataset():
    """Create and save the dataset"""
    df = create_heart_disease_dataset()
    
    # Create data directory if it doesn't exist
    os.makedirs('/app/backend/data', exist_ok=True)
    
    # Save dataset
    df.to_csv('/app/backend/data/heart_disease_dataset.csv', index=False)
    
    print(f"Dataset created with {len(df)} samples")
    print(f"Heart disease prevalence: {df['target'].mean():.2%}")
    print(f"Dataset saved to /app/backend/data/heart_disease_dataset.csv")
    
    return df

if __name__ == "__main__":
    df = save_dataset()
    print("\nDataset info:")
    print(df.info())
    print("\nTarget distribution:")
    print(df['target'].value_counts())