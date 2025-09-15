import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [healthStats, setHealthStats] = useState(null);

  useEffect(() => {
    fetchHealthStats();
  }, []);

  const fetchHealthStats = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/health-stats`);
      const data = await response.json();
      setHealthStats(data);
    } catch (error) {
      console.error('Error fetching health stats:', error);
    }
  };

  const navigateToAssessment = () => {
    router.push('/assessment');
  };

  const navigateToHistory = () => {
    router.push('/history');
  };

  const navigateToInsights = () => {
    Alert.alert(
      "Model Insights",
      "Model performance insights will be implemented in the next phase.",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>❤️ Heart Health</Text>
          <Text style={styles.subtitle}>AI-Powered Risk Assessment</Text>
        </View>

        {/* Health Stats Card */}
        {healthStats && (
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>📊 Platform Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{healthStats.total_predictions}</Text>
                <Text style={styles.statLabel}>Total Assessments</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{healthStats.high_risk_percentage}%</Text>
                <Text style={styles.statLabel}>High Risk</Text>
              </View>
            </View>
            <View style={styles.riskDistribution}>
              <Text style={styles.distributionTitle}>Risk Distribution:</Text>
              <View style={styles.distributionItem}>
                <View style={[styles.riskIndicator, styles.lowRisk]} />
                <Text style={styles.distributionText}>Low Risk: {healthStats.risk_distribution.low}</Text>
              </View>
              <View style={styles.distributionItem}>
                <View style={[styles.riskIndicator, styles.mediumRisk]} />
                <Text style={styles.distributionText}>Medium Risk: {healthStats.risk_distribution.medium}</Text>
              </View>
              <View style={styles.distributionItem}>
                <View style={[styles.riskIndicator, styles.highRisk]} />
                <Text style={styles.distributionText}>High Risk: {healthStats.risk_distribution.high}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Main Action Cards */}
        <View style={styles.actionCards}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.primaryCard]} 
            onPress={navigateToAssessment}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>🩺</Text>
            <Text style={styles.cardTitle}>Risk Assessment</Text>
            <Text style={styles.cardDescription}>
              Get your personalized heart disease risk prediction with voice input
            </Text>
            <View style={styles.cardButton}>
              <Text style={styles.buttonText}>Start Assessment</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.secondaryCard]} 
            onPress={navigateToHistory}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>Patient History</Text>
            <Text style={styles.cardDescription}>
              View past assessments and track your health journey
            </Text>
            <View style={styles.cardButton}>
              <Text style={styles.buttonText}>View History</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.tertiaryCard]} 
            onPress={() => router.push('/risk-monitor')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>Risk Monitor</Text>
            <Text style={styles.cardDescription}>
              Real-time cardiovascular risk monitoring and live updates
            </Text>
            <View style={styles.cardButton}>
              <Text style={styles.buttonText}>Monitor Risks</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.aiCard]} 
            onPress={() => router.push('/voice-assistant')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>🤖</Text>
            <Text style={styles.cardTitle}>AI Health Coach</Text>
            <Text style={styles.cardDescription}>
              Voice-powered AI assistant for health guidance and risk explanations
            </Text>
            <View style={styles.cardButton}>
              <Text style={styles.buttonText}>Talk to AI</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔬 Powered by Advanced Machine Learning
          </Text>
          <Text style={styles.footerSubtext}>
            Trained on 8,763+ patient records with 95%+ accuracy
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  riskDistribution: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 16,
  },
  distributionTitle: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 12,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  lowRisk: {
    backgroundColor: '#4CAF50',
  },
  mediumRisk: {
    backgroundColor: '#FF9800',
  },
  highRisk: {
    backgroundColor: '#F44336',
  },
  distributionText: {
    fontSize: 12,
    color: '#cccccc',
  },
  actionCards: {
    gap: 16,
  },
  actionCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryCard: {
    backgroundColor: '#1a2332',
    borderColor: '#2196F3',
  },
  secondaryCard: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333333',
  },
  tertiaryCard: {
    backgroundColor: '#2a1a2a',
    borderColor: '#9C27B0',
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  cardDescription: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  cardButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  footerText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
});