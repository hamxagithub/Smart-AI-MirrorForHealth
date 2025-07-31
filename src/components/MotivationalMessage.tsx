/**
 * Motivational Message Component
 * Displays personalized motivational messages based on current emotion
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
import { Button } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tts from 'react-native-tts';

const { width, height } = Dimensions.get('window');

interface MotivationalMessageProps {
  emotion: string;
  onClose: () => void;
}

interface MotivationalContent {
  message: string;
  affirmation: string;
  actionSuggestion: string;
  icon: string;
  color: string;
}

const MotivationalMessage: React.FC<MotivationalMessageProps> = ({
  emotion,
  onClose,
}) => {
  const [currentContent, setCurrentContent] = useState<MotivationalContent | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const motivationalContent: { [key: string]: MotivationalContent[] } = {
    happy: [
      {
        message: "Your positive energy is contagious! You're doing amazing.",
        affirmation: "I embrace joy and share my happiness with others.",
        actionSuggestion: "Spread your good vibes by reaching out to someone you care about.",
        icon: 'sentiment-very-satisfied',
        color: '#10B981',
      },
      {
        message: "This beautiful moment of happiness deserves to be celebrated!",
        affirmation: "I deserve happiness and I welcome it into my life.",
        actionSuggestion: "Take a moment to savor this feeling and remember what brought it about.",
        icon: 'celebration',
        color: '#F59E0B',
      },
    ],
    sad: [
      {
        message: "It's okay to feel sad. Your emotions are valid and temporary.",
        affirmation: "I am resilient and capable of working through difficult feelings.",
        actionSuggestion: "Be gentle with yourself today. Do something small that brings you comfort.",
        icon: 'psychology',
        color: '#3B82F6',
      },
      {
        message: "Storms don't last forever. Brighter days are ahead for you.",
        affirmation: "I have the strength to navigate through challenging times.",
        actionSuggestion: "Consider talking to a friend or loved one about how you're feeling.",
        icon: 'wb-sunny',
        color: '#8B5CF6',
      },
    ],
    angry: [
      {
        message: "Your anger is information. What is it trying to tell you?",
        affirmation: "I can acknowledge my anger and respond thoughtfully.",
        actionSuggestion: "Take three deep breaths before taking any action.",
        icon: 'self-improvement',
        color: '#EF4444',
      },
      {
        message: "You have the power to transform this intense energy positively.",
        affirmation: "I choose peace over conflict and understanding over judgment.",
        actionSuggestion: "Channel this energy into something constructive like exercise or creative work.",
        icon: 'fitness-center',
        color: '#F97316',
      },
    ],
    fearful: [
      {
        message: "Fear means you're about to do something brave. You've got this!",
        affirmation: "I am braver than I believe and stronger than I seem.",
        actionSuggestion: "Take one small step forward, even if your hands are shaking.",
        icon: 'shield',
        color: '#6366F1',
      },
      {
        message: "Every hero's journey begins with uncertainty. You're on yours.",
        affirmation: "I face my fears with courage and grow stronger through challenges.",
        actionSuggestion: "Break down what you're facing into smaller, manageable steps.",
        icon: 'trending-up',
        color: '#0EA5E9',
      },
    ],
    surprised: [
      {
        message: "Life's surprises keep things interesting! Embrace the unexpected.",
        affirmation: "I am open to new experiences and adapt with grace.",
        actionSuggestion: "Take a moment to fully experience this surprise before moving forward.",
        icon: 'auto-awesome',
        color: '#8B5CF6',
      },
    ],
    disgusted: [
      {
        message: "Sometimes we need to feel disgusted to recognize what we don't want.",
        affirmation: "I honor my boundaries and choose what aligns with my values.",
        actionSuggestion: "Use this feeling to clarify what you do want instead.",
        icon: 'filter-alt',
        color: '#84CC16',
      },
    ],
    neutral: [
      {
        message: "In stillness, we find our center. You're exactly where you need to be.",
        affirmation: "I appreciate peaceful moments and use them to recharge.",
        actionSuggestion: "This is a perfect time for reflection or planning something you enjoy.",
        icon: 'balance',
        color: '#6B7280',
      },
    ],
  };

  useEffect(() => {
    const content = motivationalContent[emotion] || motivationalContent.neutral;
    const randomIndex = Math.floor(Math.random() * content.length);
    setCurrentContent(content[randomIndex]);
    setCurrentIndex(randomIndex);
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [emotion]);

  const playMessage = async () => {
    if (!currentContent || isPlaying) return;
    
    setIsPlaying(true);
    
    try {
      // Speak the main message
      await Tts.speak(currentContent.message);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Speak the affirmation
      await Tts.speak("Here's an affirmation for you: " + currentContent.affirmation);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Speak the action suggestion
      await Tts.speak("Consider this: " + currentContent.actionSuggestion);
      
    } catch (error) {
      console.error('Error playing motivational message:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const getNextMessage = () => {
    const content = motivationalContent[emotion] || motivationalContent.neutral;
    if (content.length <= 1) return;
    
    const nextIndex = (currentIndex + 1) % content.length;
    setCurrentIndex(nextIndex);
    setCurrentContent(content[nextIndex]);
  };

  const shareMessage = () => {
    // In a real app, this would share to social media or messaging apps
    console.log('Sharing motivational message:', currentContent?.message);
  };

  if (!currentContent) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading inspiration...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: currentContent.color }]}>
          <Icon name={currentContent.icon} size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.emotionLabel}>Feeling {emotion}</Text>
      </View>

      <Animatable.View
        animation="slideInUp"
        delay={500}
        style={styles.contentContainer}
      >
        <View style={[styles.messageCard, { borderLeftColor: currentContent.color }]}>
          <Text style={styles.mainMessage}>{currentContent.message}</Text>
        </View>

        <View style={[styles.affirmationCard, { backgroundColor: currentContent.color + '20' }]}>
          <Text style={styles.affirmationLabel}>Daily Affirmation</Text>
          <Text style={styles.affirmationText}>{currentContent.affirmation}</Text>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionLabel}>Suggested Action</Text>
          <Text style={styles.actionText}>{currentContent.actionSuggestion}</Text>
        </View>
      </Animatable.View>

      <View style={styles.controlsContainer}>
        <View style={styles.primaryControls}>
          <TouchableOpacity
            onPress={playMessage}
            style={[styles.playButton, { backgroundColor: currentContent.color }]}
            disabled={isPlaying}
          >
            <Icon 
              name={isPlaying ? 'stop' : 'play-arrow'} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.playButtonText}>
              {isPlaying ? 'Playing...' : 'Listen'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={getNextMessage}
            style={styles.nextButton}
          >
            <Icon name="refresh" size={20} color={currentContent.color} />
            <Text style={[styles.nextButtonText, { color: currentContent.color }]}>
              Different Message
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryControls}>
          <TouchableOpacity
            onPress={shareMessage}
            style={styles.shareButton}
          >
            <Icon name="share" size={18} color="#6B7280" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          <Button
            mode="outlined"
            onPress={onClose}
            style={styles.closeButton}
            labelStyle={styles.closeButtonLabel}
          >
            Close
          </Button>
        </View>
      </View>

      {/* Decorative elements */}
      <View style={styles.decorativeElements}>
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={3000}
          style={[styles.decorativeCircle, styles.circle1, { borderColor: currentContent.color }]}
        />
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={4000}
          delay={1000}
          style={[styles.decorativeCircle, styles.circle2, { borderColor: currentContent.color }]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emotionLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  messageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 24,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 20,
    backdropFilter: 'blur(10px)',
  },
  mainMessage: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '500',
  },
  affirmationCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    backdropFilter: 'blur(10px)',
  },
  affirmationLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
  },
  affirmationText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  actionLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
  },
  actionText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  controlsContainer: {
    marginTop: 30,
  },
  primaryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  shareButtonText: {
    color: '#6B7280',
    fontSize: 14,
    marginLeft: 6,
  },
  closeButton: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  closeButtonLabel: {
    color: '#FFFFFF',
  },
  decorativeElements: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  decorativeCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 1000,
    opacity: 0.2,
  },
  circle1: {
    width: 200,
    height: 200,
    top: '20%',
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: '20%',
    left: -75,
  },
});

export default MotivationalMessage;
