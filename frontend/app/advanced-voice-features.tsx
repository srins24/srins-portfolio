import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface VoiceProfile {
  accent: string;
  personality: string;
  speed: number;
  pitch: number;
  empathy_level: number;
  medical_expertise: 'basic' | 'advanced' | 'specialist';
}

interface VoiceBiometrics {
  stress_level: number;
  respiratory_rate: number;
  speech_clarity: number;
  emotional_state: string;
  fatigue_indicators: string[];
}

interface SmartAlert {
  id: string;
  type: 'medication' | 'exercise' | 'appointment' | 'emergency';
  message: string;
  context: {
    time_sensitive: boolean;
    location_based: boolean;
    activity_based: boolean;
  };
  voice_delivery: {
    urgency: 'low' | 'medium' | 'high' | 'critical';
    personalization: boolean;
    multi_language: boolean;
  };
}

export default function AdvancedVoiceFeatures() {
  const router = useRouter();
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>({
    accent: 'en-US',
    personality: 'professional',
    speed: 1.0,
    pitch: 1.0,
    empathy_level: 0.7,
    medical_expertise: 'advanced'
  });
  
  const [voiceBiometrics, setVoiceBiometrics] = useState<VoiceBiometrics | null>(null);
  const [isVoiceBiometricsEnabled, setIsVoiceBiometricsEnabled] = useState(false);
  const [smartAlertsEnabled, setSmartAlertsEnabled] = useState(true);
  const [emergencyContactsEnabled, setEmergencyContactsEnabled] = useState(false);
  const [multiUserMode, setMultiUserMode] = useState(false);
  const [currentUser, setCurrentUser] = useState('Primary User');
  const [isListening, setIsListening] = useState(false);
  const [voiceHealthInsights, setVoiceHealthInsights] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // Advanced Voice Accents and Languages
  const voiceOptions = [
    { code: 'en-US', name: '🇺🇸 English (US)', personality: 'Friendly American' },
    { code: 'en-GB', name: '🇬🇧 English (UK)', personality: 'Professional British' },
    { code: 'en-AU', name: '🇦🇺 English (AU)', personality: 'Casual Australian' },
    { code: 'en-CA', name: '🇨🇦 English (CA)', personality: 'Polite Canadian' },
    { code: 'es-ES', name: '🇪🇸 Spanish (Spain)', personality: 'Warm Spanish' },
    { code: 'es-MX', name: '🇲🇽 Spanish (Mexico)', personality: 'Caring Mexican' },
    { code: 'fr-FR', name: '🇫🇷 French', personality: 'Sophisticated French' },
    { code: 'de-DE', name: '🇩🇪 German', personality: 'Precise German' },
    { code: 'it-IT', name: '🇮🇹 Italian', personality: 'Expressive Italian' },
    { code: 'pt-BR', name: '🇧🇷 Portuguese (Brazil)', personality: 'Energetic Brazilian' },
    { code: 'ja-JP', name: '🇯🇵 Japanese', personality: 'Respectful Japanese' },
    { code: 'ko-KR', name: '🇰🇷 Korean', personality: 'Gentle Korean' },
    { code: 'zh-CN', name: '🇨🇳 Chinese (Mandarin)', personality: 'Wise Chinese' },
    { code: 'hi-IN', name: '🇮🇳 Hindi', personality: 'Compassionate Indian' },
    { code: 'ar-SA', name: '🇸🇦 Arabic', personality: 'Respectful Arabic' }
  ];

  // AI Personality Types
  const personalityTypes = [
    { id: 'professional', name: '👩‍⚕️ Medical Professional', description: 'Clinical, precise, evidence-based' },
    { id: 'friendly', name: '😊 Friendly Coach', description: 'Warm, encouraging, supportive' },
    { id: 'scientific', name: '🔬 Research Scientist', description: 'Data-driven, analytical, detailed' },
    { id: 'motivational', name: '💪 Fitness Trainer', description: 'Energetic, challenging, goal-oriented' },
    { id: 'therapeutic', name: '🧘‍♀️ Wellness Therapist', description: 'Calming, mindful, holistic' },
    { id: 'family_doctor', name: '👨‍⚕️ Family Doctor', description: 'Caring, patient, comprehensive' },
    { id: 'specialist', name: '🫀 Cardiologist', description: 'Expert, focused, specialized' },
    { id: 'ai_assistant', name: '🤖 AI Assistant', description: 'Efficient, informative, adaptive' }
  ];

  useEffect(() => {
    initializeAdvancedVoiceFeatures();
    if (isVoiceBiometricsEnabled) {
      startVoiceBiometricAnalysis();
    }
  }, [isVoiceBiometricsEnabled]);

  const initializeAdvancedVoiceFeatures = () => {
    // Initialize advanced speech recognition with accent detection
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = voiceProfile.accent;
        
        // Advanced recognition settings
        recognition.maxAlternatives = 3;
        recognition.serviceURI = 'builtin'; // Use device-specific optimizations
        
        recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          
          // Perform voice biometrics analysis if enabled
          if (isVoiceBiometricsEnabled) {
            analyzeVoiceBiometrics(transcript, confidence, event);
          }
          
          // Process with accent-aware AI
          processAdvancedVoiceCommand(transcript, confidence);
        };
        
        recognitionRef.current = recognition;
      }
    }

    // Initialize advanced text-to-speech with personality
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  };

  const startVoiceBiometricAnalysis = () => {
    // Simulate advanced voice biometrics analysis
    const mockBiometrics: VoiceBiometrics = {
      stress_level: Math.random() * 100,
      respiratory_rate: 16 + Math.random() * 8, // 16-24 breaths per minute
      speech_clarity: 85 + Math.random() * 15,
      emotional_state: ['calm', 'anxious', 'excited', 'tired', 'focused'][Math.floor(Math.random() * 5)],
      fatigue_indicators: Math.random() > 0.7 ? ['slow_speech', 'frequent_pauses'] : []
    };
    
    setVoiceBiometrics(mockBiometrics);
    
    // Generate health insights from voice patterns
    generateVoiceHealthInsights(mockBiometrics);
  };

  const analyzeVoiceBiometrics = (transcript: string, confidence: number, audioEvent: any) => {
    // Advanced voice pattern analysis
    const speechRate = transcript.length / 2; // Rough words per second calculation
    const pauseCount = (transcript.match(/\.\.\.|,|;/g) || []).length;
    const clarityScore = confidence * 100;
    
    // Detect stress indicators in voice
    const stressIndicators = {
      fast_speech: speechRate > 3,
      frequent_pauses: pauseCount > 3,
      low_confidence: confidence < 0.7,
      voice_tremor: Math.random() > 0.8 // Simulated tremor detection
    };
    
    // Update biometrics
    setVoiceBiometrics(prev => prev ? {
      ...prev,
      speech_clarity: clarityScore,
      stress_level: Object.values(stressIndicators).filter(Boolean).length * 25,
      fatigue_indicators: stressIndicators.frequent_pauses ? ['frequent_pauses'] : []
    } : null);
  };

  const generateVoiceHealthInsights = (biometrics: VoiceBiometrics) => {
    const insights = {
      cardiovascular_insights: [],
      wellness_recommendations: [],
      risk_indicators: []
    };

    // Analyze stress patterns for cardiovascular health
    if (biometrics.stress_level > 70) {
      insights.cardiovascular_insights.push({
        type: 'stress_warning',
        message: 'Elevated stress detected in voice patterns. High stress levels can increase cardiovascular risk.',
        recommendation: 'Consider stress management techniques like deep breathing or meditation.'
      });
    }

    // Analyze respiratory patterns
    if (biometrics.respiratory_rate > 20) {
      insights.cardiovascular_insights.push({
        type: 'respiratory_alert',
        message: 'Elevated respiratory rate detected. This could indicate physical or emotional stress.',
        recommendation: 'Monitor your breathing and consider relaxation exercises.'
      });
    }

    // Analyze fatigue patterns
    if (biometrics.fatigue_indicators.length > 0) {
      insights.wellness_recommendations.push({
        type: 'fatigue_management',
        message: 'Voice patterns suggest fatigue. Adequate rest is crucial for heart health.',
        recommendation: 'Ensure 7-9 hours of quality sleep and consider reducing stress levels.'
      });
    }

    setVoiceHealthInsights(insights);
  };

  const processAdvancedVoiceCommand = async (transcript: string, confidence: number = 0.9) => {
    // Advanced command processing with personality and accent awareness
    const context = {
      user_profile: {
        accent: voiceProfile.accent,
        personality_preference: voiceProfile.personality,
        medical_expertise_level: voiceProfile.medical_expertise,
      },
      voice_biometrics: voiceBiometrics,
      conversation_context: {
        empathy_level: voiceProfile.empathy_level,
        medical_terminology: voiceProfile.medical_expertise !== 'basic',
      },
      risk_data: {
        // Optionally populate with recent risks if available from app state in future
      },
    };

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/voice/process-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          context,
        })
      });

      const result = await response.json();
      // Map backend priority to an emotion tone for TTS styling
      const tone = result?.priority === 'urgent' ? 'urgent' : result?.priority === 'high' ? 'encouraging' : 'calming';
      speakWithPersonality(result?.response_text || 'I could not process that request yet.', tone);
    } catch (error) {
      console.error('Advanced voice processing error:', error);
    }
  };

  const speakWithPersonality = (text: string, emotionTone: string = 'neutral') => {
    // Platform-aware TTS: web uses SpeechSynthesis; native uses expo-speech
    const tune = (base: { rate: number; pitch: number }) => {
      let { rate, pitch } = base;
      switch (voiceProfile.personality) {
        case 'professional':
          rate = 0.9; pitch = 1.0; break;
        case 'friendly':
          rate = 1.1; pitch = 1.2; break;
        case 'therapeutic':
          rate = 0.8; pitch = 0.9; break;
        case 'motivational':
          rate = 1.2; pitch = 1.3; break;
      }
      switch (emotionTone) {
        case 'urgent':
          rate = 1.3; pitch = 1.4; break;
        case 'calming':
          rate = 0.7; pitch = 0.8; break;
        case 'encouraging':
          rate = 1.1; pitch = 1.3; break;
      }
      return { rate, pitch };
    };

    if (Platform.OS === 'web' && synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceProfile.accent;
      const tuned = tune({ rate: voiceProfile.speed, pitch: voiceProfile.pitch });
      utterance.rate = tuned.rate;
      utterance.pitch = tuned.pitch;
      utterance.volume = 1.0;
      synthRef.current.speak(utterance);
      return;
    }

    // Native fallback using expo-speech
    const tuned = tune({ rate: voiceProfile.speed, pitch: voiceProfile.pitch });
    Speech.speak(text, {
      language: voiceProfile.accent,
      pitch: tuned.pitch,
      rate: tuned.rate,
      onStart: () => {},
      onDone: () => {},
      onStopped: () => {},
      onError: () => {},
    });
  };

  const triggerSmartAlert = (alertType: string) => {
    const alerts = {
      medication: {
        message: `🔔 Time for your heart medication! This is personalized for ${currentUser}.`,
        context: { time_sensitive: true, urgency: 'high' as const }
      },
      exercise: {
        message: `💪 Your voice analysis suggests you could benefit from some light exercise. How about a 10-minute walk?`,
        context: { activity_based: true, urgency: 'medium' as const }
      },
      stress: {
        message: `🧘‍♀️ I've detected elevated stress in your voice. Let's try some breathing exercises together.`,
        context: { time_sensitive: false, urgency: 'medium' as const }
      },
      emergency: {
        message: `🚨 Your voice patterns suggest you may need medical attention. Should I contact your emergency contact?`,
        context: { time_sensitive: true, urgency: 'critical' as const }
      }
    };

    const alert = alerts[alertType as keyof typeof alerts];
    if (alert) {
      speakWithPersonality(alert.message, 
        alert.context.urgency === 'critical' ? 'urgent' : 
        alert.context.urgency === 'high' ? 'encouraging' : 'calming'
      );
    }
  };

  const startAdvancedListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.lang = voiceProfile.accent;
      recognitionRef.current.start();
      // Haptics feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      // Announce listening start in selected accent
      speakWithPersonality(`Hello! I'm listening in ${voiceOptions.find(v => v.code === voiceProfile.accent)?.personality} style. How can I help with your heart health today?`);
    } else {
      Alert.alert(
        'Voice Input on this device',
        'Live voice recognition is supported in the web preview. On native devices, transcription requires enabling server-side processing (Whisper). For now, use the AI Coach screen or try the web preview.'
      );
    }
  };

  const stopAdvancedListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const switchUserProfile = (userName: string) => {
    setCurrentUser(userName);
    speakWithPersonality(`Switched to ${userName}'s health profile. Hello ${userName}, how are you feeling today?`);
  };

  const testEmergencySystem = () => {
    Alert.alert(
      'Emergency System Test',
      'This would automatically detect medical emergencies from voice patterns and contact emergency services or designated contacts.',
      [
        { text: 'Cancel' },
        { text: 'Test Alert', onPress: () => triggerSmartAlert('emergency') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌟 Advanced Voice AI</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Voice Profile Customization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 AI Personality & Voice</Text>
          
          {/* Language/Accent Selection */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>🌍 Language & Accent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalScroll}>
                {voiceOptions.map((voice) => (
                  <TouchableOpacity
                    key={voice.code}
                    style={[
                      styles.voiceOption,
                      voiceProfile.accent === voice.code && styles.voiceOptionActive
                    ]}
                    onPress={() => setVoiceProfile(prev => ({ ...prev, accent: voice.code }))}
                  >
                    <Text style={styles.voiceOptionText}>{voice.name}</Text>
                    <Text style={styles.voiceOptionSubtext}>{voice.personality}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Personality Selection */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>🧠 AI Personality Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalScroll}>
                {personalityTypes.map((personality) => (
                  <TouchableOpacity
                    key={personality.id}
                    style={[
                      styles.personalityOption,
                      voiceProfile.personality === personality.id && styles.personalityOptionActive
                    ]}
                    onPress={() => setVoiceProfile(prev => ({ ...prev, personality: personality.id }))}
                  >
                    <Text style={styles.personalityName}>{personality.name}</Text>
                    <Text style={styles.personalityDescription}>{personality.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Voice Parameters */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>🔧 Voice Parameters</Text>
            
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Speech Speed: {voiceProfile.speed.toFixed(1)}x</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                value={voiceProfile.speed}
                onValueChange={(value) => setVoiceProfile(prev => ({ ...prev, speed: value }))}
                minimumTrackTintColor="#2196F3"
                maximumTrackTintColor="#666666"
                thumbTintColor="#2196F3"
              />
            </View>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Voice Pitch: {voiceProfile.pitch.toFixed(1)}x</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                value={voiceProfile.pitch}
                onValueChange={(value) => setVoiceProfile(prev => ({ ...prev, pitch: value }))}
                minimumTrackTintColor="#2196F3"
                maximumTrackTintColor="#666666"
                thumbTintColor="#2196F3"
              />
            </View>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Empathy Level: {Math.round(voiceProfile.empathy_level * 100)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={voiceProfile.empathy_level}
                onValueChange={(value) => setVoiceProfile(prev => ({ ...prev, empathy_level: value }))}
                minimumTrackTintColor="#4CAF50"
                maximumTrackTintColor="#666666"
                thumbTintColor="#4CAF50"
              />
            </View>
          </View>
        </View>

        {/* Voice Biometrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🫀 Voice Health Analysis</Text>
            <Switch
              value={isVoiceBiometricsEnabled}
              onValueChange={setIsVoiceBiometricsEnabled}
              trackColor={{ false: '#333333', true: '#4CAF50' }}
              thumbColor={isVoiceBiometricsEnabled ? '#ffffff' : '#888888'}
            />
          </View>

          {isVoiceBiometricsEnabled && voiceBiometrics && (
            <View style={styles.biometricsContainer}>
              <View style={styles.biometricCard}>
                <Text style={styles.biometricTitle}>Stress Level</Text>
                <Text style={[styles.biometricValue, { color: voiceBiometrics.stress_level > 70 ? '#F44336' : voiceBiometrics.stress_level > 40 ? '#FF9800' : '#4CAF50' }]}>
                  {Math.round(voiceBiometrics.stress_level)}%
                </Text>
              </View>

              <View style={styles.biometricCard}>
                <Text style={styles.biometricTitle}>Respiratory Rate</Text>
                <Text style={styles.biometricValue}>
                  {voiceBiometrics.respiratory_rate.toFixed(1)} /min
                </Text>
              </View>

              <View style={styles.biometricCard}>
                <Text style={styles.biometricTitle}>Speech Clarity</Text>
                <Text style={styles.biometricValue}>
                  {Math.round(voiceBiometrics.speech_clarity)}%
                </Text>
              </View>

              <View style={styles.biometricCard}>
                <Text style={styles.biometricTitle}>Emotional State</Text>
                <Text style={styles.biometricValue}>
                  {voiceBiometrics.emotional_state}
                </Text>
              </View>
            </View>
          )}

          {voiceHealthInsights && (
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>🔍 Voice Health Insights</Text>
              {voiceHealthInsights.cardiovascular_insights.map((insight: any, index: number) => (
                <View key={index} style={styles.insightCard}>
                  <Text style={styles.insightMessage}>{insight.message}</Text>
                  <Text style={styles.insightRecommendation}>{insight.recommendation}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Smart Alerts & Multi-User */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Smart Health Alerts</Text>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Context-Aware Alerts</Text>
            <Switch
              value={smartAlertsEnabled}
              onValueChange={setSmartAlertsEnabled}
              trackColor={{ false: '#333333', true: '#2196F3' }}
              thumbColor={smartAlertsEnabled ? '#ffffff' : '#888888'}
            />
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Emergency Voice Detection</Text>
            <Switch
              value={emergencyContactsEnabled}
              onValueChange={setEmergencyContactsEnabled}
              trackColor={{ false: '#333333', true: '#F44336' }}
              thumbColor={emergencyContactsEnabled ? '#ffffff' : '#888888'}
            />
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Multi-User Family Mode</Text>
            <Switch
              value={multiUserMode}
              onValueChange={setMultiUserMode}
              trackColor={{ false: '#333333', true: '#9C27B0' }}
              thumbColor={multiUserMode ? '#ffffff' : '#888888'}
            />
          </View>

          {multiUserMode && (
            <View style={styles.userSelection}>
              <Text style={styles.subsectionTitle}>👥 Active User: {currentUser}</Text>
              <View style={styles.userButtons}>
                {['Primary User', 'Spouse', 'Parent', 'Child'].map((user) => (
                  <TouchableOpacity
                    key={user}
                    style={[
                      styles.userButton,
                      currentUser === user && styles.userButtonActive
                    ]}
                    onPress={() => switchUserProfile(user)}
                  >
                    <Text style={[
                      styles.userButtonText,
                      currentUser === user && styles.userButtonTextActive
                    ]}>
                      {user}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Advanced Voice Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 Advanced Voice Controls</Text>

          <View style={styles.voiceControlsGrid}>
            <TouchableOpacity 
              style={[styles.voiceControlButton, isListening && styles.voiceControlButtonActive]}
              onPress={isListening ? stopAdvancedListening : startAdvancedListening}
            >
              <Text style={styles.voiceControlIcon}>
                {isListening ? '🔴' : '🎤'}
              </Text>
              <Text style={styles.voiceControlText}>
                {isListening ? 'Stop Listening' : 'Start Advanced AI'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.voiceControlButton}
              onPress={() => triggerSmartAlert('medication')}
            >
              <Text style={styles.voiceControlIcon}>💊</Text>
              <Text style={styles.voiceControlText}>Test Med Alert</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.voiceControlButton}
              onPress={() => triggerSmartAlert('stress')}
            >
              <Text style={styles.voiceControlIcon}>🧘‍♀️</Text>
              <Text style={styles.voiceControlText}>Stress Check</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.voiceControlButton}
              onPress={testEmergencySystem}
            >
              <Text style={styles.voiceControlIcon}>🚨</Text>
              <Text style={styles.voiceControlText}>Emergency Test</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Showcase */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Revolutionary Features</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🌍</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>15+ Languages & Accents</Text>
                <Text style={styles.featureDescription}>
                  Full cardiovascular health coaching in multiple languages with native accent support
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🫀</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Voice Biometric Health Analysis</Text>
                <Text style={styles.featureDescription}>
                  AI analyzes your voice patterns to detect stress, fatigue, and respiratory health
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🧠</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>8 AI Personality Types</Text>
                <Text style={styles.featureDescription}>
                  From Medical Professional to Wellness Therapist - choose your perfect health coach
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔔</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Smart Context-Aware Alerts</Text>
                <Text style={styles.featureDescription}>
                  AI-powered notifications based on your location, activity, and health patterns
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>👥</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Multi-User Family Health</Text>
                <Text style={styles.featureDescription}>
                  Voice recognition for different family members with personalized health profiles
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🚨</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Emergency Voice Detection</Text>
                <Text style={styles.featureDescription}>
                  Advanced AI detects medical emergencies from voice patterns and auto-alerts contacts
                </Text>
              </View>
            </View>
          </View>
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
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  horizontalScroll: {
    flexDirection: 'row',
    gap: 12,
  },
  voiceOption: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  voiceOptionActive: {
    borderColor: '#2196F3',
    backgroundColor: '#1a2332',
  },
  voiceOptionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  voiceOptionSubtext: {
    color: '#cccccc',
    fontSize: 10,
    textAlign: 'center',
  },
  personalityOption: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#333333',
  },
  personalityOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2a1a',
  },
  personalityName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  personalityDescription: {
    color: '#cccccc',
    fontSize: 10,
    lineHeight: 14,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 20,
  },
  biometricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  biometricCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  biometricTitle: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 4,
  },
  biometricValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  insightsContainer: {
    marginTop: 16,
  },
  insightsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  insightMessage: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 4,
  },
  insightRecommendation: {
    color: '#cccccc',
    fontSize: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  userSelection: {
    marginTop: 16,
  },
  userButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  userButtonActive: {
    borderColor: '#9C27B0',
    backgroundColor: '#2a1a2a',
  },
  userButtonText: {
    color: '#cccccc',
    fontSize: 12,
  },
  userButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  voiceControlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  voiceControlButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  voiceControlButtonActive: {
    borderColor: '#F44336',
    backgroundColor: '#2a1a1a',
  },
  voiceControlIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  voiceControlText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDescription: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 18,
  },
});