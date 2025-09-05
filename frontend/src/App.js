import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Progress } from "./components/ui/progress";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Heart, Activity, TrendingUp, Users, AlertTriangle, CheckCircle, Info, Stethoscope } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [formData, setFormData] = useState({
    age: "",
    sex: "",
    cp: "",
    trestbps: "",
    chol: "",
    fbs: "",
    restecg: "",
    thalach: "",
    exang: "",
    oldpeak: "",
    slope: "",
    ca: "",
    thal: ""
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentAssessments, setRecentAssessments] = useState([]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert string values to appropriate types
      const processedData = {
        ...formData,
        age: parseInt(formData.age),
        sex: parseInt(formData.sex),
        cp: parseInt(formData.cp),
        trestbps: parseInt(formData.trestbps),
        chol: parseInt(formData.chol),
        fbs: parseInt(formData.fbs),
        restecg: parseInt(formData.restecg),
        thalach: parseInt(formData.thalach),
        exang: parseInt(formData.exang),
        oldpeak: parseFloat(formData.oldpeak),
        slope: parseInt(formData.slope),
        ca: parseInt(formData.ca),
        thal: parseInt(formData.thal)
      };

      const response = await axios.post(`${API}/predict-risk`, processedData);
      setPrediction(response.data);
      fetchRecentAssessments();
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred during prediction");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAssessments = async () => {
    try {
      const response = await axios.get(`${API}/assessments?limit=5`);
      setRecentAssessments(response.data);
    } catch (err) {
      console.error("Error fetching assessments:", err);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case "Low": return "text-emerald-600";
      case "Moderate": return "text-amber-600";
      case "High": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getRiskBadgeColor = (riskLevel) => {
    switch (riskLevel) {
      case "Low": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Moderate": return "bg-amber-100 text-amber-800 border-amber-200";
      case "High": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case "Low": return <CheckCircle className="h-4 w-4" />;
      case "Moderate": return <Info className="h-4 w-4" />;
      case "High": return <AlertTriangle className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchRecentAssessments();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CardiaRisk AI</h1>
                <p className="text-sm text-gray-600">Advanced Heart Disease Risk Assessment</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-blue-600">
                <Stethoscope className="h-5 w-5" />
                <span className="text-sm font-medium">Clinical Grade AI</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="assessment" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="assessment" className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>Risk Assessment</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Recent Assessments</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assessment" className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">Heart Disease Risk Assessment</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Enter your medical information below to get an AI-powered assessment of your cardiovascular risk
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Input Form */}
              <div className="lg:col-span-2">
                <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span>Patient Information</span>
                    </CardTitle>
                    <CardDescription>
                      Please provide accurate medical information for the most reliable assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Basic Demographics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="age">Age (years)</Label>
                          <Input
                            id="age"
                            type="number"
                            min="20"
                            max="100"
                            value={formData.age}
                            onChange={(e) => handleInputChange("age", e.target.value)}
                            className="h-11"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="sex">Sex</Label>
                          <Select value={formData.sex} onValueChange={(value) => handleInputChange("sex", value)}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select sex" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Female</SelectItem>
                              <SelectItem value="1">Male</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Vital Signs */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Vital Signs</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="trestbps">Resting Blood Pressure (mmHg)</Label>
                            <Input
                              id="trestbps"
                              type="number"
                              min="80"
                              max="220"
                              value={formData.trestbps}
                              onChange={(e) => handleInputChange("trestbps", e.target.value)}
                              className="h-11"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="chol">Cholesterol (mg/dl)</Label>
                            <Input
                              id="chol"
                              type="number"
                              min="100"
                              max="600"
                              value={formData.chol}
                              onChange={(e) => handleInputChange("chol", e.target.value)}
                              className="h-11"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="thalach">Maximum Heart Rate</Label>
                            <Input
                              id="thalach"
                              type="number"
                              min="60"
                              max="220"
                              value={formData.thalach}
                              onChange={(e) => handleInputChange("thalach", e.target.value)}
                              className="h-11"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="oldpeak">ST Depression</Label>
                            <Input
                              id="oldpeak"
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={formData.oldpeak}
                              onChange={(e) => handleInputChange("oldpeak", e.target.value)}
                              className="h-11"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Clinical Tests */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Clinical Tests</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="cp">Chest Pain Type</Label>
                            <Select value={formData.cp} onValueChange={(value) => handleInputChange("cp", value)}>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select chest pain type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Typical Angina</SelectItem>
                                <SelectItem value="2">Atypical Angina</SelectItem>
                                <SelectItem value="3">Non-Anginal Pain</SelectItem>
                                <SelectItem value="4">Asymptomatic</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fbs">Fasting Blood Sugar > 120 mg/dl</Label>
                            <Select value={formData.fbs} onValueChange={(value) => handleInputChange("fbs", value)}>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">No</SelectItem>
                                <SelectItem value="1">Yes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="restecg">Resting ECG</Label>
                            <Select value={formData.restecg} onValueChange={(value) => handleInputChange("restecg", value)}>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select ECG result" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Normal</SelectItem>
                                <SelectItem value="1">ST-T Wave Abnormality</SelectItem>
                                <SelectItem value="2">LV Hypertrophy</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="exang">Exercise Induced Angina</Label>
                            <Select value={formData.exang} onValueChange={(value) => handleInputChange("exang", value)}>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">No</SelectItem>
                                <SelectItem value="1">Yes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="slope">ST Slope</Label>
                            <Select value={formData.slope} onValueChange={(value) => handleInputChange("slope", value)}>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select slope" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Upsloping</SelectItem>
                                <SelectItem value="2">Flat</SelectItem>
                                <SelectItem value="3">Downsloping</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="ca">Major Vessels (0-3)</Label>
                            <Select value={formData.ca} onValueChange={(value) => handleInputChange("ca", value)}>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select count" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0</SelectItem>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="thal">Thalassemia</Label>
                            <Select value={formData.thal} onValueChange={(value) => handleInputChange("thal", value)}>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="3">Normal</SelectItem>
                                <SelectItem value="6">Fixed Defect</SelectItem>
                                <SelectItem value="7">Reversible Defect</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        {loading ? "Analyzing..." : "Assess Risk"}
                      </Button>

                      {error && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Results Panel */}
              <div className="space-y-6">
                {prediction && (
                  <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <span>Risk Assessment Results</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Risk Score */}
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-2">
                          {getRiskIcon(prediction.risk_level)}
                          <Badge className={`text-sm px-3 py-1 ${getRiskBadgeColor(prediction.risk_level)}`}>
                            {prediction.risk_level} Risk
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className={`text-3xl font-bold ${getRiskColor(prediction.risk_level)}`}>
                            {(prediction.risk_probability * 100).toFixed(1)}%
                          </div>
                          <p className="text-sm text-gray-600">Probability of heart disease</p>
                        </div>

                        <Progress 
                          value={prediction.risk_probability * 100} 
                          className="h-3"
                        />
                      </div>

                      {/* Interpretation */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Clinical Interpretation</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {prediction.interpretation}
                        </p>
                      </div>

                      {/* Top Risk Factors */}
                      {prediction.top_risk_factors && prediction.top_risk_factors.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900">Key Risk Factors</h4>
                          <div className="space-y-2">
                            {prediction.top_risk_factors.slice(0, 3).map((factor, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{factor.factor}</span>
                                <Badge variant="outline" className="text-xs">
                                  Impact: {(factor.importance * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Info Card */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-blue-900">
                      <Info className="h-5 w-5" />
                      <span>Important Notice</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      This AI assessment is for informational purposes only and should not replace 
                      professional medical consultation. Always consult with qualified healthcare 
                      providers for proper diagnosis and treatment.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">Recent Assessments</h2>
              <p className="text-lg text-gray-600">View previously conducted risk assessments</p>
            </div>

            <div className="grid gap-4">
              {recentAssessments.length > 0 ? (
                recentAssessments.map((assessment, index) => (
                  <Card key={index} className="shadow-sm border bg-white/60 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getRiskIcon(assessment.risk_level)}
                            <Badge className={`${getRiskBadgeColor(assessment.risk_level)}`}>
                              {assessment.risk_level}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-semibold">
                              {(assessment.risk_probability * 100).toFixed(1)}% Risk
                            </p>
                            <p className="text-sm text-gray-600">
                              Age {assessment.patient_data?.age}, {assessment.patient_data?.sex === 1 ? 'Male' : 'Female'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(assessment.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="shadow-sm border bg-white/60 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No assessments available yet</p>
                      <p className="text-sm text-gray-500">Complete your first risk assessment to see results here</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;