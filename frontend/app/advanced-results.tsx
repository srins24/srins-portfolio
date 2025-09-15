import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface CardiovascularRisk {
  probability: number;
  risk_level: string;
}

interface CardiovascularRisks {
  heart_attack: CardiovascularRisk;
  stroke: CardiovascularRisk;
  heart_failure: CardiovascularRisk;
  arrhythmia: CardiovascularRisk;
  overall_cardiovascular: CardiovascularRisk;
}

interface LifestyleScenario {
  description: string;
  risk_reduction: number;
  new_risk_level: string;
  cardiovascular_improvement: any;
}

interface AdvancedPredictionResult {
  patient_id: string;
  cardiovascular_risks: CardiovascularRisks;
  risk_probability: number;
  model_used: string;
  timestamp: string;
  recommendations: string[];
  risk_factors_analysis: any;
  lifestyle_impact: { [key: string]: LifestyleScenario };
}

export default function AdvancedResults() {
  const router = useRouter();
  const { resultData } = useLocalSearchParams();
  const [result, setResult] = useState<AdvancedPredictionResult | null>(null);
  const [lifestyleAnalysis, setLifestyleAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (resultData && typeof resultData === 'string') {
      try {
        const parsedResult = JSON.parse(resultData);
        setResult(parsedResult);
        fetchLifestyleAnalysis(parsedResult);
      } catch (error) {
        console.error('Error parsing result data:', error);
      }
    }
    setIsLoading(false);
  }, [resultData]);

  const fetchLifestyleAnalysis = async (resultData: any) => {
    try {
      // This would need patient data to analyze lifestyle impact
      // For now, we'll use the lifestyle_impact from the main prediction
      setLifestyleAnalysis(resultData.lifestyle_impact || {});
    } catch (error) {
      console.error('Error fetching lifestyle analysis:', error);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'High': return '#F44336';
      default: return '#888888';
    }
  };

  const getRiskIcon = (riskType: string) => {
    switch (riskType) {
      case 'heart_attack': return '💔';
      case 'stroke': return '🧠';
      case 'heart_failure': return '💪';
      case 'arrhythmia': return '⚡';
      case 'overall_cardiovascular': return '❤️';
      default: return '❓';
    }
  };

  const getRiskTitle = (riskType: string) => {
    switch (riskType) {
      case 'heart_attack': return 'Heart Attack';
      case 'stroke': return 'Stroke';
      case 'heart_failure': return 'Heart Failure';
      case 'arrhythmia': return 'Arrhythmia';
      case 'overall_cardiovascular': return 'Overall CV Risk';
      default: return riskType;
    }
  };

  const renderRiskCard = (riskType: string, riskData: CardiovascularRisk) => {
    const riskPercentage = (riskData.probability * 100).toFixed(1);
    const riskColor = getRiskColor(riskData.risk_level);
    const riskIcon = getRiskIcon(riskType);
    const title = getRiskTitle(riskType);

    return (
      <View key={riskType} style={[styles.riskCard, { borderColor: riskColor }]}>
        <Text style={styles.riskIcon}>{riskIcon}</Text>
        <Text style={styles.riskTitle}>{title}</Text>
        <Text style={[styles.riskLevel, { color: riskColor }]}>
          {riskData.risk_level}
        </Text>
        <Text style={styles.riskPercentage}>{riskPercentage}%</Text>
        
        {/* Risk Probability Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${riskData.probability * 100}%`,
                  backgroundColor: riskColor 
                }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  const renderLifestyleScenario = (scenarioKey: string, scenario: LifestyleScenario) => {
    const impactPercentage = (scenario.risk_reduction * 100).toFixed(1);
    const impactColor = scenario.risk_reduction > 0.1 ? '#4CAF50' : scenario.risk_reduction > 0.05 ? '#FF9800' : '#888888';

    return (
      <View key={scenarioKey} style={styles.scenarioCard}>
        <View style={styles.scenarioHeader}>
          <Text style={styles.scenarioTitle}>{scenario.description}</Text>
          <View style={[styles.impactBadge, { backgroundColor: impactColor }]}>
            <Text style={styles.impactText}>-{impactPercentage}%</Text>
          </View>
        </View>
        <Text style={styles.scenarioDescription}>
          Could reduce your risk by {impactPercentage}% and potentially move you to {scenario.new_risk_level} risk category
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Analyzing cardiovascular risks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No prediction results available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Risk Analysis</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overall Risk Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>🏥 Comprehensive Risk Assessment</Text>
          <Text style={styles.summaryDescription}>
            Advanced analysis using {result.model_used} model on 22+ risk factors
          </Text>
        </View>

        {/* Multiple Cardiovascular Risks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🫀 Cardiovascular Risk Profile</Text>
          <View style={styles.risksGrid}>
            {Object.entries(result.cardiovascular_risks).map(([riskType, riskData]) => 
              renderRiskCard(riskType, riskData)
            )}
          </View>
        </View>

        {/* Risk Factors Analysis */}
        {result.risk_factors_analysis?.top_risk_factors && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔍 Top Risk Factors</Text>
            <View style={styles.riskFactorsCard}>
              {result.risk_factors_analysis.top_risk_factors.slice(0, 5).map((factor: any, index: number) => (
                <View key={index} style={styles.riskFactorItem}>
                  <Text style={styles.riskFactorName}>{factor.factor}</Text>
                  <View style={styles.importanceBar}>
                    <View 
                      style={[
                        styles.importanceFill, 
                        { width: `${(factor.importance * 100)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.importanceText}>{(factor.importance * 100).toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Lifestyle Impact Scenarios */}
        {lifestyleAnalysis && Object.keys(lifestyleAnalysis).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💪 Lifestyle Impact Analysis</Text>
            <Text style={styles.sectionDescription}>
              See how specific lifestyle changes could reduce your cardiovascular risks:
            </Text>
            {Object.entries(lifestyleAnalysis).map(([key, scenario]) => 
              renderLifestyleScenario(key, scenario as LifestyleScenario)
            )}
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Personalized Action Plan</Text>
          <View style={styles.recommendationsCard}>
            {result.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationNumber}>{index + 1}</Text>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryActionButton]}
            onPress={() => router.push('/assessment')}
          >
            <Text style={styles.primaryActionText}>🔄 New Assessment</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryActionButton]}
            onPress={() => router.push('/history')}
          >
            <Text style={styles.secondaryActionText}>📊 Track Progress</Text>
          </TouchableOpacity>
        </View>

        {/* Medical Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>⚕️ Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This advanced cardiovascular risk assessment is for educational purposes only. 
            Results are based on statistical models and should not replace professional medical advice. 
            Always consult with your healthcare provider for personalized medical guidance.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
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
    marginRight: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2196F3',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryDescription: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 16,
    lineHeight: 20,
  },
  risksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  riskCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 64) / 2, // Two cards per row with margins
    borderWidth: 2,
  },
  riskIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  riskTitle: {
    fontSize: 12,
    color: '#cccccc',
    marginBottom: 4,
    textAlign: 'center',
  },
  riskLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskPercentage: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  riskFactorsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  riskFactorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskFactorName: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
  },
  importanceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    marginHorizontal: 12,
  },
  importanceFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  importanceText: {
    fontSize: 12,
    color: '#cccccc',
    minWidth: 30,
  },
  scenarioCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  impactText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  recommendationNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginRight: 12,
    marginTop: 2,
    minWidth: 20,
  },
  recommendationText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#2196F3',
  },
  secondaryActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryActionText: {
    color: '#cccccc',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerCard: {
    backgroundColor: '#2a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#cccccc',
    lineHeight: 18,
  },
});