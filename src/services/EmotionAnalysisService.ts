/**
 * Emotion Analysis Service
 * Handles AI-powered emotion recognition and analysis
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import '@tensorflow/tfjs-backend-cpu';
import { Platform } from 'react-native';
import { StorageService } from './StorageService';

// Initialize TensorFlow.js platform for React Native
if (Platform.OS !== 'web') {
  // Platform is automatically initialized by importing @tensorflow/tfjs-react-native
  // and @tensorflow/tfjs-backend-cpu
}

interface EmotionResult {
  emotion: string;
  confidence: number;
  allScores: { [emotion: string]: number };
}

interface EmotionTrend {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export class EmotionAnalysisService {
  private static model: tf.LayersModel | null = null;
  private static isInitialized = false;

  // Emotion labels (corresponding to model output)
  private static readonly EMOTIONS = [
    'angry',
    'disgusted', 
    'fearful',
    'happy',
    'neutral',
    'sad',
    'surprised'
  ];

  static async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // Initialize TensorFlow.js
      await tf.ready();
      
      // Load pre-trained emotion recognition model
      // Note: In a real implementation, you would load an actual model
      // For demo purposes, we'll simulate this
      this.model = await this.loadEmotionModel();
      
      this.isInitialized = true;
      console.log('Emotion Analysis Service initialized');
    } catch (error) {
      console.error('Error initializing Emotion Analysis Service:', error);
      throw error;
    }
  }

  private static async loadEmotionModel(): Promise<tf.LayersModel> {
    try {
      // In a real implementation, you would load a pre-trained model
      // For example: tf.loadLayersModel('path/to/your/model.json')
      
      // For demo purposes, create a simple mock model
      const model = tf.sequential({
        layers: [
          tf.layers.conv2d({
            inputShape: [48, 48, 1],
            filters: 32,
            kernelSize: 3,
            activation: 'relu',
          }),
          tf.layers.maxPooling2d({ poolSize: 2 }),
          tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            activation: 'relu',
          }),
          tf.layers.maxPooling2d({ poolSize: 2 }),
          tf.layers.flatten(),
          tf.layers.dense({
            units: 128,
            activation: 'relu',
          }),
          tf.layers.dropout({ rate: 0.5 }),
          tf.layers.dense({
            units: this.EMOTIONS.length,
            activation: 'softmax',
          }),
        ],
      });

      return model;
    } catch (error) {
      console.error('Error loading emotion model:', error);
      throw error;
    }
  }

  static async analyzeEmotion(imagePath: string): Promise<EmotionResult | null> {
    try {
      if (!this.isInitialized || !this.model) {
        await this.initialize();
      }

      // In a real implementation, you would:
      // 1. Load the image from the path
      // 2. Preprocess it (resize to 48x48, convert to grayscale, normalize)
      // 3. Run inference with the model
      
      // For demo purposes, return mock results
      return this.getMockEmotionResult();
      
    } catch (error) {
      console.error('Error analyzing emotion:', error);
      return null;
    }
  }

  private static getMockEmotionResult(): EmotionResult {
    // Generate realistic mock emotion detection results
    const emotions = this.EMOTIONS;
    const scores: { [emotion: string]: number } = {};
    
    // Generate random but realistic emotion scores
    let totalScore = 0;
    emotions.forEach(emotion => {
      scores[emotion] = Math.random();
      totalScore += scores[emotion];
    });
    
    // Normalize scores to sum to 1
    Object.keys(scores).forEach(emotion => {
      scores[emotion] = scores[emotion] / totalScore;
    });
    
    // Find the dominant emotion
    const dominantEmotion = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );
    
    return {
      emotion: dominantEmotion,
      confidence: scores[dominantEmotion],
      allScores: scores,
    };
  }

  static async storeEmotionHistory(history: any[]): Promise<void> {
    try {
      await StorageService.setEmotionHistory(history);
    } catch (error) {
      console.error('Error storing emotion history:', error);
      throw error;
    }
  }

  static async getEmotionHistory(): Promise<any[]> {
    try {
      return await StorageService.getEmotionHistory();
    } catch (error) {
      console.error('Error getting emotion history:', error);
      return [];
    }
  }

  static async getEmotionTrends(timeframe: 'day' | 'week' | 'month'): Promise<EmotionTrend | null> {
    try {
      const history = await this.getEmotionHistory();
      if (history.length === 0) return null;

      const now = new Date();
      let startDate = new Date();
      let labels: string[] = [];

      switch (timeframe) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          labels = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
          break;
      }

      // Filter data within timeframe
      const filteredHistory = history.filter(entry => 
        new Date(entry.timestamp) >= startDate
      );

      // Calculate mood scores for each time period
      const moodScores = this.calculateMoodScores(filteredHistory, timeframe, labels.length);

      return {
        labels,
        datasets: [{
          data: moodScores,
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          strokeWidth: 2,
        }],
      };
    } catch (error) {
      console.error('Error getting emotion trends:', error);
      return null;
    }
  }

  private static calculateMoodScores(
    history: any[], 
    timeframe: string, 
    periods: number
  ): number[] {
    const scores = new Array(periods).fill(0);
    const counts = new Array(periods).fill(0);

    const moodValues: { [emotion: string]: number } = {
      happy: 5,
      neutral: 3,
      surprised: 4,
      sad: 1,
      angry: 1,
      fearful: 2,
      disgusted: 2,
    };

    history.forEach(entry => {
      const timestamp = new Date(entry.timestamp);
      let periodIndex = 0;

      switch (timeframe) {
        case 'day':
          periodIndex = timestamp.getHours();
          break;
        case 'week':
          const dayOfWeek = timestamp.getDay();
          periodIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
          break;
        case 'month':
          const now = new Date();
          const daysAgo = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24));
          periodIndex = Math.max(0, periods - 1 - daysAgo);
          break;
      }

      if (periodIndex >= 0 && periodIndex < periods) {
        const moodValue = moodValues[entry.emotion] || 3;
        scores[periodIndex] += moodValue;
        counts[periodIndex]++;
      }
    });

    // Calculate averages
    return scores.map((total, index) => 
      counts[index] > 0 ? total / counts[index] : 3
    );
  }

  static async getEmotionDistribution(days: number = 7): Promise<any[]> {
    try {
      const history = await this.getEmotionHistory();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentHistory = history.filter(entry => 
        new Date(entry.timestamp) > cutoffDate
      );

      const distribution: { [emotion: string]: number } = {};
      
      recentHistory.forEach(entry => {
        distribution[entry.emotion] = (distribution[entry.emotion] || 0) + 1;
      });

      return Object.keys(distribution).map(emotion => ({
        emotion,
        count: distribution[emotion],
        percentage: (distribution[emotion] / recentHistory.length) * 100,
      }));
    } catch (error) {
      console.error('Error getting emotion distribution:', error);
      return [];
    }
  }

  static async getMoodStabilityScore(days: number = 7): Promise<number> {
    try {
      const history = await this.getEmotionHistory();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentHistory = history.filter(entry => 
        new Date(entry.timestamp) > cutoffDate
      );

      if (recentHistory.length < 2) return 1; // Perfect stability with insufficient data

      const moodValues: { [emotion: string]: number } = {
        happy: 5,
        neutral: 3,
        surprised: 4,
        sad: 1,
        angry: 1,
        fearful: 2,
        disgusted: 2,
      };

      const scores = recentHistory.map(entry => moodValues[entry.emotion] || 3);
      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // Calculate standard deviation
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Convert to stability score (0-1, where 1 is most stable)
      const maxPossibleStdDev = 2; // Theoretical max for our scale
      const stabilityScore = 1 - (standardDeviation / maxPossibleStdDev);
      
      return Math.max(0, Math.min(1, stabilityScore));
    } catch (error) {
      console.error('Error calculating mood stability:', error);
      return 0.5; // Default neutral stability
    }
  }

  static async detectEmotionalConcerns(): Promise<{
    hasConsistentNegativeEmotions: boolean;
    hasLowMoodStability: boolean;
    recommendations: string[];
  }> {
    try {
      const distribution = await this.getEmotionDistribution(7);
      const stabilityScore = await this.getMoodStabilityScore(7);

      const negativeEmotions = ['sad', 'angry', 'fearful', 'disgusted'];
      const negativePercentage = distribution
        .filter(item => negativeEmotions.includes(item.emotion))
        .reduce((sum, item) => sum + item.percentage, 0);

      const hasConsistentNegativeEmotions = negativePercentage > 60;
      const hasLowMoodStability = stabilityScore < 0.3;

      const recommendations: string[] = [];
      
      if (hasConsistentNegativeEmotions) {
        recommendations.push('Consider speaking with a mental health professional');
        recommendations.push('Try mindfulness and relaxation exercises');
        recommendations.push('Engage in activities that usually bring you joy');
      }
      
      if (hasLowMoodStability) {
        recommendations.push('Maintain a regular sleep schedule');
        recommendations.push('Practice stress management techniques');
        recommendations.push('Consider lifestyle changes to reduce stressors');
      }

      return {
        hasConsistentNegativeEmotions,
        hasLowMoodStability,
        recommendations,
      };
    } catch (error) {
      console.error('Error detecting emotional concerns:', error);
      return {
        hasConsistentNegativeEmotions: false,
        hasLowMoodStability: false,
        recommendations: [],
      };
    }
  }
}
