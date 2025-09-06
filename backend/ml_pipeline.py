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

class HeartDiseasePredictor:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_columns = []
        self.feature_importance = {}
        self.model_performance = {}
        self.best_model_name = None
        self.best_model = None
        
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
        """Train multiple ML models with hyperparameter tuning"""
        logger.info("Starting model training...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Handle class imbalance
        class_weights = compute_class_weight('balanced', classes=np.unique(y_train), y=y_train)
        class_weight_dict = dict(zip(np.unique(y_train), class_weights))
        
        # Define models with hyperparameter grids
        model_configs = {
            'logistic_regression': {
                'model': LogisticRegression(class_weight='balanced', random_state=42),
                'params': {
                    'C': [0.1, 1, 10, 100],
                    'penalty': ['l1', 'l2'],
                    'solver': ['liblinear']
                }
            },
            'random_forest': {
                'model': RandomForestClassifier(class_weight='balanced', random_state=42),
                'params': {
                    'n_estimators': [100, 200, 300],
                    'max_depth': [10, 20, None],
                    'min_samples_split': [2, 5, 10]
                }
            },
            'gradient_boosting': {
                'model': GradientBoostingClassifier(random_state=42),
                'params': {
                    'n_estimators': [100, 200],
                    'learning_rate': [0.05, 0.1, 0.2],
                    'max_depth': [3, 5, 7]
                }
            },
            'neural_network': {
                'model': MLPClassifier(random_state=42, max_iter=1000),
                'params': {
                    'hidden_layer_sizes': [(50,), (100,), (50, 25)],
                    'alpha': [0.001, 0.01, 0.1],
                    'learning_rate': ['constant', 'adaptive']
                }
            }
        }
        
        best_score = 0
        
        for name, config in model_configs.items():
            logger.info(f"Training {name}...")
            
            # Grid search with cross-validation
            grid_search = GridSearchCV(
                config['model'], 
                config['params'], 
                cv=5, 
                scoring='roc_auc',
                n_jobs=-1
            )
            
            if name == 'neural_network':
                grid_search.fit(X_train_scaled, y_train)
                y_pred = grid_search.predict(X_test_scaled)
                y_pred_proba = grid_search.predict_proba(X_test_scaled)[:, 1]
            else:
                grid_search.fit(X_train, y_train)
                y_pred = grid_search.predict(X_test)
                y_pred_proba = grid_search.predict_proba(X_test)[:, 1]
            
            # Calculate metrics
            metrics = {
                'accuracy': accuracy_score(y_test, y_pred),
                'precision': precision_score(y_test, y_pred),
                'recall': recall_score(y_test, y_pred),
                'f1_score': f1_score(y_test, y_pred),
                'roc_auc': roc_auc_score(y_test, y_pred_proba),
                'best_params': grid_search.best_params_
            }
            
            self.models[name] = grid_search.best_estimator_
            self.model_performance[name] = metrics
            
            # Track best model based on ROC-AUC
            if metrics['roc_auc'] > best_score:
                best_score = metrics['roc_auc']
                self.best_model_name = name
                self.best_model = grid_search.best_estimator_
            
            # Extract feature importance
            if hasattr(grid_search.best_estimator_, 'feature_importances_'):
                importance = grid_search.best_estimator_.feature_importances_
                self.feature_importance[name] = dict(zip(self.feature_columns, importance))
            elif hasattr(grid_search.best_estimator_, 'coef_'):
                importance = np.abs(grid_search.best_estimator_.coef_[0])
                self.feature_importance[name] = dict(zip(self.feature_columns, importance))
            
            logger.info(f"{name} - ROC-AUC: {metrics['roc_auc']:.4f}, Accuracy: {metrics['accuracy']:.4f}")
        
        logger.info(f"Best model: {self.best_model_name} with ROC-AUC: {best_score:.4f}")
    
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Make prediction using the best model"""
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
            probability = self.best_model.predict_proba(input_scaled)[0]
        else:
            prediction = self.best_model.predict(input_df)[0]
            probability = self.best_model.predict_proba(input_df)[0]
        
        return {
            'prediction': int(prediction),
            'risk_probability': float(probability[1]),
            'model_used': self.best_model_name,
            'risk_level': 'High' if probability[1] > 0.7 else 'Medium' if probability[1] > 0.3 else 'Low'
        }
    
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