from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Union
import uuid
from datetime import datetime, timezone
import joblib
import pandas as pd
import numpy as np

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Load ML model and scaler
try:
    model = joblib.load('/app/backend/models/best_model.pkl')
    scaler = joblib.load('/app/backend/models/scaler.pkl')
    model_info = joblib.load('/app/backend/models/model_info.pkl')
    print(f"Loaded ML model: {model_info['model_name']}")
except Exception as e:
    print(f"Warning: Could not load ML model: {e}")
    model = None
    scaler = None
    model_info = None

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class PatientData(BaseModel):
    age: int = Field(..., ge=20, le=100, description="Age in years")
    sex: int = Field(..., ge=0, le=1, description="Sex (0=female, 1=male)")
    cp: int = Field(..., ge=1, le=4, description="Chest pain type (1-4)")
    trestbps: int = Field(..., ge=80, le=220, description="Resting blood pressure (mmHg)")
    chol: int = Field(..., ge=100, le=600, description="Cholesterol level (mg/dl)")
    fbs: int = Field(..., ge=0, le=1, description="Fasting blood sugar >120 mg/dl (0=no, 1=yes)")
    restecg: int = Field(..., ge=0, le=2, description="Resting ECG results (0-2)")
    thalach: int = Field(..., ge=60, le=220, description="Maximum heart rate achieved")
    exang: int = Field(..., ge=0, le=1, description="Exercise induced angina (0=no, 1=yes)")
    oldpeak: float = Field(..., ge=0.0, le=10.0, description="ST depression")
    slope: int = Field(..., ge=1, le=3, description="Slope of peak exercise ST segment (1-3)")
    ca: int = Field(..., ge=0, le=3, description="Number of major vessels colored by fluoroscopy")
    thal: int = Field(..., description="Thalassemia (3=normal, 6=fixed defect, 7=reversible defect)")

class RiskAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_data: PatientData
    risk_probability: float
    risk_level: str
    high_risk: bool
    feature_importance: Optional[Dict[str, float]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RiskFactor(BaseModel):
    factor: str
    importance: float
    value: Union[float, int, str]
    contribution: float

class RiskPredictionResponse(BaseModel):
    risk_probability: float
    risk_level: str
    high_risk: bool
    interpretation: str
    top_risk_factors: List[RiskFactor]

# Helper functions
def get_risk_level(probability: float) -> str:
    """Convert probability to risk level"""
    if probability < 0.3:
        return "Low"
    elif probability < 0.6:
        return "Moderate"
    else:
        return "High"

def get_interpretation(risk_level: str, probability: float) -> str:
    """Get human-readable interpretation"""
    interpretations = {
        "Low": f"Based on the provided information, you have a low risk ({probability:.1%}) of heart disease. Continue maintaining a healthy lifestyle.",
        "Moderate": f"You have a moderate risk ({probability:.1%}) of heart disease. Consider discussing preventive measures with your healthcare provider.",
        "High": f"You have a high risk ({probability:.1%}) of heart disease. Please consult with a healthcare professional for proper evaluation and guidance."
    }
    return interpretations.get(risk_level, "Unable to determine risk level")

def get_top_risk_factors(patient_data: dict, feature_importance: dict) -> List[Dict[str, float]]:
    """Get top contributing risk factors for this patient"""
    if not feature_importance:
        return []
    
    # Calculate contribution of each feature for this patient
    factor_contributions = []
    
    # Define feature descriptions
    feature_descriptions = {
        'age': 'Age',
        'sex': 'Gender (Male)',
        'cp': 'Chest Pain Type',
        'trestbps': 'Resting Blood Pressure',
        'chol': 'Cholesterol Level',
        'fbs': 'Fasting Blood Sugar',
        'restecg': 'Resting ECG',
        'thalach': 'Max Heart Rate',
        'exang': 'Exercise Induced Angina',
        'oldpeak': 'ST Depression',
        'slope': 'ST Slope',
        'ca': 'Major Vessels',
        'thal': 'Thalassemia'
    }
    
    for feature, importance in feature_importance.items():
        value = patient_data.get(feature, 0)
        contribution = importance * abs(value) if isinstance(value, (int, float)) else importance
        
        factor_contributions.append({
            'factor': feature_descriptions.get(feature, feature),
            'importance': float(importance),
            'value': float(value) if isinstance(value, (int, float)) else value,
            'contribution': float(contribution)
        })
    
    # Sort by contribution and return top 5
    factor_contributions.sort(key=lambda x: x['contribution'], reverse=True)
    return factor_contributions[:5]

# Routes
@api_router.get("/")
async def root():
    return {"message": "Heart Disease Risk Assessment API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    status_dict_for_mongo = status_obj.dict()
    status_dict_for_mongo['timestamp'] = status_dict_for_mongo['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(status_dict_for_mongo)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    for check in status_checks:
        if isinstance(check.get('timestamp'), str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/predict-risk", response_model=RiskPredictionResponse)
async def predict_heart_disease_risk(patient_data: PatientData):
    """Predict heart disease risk for a patient"""
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="ML model not available")
    
    try:
        # Convert patient data to DataFrame
        patient_dict = patient_data.dict()
        patient_df = pd.DataFrame([patient_dict])
        
        # Ensure columns are in the correct order
        expected_columns = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 
                          'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
        patient_df = patient_df[expected_columns]
        
        # Scale the data
        patient_scaled = scaler.transform(patient_df)
        
        # Predict probability
        risk_probability = float(model.predict_proba(patient_scaled)[0, 1])
        
        # Determine risk level
        risk_level = get_risk_level(risk_probability)
        high_risk = risk_probability >= 0.5
        
        # Get interpretation
        interpretation = get_interpretation(risk_level, risk_probability)
        
        # Get top risk factors
        feature_importance = model_info.get('feature_importance', {}) if model_info else {}
        top_risk_factors = get_top_risk_factors(patient_dict, feature_importance)
        
        # Save assessment to database
        assessment = RiskAssessment(
            patient_data=patient_data,
            risk_probability=risk_probability,
            risk_level=risk_level,
            high_risk=high_risk,
            feature_importance=feature_importance
        )
        
        assessment_dict = assessment.dict()
        # Convert datetime and nested objects for MongoDB
        assessment_dict['timestamp'] = assessment_dict['timestamp'].isoformat()
        assessment_dict['patient_data'] = patient_dict
        
        await db.risk_assessments.insert_one(assessment_dict)
        
        return RiskPredictionResponse(
            risk_probability=risk_probability,
            risk_level=risk_level,
            high_risk=high_risk,
            interpretation=interpretation,
            top_risk_factors=top_risk_factors
        )
        
    except Exception as e:
        logging.error(f"Error predicting risk: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error predicting risk: {str(e)}")

@api_router.get("/assessments", response_model=List[RiskAssessment])
async def get_risk_assessments(limit: int = 50):
    """Get recent risk assessments"""
    try:
        assessments = await db.risk_assessments.find().sort("timestamp", -1).limit(limit).to_list(limit)
        
        # Convert timestamp strings back to datetime objects
        for assessment in assessments:
            if isinstance(assessment.get('timestamp'), str):
                assessment['timestamp'] = datetime.fromisoformat(assessment['timestamp'])
        
        return [RiskAssessment(**assessment) for assessment in assessments]
    except Exception as e:
        logging.error(f"Error fetching assessments: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching assessments")

@api_router.get("/model-info")
async def get_model_info():
    """Get information about the loaded ML model"""
    if model_info is None:
        raise HTTPException(status_code=503, detail="Model information not available")
    
    return {
        "model_name": model_info.get('model_name'),
        "feature_names": model_info.get('feature_names'),
        "status": "loaded and ready"
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()