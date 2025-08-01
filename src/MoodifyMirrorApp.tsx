/**
 * Moodify Mirror Main Application Component
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';

// Import all modules
import EmotionRecognitionModule from './modules/EmotionRecognitionModule';
import WellnessAdviceModule from './modules/WellnessAdviceModule';
import RemotePatientMonitoringModule from './modules/RemotePatientMonitoringModule';
import MirrorInterface from './components/MirrorInterface';
import VoiceCommandModule from './modules/VoiceCommandModule';
import NotificationModule from './modules/NotificationModule';
import HealthDataModule from './modules/HealthDataModule';
import TelemedicineModule from './modules/TelemedicineModule';

// Import services
import { PermissionService } from './services/PermissionService';
import { StorageService } from './services/StorageService';
import { EmotionAnalysisService } from './services/EmotionAnalysisService';

const { width, height } = Dimensions.get('window');

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366F1',
    secondary: '#EC4899',
    background: 'transparent',
    surface: 'rgba(255, 255, 255, 0.1)',
    text: '#FFFFFF',
  },
};

interface MoodifyMirrorAppProps {}

const MoodifyMirrorApp: React.FC<MoodifyMirrorAppProps> = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [isListening, setIsListening] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    initializeApp();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
 

  
  const initializeApp = async () => {
    try {
      // Request permissions
      await PermissionService.requestAllPermissions();
      
      // Initialize storage
      await StorageService.initialize();
      
      // Initialize emotion analysis service
      await EmotionAnalysisService.initialize();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  const handleEmotionDetected = (emotion: string, confidence: number) => {
    setCurrentEmotion(emotion);
  };

  const handleVoiceCommand = (command: string) => {
    console.log('Voice command received:', command);
    // Handle voice commands
  };

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.loadingText}>Initializing Moodify Mirror...</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Main Mirror Interface */}
        <MirrorInterface
          currentEmotion={currentEmotion}
          currentTime={currentTime}
          isListening={isListening}
        />

        {/* Emotion Recognition Module */}
        <EmotionRecognitionModule
          onEmotionDetected={handleEmotionDetected}
          isActive={true}
        />

        {/* Wellness Advice Module */}
        <WellnessAdviceModule
          currentEmotion={currentEmotion}
          isVisible={currentEmotion !== 'neutral'}
        />

        {/* Remote Patient Monitoring Module */}
        <RemotePatientMonitoringModule
          isActive={true}
        />

        {/* Voice Command Module */}
        <VoiceCommandModule
          onVoiceCommand={handleVoiceCommand}
          onListeningStateChange={setIsListening}
          isActive={true}
        />

        {/* Notification Module */}
        <NotificationModule />

        {/* Health Data Module */}
        <HealthDataModule
          currentEmotion={currentEmotion}
        />

        {/* Telemedicine Module */}
        <TelemedicineModule />
        
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default MoodifyMirrorApp;
