import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface HistoryItem {
  _id: string;
  patient_id: string;
  prediction_result: {
    prediction: number;
    risk_probability: number;
    risk_level: string;
    model_used: string;
    timestamp: string;
  };
  timestamp: string;
}

export default function History() {
  const router = useRouter();
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/recent-predictions?limit=20`);
      const data = await response.json();
      setHistoryData(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'High': return '#F44336';
      default: return '#888888';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return '✅';
      case 'Medium': return '⚠️';
      case 'High': return '🚨';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleItemPress = (item: HistoryItem) => {
    // Navigate to results page with historical data
    router.push({
      pathname: '/results',
      params: { resultData: JSON.stringify(item.prediction_result) }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading history...</Text>
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
        <Text style={styles.headerTitle}>Assessment History</Text>
      </View>

      {/* Content */}
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
        {/* Stats Summary */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Your Assessment Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{historyData.length}</Text>
              <Text style={styles.statLabel}>Total Assessments</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {historyData.filter(item => item.prediction_result.risk_level === 'High').length}
              </Text>
              <Text style={styles.statLabel}>High Risk</Text>
            </View>
          </View>
        </View>

        {/* History List */}
        {historyData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Assessments Yet</Text>
            <Text style={styles.emptyText}>
              Start your first heart health assessment to track your progress over time.
            </Text>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => router.push('/assessment')}
            >
              <Text style={styles.startButtonText}>Start Assessment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.historyList}>
            <Text style={styles.sectionTitle}>Recent Assessments</Text>
            {historyData.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.historyItem}
                onPress={() => handleItemPress(item)}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.riskIndicator}>
                    <Text style={styles.riskIcon}>
                      {getRiskIcon(item.prediction_result.risk_level)}
                    </Text>
                    <Text style={[
                      styles.riskText,
                      { color: getRiskColor(item.prediction_result.risk_level) }
                    ]}>
                      {item.prediction_result.risk_level} Risk
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {formatDate(item.prediction_result.timestamp)}
                  </Text>
                </View>
                
                <View style={styles.historyDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Probability:</Text>
                    <Text style={styles.detailValue}>
                      {(item.prediction_result.risk_probability * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Model:</Text>
                    <Text style={styles.detailValue}>
                      {item.prediction_result.model_used}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Patient ID:</Text>
                    <Text style={styles.detailValue}>
                      {item.patient_id.substring(0, 8)}...
                    </Text>
                  </View>
                </View>

                <Text style={styles.tapHint}>Tap to view details →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Button */}
        {historyData.length > 0 && (
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.newAssessmentButton}
              onPress={() => router.push('/assessment')}
            >
              <Text style={styles.newAssessmentText}>🔄 New Assessment</Text>
            </TouchableOpacity>
          </View>
        )}
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
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  startButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyList: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  historyItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  riskText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: '#888888',
  },
  historyDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#888888',
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  tapHint: {
    fontSize: 12,
    color: '#2196F3',
    textAlign: 'right',
    marginTop: 8,
  },
  actionContainer: {
    paddingBottom: 30,
  },
  newAssessmentButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newAssessmentText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});