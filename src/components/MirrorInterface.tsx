/**
 * Mirror Interface Component
 * The main visual interface displayed on the smart mirror
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

interface MirrorInterfaceProps {
  currentEmotion: string;
  currentTime: Date;
  isListening: boolean;
}

interface WeatherInfo {
  temperature: number;
  condition: string;
  icon: string;
}

const MirrorInterface: React.FC<MirrorInterfaceProps> = ({
  currentEmotion,
  currentTime,
  isListening,
}) => {
  const [greeting, setGreeting] = useState('');
  const [weather, setWeather] = useState<WeatherInfo>({
    temperature: 22,
    condition: 'Sunny',
    icon: 'wb-sunny',
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    updateGreeting();
    startFadeInAnimation();
  }, []);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const updateGreeting = () => {
    const hour = currentTime.getHours();
    let greetingText = '';
    
    if (hour < 12) {
      greetingText = 'Good Morning';
    } else if (hour < 17) {
      greetingText = 'Good Afternoon';
    } else {
      greetingText = 'Good Evening';
    }
    
    setGreeting(greetingText);
  };

  const startFadeInAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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

  const getEmotionColor = (emotion: string): string[] => {
    switch (emotion) {
      case 'happy':
        return ['#FEF3C7', '#F59E0B', '#D97706'];
      case 'sad':
        return ['#DBEAFE', '#3B82F6', '#1D4ED8'];
      case 'angry':
        return ['#FEE2E2', '#EF4444', '#DC2626'];
      case 'surprised':
        return ['#F3E8FF', '#8B5CF6', '#7C3AED'];
      case 'fearful':
        return ['#F0F9FF', '#0EA5E9', '#0284C7'];
      case 'disgusted':
        return ['#F0FDF4', '#22C55E', '#16A34A'];
      default:
        return ['#F9FAFB', '#6B7280', '#4B5563'];
    }
  };

  const getEmotionMessage = (emotion: string): string => {
    switch (emotion) {
      case 'happy':
        return 'You look radiant today! ✨';
      case 'sad':
        return 'Take care of yourself today 💙';
      case 'angry':
        return 'Take a deep breath, you\'ve got this 🌸';
      case 'surprised':
        return 'What a wonderful surprise! 🎉';
      case 'fearful':
        return 'You are stronger than you know 💪';
      case 'disgusted':
        return 'Focus on the positive today 🌱';
      default:
        return 'Have a wonderful day! 🌟';
    }
  };

  const formatTime = (time: Date): string => {
    return moment(time).format('h:mm A');
  };

  const formatDate = (time: Date): string => {
    return moment(time).format('dddd, MMMM Do');
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient based on emotion */}
      <LinearGradient
        colors={getEmotionColor(currentEmotion)}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Mirror overlay effect */}
      <View style={styles.mirrorOverlay} />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header Section */}
        <View style={styles.header}>
          <Animatable.View
            animation={isListening ? "pulse" : undefined}
            iterationCount="infinite"
            style={styles.timeContainer}
          >
            <Animated.Text style={[styles.time, { transform: [{ scale: pulseAnim }] }]}>
              {formatTime(currentTime)}
            </Animated.Text>
            <Text style={styles.date}>{formatDate(currentTime)}</Text>
          </Animatable.View>
          
          <View style={styles.weatherContainer}>
            <Icon name={weather.icon} size={32} color="#FFFFFF" />
            <Text style={styles.temperature}>{weather.temperature}°C</Text>
            <Text style={styles.weatherCondition}>{weather.condition}</Text>
          </View>
        </View>

        {/* Center Section - Main Display */}
        <View style={styles.centerSection}>
          <Animatable.View
            animation="fadeInUp"
            delay={1000}
            style={styles.greetingContainer}
          >
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.emotionMessage}>
              {getEmotionMessage(currentEmotion)}
            </Text>
          </Animatable.View>

          {/* Emotion Indicator */}
          <Animatable.View
            animation="zoomIn"
            delay={1500}
            style={styles.emotionIndicator}
          >
            <View style={[
              styles.emotionCircle,
              { backgroundColor: getEmotionColor(currentEmotion)[1] }
            ]}>
              <Text style={styles.emotionText}>
                {currentEmotion.toUpperCase()}
              </Text>
            </View>
          </Animatable.View>

          {/* Voice Listening Indicator */}
          {isListening && (
            <Animatable.View
              animation="pulse"
              iterationCount="infinite"
              style={styles.listeningIndicator}
            >
              <Icon name="mic" size={48} color="#FFFFFF" />
              <Text style={styles.listeningText}>Listening...</Text>
            </Animatable.View>
          )}
        </View>

        {/* Footer Section */}
        <View style={styles.footer}>
          <Animatable.View
            animation="fadeInUp"
            delay={2000}
            style={styles.footerContent}
          >
            <Text style={styles.footerText}>
              Say "Hey Mirror" to get started
            </Text>
            <View style={styles.statusIndicators}>
              <View style={styles.statusItem}>
                <Icon name="health-and-safety" size={16} color="#FFFFFF" />
                <Text style={styles.statusText}>Health Monitoring Active</Text>
              </View>
              <View style={styles.statusItem}>
                <Icon name="psychology" size={16} color="#FFFFFF" />
                <Text style={styles.statusText}>Wellness Support Ready</Text>
              </View>
            </View>
          </Animatable.View>
        </View>
      </Animated.View>

      {/* Decorative Elements */}
      <View style={styles.decorativeElements}>
        <Animatable.View
          animation="rotate"
          iterationCount="infinite"
          duration={20000}
          style={[styles.decorativeCircle, styles.circle1]}
        />
        <Animatable.View
          animation="rotate"
          iterationCount="infinite"
          duration={30000}
          style={[styles.decorativeCircle, styles.circle2]}
        />
        <Animatable.View
          animation="rotate"
          iterationCount="infinite"
          duration={25000}
          style={[styles.decorativeCircle, styles.circle3]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  mirrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  content: {
    flex: 1,
    padding: 40,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  time: {
    fontSize: 48,
    fontWeight: '200',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  date: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  weatherContainer: {
    alignItems: 'center',
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  weatherCondition: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  emotionMessage: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emotionIndicator: {
    marginBottom: 40,
  },
  emotionCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emotionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  listeningIndicator: {
    alignItems: 'center',
    marginTop: 20,
  },
  listeningText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 8,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    alignItems: 'center',
  },
  footerContent: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.7,
  },
  decorativeElements: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  decorativeCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1000,
  },
  circle1: {
    width: 200,
    height: 200,
    top: 100,
    right: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    bottom: 50,
    left: -150,
  },
  circle3: {
    width: 150,
    height: 150,
    top: '50%',
    right: 50,
  },
});

export default MirrorInterface;
