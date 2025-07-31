/**
 * Mindfulness Prompt Component
 * Provides guided mindfulness exercises and prompts
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

interface MindfulnessPromptProps {
  onComplete: () => void;
}

interface MindfulnessExercise {
  title: string;
  description: string;
  duration: number;
  steps: string[];
  type: 'breathing' | 'body-scan' | 'gratitude' | 'grounding';
}

const MindfulnessPrompt: React.FC<MindfulnessPromptProps> = ({ onComplete }) => {
  const [currentExercise, setCurrentExercise] = useState<MindfulnessExercise | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  const exercises: MindfulnessExercise[] = [
    {
      title: '5-4-3-2-1 Grounding',
      description: 'Use your senses to ground yourself in the present moment',
      duration: 5,
      type: 'grounding',
      steps: [
        'Notice 5 things you can see around you',
        'Notice 4 things you can touch',
        'Notice 3 things you can hear',
        'Notice 2 things you can smell',
        'Notice 1 thing you can taste',
      ],
    },
    {
      title: 'Body Scan Meditation',
      description: 'Systematically relax each part of your body',
      duration: 8,
      type: 'body-scan',
      steps: [
        'Start by focusing on your toes',
        'Move your attention to your feet and ankles',
        'Notice your calves and knees',
        'Focus on your thighs and hips',
        'Pay attention to your abdomen',
        'Notice your chest and breathing',
        'Focus on your shoulders and arms',
        'End with your neck and head',
      ],
    },
    {
      title: 'Gratitude Reflection',
      description: 'Cultivate appreciation for positive aspects of your life',
      duration: 4,
      type: 'gratitude',
      steps: [
        'Think of something you\'re grateful for today',
        'Recall a person who has helped you recently',
        'Notice something beautiful in your environment',
        'Appreciate a personal strength or ability you have',
      ],
    },
    {
      title: 'Mindful Breathing',
      description: 'Focus on your natural breathing rhythm',
      duration: 6,
      type: 'breathing',
      steps: [
        'Notice your natural breathing without changing it',
        'Feel the air entering through your nose',
        'Notice the pause between inhale and exhale',
        'Feel the air leaving through your nose or mouth',
        'If your mind wanders, gently return to your breath',
        'End by taking three deeper breaths',
      ],
    },
  ];

  useEffect(() => {
    // Select a random exercise
    const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];
    setCurrentExercise(randomExercise);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isActive && timeRemaining === 0) {
      nextStep();
    }
  }, [timeRemaining, isActive]);

  const startExercise = async () => {
    if (!currentExercise) return;
    
    setIsActive(true);
    setCurrentStep(0);
    const stepDuration = Math.floor((currentExercise.duration * 60) / currentExercise.steps.length);
    setTimeRemaining(stepDuration);
    
    await Tts.speak(`Let's begin the ${currentExercise.title} exercise. ${currentExercise.description}`);
    setTimeout(() => {
      speakCurrentStep();
    }, 3000);
  };

  const nextStep = async () => {
    if (!currentExercise) return;
    
    const nextStepIndex = currentStep + 1;
    
    if (nextStepIndex >= currentExercise.steps.length) {
      completeExercise();
      return;
    }
    
    setCurrentStep(nextStepIndex);
    const stepDuration = Math.floor((currentExercise.duration * 60) / currentExercise.steps.length);
    setTimeRemaining(stepDuration);
    
    await speakCurrentStep(nextStepIndex);
  };

  const speakCurrentStep = async (stepIndex?: number) => {
    if (!currentExercise) return;
    
    const index = stepIndex !== undefined ? stepIndex : currentStep;
    const step = currentExercise.steps[index];
    
    await Tts.speak(step);
  };

  const completeExercise = async () => {
    setIsActive(false);
    await Tts.speak('Excellent work. Take a moment to notice how you feel after this mindfulness practice.');
    
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  const stopExercise = () => {
    setIsActive(false);
    setTimeRemaining(0);
  };

  const getExerciseColor = (type: string): string => {
    switch (type) {
      case 'breathing':
        return '#3B82F6';
      case 'body-scan':
        return '#8B5CF6';
      case 'gratitude':
        return '#EC4899';
      case 'grounding':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getExerciseIcon = (type: string): string => {
    switch (type) {
      case 'breathing':
        return 'air';
      case 'body-scan':
        return 'accessibility-new';
      case 'gratitude':
        return 'favorite';
      case 'grounding':
        return 'nature';
      default:
        return 'psychology';
    }
  };

  if (!currentExercise) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading mindfulness exercise...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Icon 
          name={getExerciseIcon(currentExercise.type)} 
          size={32} 
          color={getExerciseColor(currentExercise.type)} 
        />
        <Text style={styles.title}>{currentExercise.title}</Text>
        <Text style={styles.description}>{currentExercise.description}</Text>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {isActive ? `Step ${currentStep + 1} of ${currentExercise.steps.length}` : 'Ready to begin'}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${isActive ? ((currentStep + 1) / currentExercise.steps.length) * 100 : 0}%`,
                backgroundColor: getExerciseColor(currentExercise.type),
              }
            ]} 
          />
        </View>
        {isActive && (
          <Text style={styles.timerText}>
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </Text>
        )}
      </View>

      <View style={styles.stepContainer}>
        {isActive ? (
          <Animatable.View
            animation="fadeIn"
            key={currentStep}
            style={styles.currentStep}
          >
            <Text style={styles.stepText}>
              {currentExercise.steps[currentStep]}
            </Text>
          </Animatable.View>
        ) : (
          <View style={styles.stepsPreview}>
            <Text style={styles.stepsTitle}>What we'll do:</Text>
            {currentExercise.steps.map((step, index) => (
              <Text key={index} style={styles.stepPreview}>
                {index + 1}. {step}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        {!isActive ? (
          <Button
            mode="contained"
            onPress={startExercise}
            style={[styles.startButton, { backgroundColor: getExerciseColor(currentExercise.type) }]}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            <Icon name="play-arrow" size={24} color="#FFFFFF" />
            Start Exercise ({currentExercise.duration} min)
          </Button>
        ) : (
          <View style={styles.activeControls}>
            <TouchableOpacity
              onPress={stopExercise}
              style={styles.stopButton}
            >
              <Icon name="stop" size={24} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => speakCurrentStep()}
              style={styles.repeatButton}
            >
              <Icon name="replay" size={20} color="#FFFFFF" />
              <Text style={styles.repeatButtonText}>Repeat</Text>
            </TouchableOpacity>
          </View>
        )}

        <Button
          mode="outlined"
          onPress={onComplete}
          style={styles.closeButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.closeButtonLabel}
        >
          Close
        </Button>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  progressBar: {
    width: width * 0.7,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 30,
  },
  currentStep: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  stepText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  stepsPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 16,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  stepPreview: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
    lineHeight: 20,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  startButton: {
    marginBottom: 12,
    width: width * 0.7,
  },
  buttonContent: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
  },
  repeatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  closeButton: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    width: width * 0.4,
  },
  closeButtonLabel: {
    color: '#FFFFFF',
  },
});

export default MindfulnessPrompt;
