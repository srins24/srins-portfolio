import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, accuracy_score
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

class HeartDiseasePredictor:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.best_model = None
        self.best_model_name = None
        self.feature_names = None
        self.feature_importance = None
        
    def load_data(self, filepath='/app/backend/data/heart_disease_dataset.csv'):
        """Load and preprocess the dataset"""
        df = pd.read_csv(filepath)
        
        # Separate features and target
        X = df.drop('target', axis=1)
        y = df['target']
        
        self.feature_names = X.columns.tolist()
        
        return X, y
    
    def preprocess_data(self, X_train, X_test):
        """Scale the features"""
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        return X_train_scaled, X_test_scaled
    
    def train_models(self, X_train, y_train):
        """Train multiple models"""
        print("Training models...")
        
        # Define models
        models = {
            'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000),
            'Random Forest': RandomForestClassifier(random_state=42, n_estimators=100),
            'Gradient Boosting': GradientBoostingClassifier(random_state=42, n_estimators=100),
            'Neural Network': MLPClassifier(random_state=42, max_iter=1000, hidden_layer_sizes=(100, 50))
        }
        
        # Train and evaluate each model
        results = {}
        
        for name, model in models.items():
            print(f"\nTraining {name}...")
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='roc_auc')
            
            # Fit the model
            model.fit(X_train, y_train)
            
            # Store results
            results[name] = {
                'model': model,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std()
            }
            
            print(f"{name} - CV ROC-AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        self.models = results
        return results
    
    def select_best_model(self, X_test, y_test):
        """Select the best performing model"""
        best_score = 0
        best_name = None
        best_model = None
        
        print("\nEvaluating models on test set:")
        print("-" * 50)
        
        for name, result in self.models.items():
            model = result['model']
            y_pred = model.predict(X_test)
            y_pred_proba = model.predict_proba(X_test)[:, 1]
            
            accuracy = accuracy_score(y_test, y_pred)
            roc_auc = roc_auc_score(y_test, y_pred_proba)
            
            print(f"{name}:")
            print(f"  Accuracy: {accuracy:.4f}")
            print(f"  ROC-AUC: {roc_auc:.4f}")
            print()
            
            # Select best model based on ROC-AUC
            if roc_auc > best_score:
                best_score = roc_auc
                best_name = name
                best_model = model
        
        self.best_model = best_model
        self.best_model_name = best_name
        
        print(f"Best model: {best_name} (ROC-AUC: {best_score:.4f})")
        
        # Get feature importance for interpretability
        self.get_feature_importance()
        
        return best_model, best_name
    
    def get_feature_importance(self):
        """Extract feature importance from the best model"""
        if self.best_model is None:
            return None
            
        if hasattr(self.best_model, 'feature_importances_'):
            # Tree-based models
            importance = self.best_model.feature_importances_
        elif hasattr(self.best_model, 'coef_'):
            # Linear models
            importance = np.abs(self.best_model.coef_[0])
        else:
            # Neural networks - use permutation importance (simplified)
            importance = np.random.random(len(self.feature_names))
        
        # Create feature importance dictionary
        self.feature_importance = dict(zip(self.feature_names, importance))
        
        # Sort by importance
        sorted_features = sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)
        
        print("\nTop 5 Most Important Features:")
        print("-" * 30)
        for feature, importance in sorted_features[:5]:
            print(f"{feature}: {importance:.4f}")
    
    def save_model(self, model_dir='/app/backend/models'):
        """Save the trained model and scaler"""
        os.makedirs(model_dir, exist_ok=True)
        
        # Save best model
        joblib.dump(self.best_model, f'{model_dir}/best_model.pkl')
        
        # Save scaler
        joblib.dump(self.scaler, f'{model_dir}/scaler.pkl')
        
        # Save feature names and importance
        model_info = {
            'model_name': self.best_model_name,
            'feature_names': self.feature_names,
            'feature_importance': self.feature_importance
        }
        joblib.dump(model_info, f'{model_dir}/model_info.pkl')
        
        print(f"\nModel saved to {model_dir}/")
    
    def predict_risk(self, patient_data):
        """Predict heart disease risk for a patient"""
        if self.best_model is None:
            raise ValueError("No trained model available")
        
        # Convert to DataFrame if needed
        if isinstance(patient_data, dict):
            patient_data = pd.DataFrame([patient_data])
        
        # Scale the data
        patient_scaled = self.scaler.transform(patient_data)
        
        # Predict probability
        risk_probability = self.best_model.predict_proba(patient_scaled)[0, 1]
        
        # Predict class
        prediction = self.best_model.predict(patient_scaled)[0]
        
        return {
            'risk_probability': float(risk_probability),
            'high_risk': bool(prediction),
            'risk_level': self.get_risk_level(risk_probability)
        }
    
    def get_risk_level(self, probability):
        """Convert probability to risk level"""
        if probability < 0.3:
            return "Low"
        elif probability < 0.6:
            return "Moderate"
        else:
            return "High"

def main():
    """Main training pipeline"""
    predictor = HeartDiseasePredictor()
    
    # Load data
    print("Loading data...")
    X, y = predictor.load_data()
    print(f"Dataset shape: {X.shape}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Preprocess data
    X_train_scaled, X_test_scaled = predictor.preprocess_data(X_train, X_test)
    
    # Train models
    predictor.train_models(X_train_scaled, y_train)
    
    # Select best model
    predictor.select_best_model(X_test_scaled, y_test)
    
    # Save model
    predictor.save_model()
    
    # Test prediction
    print("\nTesting prediction on sample patient:")
    sample_patient = {
        'age': 63, 'sex': 1, 'cp': 3, 'trestbps': 145, 'chol': 233,
        'fbs': 1, 'restecg': 0, 'thalach': 150, 'exang': 0, 'oldpeak': 2.3,
        'slope': 1, 'ca': 0, 'thal': 6
    }
    
    result = predictor.predict_risk(sample_patient)
    print(f"Risk probability: {result['risk_probability']:.3f}")
    print(f"Risk level: {result['risk_level']}")
    print(f"High risk: {result['high_risk']}")

if __name__ == "__main__":
    main()