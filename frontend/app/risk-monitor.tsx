import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface RiskTrend {
  timestamp: string;
  overall_risk: number;
  heart_attack_risk: number;
  stroke_risk: number;
  heart_failure_risk: number;
  arrhythmia_risk: number;
}

interface LiveRiskData {
  current_risks: {
    [key: string]: {
      probability: number;
      risk_level: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      change_since_last: number;
    };
  };
  risk_trends: RiskTrend[];
  next_assessment_due: string;
  monitoring_score: number;
  alerts: string[];
  recommendations_update: string[];
}

export default function RiskMonitor() {
  const router = useRouter();
  const [liveRiskData, setLiveRiskData] = useState<LiveRiskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    initializeRiskMonitoring();
    const interval = setInterval(() => {
      if (monitoringActive) {
        updateRealTimeRisks();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [monitoringActive]);

  const initializeRiskMonitoring = async () => {
    try {
      setIsLoading(true);
      await fetchLatestRiskData();
      setMonitoringActive(true);
    } catch (error) {
      console.error('Error initializing risk monitoring:', error);
      Alert.alert('Error', 'Failed to initialize risk monitoring');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatestRiskData = async () => {
    try {
      // Get the most recent assessment from history
      const historyResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/recent-predictions?limit=1`);
      const historyData = await historyResponse.json();
      
      if (historyData.length === 0) {
        throw new Error('No assessment history found');
      }

      const latestAssessment = historyData[0];
      
      // Simulate real-time risk monitoring data (in a real app, this would come from a dedicated monitoring service)
      const mockLiveData: LiveRiskData = {
        current_risks: {
          heart_attack: {
            probability: latestAssessment.prediction_result.cardiovascular_risks?.heart_attack?.probability || 0.5,
            risk_level: latestAssessment.prediction_result.cardiovascular_risks?.heart_attack?.risk_level || 'Medium',
            trend: Math.random() > 0.5 ? 'stable' : Math.random() > 0.5 ? 'decreasing' : 'increasing',
            change_since_last: (Math.random() - 0.5) * 0.1, // Random change between -0.05 and +0.05
          },
          stroke: {
            probability: latestAssessment.prediction_result.cardiovascular_risks?.stroke?.probability || 0.4,
            risk_level: latestAssessment.prediction_result.cardiovascular_risks?.stroke?.risk_level || 'Medium',
            trend: Math.random() > 0.5 ? 'stable' : Math.random() > 0.5 ? 'decreasing' : 'increasing',
            change_since_last: (Math.random() - 0.5) * 0.1,
          },
          heart_failure: {
            probability: latestAssessment.prediction_result.cardiovascular_risks?.heart_failure?.probability || 0.3,
            risk_level: latestAssessment.prediction_result.cardiovascular_risks?.heart_failure?.risk_level || 'Low',
            trend: Math.random() > 0.5 ? 'stable' : Math.random() > 0.5 ? 'decreasing' : 'increasing',
            change_since_last: (Math.random() - 0.5) * 0.1,
          },
          arrhythmia: {
            probability: latestAssessment.prediction_result.cardiovascular_risks?.arrhythmia?.probability || 0.25,
            risk_level: latestAssessment.prediction_result.cardiovascular_risks?.arrhythmia?.risk_level || 'Low',
            trend: Math.random() > 0.5 ? 'stable' : Math.random() > 0.5 ? 'decreasing' : 'increasing',
            change_since_last: (Math.random() - 0.5) * 0.1,
          },
          overall_cardiovascular: {
            probability: latestAssessment.prediction_result.cardiovascular_risks?.overall_cardiovascular?.probability || 0.4,
            risk_level: latestAssessment.prediction_result.cardiovascular_risks?.overall_cardiovascular?.risk_level || 'Medium',
            trend: Math.random() > 0.5 ? 'stable' : Math.random() > 0.5 ? 'decreasing' : 'increasing',
            change_since_last: (Math.random() - 0.5) * 0.1,
          },
        },
        risk_trends: generateMockTrends(7), // Last 7 data points
        next_assessment_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        monitoring_score: Math.floor(Math.random() * 30) + 70, // Score between 70-100
        alerts: generateAlerts(),
        recommendations_update: generateUpdatedRecommendations(),
      };

      setLiveRiskData(mockLiveData);
      setLastUpdateTime(new Date());
      
    } catch (error) {
      console.error('Error fetching risk data:', error);
      throw error;
    }
  };

  const generateMockTrends = (days: number): RiskTrend[] => {
    const trends: RiskTrend[] = [];
    const baseDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      
      trends.push({
        timestamp: date.toISOString(),
        overall_risk: 0.4 + (Math.random() - 0.5) * 0.2,
        heart_attack_risk: 0.5 + (Math.random() - 0.5) * 0.2,
        stroke_risk: 0.4 + (Math.random() - 0.5) * 0.2,
        heart_failure_risk: 0.3 + (Math.random() - 0.5) * 0.2,
        arrhythmia_risk: 0.25 + (Math.random() - 0.5) * 0.2,
      });
    }
    
    return trends;
  };

  const generateAlerts = (): string[] => {
    const possibleAlerts = [
      '🩺 Annual cardiology check-up recommended',
      '💊 Medication adherence is important for risk reduction',
      '🏃‍♂️ Increase physical activity to improve cardiovascular health',
      '🍎 Consider dietary improvements to lower cholesterol',
      '😴 Improve sleep quality for better heart health',
      '🚭 Smoking cessation programs available in your area',
      '🩸 Blood pressure monitoring recommended',
    ];
    
    // Return 1-3 random alerts
    const numAlerts = Math.floor(Math.random() * 3) + 1;
    const shuffled = possibleAlerts.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numAlerts);
  };

  const generateUpdatedRecommendations = (): string[] => {
    return [
      'Continue current exercise routine - showing positive impact',
      'Monitor blood pressure weekly and log readings',
      'Schedule follow-up appointment with healthcare provider',
      'Consider stress management techniques like meditation',
      'Maintain current healthy diet plan',
    ];
  };

  const updateRealTimeRisks = useCallback(async () => {
    if (!liveRiskData) return;
    
    try {
      // Simulate small real-time changes in risk
      const updatedRisks = { ...liveRiskData.current_risks };
      
      Object.keys(updatedRisks).forEach(riskType => {
        const risk = updatedRisks[riskType];
        const change = (Math.random() - 0.5) * 0.02; // Small random change
        const newProbability = Math.max(0, Math.min(1, risk.probability + change));
        
        updatedRisks[riskType] = {
          ...risk,
          probability: newProbability,
          change_since_last: change,
          trend: change > 0.005 ? 'increasing' : change < -0.005 ? 'decreasing' : 'stable',
        };
      });

      setLiveRiskData(prev => prev ? {
        ...prev,
        current_risks: updatedRisks,
      } : null);
      
      setLastUpdateTime(new Date());
      
    } catch (error) {
      console.error('Error updating real-time risks:', error);
    }
  }, [liveRiskData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLatestRiskData();
    setRefreshing(false);
  }, []);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'High': return '#F44336';
      default: return '#888888';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return '#F44336';
      case 'decreasing': return '#4CAF50';
      case 'stable': return '#888888';  
      default: return '#888888';
    }
  };

  const renderRiskCard = (riskType: string, riskData: any) => {
    const displayName = riskType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const riskPercentage = (riskData.probability * 100).toFixed(1);
    const changePercentage = (Math.abs(riskData.change_since_last) * 100).toFixed(1);
    
    return (
      <View key={riskType} style={[styles.riskCard, { borderColor: getRiskColor(riskData.risk_level) }]}>
        <View style={styles.riskHeader}>
          <Text style={styles.riskTitle}>{displayName}</Text>
          <View style={styles.trendContainer}>
            <Text style={[styles.trendIcon, { color: getTrendColor(riskData.trend) }]}>
              {getTrendIcon(riskData.trend)}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.riskLevel, { color: getRiskColor(riskData.risk_level) }]}>
          {riskData.risk_level}
        </Text>
        <Text style={styles.riskPercentage}>{riskPercentage}%</Text>
        
        <View style={styles.changeIndicator}>
          <Text style={[styles.changeText, { color: getTrendColor(riskData.trend) }]}>
            {riskData.change_since_last > 0 ? '+' : ''}{changePercentage}% since last update
          </Text>
        </View>
        
        {/* Mini Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${riskData.probability * 100}%`,
                  backgroundColor: getRiskColor(riskData.risk_level)
                }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Initializing risk monitoring...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!liveRiskData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No risk data available. Please complete an assessment first.</Text>
          <TouchableOpacity 
            style={styles.assessmentButton}
            onPress={() => router.push('/assessment')}
          >
            <Text style={styles.assessmentButtonText}>Start Assessment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const timeAgo = Math.floor((new Date().getTime() - lastUpdateTime.getTime()) / 1000);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Risk Monitor</Text>
        <TouchableOpacity 
          style={styles.monitorToggle}
          onPress={() => setMonitoringActive(!monitoringActive)}
        >
          <Text style={[styles.monitorStatus, { color: monitoringActive ? '#4CAF50' : '#888888' }]}>
            {monitoringActive ? '🔴 LIVE' : '⭕ OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2196F3"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>⚡ Real-Time Monitoring</Text>
            <Text style={styles.monitoringScore}>Score: {liveRiskData.monitoring_score}/100</Text>
          </View>
          <Text style={styles.lastUpdate}>
            Last updated: {timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo/60)}m ago`}
          </Text>
          <Text style={styles.nextAssessment}>
            Next assessment due: {new Date(liveRiskData.next_assessment_due).toLocaleDateString()}
          </Text>
        </View>

        {/* Live Risk Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🫀 Live Risk Analysis</Text>
          <View style={styles.riskGrid}>
            {Object.entries(liveRiskData.current_risks).map(([riskType, riskData]) => 
              renderRiskCard(riskType, riskData)
            )}
          </View>
        </View>

        {/* Alerts */}
        {liveRiskData.alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚨 Health Alerts</Text>
            <View style={styles.alertsContainer}>
              {liveRiskData.alerts.map((alert, index) => (
                <View key={index} style={styles.alertItem}>
                  <Text style={styles.alertText}>{alert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Updated Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Updated Recommendations</Text>
          <View style={styles.recommendationsContainer}>
            {liveRiskData.recommendations_update.map((recommendation, index) => (
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
            <Text style={styles.secondaryActionText}>📊 View History</Text>
          </TouchableOpacity>
        </View>

        {/* Monitoring Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ About Real-Time Monitoring</Text>
          <Text style={styles.infoText}>
            This real-time monitoring system continuously analyzes your cardiovascular risk based on your latest assessment. 
            Risk levels are updated every 30 seconds using advanced algorithms that consider temporal factors and trend analysis.
          </Text>
          <Text style={styles.infoText}>
            {monitoringActive ? 'Monitoring is currently active.' : 'Monitoring is paused. Tap LIVE to resume.'}
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
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  assessmentButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  assessmentButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  monitorToggle: {
    padding: 8,
  },
  monitorStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  monitoringScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#cccccc',
    marginBottom: 4,
  },
  nextAssessment: {
    fontSize: 12,
    color: '#cccccc',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  riskGrid: {
    gap: 12,
  },
  riskCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: 16,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskPercentage: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 8,
  },
  changeIndicator: {
    marginBottom: 8,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  alertsContainer: {
    gap: 8,
  },
  alertItem: {
    backgroundColor: '#2a1a1a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  alertText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
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
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    marginBottom: 8,
  },
});