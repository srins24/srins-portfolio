import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface VoiceCommand {
  command: string;
  action: () => void;
  description: string;
}

interface AIResponse {
  message: string;
  action?: string;
  data?: any;
}

export default function VoiceAssistant() {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'ai';
    message: string;
    timestamp: Date;
  }>>([]);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // Voice commands mapping
  const voiceCommands: VoiceCommand[] = [
    {
      command: 'start assessment',
      action: () => router.push('/assessment'),
      description: 'Begin a new heart health assessment'
    },
    {
      command: 'show risk monitor',
      action: () => router.push('/risk-monitor'),
      description: 'View real-time risk monitoring'
    },
    {
      command: 'view history',
      action: () => router.push('/history'),
      description: 'Check your assessment history'
    },
    {
      command: 'go home',
      action: () => router.push('/'),
      description: 'Return to home dashboard'
    },
    {
      command: 'what is my heart attack risk',
      action: () => getLatestRisk('heart_attack'),
      description: 'Get your current heart attack risk level'
    },
    {
      command: 'explain my results',
      action: () => explainLatestResults(),
      description: 'Get AI explanation of your latest assessment'
    },
    {
      command: 'give me health tips',
      action: () => getPersonalizedTips(),
      description: 'Receive personalized health recommendations'
    },
  ];

  useEffect(() => {
    initializeVoiceRecognition();
    initializeTextToSpeech();
    
    // Add welcome message
    addToConversation('ai', '👋 Hi! I\'m your AI Health Coach. Try saying "What is my heart attack risk?" or "Give me health tips"');
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const initializeVoiceRecognition = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setVoiceSupported(true);
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
          setTranscript('');
        };
        
        recognition.onresult = (event: any) => {
          const result = event.results[0][0].transcript.toLowerCase().trim();
          setTranscript(result);
          addToConversation('user', result);
          processVoiceCommand(result);
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          Alert.alert('Voice Error', 'Could not recognize speech. Please try again.');
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      } else {
        setVoiceSupported(false);
        Alert.alert('Voice Not Supported', 'Your browser does not support voice recognition.');
      }
    }
  };

  const initializeTextToSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  };

  const startListening = () => {
    if (recognitionRef.current && voiceSupported) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const speak = (text: string) => {
    if (synthRef.current && 'speechSynthesis' in window) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
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

  const addToConversation = (type: 'user' | 'ai', message: string) => {
    setConversationHistory(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  };

  const processVoiceCommand = async (command: string) => {
    // Check for direct command matches
    const matchedCommand = voiceCommands.find(cmd => 
      command.includes(cmd.command) || cmd.command.includes(command)
    );
    
    if (matchedCommand) {
      matchedCommand.action();
      const response = `Executing: ${matchedCommand.description}`;
      addToConversation('ai', response);
      speak(response);
      return;
    }
    
    // Handle conversational AI queries
    await handleAIQuery(command);
  };

  const handleAIQuery = async (query: string) => {
    try {
      // Get AI response based on the query
      const response = await getAIHealthCoachResponse(query);
      addToConversation('ai', response.message);
      speak(response.message);
      setAiResponse(response);
      
      // Execute any associated actions
      if (response.action) {
        setTimeout(() => {
          executeAIAction(response.action!, response.data);
        }, 2000);
      }
    } catch (error) {
      console.error('AI query error:', error);
      const errorMsg = "I'm sorry, I couldn't process that request. Please try asking about your heart health, risks, or say 'help' for available commands.";
      addToConversation('ai', errorMsg);
      speak(errorMsg);
    }
  };

  const getAIHealthCoachResponse = async (query: string): Promise<AIResponse> => {
    // Simulate AI health coach responses based on query patterns
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('heart attack') || lowerQuery.includes('heart risk')) {
      return {
        message: "Based on your latest assessment, your heart attack risk is currently at a medium level. This is primarily influenced by factors like cholesterol levels and lifestyle habits. Would you like specific recommendations to reduce this risk?",
        action: 'show_heart_attack_details'
      };
    }
    
    if (lowerQuery.includes('stroke') || lowerQuery.includes('brain')) {
      return {
        message: "Your stroke risk appears to be in the low category, which is great news! Your blood pressure management and overall cardiovascular health are contributing positively. Keep up the good work with your current lifestyle.",
        action: 'show_stroke_details'
      };
    }
    
    if (lowerQuery.includes('tips') || lowerQuery.includes('advice') || lowerQuery.includes('help me')) {
      return {
        message: "Here are your top 3 personalized recommendations: First, consider increasing your weekly exercise to at least 150 minutes. Second, focus on reducing sodium intake to help with blood pressure. Third, ensure you're getting 7-8 hours of quality sleep nightly.",
        action: 'show_personalized_tips'
      };
    }
    
    if (lowerQuery.includes('explain') || lowerQuery.includes('what does') || lowerQuery.includes('mean')) {
      return {
        message: "Your cardiovascular risk assessment uses machine learning to analyze 22 different health factors. The system looks at things like your age, blood pressure, cholesterol, lifestyle habits, and family history to calculate your risk for different heart conditions.",
        action: 'show_explanation'
      };
    }
    
    if (lowerQuery.includes('improve') || lowerQuery.includes('better') || lowerQuery.includes('reduce risk')) {
      return {
        message: "Great question! Based on your profile, the most impactful changes would be: quitting smoking if applicable, which could reduce your risk by up to 15%, increasing physical activity could lower it by 8%, and improving your diet could provide a 6% reduction.",
        action: 'show_improvement_plan'
      };
    }
    
    if (lowerQuery.includes('emergency') || lowerQuery.includes('urgent') || lowerQuery.includes('call doctor')) {
      return {
        message: "If you're experiencing chest pain, shortness of breath, or other concerning symptoms, please seek immediate medical attention or call emergency services. For non-urgent questions, I recommend scheduling an appointment with your healthcare provider.",
        action: 'show_emergency_info'
      };
    }
    
    if (lowerQuery.includes('help') || lowerQuery.includes('commands')) {
      return {
        message: "I can help you with: checking your heart risks, explaining assessment results, providing health tips, starting new assessments, or navigating the app. Just speak naturally - for example, say 'What's my heart attack risk?' or 'Give me health advice'.",
        action: 'show_help'
      };
    }
    
    // Default response for unrecognized queries
    return {
      message: "I understand you're asking about your heart health. Could you be more specific? You can ask about your risk levels, request health tips, or say 'help' to see what I can do for you.",
    };
  };

  const executeAIAction = (action: string, data?: any) => {
    switch (action) {
      case 'show_heart_attack_details':
        router.push('/risk-monitor');
        break;
      case 'show_personalized_tips':
        // Could show a tips modal or navigate to tips page
        break;
      case 'show_improvement_plan':
        // Could show lifestyle improvement suggestions
        break;
      case 'show_emergency_info':
        Alert.alert('Emergency Information', 'For immediate help: Call 911 (US) or your local emergency number. For non-urgent questions, contact your healthcare provider.');
        break;
      default:
        break;
    }
  };

  const getLatestRisk = async (riskType: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/recent-predictions?limit=1`);
      const data = await response.json();
      
      if (data.length > 0) {
        const latest = data[0];
        const risk = latest.prediction_result.cardiovascular_risks?.[riskType];
        
        if (risk) {
          const message = `Your ${riskType.replace('_', ' ')} risk is currently ${risk.risk_level.toLowerCase()} at ${(risk.probability * 100).toFixed(1)}%.`;
          addToConversation('ai', message);
          speak(message);
        }
      }
    } catch (error) {
      console.error('Error getting latest risk:', error);
    }
  };

  const explainLatestResults = async () => {
    const message = "Your latest assessment shows a comprehensive view of your cardiovascular health. The AI analyzed your lifestyle factors, medical history, and vital signs to calculate risks for heart attack, stroke, heart failure, and arrhythmia. Would you like me to explain any specific risk category?";
    addToConversation('ai', message);
    speak(message);
  };

  const getPersonalizedTips = () => {
    const tips = [
      "Aim for 30 minutes of moderate exercise 5 days a week",
      "Limit sodium to less than 2,300mg daily",
      "Include omega-3 rich fish twice weekly",
      "Practice stress-reduction techniques daily",
      "Monitor your blood pressure regularly"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    const message = `Here's a personalized tip: ${randomTip}. Would you like more specific advice for your risk profile?`;
    addToConversation('ai', message);
    speak(message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Health Coach</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Voice Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>🎤 Voice Assistant</Text>
          <Text style={styles.statusText}>
            {!voiceSupported ? 'Voice not supported' :
             isListening ? '🔴 Listening...' :
             isSpeaking ? '🔊 Speaking...' : 
             '⚪ Ready to listen'}
          </Text>
        </View>

        {/* Voice Controls */}
        <View style={styles.controlsCard}>
          <TouchableOpacity 
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            onPress={isListening ? stopListening : startListening}
            disabled={!voiceSupported || isSpeaking}
          >
            <Text style={styles.voiceButtonIcon}>
              {isListening ? '🔴' : '🎤'}
            </Text>
            <Text style={styles.voiceButtonText}>
              {isListening ? 'Stop Listening' : 'Start Voice Command'}
            </Text>
          </TouchableOpacity>
          
          {transcript && (
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptLabel}>You said:</Text>
              <Text style={styles.transcriptText}>"{transcript}"</Text>
            </View>
          )}
        </View>

        {/* Conversation History */}
        <View style={styles.conversationCard}>
          <Text style={styles.conversationTitle}>💬 Conversation</Text>
          <ScrollView style={styles.conversationHistory} nestedScrollEnabled>
            {conversationHistory.map((item, index) => (
              <View key={index} style={[
                styles.messageContainer,
                item.type === 'user' ? styles.userMessage : styles.aiMessage
              ]}>
                <Text style={styles.messageType}>
                  {item.type === 'user' ? '👤 You' : '🤖 AI Coach'}
                </Text>
                <Text style={styles.messageText}>{item.message}</Text>
                <Text style={styles.messageTime}>
                  {item.timestamp.toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Available Commands */}
        <View style={styles.commandsCard}>
          <Text style={styles.commandsTitle}>🗣️ Try These Commands</Text>
          {voiceCommands.slice(0, 5).map((cmd, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.commandItem}
              onPress={() => {
                addToConversation('user', cmd.command);
                processVoiceCommand(cmd.command);
              }}
            >
              <Text style={styles.commandText}>"{cmd.command}"</Text>
              <Text style={styles.commandDescription}>{cmd.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              const msg = "Hello! I'm your AI Health Coach. I can help explain your cardiovascular risks, provide personalized health tips, and guide you through assessments. What would you like to know?";
              addToConversation('ai', msg);
              speak(msg);
            }}
          >
            <Text style={styles.quickActionText}>👋 Say Hello</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => handleAIQuery('give me health tips')}
          >
            <Text style={styles.quickActionText}>💡 Get Tips</Text>
          </TouchableOpacity>
        </View>

        {/* AI Features Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🧠 AI Health Coach Features</Text>
          <Text style={styles.infoText}>
            • Voice-activated risk analysis{'\n'}
            • Personalized health recommendations{'\n'}
            • Natural language interaction{'\n'}
            • Real-time health coaching{'\n'}
            • Assessment guidance{'\n'}
            • Emergency information
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
  statusCard: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#cccccc',
  },
  controlsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  voiceButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceButtonActive: {
    backgroundColor: '#F44336',
  },
  voiceButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  voiceButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transcriptCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  transcriptLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: '#ffffff',
    fontStyle: 'italic',
  },
  conversationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    maxHeight: 300,
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
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
    maxWidth: '80%',
  },
  aiMessage: {
    backgroundColor: '#2a2a2a',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  messageType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
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
  commandsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  commandsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  commandItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  commandText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 2,
  },
  commandDescription: {
    fontSize: 12,
    color: '#cccccc',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickActionText: {
    color: '#ffffff',
    fontSize: 14,
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
  },
});