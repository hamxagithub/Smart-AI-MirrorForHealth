/**
 * Voice Command Module
 * Handles voice recognition and command processing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Voice from '@react-native-community/voice';
import Tts from 'react-native-tts';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { VoiceCommandService } from '../services/VoiceCommandService';

const { width } = Dimensions.get('window');

interface VoiceCommandModuleProps {
  onVoiceCommand: (command: string) => void;
  onListeningStateChange: (isListening: boolean) => void;
  isActive: boolean;
}

interface Command {
  intent: string;
  parameters: { [key: string]: string };
  confidence: number;
}

const VoiceCommandModule: React.FC<VoiceCommandModuleProps> = ({
  onVoiceCommand,
  onListeningStateChange,
  isActive,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [lastCommand, setLastCommand] = useState<Command | null>(null);

  useEffect(() => {
    if (isActive) {
      initializeVoice();
      initializeTts();
    }
    
    return () => {
      cleanupVoice();
    };
  }, [isActive]);

  useEffect(() => {
    onListeningStateChange(isListening);
  }, [isListening, onListeningStateChange]);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const initializeVoice = async () => {
    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechRecognized = onSpeechRecognized;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechError = onSpeechError;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechPartialResults = onSpeechPartialResults;

      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert('Voice Recognition', 'Voice recognition is not available on this device');
      }
    } catch (error) {
      console.error('Error initializing voice:', error);
    }
  };

  const initializeTts = async () => {
    try {
      await Tts.setDefaultLanguage('en-US');
      await Tts.setDefaultRate(0.5);
      await Tts.setDefaultPitch(1.0);
    } catch (error) {
      console.error('Error initializing TTS:', error);
    }
  };

  const cleanupVoice = () => {
    Voice.destroy().then(Voice.removeAllListeners);
  };

  const startListening = async () => {
    try {
      setRecognizedText('');
      setIsProcessing(false);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  };

  const onSpeechStart = (event: any) => {
    setIsListening(true);
    setRecognizedText('Listening...');
  };

  const onSpeechRecognized = (event: any) => {
    // Speech has been recognized
  };

  const onSpeechEnd = (event: any) => {
    setIsListening(false);
    setIsProcessing(true);
  };

  const onSpeechError = (event: any) => {
    console.error('Speech error:', event.error);
    setIsListening(false);
    setIsProcessing(false);
    setRecognizedText('');
  };

  const onSpeechResults = async (event: any) => {
    const result = event.value?.[0];
    if (result) {
      setRecognizedText(result);
      await processVoiceCommand(result);
    }
    setIsProcessing(false);
  };

  const onSpeechPartialResults = (event: any) => {
    const partialResult = event.value?.[0];
    if (partialResult) {
      setRecognizedText(partialResult);
    }
  };

  const processVoiceCommand = async (text: string) => {
    try {
      const command = await VoiceCommandService.parseCommand(text);
      if (command) {
        setLastCommand(command);
        await executeCommand(command);
        onVoiceCommand(text);
      } else {
        await speakResponse("I didn't understand that command. Please try again.");
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      await speakResponse("Sorry, I encountered an error processing your command.");
    }
  };

  const executeCommand = async (command: Command) => {
    try {
      let response = '';
      
      switch (command.intent) {
        case 'greeting':
          response = "Hello! How can I help you today?";
          break;
          
        case 'wellness_check':
          response = "Let me check your wellness status.";
          // Trigger wellness module
          break;
          
        case 'medication_reminder':
          response = "Let me check your medication schedule.";
          // Trigger medication module
          break;
          
        case 'breathing_exercise':
          response = "Starting a breathing exercise for you.";
          // Trigger breathing exercise
          break;
          
        case 'mood_check':
          response = "I can see you're feeling " + (command.parameters.emotion || 'neutral') + ". Would you like some wellness advice?";
          break;
          
        case 'emergency':
          response = "Contacting emergency services immediately.";
          // Trigger emergency protocol
          break;
          
        case 'call_caregiver':
          response = "Calling your designated caregiver.";
          // Trigger caregiver contact
          break;
          
        case 'health_report':
          response = "Preparing your health summary.";
          // Generate health report
          break;
          
        case 'music_therapy':
          response = "Starting calming music for relaxation.";
          // Start music therapy
          break;
          
        case 'schedule_appointment':
          response = "Let me help you schedule an appointment.";
          // Trigger appointment scheduling
          break;
          
        default:
          response = "I understand you said: " + recognizedText + ". How can I help you with that?";
      }
      
      await speakResponse(response);
      
    } catch (error) {
      console.error('Error executing command:', error);
      await speakResponse("I encountered an error while processing your request.");
    }
  };

  const speakResponse = async (text: string) => {
    try {
      await Tts.speak(text);
    } catch (error) {
      console.error('Error with text-to-speech:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.setValue(1);
  };

  const getStatusColor = () => {
    if (isListening) return '#10B981';
    if (isProcessing) return '#F59E0B';
    return '#6B7280';
  };

  const getStatusText = () => {
    if (isListening) return 'Listening...';
    if (isProcessing) return 'Processing...';
    if (recognizedText && !isListening) return `"${recognizedText}"`;
    return 'Say "Hey Mirror" to start';
  };

  if (!isActive) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animatable.View
        animation={isListening ? 'pulse' : undefined}
        iterationCount="infinite"
        style={styles.voiceIndicator}
      >
        <Animated.View
          style={[
            styles.microphoneContainer,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: getStatusColor(),
            },
          ]}
        >
          <Icon
            name={isListening ? 'mic' : isProcessing ? 'hourglass-empty' : 'mic-none'}
            size={32}
            color="#FFFFFF"
          />
        </Animated.View>
      </Animatable.View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      
      {lastCommand && (
        <View style={styles.commandHistory}>
          <Text style={styles.commandText}>
            Last: {lastCommand.intent} ({Math.round(lastCommand.confidence * 100)}%)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 20,
    alignItems: 'center',
    zIndex: 20,
  },
  voiceIndicator: {
    marginBottom: 12,
  },
  microphoneContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: width * 0.5,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  commandHistory: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  commandText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
  },
});

export default VoiceCommandModule;
