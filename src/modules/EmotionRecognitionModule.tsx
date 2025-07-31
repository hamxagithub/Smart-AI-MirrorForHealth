/**
 * Emotion Recognition Module
 * AI-powered facial analysis for emotion detection
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { EmotionAnalysisService } from '../services/EmotionAnalysisService';

interface EmotionRecognitionModuleProps {
  onEmotionDetected: (emotion: string, confidence: number) => void;
  isActive: boolean;
}

interface EmotionData {
  emotion: string;
  confidence: number;
  timestamp: Date;
}

const EmotionRecognitionModule: React.FC<EmotionRecognitionModuleProps> = ({
  onEmotionDetected,
  isActive,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null);
  const cameraRef = useRef<Camera>(null);
  
  const devices = useCameraDevices();
  const device = devices.front;

  useEffect(() => {
    checkCameraPermission();
  }, []);

  useEffect(() => {
    if (isActive && hasPermission && device) {
      startEmotionAnalysis();
    } else {
      stopEmotionAnalysis();
    }
  }, [isActive, hasPermission, device]);

  const checkCameraPermission = async () => {
    try {
      const cameraPermission = await Camera.getCameraPermissionStatus();
      
      if (cameraPermission === 'not-determined') {
        const newPermission = await Camera.requestCameraPermission();
        setHasPermission(newPermission === 'authorized');
      } else {
        setHasPermission(cameraPermission === 'authorized');
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      Alert.alert('Camera Error', 'Failed to access camera for emotion recognition');
    }
  };

  const startEmotionAnalysis = () => {
    if (!isAnalyzing) {
      setIsAnalyzing(true);
      analyzeEmotionLoop();
    }
  };

  const stopEmotionAnalysis = () => {
    setIsAnalyzing(false);
  };

  const analyzeEmotionLoop = async () => {
    while (isAnalyzing && isActive) {
      try {
        if (cameraRef.current) {
          // Capture frame for analysis
          const frame = await captureFrame();
          if (frame) {
            const emotionResult = await EmotionAnalysisService.analyzeEmotion(frame);
            
            if (emotionResult) {
              const emotionData: EmotionData = {
                emotion: emotionResult.emotion,
                confidence: emotionResult.confidence,
                timestamp: new Date(),
              };
              
              setCurrentEmotion(emotionData);
              onEmotionDetected(emotionResult.emotion, emotionResult.confidence);
              
              // Store emotion data for trends
              await storeEmotionData(emotionData);
            }
          }
        }
        
        // Wait before next analysis (reduce frequency to save battery)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error in emotion analysis:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer on error
      }
    }
  };

  const captureFrame = async (): Promise<string | null> => {
    try {
      if (cameraRef.current) {
        // Note: This is a simplified version. In a real implementation,
        // you would use react-native-vision-camera's frame processor
        // or take a photo and process it
        const photo = await cameraRef.current.takePhoto({
          qualityPrioritization: 'speed',
          flash: 'off',
          enableAutoRedEyeReduction: false,
        });
        return photo.path;
      }
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
    return null;
  };

  const storeEmotionData = async (emotionData: EmotionData) => {
    try {
      // Store in local storage for trend analysis
      const existingData = await EmotionAnalysisService.getEmotionHistory();
      const updatedData = [...existingData, emotionData];
      
      // Keep only last 1000 entries to manage storage
      const trimmedData = updatedData.slice(-1000);
      
      await EmotionAnalysisService.storeEmotionHistory(trimmedData);
    } catch (error) {
      console.error('Error storing emotion data:', error);
    }
  };

  const getEmotionColor = (emotion: string): string => {
    const emotionColors: { [key: string]: string } = {
      happy: '#10B981',
      sad: '#3B82F6',
      angry: '#EF4444',
      surprised: '#F59E0B',
      fearful: '#8B5CF6',
      disgusted: '#84CC16',
      neutral: '#6B7280',
    };
    return emotionColors[emotion] || '#6B7280';
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required for emotion recognition
        </Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          No front camera available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={isActive && hasPermission}
        photo={true}
      />
      
      {currentEmotion && (
        <View style={styles.emotionOverlay}>
          <View 
            style={[
              styles.emotionIndicator,
              { backgroundColor: getEmotionColor(currentEmotion.emotion) }
            ]}
          >
            <Text style={styles.emotionText}>
              {currentEmotion.emotion.toUpperCase()}
            </Text>
            <Text style={styles.confidenceText}>
              {Math.round(currentEmotion.confidence * 100)}%
            </Text>
          </View>
        </View>
      )}
      
      {isAnalyzing && (
        <View style={styles.analysisIndicator}>
          <Text style={styles.analysisText}>Analyzing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 150,
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    opacity: 0.3, // Semi-transparent for mirror effect
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  permissionText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
    padding: 10,
  },
  emotionOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  emotionIndicator: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  emotionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
  },
  analysisIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: 4,
  },
  analysisText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default EmotionRecognitionModule;
