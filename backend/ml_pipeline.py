import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, classification_report
from sklearn.utils.class_weight import compute_class_weight
import joblib
import os
import logging
from typing import Dict, Any, Tuple
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CardiovascularRiskPredictor:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_columns = []
        self.feature_importance = {}
        self.model_performance = {}
        self.best_model_name = None
        self.best_model = None
        
        # Advanced cardiovascular risk models
        self.risk_models = {
            'heart_attack': None,
            'stroke': None,
            'heart_failure': None,
            'arrhythmia': None
        }
        self.risk_coefficients = {
            'heart_attack': 1.0,
            'stroke': 0.8,
            'heart_failure': 0.7,
            'arrhythmia': 0.6
        }
        
    def load_and_preprocess_data(self, csv_path: str) -> Tuple[pd.DataFrame, pd.Series]:
        """Load and preprocess the heart disease dataset"""
        logger.info("Loading dataset...")
        df = pd.read_csv(csv_path)
        
        # Parse blood pressure
        df['Systolic_BP'] = df['Blood Pressure'].str.split('/').str[0].astype(int)
        df['Diastolic_BP'] = df['Blood Pressure'].str.split('/').str[1].astype(int)
        
        # Drop original blood pressure and non-predictive columns
        df = df.drop(['Patient ID', 'Blood Pressure', 'Country', 'Continent', 'Hemisphere'], axis=1)
        
        # Encode categorical variables
        categorical_columns = ['Sex', 'Diet']
        for col in categorical_columns:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col])
            self.label_encoders[col] = le
        
        # Separate features and target
        X = df.drop('Heart Attack Risk', axis=1)
        y = df['Heart Attack Risk']
        
        self.feature_columns = X.columns.tolist()
        logger.info(f"Dataset loaded with {len(X)} samples and {len(X.columns)} features")
        
        return X, y
    
    def train_models(self, X: pd.DataFrame, y: pd.Series):
        """Train multiple ML models with simplified hyperparameter tuning"""
        logger.info("Starting model training...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Define simplified models (faster training)
        model_configs = {
            'logistic_regression': {
                'model': LogisticRegression(class_weight='balanced', random_state=42, max_iter=1000),
                'use_scaled': False
            },
            'random_forest': {
                'model': RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42, max_depth=10),
                'use_scaled': False
            },
            'gradient_boosting': {
                'model': GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42),
                'use_scaled': False
            }
        }
        
        best_score = 0
        
        for name, config in model_configs.items():
            logger.info(f"Training {name}...")
            
            # Choose data based on model requirements
            if config['use_scaled']:
                X_train_data = X_train_scaled
                X_test_data = X_test_scaled
            else:
                X_train_data = X_train
                X_test_data = X_test
            
            # Train model
            model = config['model']
            model.fit(X_train_data, y_train)
            
            # Make predictions
            y_pred = model.predict(X_test_data)
            y_pred_proba = model.predict_proba(X_test_data)[:, 1]
            
            # Calculate metrics
            metrics = {
                'accuracy': accuracy_score(y_test, y_pred),
                'precision': precision_score(y_test, y_pred),
                'recall': recall_score(y_test, y_pred),
                'f1_score': f1_score(y_test, y_pred),
                'roc_auc': roc_auc_score(y_test, y_pred_proba),
                'best_params': 'default'
            }
            
            self.models[name] = model
            self.model_performance[name] = metrics
            
            # Track best model based on ROC-AUC
            if metrics['roc_auc'] > best_score:
                best_score = metrics['roc_auc']
                self.best_model_name = name
                self.best_model = model
            
            # Extract feature importance
            if hasattr(model, 'feature_importances_'):
                importance = model.feature_importances_
                self.feature_importance[name] = dict(zip(self.feature_columns, importance))
            elif hasattr(model, 'coef_'):
                importance = np.abs(model.coef_[0])
                self.feature_importance[name] = dict(zip(self.feature_columns, importance))
            
            logger.info(f"{name} - ROC-AUC: {metrics['roc_auc']:.4f}, Accuracy: {metrics['accuracy']:.4f}")
        
        logger.info(f"Best model: {self.best_model_name} with ROC-AUC: {best_score:.4f}")
    
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Make comprehensive cardiovascular risk prediction"""
        if not self.best_model:
            raise ValueError("No trained model available")
        
        # Create DataFrame with proper column order
        input_df = pd.DataFrame([features])
        
        # Handle categorical encoding
        for col, encoder in self.label_encoders.items():
            if col in input_df.columns:
                input_df[col] = encoder.transform([features[col]])[0]
        
        # Ensure all columns are present and in correct order
        for col in self.feature_columns:
            if col not in input_df.columns:
                input_df[col] = 0  # Default value for missing features
        
        input_df = input_df[self.feature_columns]
        
        # Scale if neural network
        if self.best_model_name == 'neural_network':
            input_scaled = self.scaler.transform(input_df)
            prediction = self.best_model.predict(input_scaled)[0]
            base_probability = self.best_model.predict_proba(input_scaled)[0]
        else:
            prediction = self.best_model.predict(input_df)[0]
            base_probability = self.best_model.predict_proba(input_df)[0]
        
        # Calculate multiple cardiovascular risks
        heart_attack_prob = float(base_probability[1])
        
        # Calculate derived cardiovascular risks based on risk factors
        stroke_risk = self._calculate_stroke_risk(features, heart_attack_prob)
        heart_failure_risk = self._calculate_heart_failure_risk(features, heart_attack_prob)
        arrhythmia_risk = self._calculate_arrhythmia_risk(features, heart_attack_prob)
        
        # Calculate overall cardiovascular risk score
        overall_cv_risk = (heart_attack_prob * 0.4 + stroke_risk * 0.25 + 
                          heart_failure_risk * 0.2 + arrhythmia_risk * 0.15)
        
        # Risk level classification
        def get_risk_level(prob):
            if prob > 0.7: return 'High'
            elif prob > 0.4: return 'Medium'
            else: return 'Low'
        
        return {
            'prediction': int(prediction),
            'cardiovascular_risks': {
                'heart_attack': {
                    'probability': heart_attack_prob,
                    'risk_level': get_risk_level(heart_attack_prob)
                },
                'stroke': {
                    'probability': stroke_risk,
                    'risk_level': get_risk_level(stroke_risk)
                },
                'heart_failure': {
                    'probability': heart_failure_risk,
                    'risk_level': get_risk_level(heart_failure_risk)
                },
                'arrhythmia': {
                    'probability': arrhythmia_risk,
                    'risk_level': get_risk_level(arrhythmia_risk)
                },
                'overall_cardiovascular': {
                    'probability': overall_cv_risk,
                    'risk_level': get_risk_level(overall_cv_risk)
                }
            },
            'risk_probability': heart_attack_prob,  # Backward compatibility
            'model_used': self.best_model_name,
            'risk_level': get_risk_level(heart_attack_prob),  # Backward compatibility
            'risk_factors_analysis': self._analyze_risk_factors(features),
            'lifestyle_impact': self._calculate_lifestyle_impact(features)
        }
    
    def _calculate_stroke_risk(self, features: Dict[str, Any], base_risk: float) -> float:
        """Calculate stroke risk based on specific risk factors"""
        stroke_multiplier = 1.0
        
        # Age factor
        age = features.get('Age', 0)
        if age > 65: stroke_multiplier *= 1.5
        elif age > 55: stroke_multiplier *= 1.3
        
        # Blood pressure factor
        systolic = features.get('Systolic_BP', 120)
        if systolic > 160: stroke_multiplier *= 1.8
        elif systolic > 140: stroke_multiplier *= 1.4
        
        # Diabetes factor
        if features.get('Diabetes', 0): stroke_multiplier *= 1.6
        
        # Smoking factor
        if features.get('Smoking', 0): stroke_multiplier *= 1.5
        
        return min(base_risk * stroke_multiplier * 0.8, 1.0)
    
    def _calculate_heart_failure_risk(self, features: Dict[str, Any], base_risk: float) -> float:
        """Calculate heart failure risk"""
        hf_multiplier = 1.0
        
        # Age factor
        age = features.get('Age', 0)
        if age > 70: hf_multiplier *= 1.6
        elif age > 60: hf_multiplier *= 1.3
        
        # BMI factor
        bmi = features.get('BMI', 25)
        if bmi > 35: hf_multiplier *= 1.5
        elif bmi > 30: hf_multiplier *= 1.3
        
        # Previous heart problems
        if features.get('Previous Heart Problems', 0): hf_multiplier *= 2.0
        
        # Sedentary lifestyle
        sedentary = features.get('Sedentary Hours Per Day', 8)
        if sedentary > 10: hf_multiplier *= 1.3
        
        return min(base_risk * hf_multiplier * 0.7, 1.0)
    
    def _calculate_arrhythmia_risk(self, features: Dict[str, Any], base_risk: float) -> float:
        """Calculate arrhythmia risk"""
        arr_multiplier = 1.0
        
        # Stress factor
        stress = features.get('Stress Level', 5)
        if stress > 8: arr_multiplier *= 1.4
        elif stress > 6: arr_multiplier *= 1.2
        
        # Alcohol consumption
        if features.get('Alcohol Consumption', 0): arr_multiplier *= 1.3
        
        # Sleep factor
        sleep = features.get('Sleep Hours Per Day', 7)
        if sleep < 6 or sleep > 9: arr_multiplier *= 1.2
        
        # Heart rate
        hr = features.get('Heart Rate', 70)
        if hr > 100 or hr < 50: arr_multiplier *= 1.4
        
        return min(base_risk * arr_multiplier * 0.6, 1.0)
    
    def _analyze_risk_factors(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze individual risk factors"""
        analysis = {}
        
        # Get feature importance if available
        if self.best_model_name in self.feature_importance:
            importance = self.feature_importance[self.best_model_name]
            sorted_factors = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10]
            analysis['top_risk_factors'] = [
                {'factor': factor, 'importance': float(imp)} 
                for factor, imp in sorted_factors
            ]
        
        # Risk factor categories
        analysis['risk_categories'] = {
            'modifiable_high_risk': [],
            'modifiable_medium_risk': [],
            'non_modifiable': []
        }
        
        # Categorize risk factors
        age = features.get('Age', 0)
        if age > 65:
            analysis['risk_categories']['non_modifiable'].append('Advanced age (>65)')
        
        if features.get('Smoking', 0):
            analysis['risk_categories']['modifiable_high_risk'].append('Smoking')
        
        bmi = features.get('BMI', 25)
        if bmi > 30:
            analysis['risk_categories']['modifiable_high_risk'].append('Obesity')
        elif bmi > 25:
            analysis['risk_categories']['modifiable_medium_risk'].append('Overweight')
        
        systolic = features.get('Systolic_BP', 120)
        if systolic > 140:
            analysis['risk_categories']['modifiable_high_risk'].append('High blood pressure')
        
        cholesterol = features.get('Cholesterol', 200)
        if cholesterol > 240:
            analysis['risk_categories']['modifiable_high_risk'].append('High cholesterol')
        
        exercise = features.get('Exercise Hours Per Week', 0)
        if exercise < 2.5:
            analysis['risk_categories']['modifiable_medium_risk'].append('Insufficient exercise')
        
        return analysis
    
    def _calculate_lifestyle_impact(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate potential impact of lifestyle changes"""
        scenarios = {}
        
        # Smoking cessation impact
        if features.get('Smoking', 0):
            modified_features = features.copy()
            modified_features['Smoking'] = 0
            improved_result = self.predict(modified_features)
            original_risk = features.get('risk_probability', 0.5)
            scenarios['quit_smoking'] = {
                'risk_reduction': max(0, original_risk - improved_result['risk_probability']),
                'description': 'Quitting smoking'
            }
        
        # Weight loss impact
        current_bmi = features.get('BMI', 25)
        if current_bmi > 25:
            modified_features = features.copy()
            modified_features['BMI'] = min(25, current_bmi * 0.9)  # 10% weight loss
            improved_result = self.predict(modified_features)
            original_risk = features.get('risk_probability', 0.5)
            scenarios['weight_loss'] = {
                'risk_reduction': max(0, original_risk - improved_result['risk_probability']),
                'description': 'Losing 10% body weight'
            }
        
        # Exercise increase impact
        current_exercise = features.get('Exercise Hours Per Week', 0)
        if current_exercise < 5:
            modified_features = features.copy()
            modified_features['Exercise Hours Per Week'] = min(5, current_exercise + 2.5)
            improved_result = self.predict(modified_features)
            original_risk = features.get('risk_probability', 0.5)
            scenarios['increase_exercise'] = {
                'risk_reduction': max(0, original_risk - improved_result['risk_probability']),
                'description': 'Adding 2.5 hours of exercise per week'
            }
        
        return scenarios
    
    def get_feature_importance(self, model_name: str = None) -> Dict[str, float]:
        """Get feature importance for specified model or best model"""
        model_name = model_name or self.best_model_name
        return self.feature_importance.get(model_name, {})
    
    def save_models(self, models_dir: str = 'models'):
        """Save trained models and preprocessors"""
        Path(models_dir).mkdir(exist_ok=True)
        
        # Save best model and scaler
        joblib.dump(self.best_model, f'{models_dir}/best_model.pkl')
        joblib.dump(self.scaler, f'{models_dir}/scaler.pkl')
        joblib.dump(self.label_encoders, f'{models_dir}/label_encoders.pkl')
        joblib.dump(self.feature_columns, f'{models_dir}/feature_columns.pkl')
        joblib.dump(self.model_performance, f'{models_dir}/model_performance.pkl')
        joblib.dump(self.feature_importance, f'{models_dir}/feature_importance.pkl')
        joblib.dump(self.best_model_name, f'{models_dir}/best_model_name.pkl')
        
        logger.info(f"Models saved to {models_dir}")
    
    def load_models(self, models_dir: str = 'models'):
        """Load trained models and preprocessors"""
        self.best_model = joblib.load(f'{models_dir}/best_model.pkl')
        self.scaler = joblib.load(f'{models_dir}/scaler.pkl')
        self.label_encoders = joblib.load(f'{models_dir}/label_encoders.pkl')
        self.feature_columns = joblib.load(f'{models_dir}/feature_columns.pkl')
        self.model_performance = joblib.load(f'{models_dir}/model_performance.pkl')
        self.feature_importance = joblib.load(f'{models_dir}/feature_importance.pkl')
        self.best_model_name = joblib.load(f'{models_dir}/best_model_name.pkl')
        
        logger.info("Models loaded successfully")

def train_and_save_models():
    """Main function to train and save models"""
    predictor = HeartDiseasePredictor()
    
    # Load and preprocess data
    X, y = predictor.load_and_preprocess_data('/app/heart_attack_prediction_dataset.csv')
    
    # Train models
    predictor.train_models(X, y)
    
    # Save models
    predictor.save_models('/app/backend/models')
    
    return predictor

if __name__ == "__main__":
    train_and_save_models()