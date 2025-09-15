import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  confidence?: number;
}

interface HealthAlert {
  id: string;
  text: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  type: 'medication' | 'risk_change' | 'emergency' | 'reminder';
}

interface RiskData {
  overall_score: number;
  heart_attack: number;
  stroke: number;
  heart_failure: number;
  arrhythmia: number;
  last_updated: string;
  trend: 'improving' | 'stable' | 'worsening';
}

export default function EnhancedVoiceUI() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([]);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);
  const audioRef = useRef<any>(null);

  // Voice commands with enhanced natural language processing
  const voiceCommands = [
    { pattern: /show.*risk|what.*risk|current.*risk/i, action: 'show_risk', description: 'Show current risk levels' },
    { pattern: /start.*assessment|new.*assessment|take.*test/i, action: 'start_assessment', description: 'Start new assessment' },
    { pattern: /explain.*result|what.*mean|help.*understand/i, action: 'explain_results', description: 'Explain risk results' },
    { pattern: /medication.*remind|take.*medicine|pills/i, action: 'medication_reminder', description: 'Set medication reminder' },
    { pattern: /emergency|help.*urgent|call.*doctor/i, action: 'emergency_help', description: 'Emergency assistance' },
    { pattern: /next.*question|continue|proceed/i, action: 'next_question', description: 'Continue to next question' },
    { pattern: /repeat.*result|say.*again|repeat/i, action: 'repeat_last', description: 'Repeat last result' },
    { pattern: /lifestyle.*tip|health.*advice|improve.*health/i, action: 'lifestyle_tips', description: 'Get health tips' },
    { pattern: /stop.*listening|pause|quiet/i, action: 'stop_listening', description: 'Stop voice assistant' },
  ];

  useEffect(() => {
    initializeVoiceSystem();
    fetchLatestRiskData();
    initializeHealthAlerts();
    
    // Add welcome message
    addVoiceMessage('assistant', 'Hello! I\'m your AI Health Coach. You can ask me about your heart health, request explanations, or start a new assessment. What would you like to know?');
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const initializeVoiceSystem = () => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setVoiceSupported(true);
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
          setCurrentTranscript('');
        };
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          setCurrentTranscript(interimTranscript || finalTranscript);
          
          if (finalTranscript) {
            addVoiceMessage('user', finalTranscript, event.results[event.results.length - 1][0].confidence);
            processVoiceCommand(finalTranscript);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'no-speech') {
            addVoiceMessage('assistant', 'I didn\'t hear anything. Please try speaking again.');
          } else {
            addVoiceMessage('assistant', 'Sorry, I had trouble understanding. Please try again.');
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
          setCurrentTranscript('');
        };
        
        recognitionRef.current = recognition;
      }
      
      // Initialize Text-to-Speech
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
    }
  };

  const startListening = () => {
    if (recognitionRef.current && voiceSupported && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        Alert.alert('Voice Error', 'Could not start voice recognition. Please try again.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speak = (text: string, priority: 'low' | 'high' = 'low') => {
    if (synthRef.current && 'speechSynthesis' in window) {
      // Cancel current speech if high priority
      if (priority === 'high') {
        synthRef.current.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthRef.current.speak(utterance);
    }
  };

  const addVoiceMessage = (role: 'user' | 'assistant', text: string, confidence?: number) => {
    const message: VoiceMessage = {
      id: Date.now().toString(),
      role,
      text,
      timestamp: new Date(),
      confidence
    };
    
    setVoiceMessages(prev => [...prev, message]);
    
    // Auto-speak assistant messages
    if (role === 'assistant') {
      speak(text);
    }
  };

  const addHealthAlert = (text: string, severity: 'low' | 'medium' | 'high', type: HealthAlert['type']) => {
    const alert: HealthAlert = {
      id: Date.now().toString(),
      text,
      severity,
      timestamp: new Date(),
      type
    };
    
    setHealthAlerts(prev => [alert, ...prev.slice(0, 4)]); // Keep last 5 alerts
    
    // Speak high-severity alerts immediately
    if (severity === 'high') {
      speak(`Important alert: ${text}`, 'high');
    }
  };

  const processVoiceCommand = async (transcript: string) => {
    setIsProcessing(true);
    
    try {
      // Check for direct command matches
      const matchedCommand = voiceCommands.find(cmd => cmd.pattern.test(transcript));
      
      if (matchedCommand) {
        await executeVoiceAction(matchedCommand.action, transcript);
      } else {
        // Send to AI assistant for natural language processing
        await processNaturalLanguageQuery(transcript);
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      addVoiceMessage('assistant', 'I apologize, but I encountered an error processing your request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeVoiceAction = async (action: string, transcript: string) => {
    switch (action) {
      case 'show_risk':
        await showCurrentRisk();
        break;
      case 'start_assessment':
        addVoiceMessage('assistant', 'Starting a new heart health assessment for you.');
        router.push('/assessment');
        break;
      case 'explain_results':
        await explainLatestResults();
        break;
      case 'medication_reminder':
        addHealthAlert('Reminder: Take your prescribed heart medication', 'medium', 'medication');
        addVoiceMessage('assistant', 'I\'ve added a medication reminder for you. Don\'t forget to take your prescribed heart medication.');
        break;
      case 'emergency_help':
        addVoiceMessage('assistant', 'If you\'re experiencing a medical emergency, please call 911 immediately. For non-urgent medical questions, contact your healthcare provider.');
        addHealthAlert('Emergency resources available if needed', 'high', 'emergency');
        break;
      case 'next_question':
        addVoiceMessage('assistant', 'Let\'s continue. What else would you like to know about your heart health?');
        break;
      case 'repeat_last':
        await repeatLastResult();
        break;
      case 'lifestyle_tips':
        await provideLifestyleTips();
        break;
      case 'stop_listening':
        stopListening();
        addVoiceMessage('assistant', 'Voice assistant paused. Tap the microphone to resume.');
        break;
      default:
        await processNaturalLanguageQuery(transcript);
    }
  };

  const processNaturalLanguageQuery = async (query: string) => {
    try {
      // In a real implementation, this would call your NLP backend
      // For now, provide contextual responses based on keywords
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('heart attack')) {
        const response = `Based on your latest assessment, your heart attack risk is ${riskData?.heart_attack || 'moderate'} level. This is calculated using multiple factors including your age, lifestyle, and medical history. Would you like me to explain which factors are contributing most to this risk?`;
        addVoiceMessage('assistant', response);
      } else if (lowerQuery.includes('stroke')) {
        const response = `Your stroke risk is currently ${riskData?.stroke || 'low'} level. Key factors that influence stroke risk include blood pressure, age, and lifestyle habits. Keep up the good work managing your cardiovascular health!`;
        addVoiceMessage('assistant', response);
      } else if (lowerQuery.includes('improve') || lowerQuery.includes('better')) {
        await provideLifestyleTips();
      } else {
        // Generic helpful response
        addVoiceMessage('assistant', 'I\'m here to help with your heart health questions. You can ask me about your risk levels, request health tips, start a new assessment, or ask for explanations of your results. What would you like to know?');
      }
    } catch (error) {
      addVoiceMessage('assistant', 'I\'m sorry, I couldn\'t process that request right now. Please try rephrasing your question.');
    }
  };

  const showCurrentRisk = async () => {
    if (riskData) {
      const response = `Your overall cardiovascular risk score is ${riskData.overall_score}%. Breaking this down: Heart attack risk is ${riskData.heart_attack}%, stroke risk is ${riskData.stroke}%, heart failure risk is ${riskData.heart_failure}%, and arrhythmia risk is ${riskData.arrhythmia}%. Your risk trend is currently ${riskData.trend}. Would you like me to explain what these numbers mean?`;
      addVoiceMessage('assistant', response);
    } else {
      addVoiceMessage('assistant', 'I don\'t have your current risk data available. Would you like to start a new assessment to get updated risk calculations?');
    }
  };

  const explainLatestResults = async () => {
    const explanation = `Your cardiovascular risk assessment uses advanced machine learning to analyze over 20 health factors. The system looks at things like your age, blood pressure, cholesterol levels, family history, lifestyle habits, and more. Each factor is weighted based on medical research to give you personalized risk predictions. The percentages tell you your statistical likelihood of developing each condition. Would you like me to focus on any specific risk factor?`;
    addVoiceMessage('assistant', explanation);
  };

  const repeatLastResult = async () => {
    const lastAssistantMessage = voiceMessages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMessage) {
      addVoiceMessage('assistant', `I'll repeat that: ${lastAssistantMessage.text}`);
    } else {
      addVoiceMessage('assistant', 'I don\'t have a previous result to repeat. Would you like me to show your current risk levels?');
    }
  };

  const provideLifestyleTips = async () => {
    const tips = [
      'Regular exercise for at least 30 minutes, 5 days a week can significantly reduce your cardiovascular risk.',
      'A Mediterranean-style diet rich in fruits, vegetables, whole grains, and healthy fats is excellent for heart health.',
      'Managing stress through meditation, yoga, or other relaxation techniques can lower your blood pressure.',
      'Getting 7-9 hours of quality sleep each night is crucial for heart health.',
      'If you smoke, quitting is the single most important thing you can do for your cardiovascular health.'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    addVoiceMessage('assistant', `Here's a personalized health tip: ${randomTip} Would you like more specific advice for your situation?`);
  };

  const fetchLatestRiskData = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/recent-predictions?limit=1`);
      const data = await response.json();
      
      if (data.length > 0) {
        const latest = data[0];
        const risks = latest.prediction_result.cardiovascular_risks;
        
        setRiskData({
          overall_score: Math.round((risks?.overall_cardiovascular?.probability || 0) * 100),
          heart_attack: Math.round((risks?.heart_attack?.probability || 0) * 100),
          stroke: Math.round((risks?.stroke?.probability || 0) * 100),
          heart_failure: Math.round((risks?.heart_failure?.probability || 0) * 100),
          arrhythmia: Math.round((risks?.arrhythmia?.probability || 0) * 100),
          last_updated: latest.timestamp,
          trend: 'stable' // You could calculate this from historical data
        });
      }
    } catch (error) {
      console.error('Error fetching risk data:', error);
    }
  };

  const initializeHealthAlerts = () => {
    // Add some sample alerts
    addHealthAlert('Daily medication reminder set', 'low', 'reminder');
    addHealthAlert('Regular check-up scheduled for next week', 'low', 'reminder');
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#4CAF50';
    if (score < 70) return '#FF9800';
    return '#F44336';
  };

  const getAlertColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enhanced Voice UI</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Voice Control Panel */}
        <View style={styles.voicePanel}>
          <View style={styles.voicePanelHeader}>
            <Text style={styles.voicePanelTitle}>🎤 Voice Assistant</Text>
            <Text style={styles.voiceStatus}>
              {!voiceSupported ? '❌ Not supported' :
               isListening ? '🔴 Listening...' :
               isSpeaking ? '🔊 Speaking...' :
               isProcessing ? '⚙️ Processing...' :
               '⚪ Ready'}
            </Text>
          </View>
          
          <View style={styles.voiceControls}>
            <TouchableOpacity 
              style={[styles.micButton, isListening && styles.micButtonActive]}
              onPress={isListening ? stopListening : startListening}
              disabled={!voiceSupported || isSpeaking || isProcessing}
            >
              <Text style={styles.micButtonIcon}>
                {isListening ? '🔴' : '🎤'}
              </Text>
              <Text style={styles.micButtonText}>
                {isListening ? 'Stop Listening' : 'Start Voice'}
              </Text>
            </TouchableOpacity>

            {currentTranscript && (
              <View style={styles.transcriptPreview}>
                <Text style={styles.transcriptText}>"{currentTranscript}"</Text>
              </View>
            )}
          </View>
        </View>

        {/* Risk Dashboard */}
        {riskData && (
          <View style={styles.riskDashboard}>
            <Text style={styles.sectionTitle}>📊 Current Risk Levels</Text>
            <View style={styles.riskGrid}>
              <View style={styles.riskCard}>
                <Text style={styles.riskCardTitle}>Overall Risk</Text>
                <Text style={[styles.riskScore, { color: getRiskColor(riskData.overall_score) }]}>
                  {riskData.overall_score}%
                </Text>
                <Text style={styles.riskTrend}>Trend: {riskData.trend}</Text>
              </View>
              
              <View style={styles.riskCard}>
                <Text style={styles.riskCardTitle}>Heart Attack</Text>
                <Text style={[styles.riskScore, { color: getRiskColor(riskData.heart_attack) }]}>
                  {riskData.heart_attack}%
                </Text>
              </View>
              
              <View style={styles.riskCard}>
                <Text style={styles.riskCardTitle}>Stroke</Text>
                <Text style={[styles.riskScore, { color: getRiskColor(riskData.stroke) }]}>
                  {riskData.stroke}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Conversation History */}
        <View style={styles.conversationSection}>
          <Text style={styles.sectionTitle}>💬 Assistant Conversation</Text>
          <ScrollView style={styles.conversationHistory} nestedScrollEnabled>
            {voiceMessages.map((message) => (
              <View key={message.id} style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              ]}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageRole}>
                    {message.role === 'user' ? '👤 You' : '🤖 AI Coach'}
                  </Text>
                  {message.confidence && (
                    <Text style={styles.confidenceScore}>
                      {Math.round(message.confidence * 100)}% confidence
                    </Text>
                  )}
                </View>
                <Text style={styles.messageText}>{message.text}</Text>
                <Text style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Health Alerts */}
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>🚨 Health Alerts</Text>
          {healthAlerts.length === 0 ? (
            <Text style={styles.noAlertsText}>No current alerts</Text>
          ) : (
            healthAlerts.map((alert) => (
              <View key={alert.id} style={[
                styles.alertCard,
                { borderLeftColor: getAlertColor(alert.severity) }
              ]}>
                <Text style={styles.alertText}>{alert.text}</Text>
                <Text style={styles.alertTime}>
                  {alert.timestamp.toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionButtonsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => addHealthAlert('Medication reminder set', 'medium', 'medication')}
            >
              <Text style={styles.actionButtonText}>💊 Remind Meds</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/assessment')}
            >
              <Text style={styles.actionButtonText}>📋 Assessment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => processVoiceCommand('show current risk')}
            >
              <Text style={styles.actionButtonText}>📊 Show Risk</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => processVoiceCommand('give me health tips')}
            >
              <Text style={styles.actionButtonText}>💡 Get Tips</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice Commands Help */}
        <View style={styles.helpSection}>
          <Text style={styles.sectionTitle}>🗣️ Voice Commands</Text>
          <Text style={styles.helpText}>
            Try saying: "Show my heart attack risk", "Give me health tips", "Start new assessment", 
            "Explain my results", "Next question", "Repeat last result", or ask any health question!
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
  voicePanel: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  voicePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voicePanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  voiceStatus: {
    fontSize: 14,
    color: '#cccccc',
  },
  voiceControls: {
    alignItems: 'center',
  },
  micButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 150,
  },
  micButtonActive: {
    backgroundColor: '#F44336',
  },
  micButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  micButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transcriptPreview: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    maxWidth: '100%',
  },
  transcriptText: {
    color: '#ffffff',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  riskDashboard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  riskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  riskCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: (width - 84) / 3,
    alignItems: 'center',
  },
  riskCardTitle: {
    fontSize: 12,
    color: '#cccccc',
    marginBottom: 4,
  },
  riskScore: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskTrend: {
    fontSize: 10,
    color: '#888888',
  },
  conversationSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
    maxHeight: 300,
  },
  conversationHistory: {
    flex: 1,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  userMessage: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  assistantMessage: {
    backgroundColor: '#2a2a2a',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  confidenceScore: {
    fontSize: 10,
    color: '#cccccc',
  },
  messageText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 18,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#cccccc',
  },
  alertsSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  noAlertsText: {
    color: '#888888',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 4,
  },
  alertTime: {
    color: '#888888',
    fontSize: 10,
  },
  quickActions: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: (width - 84) / 2,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#333333',
  },
  helpText: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
});