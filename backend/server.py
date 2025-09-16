from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from ml_pipeline import CardiovascularRiskPredictor
from voice_nlp_service import voice_router
import joblib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Heart Disease Risk Prediction API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize ML predictor
predictor = CardiovascularRiskPredictor()

# Load trained models if they exist
try:
    predictor.load_models('/app/backend/models')
    logging.info("Pre-trained models loaded successfully")
except:
    logging.warning("No pre-trained models found. Training new models...")
    # Import and run training
    from ml_pipeline import train_and_save_models
    predictor = train_and_save_models()

# Pydantic models
class PatientInput(BaseModel):
    age: int = Field(..., ge=1, le=120, description="Patient age")
    sex: str = Field(..., description="Patient sex (Male/Female)")
    cholesterol: int = Field(..., ge=100, le=600, description="Cholesterol level")
    systolic_bp: int = Field(..., ge=80, le=250, description="Systolic blood pressure")
    diastolic_bp: int = Field(..., ge=40, le=150, description="Diastolic blood pressure")
    heart_rate: int = Field(..., ge=40, le=200, description="Heart rate")
    diabetes: int = Field(..., ge=0, le=1, description="Diabetes (0=No, 1=Yes)")
    family_history: int = Field(..., ge=0, le=1, description="Family history (0=No, 1=Yes)")
    smoking: int = Field(..., ge=0, le=1, description="Smoking (0=No, 1=Yes)")
    obesity: int = Field(..., ge=0, le=1, description="Obesity (0=No, 1=Yes)")
    alcohol_consumption: int = Field(..., ge=0, le=1, description="Alcohol consumption (0=No, 1=Yes)")
    exercise_hours_per_week: float = Field(..., ge=0, le=50, description="Exercise hours per week")
    diet: str = Field(..., description="Diet type (Healthy/Average/Unhealthy)")
    previous_heart_problems: int = Field(..., ge=0, le=1, description="Previous heart problems (0=No, 1=Yes)")
    medication_use: int = Field(..., ge=0, le=1, description="Medication use (0=No, 1=Yes)")
    stress_level: int = Field(..., ge=1, le=10, description="Stress level (1-10)")
    sedentary_hours_per_day: float = Field(..., ge=0, le=24, description="Sedentary hours per day")
    income: int = Field(..., ge=0, description="Income")
    bmi: float = Field(..., ge=10, le=60, description="BMI")
    triglycerides: int = Field(..., ge=50, le=1000, description="Triglycerides level")
    physical_activity_days_per_week: int = Field(..., ge=0, le=7, description="Physical activity days per week")
    sleep_hours_per_day: int = Field(..., ge=1, le=24, description="Sleep hours per day")

class CardiovascularRisk(BaseModel):
    probability: float
    risk_level: str

class RiskFactor(BaseModel):
    factor: str
    importance: float

class RiskCategories(BaseModel):
    modifiable_high_risk: List[str]
    modifiable_medium_risk: List[str]
    non_modifiable: List[str]

class RiskFactorsAnalysis(BaseModel):
    top_risk_factors: List[RiskFactor]
    risk_categories: RiskCategories

class LifestyleScenario(BaseModel):
    risk_reduction: float
    description: str

class PredictionResult(BaseModel):
    patient_id: str
    prediction: int
    risk_probability: float
    risk_level: str
    model_used: str
    timestamp: datetime
    recommendations: List[str]
    cardiovascular_risks: Dict[str, CardiovascularRisk]
    risk_factors_analysis: RiskFactorsAnalysis
    lifestyle_impact: Dict[str, LifestyleScenario]

class PatientHistory(BaseModel):
    patient_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_data: PatientInput
    prediction_result: PredictionResult
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ModelPerformance(BaseModel):
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float

def generate_recommendations(patient_data: PatientInput, risk_level: str) -> List[str]:
    """Generate personalized health recommendations"""
    recommendations = []
    
    if risk_level == "High":
        recommendations.append("🚨 Consult with a cardiologist immediately")
        recommendations.append("📊 Schedule comprehensive cardiac testing")
    
    if patient_data.smoking == 1:
        recommendations.append("🚭 Quit smoking - this is the most important step you can take")
    
    if patient_data.bmi > 30:
        recommendations.append("⚖️ Focus on weight management through diet and exercise")
    
    if patient_data.exercise_hours_per_week < 2.5:
        recommendations.append("🏃‍♂️ Increase physical activity to at least 150 minutes per week")
    
    if patient_data.stress_level > 7:
        recommendations.append("🧘‍♀️ Practice stress management techniques like meditation or yoga")
    
    if patient_data.diet == "Unhealthy":
        recommendations.append("🥗 Adopt a heart-healthy diet rich in fruits, vegetables, and whole grains")
    
    if patient_data.sleep_hours_per_day < 7:
        recommendations.append("😴 Aim for 7-9 hours of quality sleep per night")
    
    if patient_data.cholesterol > 240:
        recommendations.append("💊 Monitor and manage cholesterol levels with your doctor")
    
    if patient_data.systolic_bp > 140 or patient_data.diastolic_bp > 90:
        recommendations.append("🩺 Monitor and control blood pressure regularly")
    
    # Add general recommendations
    recommendations.append("📅 Schedule regular check-ups with your healthcare provider")
    recommendations.append("📱 Track your heart health metrics regularly")
    
    return recommendations[:6]  # Limit to 6 recommendations

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Heart Disease Risk Prediction API", "status": "active"}

@api_router.post("/predict", response_model=PredictionResult)
async def predict_heart_disease_risk(patient_data: PatientInput):
    """Predict heart disease risk for a patient"""
    try:
        # Convert input to dictionary format expected by ML model
        features = {
            'Age': patient_data.age,
            'Sex': patient_data.sex,
            'Cholesterol': patient_data.cholesterol,
            'Systolic_BP': patient_data.systolic_bp,
            'Diastolic_BP': patient_data.diastolic_bp,
            'Heart Rate': patient_data.heart_rate,
            'Diabetes': patient_data.diabetes,
            'Family History': patient_data.family_history,
            'Smoking': patient_data.smoking,
            'Obesity': patient_data.obesity,
            'Alcohol Consumption': patient_data.alcohol_consumption,
            'Exercise Hours Per Week': patient_data.exercise_hours_per_week,
            'Diet': patient_data.diet,
            'Previous Heart Problems': patient_data.previous_heart_problems,
            'Medication Use': patient_data.medication_use,
            'Stress Level': patient_data.stress_level,
            'Sedentary Hours Per Day': patient_data.sedentary_hours_per_day,
            'Income': patient_data.income,
            'BMI': patient_data.bmi,
            'Triglycerides': patient_data.triglycerides,
            'Physical Activity Days Per Week': patient_data.physical_activity_days_per_week,
            'Sleep Hours Per Day': patient_data.sleep_hours_per_day
        }
        
        # Make prediction
        result = predictor.predict(features)
        
        # Generate recommendations
        recommendations = generate_recommendations(patient_data, result['risk_level'])
        
        patient_id = str(uuid.uuid4())
        
        # Convert cardiovascular_risks to proper format
        cardiovascular_risks = {}
        for risk_type, risk_data in result['cardiovascular_risks'].items():
            cardiovascular_risks[risk_type] = CardiovascularRisk(
                probability=risk_data['probability'],
                risk_level=risk_data['risk_level']
            )
        
        # Convert risk_factors_analysis to proper format
        risk_factors_analysis = RiskFactorsAnalysis(
            top_risk_factors=[
                RiskFactor(factor=rf['factor'], importance=rf['importance'])
                for rf in result['risk_factors_analysis'].get('top_risk_factors', [])
            ],
            risk_categories=RiskCategories(
                modifiable_high_risk=result['risk_factors_analysis'].get('risk_categories', {}).get('modifiable_high_risk', []),
                modifiable_medium_risk=result['risk_factors_analysis'].get('risk_categories', {}).get('modifiable_medium_risk', []),
                non_modifiable=result['risk_factors_analysis'].get('risk_categories', {}).get('non_modifiable', [])
            )
        )
        
        # Convert lifestyle_impact to proper format
        lifestyle_impact = {}
        for scenario_name, scenario_data in result['lifestyle_impact'].items():
            lifestyle_impact[scenario_name] = LifestyleScenario(
                risk_reduction=scenario_data['risk_reduction'],
                description=scenario_data['description']
            )
        
        prediction_result = PredictionResult(
            patient_id=patient_id,
            prediction=result['prediction'],
            risk_probability=result['risk_probability'],
            risk_level=result['risk_level'],
            model_used=result['model_used'],
            timestamp=datetime.utcnow(),
            recommendations=recommendations,
            cardiovascular_risks=cardiovascular_risks,
            risk_factors_analysis=risk_factors_analysis,
            lifestyle_impact=lifestyle_impact
        )
        
        # Save to database
        patient_history = PatientHistory(
            patient_id=patient_id,
            patient_data=patient_data,
            prediction_result=prediction_result
        )
        
        await db.patient_history.insert_one(patient_history.dict())
        
        return prediction_result
        
    except Exception as e:
        logging.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@api_router.get("/patient-history/{patient_id}")
async def get_patient_history(patient_id: str):
    """Get patient history by ID"""
    history = await db.patient_history.find_one({"patient_id": patient_id})
    if not history:
        raise HTTPException(status_code=404, detail="Patient not found")
    # Convert ObjectId to string for JSON serialization
    history["_id"] = str(history["_id"])
    return history

@api_router.get("/recent-predictions")
async def get_recent_predictions(limit: int = 10):
    """Get recent predictions"""
    predictions = await db.patient_history.find().sort("timestamp", -1).limit(limit).to_list(limit)
    # Convert ObjectId to string for JSON serialization
    for prediction in predictions:
        prediction["_id"] = str(prediction["_id"])
    return predictions

@api_router.get("/model-performance")
async def get_model_performance():
    """Get model performance metrics"""
    performance_data = []
    for model_name, metrics in predictor.model_performance.items():
        performance_data.append(ModelPerformance(
            model_name=model_name,
            accuracy=metrics['accuracy'],
            precision=metrics['precision'],
            recall=metrics['recall'],
            f1_score=metrics['f1_score'],
            roc_auc=metrics['roc_auc']
        ))
    return {
        "best_model": predictor.best_model_name,
        "models": performance_data
    }

@api_router.get("/feature-importance")
async def get_feature_importance(model_name: Optional[str] = None):
    """Get feature importance for model interpretability"""
    importance = predictor.get_feature_importance(model_name)
    # Sort by importance
    sorted_importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    return {
        "model": model_name or predictor.best_model_name,
        "feature_importance": sorted_importance
    }

@api_router.get("/health-stats")
async def get_health_stats():
    """Get aggregate health statistics"""
    total_predictions = await db.patient_history.count_documents({})
    high_risk_count = await db.patient_history.count_documents({"prediction_result.risk_level": "High"})
    medium_risk_count = await db.patient_history.count_documents({"prediction_result.risk_level": "Medium"})
    low_risk_count = await db.patient_history.count_documents({"prediction_result.risk_level": "Low"})
    
    return {
        "total_predictions": total_predictions,
        "risk_distribution": {
            "high": high_risk_count,
            "medium": medium_risk_count,
            "low": low_risk_count
        },
        "high_risk_percentage": round((high_risk_count / total_predictions * 100) if total_predictions > 0 else 0, 2)
    }

@api_router.post("/predict-realtime")
async def predict_realtime(patient_data: PatientInput):
    """Real-time prediction as user fills the form"""
    try:
        # Convert input to dictionary format expected by ML model
        features = {
            'Age': patient_data.age,
            'Sex': patient_data.sex,
            'Cholesterol': patient_data.cholesterol,
            'Systolic_BP': patient_data.systolic_bp,
            'Diastolic_BP': patient_data.diastolic_bp,
            'Heart Rate': patient_data.heart_rate,
            'Diabetes': patient_data.diabetes,
            'Family History': patient_data.family_history,
            'Smoking': patient_data.smoking,
            'Obesity': patient_data.obesity,
            'Alcohol Consumption': patient_data.alcohol_consumption,
            'Exercise Hours Per Week': patient_data.exercise_hours_per_week,
            'Diet': patient_data.diet,
            'Previous Heart Problems': patient_data.previous_heart_problems,
            'Medication Use': patient_data.medication_use,
            'Stress Level': patient_data.stress_level,
            'Sedentary Hours Per Day': patient_data.sedentary_hours_per_day,
            'Income': patient_data.income,
            'BMI': patient_data.bmi,
            'Triglycerides': patient_data.triglycerides,
            'Physical Activity Days Per Week': patient_data.physical_activity_days_per_week,
            'Sleep Hours Per Day': patient_data.sleep_hours_per_day
        }
        
        # Make prediction
        result = predictor.predict(features)
        
        # Return just the cardiovascular risks for real-time display
        return {
            "cardiovascular_risks": result.get('cardiovascular_risks', {}),
            "risk_factors_analysis": result.get('risk_factors_analysis', {}),
            "lifestyle_impact": result.get('lifestyle_impact', {})
        }
        
    except Exception as e:
        logging.error(f"Real-time prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Real-time prediction failed: {str(e)}")

@api_router.post("/analyze-lifestyle-impact")
async def analyze_lifestyle_impact(patient_data: PatientInput):
    """Analyze potential impact of lifestyle changes"""
    try:
        features = {
            'Age': patient_data.age,
            'Sex': patient_data.sex,
            'Cholesterol': patient_data.cholesterol,
            'Systolic_BP': patient_data.systolic_bp,
            'Diastolic_BP': patient_data.diastolic_bp,
            'Heart Rate': patient_data.heart_rate,
            'Diabetes': patient_data.diabetes,
            'Family History': patient_data.family_history,
            'Smoking': patient_data.smoking,
            'Obesity': patient_data.obesity,
            'Alcohol Consumption': patient_data.alcohol_consumption,
            'Exercise Hours Per Week': patient_data.exercise_hours_per_week,
            'Diet': patient_data.diet,
            'Previous Heart Problems': patient_data.previous_heart_problems,
            'Medication Use': patient_data.medication_use,
            'Stress Level': patient_data.stress_level,
            'Sedentary Hours Per Day': patient_data.sedentary_hours_per_day,
            'Income': patient_data.income,
            'BMI': patient_data.bmi,
            'Triglycerides': patient_data.triglycerides,
            'Physical Activity Days Per Week': patient_data.physical_activity_days_per_week,
            'Sleep Hours Per Day': patient_data.sleep_hours_per_day
        }
        
        # Get baseline prediction
        baseline_result = predictor.predict(features)
        
        # Calculate various lifestyle modification scenarios
        scenarios = {}
        
        # Scenario 1: Quit smoking
        if features['Smoking'] == 1:
            modified_features = features.copy()
            modified_features['Smoking'] = 0
            quit_smoking_result = predictor.predict(modified_features)
            scenarios['quit_smoking'] = {
                'description': 'Quit smoking',
                'risk_reduction': max(0, baseline_result['risk_probability'] - quit_smoking_result['risk_probability']),
                'new_risk_level': quit_smoking_result['risk_level'],
                'cardiovascular_improvement': {
                    risk_type: {
                        'reduction': max(0, baseline_result['cardiovascular_risks'][risk_type]['probability'] - 
                                   quit_smoking_result['cardiovascular_risks'][risk_type]['probability'])
                    }
                    for risk_type in baseline_result['cardiovascular_risks']
                }
            }
        
        # Scenario 2: Weight loss (10% BMI reduction)
        if features['BMI'] > 25:
            modified_features = features.copy()
            modified_features['BMI'] = features['BMI'] * 0.9
            weight_loss_result = predictor.predict(modified_features)
            scenarios['weight_loss'] = {
                'description': 'Lose 10% body weight',
                'risk_reduction': max(0, baseline_result['risk_probability'] - weight_loss_result['risk_probability']),
                'new_risk_level': weight_loss_result['risk_level'],
                'cardiovascular_improvement': {
                    risk_type: {
                        'reduction': max(0, baseline_result['cardiovascular_risks'][risk_type]['probability'] - 
                                   weight_loss_result['cardiovascular_risks'][risk_type]['probability'])
                    }
                    for risk_type in baseline_result['cardiovascular_risks']
                }
            }
        
        # Scenario 3: Increase exercise
        if features['Exercise Hours Per Week'] < 5:
            modified_features = features.copy()
            modified_features['Exercise Hours Per Week'] = min(5, features['Exercise Hours Per Week'] + 2.5)
            exercise_result = predictor.predict(modified_features)
            scenarios['increase_exercise'] = {
                'description': 'Add 2.5 hours of exercise per week',
                'risk_reduction': max(0, baseline_result['risk_probability'] - exercise_result['risk_probability']),
                'new_risk_level': exercise_result['risk_level'],
                'cardiovascular_improvement': {
                    risk_type: {
                        'reduction': max(0, baseline_result['cardiovascular_risks'][risk_type]['probability'] - 
                                   exercise_result['cardiovascular_risks'][risk_type]['probability'])
                    }
                    for risk_type in baseline_result['cardiovascular_risks']
                }
            }
        
        # Scenario 4: Improve diet
        if features['Diet'] == 'Unhealthy':
            modified_features = features.copy()
            modified_features['Diet'] = 'Healthy'
            diet_result = predictor.predict(modified_features)
            scenarios['improve_diet'] = {
                'description': 'Switch to healthy diet',
                'risk_reduction': max(0, baseline_result['risk_probability'] - diet_result['risk_probability']),
                'new_risk_level': diet_result['risk_level'],
                'cardiovascular_improvement': {
                    risk_type: {
                        'reduction': max(0, baseline_result['cardiovascular_risks'][risk_type]['probability'] - 
                                   diet_result['cardiovascular_risks'][risk_type]['probability'])
                    }
                    for risk_type in baseline_result['cardiovascular_risks']
                }
            }
        
        return {
            'baseline_risk': baseline_result['cardiovascular_risks'],
            'lifestyle_scenarios': scenarios,
            'recommendations_priority': _get_priority_recommendations(scenarios)
        }
        
    except Exception as e:
        logging.error(f"Lifestyle impact analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lifestyle analysis failed: {str(e)}")

@api_router.get("/continuous-monitoring/{patient_id}")
async def get_continuous_monitoring(patient_id: str):
    """Get continuous risk monitoring data for a patient"""
    try:
        # Get patient's latest assessment
        latest_assessment = await db.patient_history.find_one(
            {"patient_id": patient_id},
            sort=[("timestamp", -1)]
        )
        
        if not latest_assessment:
            raise HTTPException(status_code=404, detail="No assessment found for patient")
        
        # Get patient's risk history (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        risk_history = await db.patient_history.find({
            "patient_id": patient_id,
            "timestamp": {"$gte": thirty_days_ago}
        }).sort("timestamp", -1).to_list(30)
        
        # Calculate risk trends
        risk_trends = []
        for assessment in risk_history:
            if 'cardiovascular_risks' in assessment.get('prediction_result', {}):
                cv_risks = assessment['prediction_result']['cardiovascular_risks']
                risk_trends.append({
                    'timestamp': assessment['timestamp'],
                    'overall_risk': cv_risks.get('overall_cardiovascular', {}).get('probability', 0),
                    'heart_attack_risk': cv_risks.get('heart_attack', {}).get('probability', 0),
                    'stroke_risk': cv_risks.get('stroke', {}).get('probability', 0),
                    'heart_failure_risk': cv_risks.get('heart_failure', {}).get('probability', 0),
                    'arrhythmia_risk': cv_risks.get('arrhythmia', {}).get('probability', 0)
                })
        
        # Generate monitoring alerts based on trends
        alerts = []
        if len(risk_trends) >= 2:
            recent_risk = risk_trends[0]['overall_risk']
            previous_risk = risk_trends[1]['overall_risk']
            
            if recent_risk > previous_risk + 0.1:
                alerts.append("📈 Your cardiovascular risk has increased since last assessment")
            elif recent_risk < previous_risk - 0.1:
                alerts.append("📉 Great progress! Your cardiovascular risk is decreasing")
                
            if recent_risk > 0.7:
                alerts.append("🚨 High risk detected - please consult your healthcare provider")
            elif recent_risk > 0.5:
                alerts.append("⚠️ Moderate risk - consider lifestyle modifications")
        
        # Calculate monitoring score (0-100)
        base_score = 100
        if latest_assessment['prediction_result'].get('risk_level') == 'High':
            base_score -= 30
        elif latest_assessment['prediction_result'].get('risk_level') == 'Medium':
            base_score -= 15
            
        # Adjust for trends
        if len(risk_trends) >= 2 and risk_trends[0]['overall_risk'] > risk_trends[1]['overall_risk']:
            base_score -= 10
            
        monitoring_score = max(0, min(100, base_score))
        
        # Next assessment recommendation
        days_since_last = (datetime.utcnow() - latest_assessment['timestamp']).days
        if latest_assessment['prediction_result'].get('risk_level') == 'High':
            next_assessment_days = 30
        elif latest_assessment['prediction_result'].get('risk_level') == 'Medium':
            next_assessment_days = 90
        else:
            next_assessment_days = 180
            
        next_assessment_due = datetime.utcnow() + timedelta(days=max(0, next_assessment_days - days_since_last))
        
        return {
            'patient_id': patient_id,
            'current_risks': latest_assessment['prediction_result'].get('cardiovascular_risks', {}),
            'risk_trends': risk_trends,
            'monitoring_score': monitoring_score,
            'alerts': alerts,
            'next_assessment_due': next_assessment_due.isoformat(),
            'days_since_last_assessment': days_since_last,
            'assessment_frequency_recommendation': next_assessment_days,
            'total_assessments': len(risk_history)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Continuous monitoring error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Monitoring failed: {str(e)}")

@api_router.post("/update-risk-factors")
async def update_risk_factors(patient_data: PatientInput):
    """Update risk factors and get immediate risk recalculation"""
    try:
        features = {
            'Age': patient_data.age,
            'Sex': patient_data.sex,
            'Cholesterol': patient_data.cholesterol,
            'Systolic_BP': patient_data.systolic_bp,
            'Diastolic_BP': patient_data.diastolic_bp,
            'Heart Rate': patient_data.heart_rate,
            'Diabetes': patient_data.diabetes,
            'Family History': patient_data.family_history,
            'Smoking': patient_data.smoking,
            'Obesity': patient_data.obesity,
            'Alcohol Consumption': patient_data.alcohol_consumption,
            'Exercise Hours Per Week': patient_data.exercise_hours_per_week,
            'Diet': patient_data.diet,
            'Previous Heart Problems': patient_data.previous_heart_problems,
            'Medication Use': patient_data.medication_use,
            'Stress Level': patient_data.stress_level,
            'Sedentary Hours Per Day': patient_data.sedentary_hours_per_day,
            'Income': patient_data.income,
            'BMI': patient_data.bmi,
            'Triglycerides': patient_data.triglycerides,
            'Physical Activity Days Per Week': patient_data.physical_activity_days_per_week,
            'Sleep Hours Per Day': patient_data.sleep_hours_per_day
        }
        
        # Get updated prediction
        result = predictor.predict(features)
        
        # Store as updated risk factors (not full assessment)  
        patient_id = str(uuid.uuid4())
        update_record = {
            'patient_id': patient_id,
            'type': 'risk_factor_update',
            'updated_factors': dict(patient_data),
            'cardiovascular_risks': result['cardiovascular_risks'],
            'timestamp': datetime.utcnow(),
            'risk_change_analysis': result.get('lifestyle_impact', {})
        }
        
        await db.risk_updates.insert_one(update_record)
        
        return {
            'patient_id': patient_id,
            'cardiovascular_risks': result['cardiovascular_risks'],
            'risk_factors_analysis': result.get('risk_factors_analysis', {}),
            'lifestyle_impact': result.get('lifestyle_impact', {}),
            'timestamp': datetime.utcnow().isoformat(),
            'update_type': 'risk_factor_modification'
        }
        
    except Exception as e:
        logging.error(f"Lifestyle impact analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lifestyle analysis failed: {str(e)}")

def _get_priority_recommendations(scenarios):
    """Get prioritized recommendations based on impact"""
    priorities = []
    for scenario_name, scenario_data in scenarios.items():
        priorities.append({
            'action': scenario_data['description'],
            'impact_score': scenario_data['risk_reduction'],
            'priority': 'High' if scenario_data['risk_reduction'] > 0.1 else 'Medium' if scenario_data['risk_reduction'] > 0.05 else 'Low'
        })
    
    return sorted(priorities, key=lambda x: x['impact_score'], reverse=True)

# Include the routers in the main app
app.include_router(api_router)
app.include_router(voice_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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