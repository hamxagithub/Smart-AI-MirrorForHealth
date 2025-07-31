/**
 * Breathing Exercise Component
 * Guided breathing exercises for stress relief
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
import * as Animatable from 'react-native-animatable';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tts from 'react-native-tts';

const { width, height } = Dimensions.get('window');

interface BreathingExerciseProps {
  onComplete: () => void;
}

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

const BreathingExercise: React.FC<BreathingExerciseProps> = ({ onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>('inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const [totalCycles] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Breathing pattern: 4-7-8 technique (inhale 4s, hold 7s, exhale 8s)
  const breathingPattern = {
    inhale: 4,
    hold: 7,
    exhale: 8,
    rest: 1,
  };

  useEffect(() => {
    if (isActive) {
      startBreathingCycle();
    } else {
      stopBreathingCycle();
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isActive && timeRemaining === 0) {
      nextPhase();
    }
  }, [timeRemaining, isActive]);

  const startBreathingCycle = async () => {
    await Tts.speak('Let\'s begin the breathing exercise. Follow the visual guide and my instructions.');
    setCycleCount(0);
    setCurrentPhase('inhale');
    setTimeRemaining(breathingPattern.inhale);
    startAnimation('inhale');
  };

  const stopBreathingCycle = () => {
    setTimeRemaining(0);
    scaleAnim.setValue(1);
  };

  const nextPhase = async () => {
    let nextPhase: BreathingPhase;
    let nextTime: number;

    switch (currentPhase) {
      case 'inhale':
        nextPhase = 'hold';
        nextTime = breathingPattern.hold;
        await Tts.speak('Hold your breath');
        startAnimation('hold');
        break;
      case 'hold':
        nextPhase = 'exhale';
        nextTime = breathingPattern.exhale;
        await Tts.speak('Slowly exhale');
        startAnimation('exhale');
        break;
      case 'exhale':
        const newCycleCount = cycleCount + 1;
        setCycleCount(newCycleCount);
        
        if (newCycleCount >= totalCycles) {
          completeExercise();
          return;
        }
        
        nextPhase = 'rest';
        nextTime = breathingPattern.rest;
        startAnimation('rest');
        break;
      case 'rest':
        nextPhase = 'inhale';
        nextTime = breathingPattern.inhale;
        await Tts.speak('Breathe in slowly');
        startAnimation('inhale');
        break;
    }

    setCurrentPhase(nextPhase);
    setTimeRemaining(nextTime);
  };

  const startAnimation = (phase: BreathingPhase) => {
    const animations: { [key: string]: any } = {
      inhale: {
        toValue: 1.5,
        duration: breathingPattern.inhale * 1000,
      },
      hold: {
        toValue: 1.5,
        duration: breathingPattern.hold * 1000,
      },
      exhale: {
        toValue: 1,
        duration: breathingPattern.exhale * 1000,
      },
      rest: {
        toValue: 1,
        duration: breathingPattern.rest * 1000,
      },
    };

    const config = animations[phase];
    Animated.timing(scaleAnim, {
      ...config,
      useNativeDriver: true,
    }).start();
  };

  const completeExercise = async () => {
    setIsActive(false);
    await Tts.speak('Great job! You\'ve completed the breathing exercise. Take a moment to notice how you feel.');
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const getPhaseInstruction = (phase: BreathingPhase): string => {
    switch (phase) {
      case 'inhale':
        return 'Breathe In';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
      case 'rest':
        return 'Rest';
    }
  };

  const getPhaseColor = (phase: BreathingPhase): string => {
    switch (phase) {
      case 'inhale':
        return '#10B981';
      case 'hold':
        return '#3B82F6';
      case 'exhale':
        return '#8B5CF6';
      case 'rest':
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Breathing Exercise</Text>
        <Text style={styles.subtitle}>4-7-8 Relaxation Technique</Text>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Cycle {cycleCount + 1} of {totalCycles}
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((cycleCount / totalCycles) * 100)}%` }
            ]} 
          />
        </View>
      </View>

      <View style={styles.breathingContainer}>
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              transform: [{ scale: scaleAnim }],
              backgroundColor: getPhaseColor(currentPhase),
            },
          ]}
        >
          <Text style={styles.phaseText}>{getPhaseInstruction(currentPhase)}</Text>
          {isActive && (
            <Text style={styles.timerText}>{timeRemaining}</Text>
          )}
        </Animated.View>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionTitle}>Instructions:</Text>
        <Text style={styles.instructionText}>
          • Inhale slowly through your nose for 4 seconds
        </Text>
        <Text style={styles.instructionText}>
          • Hold your breath for 7 seconds
        </Text>
        <Text style={styles.instructionText}>
          • Exhale slowly through your mouth for 8 seconds
        </Text>
        <Text style={styles.instructionText}>
          • Repeat for {totalCycles} cycles
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        {!isActive ? (
          <Button
            mode="contained"
            onPress={() => setIsActive(true)}
            style={styles.startButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            <Icon name="play-arrow" size={24} color="#FFFFFF" />
            Start Exercise
          </Button>
        ) : (
          <View style={styles.activeControls}>
            <TouchableOpacity
              onPress={() => setIsActive(false)}
              style={styles.stopButton}
            >
              <Icon name="stop" size={24} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>Stop</Text>
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

      {!isActive && cycleCount > 0 && (
        <Animatable.View
          animation="fadeInUp"
          style={styles.completionMessage}
        >
          <Icon name="check-circle" size={48} color="#10B981" />
          <Text style={styles.completionText}>
            Exercise Complete!
          </Text>
          <Text style={styles.completionSubtext}>
            Well done! You completed {cycleCount} breathing cycles.
          </Text>
        </Animatable.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  progressBar: {
    width: width * 0.6,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  phaseText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#10B981',
    marginBottom: 12,
    width: width * 0.6,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButton: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    width: width * 0.4,
  },
  closeButtonLabel: {
    color: '#FFFFFF',
  },
  completionMessage: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    width: 200,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 16,
  },
  completionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  completionSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default BreathingExercise;
