import requests
import sys
import json
from datetime import datetime

class HeartDiseaseAPITester:
    def __init__(self, base_url="https://cardiac-risk-tool.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_model_info(self):
        """Test model info endpoint"""
        return self.run_test("Model Info", "GET", "model-info", 200)

    def test_predict_risk_valid_data(self):
        """Test risk prediction with valid sample data"""
        # Sample data from the request
        sample_data = {
            "age": 54,
            "sex": 1,  # Male
            "cp": 2,   # Atypical Angina
            "trestbps": 140,
            "chol": 239,
            "fbs": 0,  # No
            "restecg": 0,  # Normal
            "thalach": 160,
            "exang": 0,  # No
            "oldpeak": 1.2,
            "slope": 2,  # Flat
            "ca": 0,
            "thal": 3  # Normal
        }
        
        success, response = self.run_test(
            "Risk Prediction - Valid Data", 
            "POST", 
            "predict-risk", 
            200, 
            data=sample_data
        )
        
        if success and response:
            # Validate response structure
            required_fields = ['risk_probability', 'risk_level', 'high_risk', 'interpretation', 'top_risk_factors']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"⚠️  Warning: Missing fields in response: {missing_fields}")
            else:
                print(f"✅ Response structure is complete")
                print(f"   Risk Level: {response.get('risk_level')}")
                print(f"   Risk Probability: {response.get('risk_probability', 0)*100:.1f}%")
        
        return success, response

    def test_predict_risk_invalid_data(self):
        """Test risk prediction with invalid data"""
        invalid_data = {
            "age": 150,  # Invalid age
            "sex": 2,    # Invalid sex
            "cp": 5,     # Invalid chest pain type
        }
        
        return self.run_test(
            "Risk Prediction - Invalid Data", 
            "POST", 
            "predict-risk", 
            422,  # Validation error
            data=invalid_data
        )

    def test_predict_risk_missing_fields(self):
        """Test risk prediction with missing required fields"""
        incomplete_data = {
            "age": 54,
            "sex": 1
            # Missing other required fields
        }
        
        return self.run_test(
            "Risk Prediction - Missing Fields", 
            "POST", 
            "predict-risk", 
            422,  # Validation error
            data=incomplete_data
        )

    def test_get_assessments(self):
        """Test getting recent assessments"""
        return self.run_test("Get Assessments", "GET", "assessments", 200)

    def test_get_assessments_with_limit(self):
        """Test getting assessments with limit parameter"""
        return self.run_test("Get Assessments with Limit", "GET", "assessments?limit=3", 200)

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test creating a status check
        status_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        
        success1, response1 = self.run_test(
            "Create Status Check", 
            "POST", 
            "status", 
            200, 
            data=status_data
        )
        
        # Test getting status checks
        success2, response2 = self.run_test("Get Status Checks", "GET", "status", 200)
        
        return success1 and success2, (response1, response2)

def main():
    print("🚀 Starting Heart Disease Risk Assessment API Tests")
    print("=" * 60)
    
    # Initialize tester
    tester = HeartDiseaseAPITester()
    
    # Test sequence
    print("\n📋 Testing API Endpoints...")
    
    # 1. Test root endpoint
    tester.test_root_endpoint()
    
    # 2. Test model info
    tester.test_model_info()
    
    # 3. Test risk prediction with valid data
    tester.test_predict_risk_valid_data()
    
    # 4. Test risk prediction with invalid data
    tester.test_predict_risk_invalid_data()
    
    # 5. Test risk prediction with missing fields
    tester.test_predict_risk_missing_fields()
    
    # 6. Test assessments endpoints
    tester.test_get_assessments()
    tester.test_get_assessments_with_limit()
    
    # 7. Test status endpoints
    tester.test_status_endpoints()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())