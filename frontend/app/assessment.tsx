import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PatientData {
  age: string;
  sex: string;
  cholesterol: string;
  systolic_bp: string;
  diastolic_bp: string;
  heart_rate: string;
  diabetes: string;
  family_history: string;
  smoking: string;
  obesity: string;
  alcohol_consumption: string;
  exercise_hours_per_week: string;
  diet: string;
  previous_heart_problems: string;
  medication_use: string;
  stress_level: string;
  sedentary_hours_per_day: string;
  income: string;
  bmi: string;
  triglycerides: string;
  physical_activity_days_per_week: string;
  sleep_hours_per_day: string;
}

const initialData: PatientData = {
  age: '',
  sex: 'Male',
  cholesterol: '',
  systolic_bp: '',
  diastolic_bp: '',
  heart_rate: '',
  diabetes: '0',
  family_history: '0',
  smoking: '0',
  obesity: '0',
  alcohol_consumption: '0',
  exercise_hours_per_week: '',
  diet: 'Average',
  previous_heart_problems: '0',
  medication_use: '0',
  stress_level: '',
  sedentary_hours_per_day: '',
  income: '',
  bmi: '',
  triglycerides: '',
  physical_activity_days_per_week: '',
  sleep_hours_per_day: '',
};

export default function Assessment() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [patientData, setPatientData] = useState<PatientData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeRisk, setRealTimeRisk] = useState<any>(null);
  const [showRealTimeRisk, setShowRealTimeRisk] = useState(false);

  const steps = [
    {
      title: "Basic Information",
      icon: "👤",
      fields: ['age', 'sex', 'income']
    },
    {
      title: "Health Metrics", 
      icon: "📊",
      fields: ['cholesterol', 'systolic_bp', 'diastolic_bp', 'heart_rate', 'bmi', 'triglycerides']
    },
    {
      title: "Medical History",
      icon: "🏥", 
      fields: ['diabetes', 'family_history', 'previous_heart_problems', 'medication_use']
    },
    {
      title: "Lifestyle Factors",
      icon: "🌟",
      fields: ['smoking', 'obesity', 'alcohol_consumption', 'diet']
    },
    {
      title: "Activity & Wellness",
      icon: "💪",
      fields: ['exercise_hours_per_week', 'physical_activity_days_per_week', 'sleep_hours_per_day', 'sedentary_hours_per_day', 'stress_level']
    }
  ];

  const updateField = (field: keyof PatientData, value: string) => {
    const newData = {
      ...patientData,
      [field]: value
    };
    setPatientData(newData);
    
    // Trigger real-time risk calculation if we have enough data
    if (currentStep >= 2) { // Start showing after health metrics step
      calculateRealTimeRisk(newData);
    }
  };

  const calculateRealTimeRisk = async (data: PatientData) => {
    // Only calculate if we have essential fields filled
    if (!data.age || !data.cholesterol || !data.systolic_bp || !data.diastolic_bp) {
      return;
    }

    try {
      // Use default values for missing fields
      const payload = {
        age: parseInt(data.age) || 45,
        sex: data.sex,
        cholesterol: parseInt(data.cholesterol) || 200,
        systolic_bp: parseInt(data.systolic_bp) || 120,
        diastolic_bp: parseInt(data.diastolic_bp) || 80,
        heart_rate: parseInt(data.heart_rate) || 70,
        diabetes: parseInt(data.diabetes),
        family_history: parseInt(data.family_history),
        smoking: parseInt(data.smoking),
        obesity: parseInt(data.obesity),
        alcohol_consumption: parseInt(data.alcohol_consumption),
        exercise_hours_per_week: parseFloat(data.exercise_hours_per_week) || 3,
        diet: data.diet,
        previous_heart_problems: parseInt(data.previous_heart_problems),
        medication_use: parseInt(data.medication_use),
        stress_level: parseInt(data.stress_level) || 5,
        sedentary_hours_per_day: parseFloat(data.sedentary_hours_per_day) || 8,
        income: parseInt(data.income) || 50000,
        bmi: parseFloat(data.bmi) || 25,
        triglycerides: parseInt(data.triglycerides) || 150,
        physical_activity_days_per_week: parseInt(data.physical_activity_days_per_week) || 3,
        sleep_hours_per_day: parseInt(data.sleep_hours_per_day) || 7,
      };

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/predict-realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        setRealTimeRisk(result);
        setShowRealTimeRisk(true);
      }
    } catch (error) {
      console.error('Real-time prediction error:', error);
    }
  };

  const renderField = (field: keyof PatientData) => {
    const fieldConfig = getFieldConfig(field);
    
    if (fieldConfig.type === 'select') {
      return (
        <View key={field} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{fieldConfig.label}</Text>
          <View style={styles.selectContainer}>
            {fieldConfig.options?.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectOption,
                  patientData[field] === option.value && styles.selectOptionActive
                ]}
                onPress={() => updateField(field, option.value)}
              >
                <Text style={[
                  styles.selectOptionText,
                  patientData[field] === option.value && styles.selectOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View key={field} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{fieldConfig.label}</Text>
        <TextInput
          style={styles.textInput}
          value={patientData[field]}
          onChangeText={(value) => updateField(field, value)}
          placeholder={fieldConfig.placeholder}
          placeholderTextColor="#666666"
          keyboardType={fieldConfig.keyboardType}
        />
        {fieldConfig.unit && (
          <Text style={styles.unitLabel}>{fieldConfig.unit}</Text>
        )}
      </View>
    );
  };

  const getFieldConfig = (field: keyof PatientData) => {
    const configs = {
      age: { label: 'Age', placeholder: 'Enter your age', keyboardType: 'numeric' as const, unit: 'years' },
      sex: { 
        label: 'Sex', 
        type: 'select', 
        options: [
          { label: 'Male', value: 'Male' },
          { label: 'Female', value: 'Female' }
        ]
      },
      cholesterol: { label: 'Cholesterol Level', placeholder: '150-300', keyboardType: 'numeric' as const, unit: 'mg/dL' },
      systolic_bp: { label: 'Systolic Blood Pressure', placeholder: '90-180', keyboardType: 'numeric' as const, unit: 'mmHg' },
      diastolic_bp: { label: 'Diastolic Blood Pressure', placeholder: '60-120', keyboardType: 'numeric' as const, unit: 'mmHg' },
      heart_rate: { label: 'Heart Rate', placeholder: '50-150', keyboardType: 'numeric' as const, unit: 'bpm' },
      diabetes: {
        label: 'Do you have diabetes?',
        type: 'select',
        options: [
          { label: 'No', value: '0' },
          { label: 'Yes', value: '1' }
        ]
      },
      family_history: {
        label: 'Family history of heart disease?',
        type: 'select',
        options: [
          { label: 'No', value: '0' },
          { label: 'Yes', value: '1' }
        ]
      },
      smoking: {
        label: 'Do you smoke?',
        type: 'select',
        options: [
          { label: 'No', value: '0' },
          { label: 'Yes', value: '1' }
        ]
      },
      obesity: {
        label: 'Are you obese?',
        type: 'select',
        options: [
          { label: 'No', value: '0' },
          { label: 'Yes', value: '1' }
        ]
      },
      alcohol_consumption: {
        label: 'Do you consume alcohol regularly?',
        type: 'select',
        options: [
          { label: 'No', value: '0' },
          { label: 'Yes', value: '1' }
        ]
      },
      exercise_hours_per_week: { label: 'Exercise Hours Per Week', placeholder: '0-20', keyboardType: 'numeric' as const, unit: 'hours' },
      diet: {
        label: 'Diet Type',
        type: 'select',
        options: [
          { label: 'Healthy', value: 'Healthy' },
          { label: 'Average', value: 'Average' },
          { label: 'Unhealthy', value: 'Unhealthy' }
        ]
      },
      previous_heart_problems: {
        label: 'Previous heart problems?',
        type: 'select',
        options: [
          { label: 'No', value: '0' },
          { label: 'Yes', value: '1' }
        ]
      },
      medication_use: {
        label: 'Currently taking medications?',
        type: 'select',
        options: [
          { label: 'No', value: '0' },
          { label: 'Yes', value: '1' }
        ]
      },
      stress_level: { label: 'Stress Level (1-10)', placeholder: '1-10', keyboardType: 'numeric' as const },
      sedentary_hours_per_day: { label: 'Sedentary Hours Per Day', placeholder: '0-16', keyboardType: 'numeric' as const, unit: 'hours' },
      income: { label: 'Annual Income', placeholder: '25000-150000', keyboardType: 'numeric' as const, unit: 'USD' },
      bmi: { label: 'BMI', placeholder: '18-40', keyboardType: 'numeric' as const, unit: 'kg/m²' },
      triglycerides: { label: 'Triglycerides', placeholder: '50-500', keyboardType: 'numeric' as const, unit: 'mg/dL' },
      physical_activity_days_per_week: { label: 'Physical Activity Days/Week', placeholder: '0-7', keyboardType: 'numeric' as const, unit: 'days' },
      sleep_hours_per_day: { label: 'Sleep Hours Per Day', placeholder: '4-12', keyboardType: 'numeric' as const, unit: 'hours' },
    };
    
    return configs[field] || { label: field, placeholder: 'Enter value', keyboardType: 'default' as const };
  };

  const validateCurrentStep = () => {
    const currentFields = steps[currentStep].fields;
    const emptyFields = currentFields.filter(field => !patientData[field as keyof PatientData]);
    
    if (emptyFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all fields to continue.');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    
    setIsLoading(true);
    
    try {
      // Convert string values to appropriate types
      const payload = {
        age: parseInt(patientData.age),
        sex: patientData.sex,
        cholesterol: parseInt(patientData.cholesterol),
        systolic_bp: parseInt(patientData.systolic_bp),
        diastolic_bp: parseInt(patientData.diastolic_bp),
        heart_rate: parseInt(patientData.heart_rate),
        diabetes: parseInt(patientData.diabetes),
        family_history: parseInt(patientData.family_history),
        smoking: parseInt(patientData.smoking),
        obesity: parseInt(patientData.obesity),
        alcohol_consumption: parseInt(patientData.alcohol_consumption),
        exercise_hours_per_week: parseFloat(patientData.exercise_hours_per_week),
        diet: patientData.diet,
        previous_heart_problems: parseInt(patientData.previous_heart_problems),
        medication_use: parseInt(patientData.medication_use),
        stress_level: parseInt(patientData.stress_level),
        sedentary_hours_per_day: parseFloat(patientData.sedentary_hours_per_day),
        income: parseInt(patientData.income),
        bmi: parseFloat(patientData.bmi),
        triglycerides: parseInt(patientData.triglycerides),
        physical_activity_days_per_week: parseInt(patientData.physical_activity_days_per_week),
        sleep_hours_per_day: parseInt(patientData.sleep_hours_per_day),
      };

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Navigate to advanced results page with the prediction data
      router.push({
        pathname: '/advanced-results',
        params: { resultData: JSON.stringify(result) }
      });
      
    } catch (error) {
      console.error('Prediction error:', error);
      Alert.alert(
        'Error',
        'Failed to get prediction. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Risk Assessment</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / steps.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {/* Step Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepIcon}>{currentStepData.icon}</Text>
            <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          </View>

          {/* Real-time Risk Display */}
          {showRealTimeRisk && realTimeRisk && currentStep >= 2 && (
            <View style={styles.realTimeRiskCard}>
              <Text style={styles.realTimeRiskTitle}>⚡ Live Risk Analysis</Text>
              <View style={styles.riskGrid}>
                {realTimeRisk.cardiovascular_risks && Object.entries(realTimeRisk.cardiovascular_risks).slice(0, 3).map(([riskType, riskData]: [string, any]) => (
                  <View key={riskType} style={styles.miniRiskCard}>
                    <Text style={styles.miniRiskType}>
                      {riskType === 'heart_attack' ? '💔' : riskType === 'stroke' ? '🧠' : '❤️'}
                    </Text>
                    <Text style={styles.miniRiskLevel} 
                          style={[styles.miniRiskLevel, { 
                            color: riskData.risk_level === 'High' ? '#F44336' : 
                                   riskData.risk_level === 'Medium' ? '#FF9800' : '#4CAF50' 
                          }]}>
                      {riskData.risk_level}
                    </Text>
                    <Text style={styles.miniRiskPercent}>
                      {(riskData.probability * 100).toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.realTimeNote}>
                Risk updates as you provide more information
              </Text>
            </View>
          )}

          <View style={styles.fieldsContainer}>
            {currentStepData.fields.map(field => renderField(field as keyof PatientData))}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={[styles.navButton, styles.secondaryButton]}
            onPress={handleBack}
          >
            <Text style={styles.secondaryButtonText}>
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, styles.primaryButton]}
            onPress={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === steps.length - 1 ? 'Get Prediction' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 60, // Compensate for back button
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  fieldsContainer: {
    gap: 20,
  },
  fieldContainer: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  unitLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  selectContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  selectOption: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
  },
  selectOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  selectOptionText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectOptionTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#cccccc',
    fontSize: 16,
    fontWeight: '600',
  },
  realTimeRiskCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  realTimeRiskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  riskGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  miniRiskCard: {
    alignItems: 'center',
    flex: 1,
  },
  miniRiskType: {
    fontSize: 20,
    marginBottom: 4,
  },
  miniRiskLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  miniRiskPercent: {
    fontSize: 10,
    color: '#cccccc',
  },
  realTimeNote: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});