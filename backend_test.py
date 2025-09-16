#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Heart Disease Risk Prediction API
Tests all endpoints with proper error handling and validation
"""

import requests
import json
import sys
from datetime import datetime
import time

# Get backend URL from frontend .env
BACKEND_URL = "https://heartvoice-1.preview.emergentagent.com/api"

# Test data for prediction endpoint - comprehensive patient data for advanced testing
SAMPLE_PATIENT_DATA = {
    "age": 55,
    "sex": "Male", 
    "cholesterol": 280,
    "systolic_bp": 160,
    "diastolic_bp": 95,
    "heart_rate": 90,
    "diabetes": 1,
    "family_history": 1,
    "smoking": 1,
    "obesity": 0,
    "alcohol_consumption": 1,
    "exercise_hours_per_week": 1.5,
    "diet": "Unhealthy",
    "previous_heart_problems": 0,
    "medication_use": 1,
    "stress_level": 8,
    "sedentary_hours_per_day": 10.0,
    "income": 75000,
    "bmi": 32.0,
    "triglycerides": 220,
    "physical_activity_days_per_week": 2,
    "sleep_hours_per_day": 6
}

# Invalid test data for error handling
INVALID_PATIENT_DATA = {
    "age": 150,  # Invalid age
    "sex": "Male",
    "cholesterol": 50,  # Invalid cholesterol
    "systolic_bp": 300,  # Invalid BP
    "diastolic_bp": 200,  # Invalid BP
    "heart_rate": 300,  # Invalid heart rate
    "diabetes": 2,  # Invalid value
    "family_history": 1,
    "smoking": 1,
    "obesity": 0,
    "alcohol_consumption": 1,
    "exercise_hours_per_week": 2.5,
    "diet": "Average",
    "previous_heart_problems": 0,
    "medication_use": 1,
    "stress_level": 7,
    "sedentary_hours_per_day": 8.0,
    "income": 50000,
    "bmi": 28.5,
    "triglycerides": 200,
    "physical_activity_days_per_week": 3,
    "sleep_hours_per_day": 7
}

class BackendTester:
    def __init__(self):
        self.results = []
        self.patient_id = None
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def test_health_check(self):
        """Test basic health check endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "status" in data:
                    self.log_result("Health Check", True, f"API is active. Response: {data}")
                    return True
                else:
                    self.log_result("Health Check", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_prediction_endpoint(self):
        """Test the main prediction endpoint with valid data"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/predict",
                json=SAMPLE_PATIENT_DATA,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["patient_id", "prediction", "risk_probability", "risk_level", "model_used", "timestamp", "recommendations"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_result("Prediction Endpoint", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Validate data types and ranges
                if not isinstance(data["prediction"], int) or data["prediction"] not in [0, 1]:
                    self.log_result("Prediction Endpoint", False, f"Invalid prediction value: {data['prediction']}")
                    return False
                
                if not isinstance(data["risk_probability"], (int, float)) or not (0 <= data["risk_probability"] <= 1):
                    self.log_result("Prediction Endpoint", False, f"Invalid risk probability: {data['risk_probability']}")
                    return False
                
                if data["risk_level"] not in ["Low", "Medium", "High"]:
                    self.log_result("Prediction Endpoint", False, f"Invalid risk level: {data['risk_level']}")
                    return False
                
                if not isinstance(data["recommendations"], list) or len(data["recommendations"]) == 0:
                    self.log_result("Prediction Endpoint", False, f"Invalid recommendations: {data['recommendations']}")
                    return False
                
                # Store patient ID for later tests
                self.patient_id = data["patient_id"]
                
                self.log_result("Prediction Endpoint", True, 
                              f"Prediction successful. Risk: {data['risk_level']} ({data['risk_probability']:.3f}), Model: {data['model_used']}")
                return True
            else:
                self.log_result("Prediction Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Prediction Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_prediction_error_handling(self):
        """Test prediction endpoint with invalid data"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/predict",
                json=INVALID_PATIENT_DATA,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 422:  # Validation error expected
                self.log_result("Prediction Error Handling", True, "Correctly rejected invalid input with 422 status")
                return True
            elif response.status_code == 400:  # Bad request also acceptable
                self.log_result("Prediction Error Handling", True, "Correctly rejected invalid input with 400 status")
                return True
            else:
                self.log_result("Prediction Error Handling", False, f"Unexpected status {response.status_code} for invalid data")
                return False
                
        except Exception as e:
            self.log_result("Prediction Error Handling", False, f"Error: {str(e)}")
            return False
    
    def test_model_performance(self):
        """Test model performance endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/model-performance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if "best_model" not in data or "models" not in data:
                    self.log_result("Model Performance", False, f"Missing required fields in response: {data}")
                    return False
                
                if not isinstance(data["models"], list) or len(data["models"]) == 0:
                    self.log_result("Model Performance", False, f"No model performance data found: {data}")
                    return False
                
                # Check first model structure
                model = data["models"][0]
                required_metrics = ["model_name", "accuracy", "precision", "recall", "f1_score", "roc_auc"]
                missing_metrics = [metric for metric in required_metrics if metric not in model]
                
                if missing_metrics:
                    self.log_result("Model Performance", False, f"Missing metrics: {missing_metrics}")
                    return False
                
                self.log_result("Model Performance", True, 
                              f"Performance data retrieved. Best model: {data['best_model']}, Models count: {len(data['models'])}")
                return True
            else:
                self.log_result("Model Performance", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Model Performance", False, f"Error: {str(e)}")
            return False
    
    def test_feature_importance(self):
        """Test feature importance endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/feature-importance", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if "model" not in data or "feature_importance" not in data:
                    self.log_result("Feature Importance", False, f"Missing required fields: {data}")
                    return False
                
                if not isinstance(data["feature_importance"], dict) or len(data["feature_importance"]) == 0:
                    self.log_result("Feature Importance", False, f"No feature importance data: {data}")
                    return False
                
                # Check if features are sorted by importance (descending)
                importance_values = list(data["feature_importance"].values())
                if importance_values != sorted(importance_values, reverse=True):
                    self.log_result("Feature Importance", False, "Features not sorted by importance")
                    return False
                
                self.log_result("Feature Importance", True, 
                              f"Feature importance retrieved for model: {data['model']}, Features count: {len(data['feature_importance'])}")
                return True
            else:
                self.log_result("Feature Importance", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Feature Importance", False, f"Error: {str(e)}")
            return False
    
    def test_health_stats(self):
        """Test health statistics endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/health-stats", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                required_fields = ["total_predictions", "risk_distribution", "high_risk_percentage"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Health Stats", False, f"Missing fields: {missing_fields}")
                    return False
                
                if "high" not in data["risk_distribution"] or "medium" not in data["risk_distribution"] or "low" not in data["risk_distribution"]:
                    self.log_result("Health Stats", False, f"Invalid risk distribution format: {data['risk_distribution']}")
                    return False
                
                # Validate data types
                if not isinstance(data["total_predictions"], int):
                    self.log_result("Health Stats", False, f"Invalid total_predictions type: {type(data['total_predictions'])}")
                    return False
                
                self.log_result("Health Stats", True, 
                              f"Health stats retrieved. Total predictions: {data['total_predictions']}, High risk %: {data['high_risk_percentage']}")
                return True
            else:
                self.log_result("Health Stats", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Health Stats", False, f"Error: {str(e)}")
            return False
    
    def test_recent_predictions(self):
        """Test recent predictions endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/recent-predictions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_result("Recent Predictions", False, f"Expected list, got: {type(data)}")
                    return False
                
                # If we have predictions, validate structure
                if len(data) > 0:
                    prediction = data[0]
                    required_fields = ["patient_id", "patient_data", "prediction_result", "timestamp"]
                    missing_fields = [field for field in required_fields if field not in prediction]
                    
                    if missing_fields:
                        self.log_result("Recent Predictions", False, f"Missing fields in prediction: {missing_fields}")
                        return False
                
                self.log_result("Recent Predictions", True, f"Recent predictions retrieved. Count: {len(data)}")
                return True
            else:
                self.log_result("Recent Predictions", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Recent Predictions", False, f"Error: {str(e)}")
            return False
    
    def test_patient_history(self):
        """Test patient history endpoint if we have a patient ID"""
        if not self.patient_id:
            self.log_result("Patient History", False, "No patient ID available from previous tests")
            return False
            
        try:
            response = requests.get(f"{BACKEND_URL}/patient-history/{self.patient_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                required_fields = ["patient_id", "patient_data", "prediction_result", "timestamp"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Patient History", False, f"Missing fields: {missing_fields}")
                    return False
                
                if data["patient_id"] != self.patient_id:
                    self.log_result("Patient History", False, f"Patient ID mismatch: expected {self.patient_id}, got {data['patient_id']}")
                    return False
                
                self.log_result("Patient History", True, f"Patient history retrieved for ID: {self.patient_id}")
                return True
            elif response.status_code == 404:
                self.log_result("Patient History", False, f"Patient not found: {self.patient_id}")
                return False
            else:
                self.log_result("Patient History", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Patient History", False, f"Error: {str(e)}")
            return False

    def test_enhanced_prediction_endpoint(self):
        """Test the enhanced prediction endpoint with multiple cardiovascular risks"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/predict",
                json=SAMPLE_PATIENT_DATA,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response has cardiovascular_risks (enhanced feature)
                if "cardiovascular_risks" in data:
                    cv_risks = data["cardiovascular_risks"]
                    
                    # Verify all required risk types
                    required_risks = ["heart_attack", "stroke", "heart_failure", "arrhythmia", "overall_cardiovascular"]
                    missing_risks = [risk for risk in required_risks if risk not in cv_risks]
                    
                    if missing_risks:
                        self.log_result("Enhanced Prediction - Multiple Risks", False, f"Missing cardiovascular risks: {missing_risks}")
                        return False
                    
                    # Verify each risk has probability and risk_level
                    for risk_type, risk_data in cv_risks.items():
                        if "probability" not in risk_data or "risk_level" not in risk_data:
                            self.log_result("Enhanced Prediction - Multiple Risks", False, f"Missing probability/risk_level for {risk_type}")
                            return False
                        
                        if not isinstance(risk_data["probability"], (int, float)) or not (0 <= risk_data["probability"] <= 1):
                            self.log_result("Enhanced Prediction - Multiple Risks", False, f"Invalid probability for {risk_type}: {risk_data['probability']}")
                            return False
                        
                        if risk_data["risk_level"] not in ["Low", "Medium", "High"]:
                            self.log_result("Enhanced Prediction - Multiple Risks", False, f"Invalid risk level for {risk_type}: {risk_data['risk_level']}")
                            return False
                    
                    self.log_result("Enhanced Prediction - Multiple Risks", True, 
                                  f"Multiple cardiovascular risks returned successfully. Heart attack: {cv_risks['heart_attack']['risk_level']}, Stroke: {cv_risks['stroke']['risk_level']}, Overall: {cv_risks['overall_cardiovascular']['risk_level']}")
                    return True
                else:
                    self.log_result("Enhanced Prediction - Multiple Risks", False, "No cardiovascular_risks object found in response")
                    return False
                    
            else:
                self.log_result("Enhanced Prediction - Multiple Risks", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Enhanced Prediction - Multiple Risks", False, f"Error: {str(e)}")
            return False

    def test_risk_factors_analysis(self):
        """Test risk factors analysis in prediction response"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/predict",
                json=SAMPLE_PATIENT_DATA,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "risk_factors_analysis" not in data:
                    self.log_result("Risk Factors Analysis", False, "No risk_factors_analysis found in response")
                    return False
                
                analysis = data["risk_factors_analysis"]
                
                # Check for top_risk_factors
                if "top_risk_factors" in analysis:
                    if not isinstance(analysis["top_risk_factors"], list):
                        self.log_result("Risk Factors Analysis", False, "top_risk_factors should be a list")
                        return False
                    
                    # Verify structure of risk factors
                    for factor in analysis["top_risk_factors"]:
                        if "factor" not in factor or "importance" not in factor:
                            self.log_result("Risk Factors Analysis", False, f"Invalid risk factor structure: {factor}")
                            return False
                
                # Check for risk_categories
                if "risk_categories" in analysis:
                    categories = analysis["risk_categories"]
                    required_categories = ["modifiable_high_risk", "modifiable_medium_risk", "non_modifiable"]
                    
                    for category in required_categories:
                        if category not in categories:
                            self.log_result("Risk Factors Analysis", False, f"Missing risk category: {category}")
                            return False
                        
                        if not isinstance(categories[category], list):
                            self.log_result("Risk Factors Analysis", False, f"Risk category {category} should be a list")
                            return False
                
                self.log_result("Risk Factors Analysis", True, 
                              f"Risk factors analysis working. Top factors count: {len(analysis.get('top_risk_factors', []))}")
                return True
                
            else:
                self.log_result("Risk Factors Analysis", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Risk Factors Analysis", False, f"Error: {str(e)}")
            return False

    def test_realtime_prediction_endpoint(self):
        """Test the real-time prediction endpoint"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/predict-realtime",
                json=SAMPLE_PATIENT_DATA,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return cardiovascular_risks without saving to database
                required_fields = ["cardiovascular_risks", "risk_factors_analysis", "lifestyle_impact"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Real-time Prediction", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify cardiovascular_risks structure
                cv_risks = data["cardiovascular_risks"]
                required_risks = ["heart_attack", "stroke", "heart_failure", "arrhythmia", "overall_cardiovascular"]
                
                for risk_type in required_risks:
                    if risk_type not in cv_risks:
                        self.log_result("Real-time Prediction", False, f"Missing risk type: {risk_type}")
                        return False
                    
                    risk_data = cv_risks[risk_type]
                    if "probability" not in risk_data or "risk_level" not in risk_data:
                        self.log_result("Real-time Prediction", False, f"Missing probability/risk_level for {risk_type}")
                        return False
                
                self.log_result("Real-time Prediction", True, 
                              f"Real-time prediction working. Overall CV risk: {cv_risks['overall_cardiovascular']['risk_level']}")
                return True
                
            else:
                self.log_result("Real-time Prediction", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Real-time Prediction", False, f"Error: {str(e)}")
            return False

    def test_lifestyle_impact_analysis_endpoint(self):
        """Test the lifestyle impact analysis endpoint"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/analyze-lifestyle-impact",
                json=SAMPLE_PATIENT_DATA,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                required_fields = ["baseline_risk", "lifestyle_scenarios", "recommendations_priority"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Lifestyle Impact Analysis", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify baseline_risk structure
                baseline_risk = data["baseline_risk"]
                required_risks = ["heart_attack", "stroke", "heart_failure", "arrhythmia", "overall_cardiovascular"]
                
                for risk_type in required_risks:
                    if risk_type not in baseline_risk:
                        self.log_result("Lifestyle Impact Analysis", False, f"Missing baseline risk type: {risk_type}")
                        return False
                
                # Verify lifestyle scenarios
                scenarios = data["lifestyle_scenarios"]
                expected_scenarios = ["quit_smoking", "weight_loss", "increase_exercise", "improve_diet"]
                
                # Check if at least some scenarios are present (based on patient data)
                scenario_count = len(scenarios)
                if scenario_count == 0:
                    self.log_result("Lifestyle Impact Analysis", False, "No lifestyle scenarios generated")
                    return False
                
                # Verify scenario structure
                for scenario_name, scenario_data in scenarios.items():
                    required_scenario_fields = ["description", "risk_reduction", "new_risk_level", "cardiovascular_improvement"]
                    missing_scenario_fields = [field for field in required_scenario_fields if field not in scenario_data]
                    
                    if missing_scenario_fields:
                        self.log_result("Lifestyle Impact Analysis", False, f"Missing fields in scenario {scenario_name}: {missing_scenario_fields}")
                        return False
                
                # Verify recommendations priority
                recommendations = data["recommendations_priority"]
                if not isinstance(recommendations, list):
                    self.log_result("Lifestyle Impact Analysis", False, "recommendations_priority should be a list")
                    return False
                
                for rec in recommendations:
                    if "action" not in rec or "impact_score" not in rec or "priority" not in rec:
                        self.log_result("Lifestyle Impact Analysis", False, f"Invalid recommendation structure: {rec}")
                        return False
                
                self.log_result("Lifestyle Impact Analysis", True, 
                              f"Lifestyle impact analysis working. Scenarios: {list(scenarios.keys())}, Recommendations: {len(recommendations)}")
                return True
                
            else:
                self.log_result("Lifestyle Impact Analysis", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Lifestyle Impact Analysis", False, f"Error: {str(e)}")
            return False

    def test_lifestyle_impact_in_prediction(self):
        """Test lifestyle impact scenarios in regular prediction response"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/predict",
                json=SAMPLE_PATIENT_DATA,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "lifestyle_impact" not in data:
                    self.log_result("Lifestyle Impact in Prediction", False, "No lifestyle_impact found in prediction response")
                    return False
                
                lifestyle_impact = data["lifestyle_impact"]
                
                # Based on our sample data, we should have scenarios for:
                # - quit_smoking (smoking=1)
                # - weight_loss (BMI=32.0 > 25)
                # - increase_exercise (exercise_hours_per_week=1.5 < 5)
                expected_scenarios = ["quit_smoking", "weight_loss", "increase_exercise"]
                
                found_scenarios = []
                for scenario in expected_scenarios:
                    if scenario in lifestyle_impact:
                        scenario_data = lifestyle_impact[scenario]
                        if "risk_reduction" in scenario_data and "description" in scenario_data:
                            found_scenarios.append(scenario)
                
                if len(found_scenarios) == 0:
                    self.log_result("Lifestyle Impact in Prediction", False, "No valid lifestyle scenarios found")
                    return False
                
                self.log_result("Lifestyle Impact in Prediction", True, 
                              f"Lifestyle impact scenarios working. Found: {found_scenarios}")
                return True
                
            else:
                self.log_result("Lifestyle Impact in Prediction", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Lifestyle Impact in Prediction", False, f"Error: {str(e)}")
            return False

    def test_voice_process_command(self):
        """Test voice NLP process-command endpoint"""
        try:
            # Test payload as specified in the review request
            test_payload = {
                "text": "Show my heart attack risk",
                "context": {}
            }
            
            response = requests.post(
                f"{BACKEND_URL}/voice/process-command",
                json=test_payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for required fields as specified in review request
                required_fields = ["intent", "confidence", "entities", "response_text", "suggested_actions", "should_speak", "priority"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Voice Process Command", False, f"Missing required fields: {missing_fields}")
                    return False
                
                # Validate data types and values
                if not isinstance(data["confidence"], (int, float)) or not (0 <= data["confidence"] <= 1):
                    self.log_result("Voice Process Command", False, f"Invalid confidence value: {data['confidence']}")
                    return False
                
                if not isinstance(data["entities"], dict):
                    self.log_result("Voice Process Command", False, f"entities should be a dict, got: {type(data['entities'])}")
                    return False
                
                if not isinstance(data["response_text"], str) or len(data["response_text"]) == 0:
                    self.log_result("Voice Process Command", False, f"Invalid response_text: {data['response_text']}")
                    return False
                
                if not isinstance(data["suggested_actions"], list):
                    self.log_result("Voice Process Command", False, f"suggested_actions should be a list, got: {type(data['suggested_actions'])}")
                    return False
                
                if not isinstance(data["should_speak"], bool):
                    self.log_result("Voice Process Command", False, f"should_speak should be boolean, got: {type(data['should_speak'])}")
                    return False
                
                if data["priority"] not in ["normal", "high", "urgent"]:
                    self.log_result("Voice Process Command", False, f"Invalid priority value: {data['priority']}")
                    return False
                
                # Check if intent is correctly classified for "Show my heart attack risk"
                if data["intent"] != "show_risk":
                    self.log_result("Voice Process Command", False, f"Expected intent 'show_risk', got: {data['intent']}")
                    return False
                
                self.log_result("Voice Process Command", True, 
                              f"Voice command processed successfully. Intent: {data['intent']}, Confidence: {data['confidence']:.2f}, Priority: {data['priority']}")
                return True
                
            else:
                self.log_result("Voice Process Command", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Voice Process Command", False, f"Error: {str(e)}")
            return False

    def test_voice_commands_list(self):
        """Test voice commands list endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/voice/voice-commands", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, dict):
                    self.log_result("Voice Commands List", False, f"Expected dict, got: {type(data)}")
                    return False
                
                # Check for expected categories
                expected_categories = ["risk_queries", "explanations", "actions", "navigation", "emergency"]
                missing_categories = [cat for cat in expected_categories if cat not in data]
                
                if missing_categories:
                    self.log_result("Voice Commands List", False, f"Missing categories: {missing_categories}")
                    return False
                
                # Verify each category contains arrays
                for category, commands in data.items():
                    if not isinstance(commands, list):
                        self.log_result("Voice Commands List", False, f"Category '{category}' should contain an array, got: {type(commands)}")
                        return False
                    
                    if len(commands) == 0:
                        self.log_result("Voice Commands List", False, f"Category '{category}' is empty")
                        return False
                    
                    # Verify commands are strings
                    for command in commands:
                        if not isinstance(command, str):
                            self.log_result("Voice Commands List", False, f"Command in '{category}' should be string, got: {type(command)}")
                            return False
                
                total_commands = sum(len(commands) for commands in data.values())
                self.log_result("Voice Commands List", True, 
                              f"Voice commands retrieved successfully. Categories: {len(data)}, Total commands: {total_commands}")
                return True
                
            else:
                self.log_result("Voice Commands List", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Voice Commands List", False, f"Error: {str(e)}")
            return False

    def test_voice_nlp_sanity_check(self):
        """Sanity check to ensure no 500 errors across voice endpoints"""
        try:
            endpoints_to_test = [
                ("/voice/voice-commands", "GET", None),
                ("/voice/process-command", "POST", {"text": "Hello", "context": {}}),
                ("/voice/process-command", "POST", {"text": "What is my risk?", "context": {}}),
                ("/voice/process-command", "POST", {"text": "Start assessment", "context": {}})
            ]
            
            failed_endpoints = []
            
            for endpoint, method, payload in endpoints_to_test:
                try:
                    if method == "GET":
                        response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=10)
                    else:
                        response = requests.post(
                            f"{BACKEND_URL}{endpoint}",
                            json=payload,
                            headers={"Content-Type": "application/json"},
                            timeout=10
                        )
                    
                    if response.status_code == 500:
                        failed_endpoints.append(f"{method} {endpoint}: {response.text[:100]}")
                        
                except Exception as e:
                    failed_endpoints.append(f"{method} {endpoint}: Connection error - {str(e)}")
            
            if failed_endpoints:
                self.log_result("Voice NLP Sanity Check", False, f"500 errors found: {failed_endpoints}")
                return False
            else:
                self.log_result("Voice NLP Sanity Check", True, f"No 500 errors found across {len(endpoints_to_test)} voice endpoints")
                return True
                
        except Exception as e:
            self.log_result("Voice NLP Sanity Check", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests including advanced cardiovascular risk features"""
        print(f"🚀 Starting Enhanced Cardiovascular Risk Prediction Backend Tests")
        print(f"Testing URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Test in logical order - basic tests first, then advanced features
        tests = [
            self.test_health_check,
            self.test_model_performance,
            self.test_feature_importance,
            self.test_health_stats,
            self.test_recent_predictions,
            self.test_prediction_endpoint,
            self.test_enhanced_prediction_endpoint,
            self.test_risk_factors_analysis,
            self.test_lifestyle_impact_in_prediction,
            self.test_realtime_prediction_endpoint,
            self.test_lifestyle_impact_analysis_endpoint,
            self.test_prediction_error_handling,
            self.test_patient_history
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {str(e)}")
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed. Check the issues above.")
            return False
    
    def get_summary(self):
        """Get test summary"""
        passed = sum(1 for result in self.results if result["success"])
        total = len(self.results)
        
        summary = {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": round((passed / total * 100) if total > 0 else 0, 2),
            "results": self.results
        }
        
        return summary

def main():
    """Main test execution"""
    tester = BackendTester()
    
    print("Heart Disease Risk Prediction API - Backend Testing")
    print(f"Testing URL: {BACKEND_URL}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print()
    
    success = tester.run_all_tests()
    
    # Print detailed summary
    summary = tester.get_summary()
    print(f"\n📋 Detailed Summary:")
    print(f"   Success Rate: {summary['success_rate']}%")
    print(f"   Total Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed']}")
    print(f"   Failed: {summary['failed']}")
    
    # Print failed tests details
    failed_tests = [r for r in summary['results'] if not r['success']]
    if failed_tests:
        print(f"\n❌ Failed Tests Details:")
        for test in failed_tests:
            print(f"   - {test['test']}: {test['message']}")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)