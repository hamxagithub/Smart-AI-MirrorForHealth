/**
 * Wellness Advice Module
 * Provides personalized wellness advice based on detected emotions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Card, Button, Modal, Portal } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WellnessAdviceService } from '../services/WellnessAdviceService';
import BreathingExercise from '../components/BreathingExercise';
import MindfulnessPrompt from '../components/MindfulnessPrompt';
import MotivationalMessage from '../components/MotivationalMessage';

const { width, height } = Dimensions.get('window');

interface WellnessAdviceModuleProps {
  currentEmotion: string;
  isVisible: boolean;
}

interface AdviceContent {
  type: 'breathing' | 'mindfulness' | 'motivation' | 'professional';
  title: string;
  content: string;
  duration?: number;
  icon: string;
  color: string;
}

const WellnessAdviceModule: React.FC<WellnessAdviceModuleProps> = ({
  currentEmotion,
  isVisible,
}) => {
  const [currentAdvice, setCurrentAdvice] = useState<AdviceContent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isVisible && currentEmotion !== 'neutral') {
      generateAdvice(currentEmotion);
      showAdviceWithAnimation();
    } else {
      hideAdviceWithAnimation();
    }
  }, [currentEmotion, isVisible]);

  const generateAdvice = async (emotion: string) => {
    try {
      const advice = await WellnessAdviceService.getAdviceForEmotion(emotion);
      setCurrentAdvice(advice);
    } catch (error) {
      console.error('Error generating advice:', error);
    }
  };

  const showAdviceWithAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const hideAdviceWithAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleAdviceAction = () => {
    if (currentAdvice) {
      switch (currentAdvice.type) {
        case 'breathing':
          setActiveExercise('breathing');
          setShowModal(true);
          break;
        case 'mindfulness':
          setActiveExercise('mindfulness');
          setShowModal(true);
          break;
        case 'motivation':
          setActiveExercise('motivation');
          setShowModal(true);
          break;
        case 'professional':
          handleProfessionalHelp();
          break;
        default:
          break;
      }
    }
  };

  const handleProfessionalHelp = () => {
    // This would integrate with telemedicine module
    console.log('Connecting to professional help...');
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveExercise(null);
  };

  const renderExerciseContent = () => {
    switch (activeExercise) {
      case 'breathing':
        return <BreathingExercise onComplete={closeModal} />;
      case 'mindfulness':
        return <MindfulnessPrompt onComplete={closeModal} />;
      case 'motivation':
        return <MotivationalMessage emotion={currentEmotion} onClose={closeModal} />;
      default:
        return null;
    }
  };

  if (!currentAdvice || !isVisible) {
    return null;
  }

  return (
    <>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Animatable.View
          animation="slideInLeft"
          duration={1000}
          style={styles.adviceContainer}
        >
          <Card style={[styles.adviceCard, { backgroundColor: currentAdvice.color }]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.headerContainer}>
                <Icon name={currentAdvice.icon} size={24} color="#FFFFFF" />
                <Text style={styles.adviceTitle}>{currentAdvice.title}</Text>
              </View>
              
              <Text style={styles.adviceContent}>{currentAdvice.content}</Text>
              
              {currentAdvice.duration && (
                <Text style={styles.durationText}>
                  Duration: {currentAdvice.duration} minutes
                </Text>
              )}
              
              <Button
                mode="contained"
                onPress={handleAdviceAction}
                style={styles.actionButton}
                labelStyle={styles.actionButtonText}
              >
                {currentAdvice.type === 'professional' ? 'Get Help' : 'Start'}
              </Button>
            </Card.Content>
          </Card>
        </Animatable.View>
      </Animated.View>

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={closeModal}
          contentContainerStyle={styles.modalContainer}
        >
          {renderExerciseContent()}
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    top: height * 0.3,
    width: width * 0.4,
    zIndex: 10,
  },
  adviceContainer: {
    flex: 1,
  },
  adviceCard: {
    elevation: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  adviceContent: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  durationText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: 16,
    opacity: 0.8,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: height * 0.8,
  },
});

export default WellnessAdviceModule;
