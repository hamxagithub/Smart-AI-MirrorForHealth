/**
 * Health Check Service
 * Handles health check-ins, vital signs monitoring, and assessments
 */

import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';

interface VitalSigns {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    timestamp: Date;
  };
  heartRate?: {
    bpm: number;
    timestamp: Date;
  };
  temperature?: {
    value: number;
    unit: 'F' | 'C';
    timestamp: Date;
  };
  oxygenSaturation?: {
    percentage: number;
    timestamp: Date;
  };
  weight?: {
    value: number;
    unit: 'lbs' | 'kg';
    timestamp: Date;
  };
  glucoseLevel?: {
    value: number;
    unit: 'mg/dL' | 'mmol/L';
    timestamp: Date;
    mealRelation: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime';
  };
}

interface HealthCheckIn {
  id: string;
  timestamp: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'emergency' | 'custom';
  questions: HealthQuestion[];
  responses: HealthResponse[];
  vitalSigns?: VitalSigns;
  overallScore: number; // 1-10 scale
  notes?: string;
  flagged: boolean; // Requires attention
  caregiverNotified: boolean;
}

interface HealthQuestion {
  id: string;
  question: string;
  type: 'scale' | 'boolean' | 'multiple_choice' | 'text';
  options?: string[];
  required: boolean;
  category: 'pain' | 'mood' | 'energy' | 'sleep' | 'appetite' | 'mobility' | 'breathing' | 'mental' | 'general';
}

interface HealthResponse {
  questionId: string;
  value: string | number | boolean;
  timestamp: Date;
}

interface HealthTrend {
  category: string;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  timeframe: 'week' | 'month' | '3months';
  recommendations: string[];
}

export class HealthCheckService {
  private static readonly DAILY_QUESTIONS: HealthQuestion[] = [
    {
      id: 'pain_level',
      question: 'How would you rate your pain level today?',
      type: 'scale',
      required: true,
      category: 'pain',
    },
    {
      id: 'mood_rating',
      question: 'How would you describe your mood today?',
      type: 'scale',
      required: true,
      category: 'mood',
    },
    {
      id: 'energy_level',
      question: 'How is your energy level today?',
      type: 'scale',
      required: true,
      category: 'energy',
    },
    {
      id: 'sleep_quality',
      question: 'How well did you sleep last night?',
      type: 'scale',
      required: true,
      category: 'sleep',
    },
    {
      id: 'appetite',
      question: 'How is your appetite today?',
      type: 'scale',
      required: false,
      category: 'appetite',
    },
  ];

  private static readonly WEEKLY_QUESTIONS: HealthQuestion[] = [
    {
      id: 'mobility_issues',
      question: 'Have you experienced any mobility issues this week?',
      type: 'boolean',
      required: true,
      category: 'mobility',
    },
    {
      id: 'breathing_difficulty',
      question: 'Have you had any breathing difficulties?',
      type: 'boolean',
      required: true,
      category: 'breathing',
    },
    {
      id: 'mental_clarity',
      question: 'How clear has your thinking been this week?',
      type: 'scale',
      required: true,
      category: 'mental',
    },
    {
      id: 'social_interaction',
      question: 'How much social interaction have you had?',
      type: 'multiple_choice',
      options: ['None', 'Very little', 'Some', 'Adequate', 'Plenty'],
      required: false,
      category: 'mental',
    },
  ];

  static async createHealthCheckIn(type: HealthCheckIn['type'], vitalSigns?: VitalSigns): Promise<string> {
    try {
      const questions = this.getQuestionsForType(type);
      const id = Date.now().toString();
      
      const checkIn: Omit<HealthCheckIn, 'responses' | 'overallScore' | 'flagged' | 'caregiverNotified'> = {
        id,
        timestamp: new Date(),
        type,
        questions,
        vitalSigns,
        notes: '',
      };

      await StorageService.setItem(`health_checkin_${id}`, {
        ...checkIn,
        responses: [],
        overallScore: 0,
        flagged: false,
        caregiverNotified: false,
      });

      return id;
    } catch (error) {
      console.error('Error creating health check-in:', error);
      throw error;
    }
  }

  static async submitHealthCheckIn(
    id: string,
    responses: HealthResponse[],
    notes?: string
  ): Promise<void> {
    try {
      const checkIn = await StorageService.getItem<HealthCheckIn>(`health_checkin_${id}`);
      if (!checkIn) {
        throw new Error('Health check-in not found');
      }

      const overallScore = this.calculateOverallScore(responses);
      const flagged = this.shouldFlagCheckIn(responses, overallScore);

      const updatedCheckIn: HealthCheckIn = {
        ...checkIn,
        responses,
        overallScore,
        notes: notes || '',
        flagged,
        caregiverNotified: false,
      };

      await StorageService.setItem(`health_checkin_${id}`, updatedCheckIn);

      // Add to history
      await this.addToHistory(updatedCheckIn);

      // Check if caregiver should be notified
      if (flagged) {
        await this.notifyCaregiver(updatedCheckIn);
      }

      // Schedule next check-in if needed
      await this.scheduleNextCheckIn(updatedCheckIn.type);

    } catch (error) {
      console.error('Error submitting health check-in:', error);
      throw error;
    }
  }

  static async getHealthCheckIn(id: string): Promise<HealthCheckIn | null> {
    try {
      return await StorageService.getItem<HealthCheckIn>(`health_checkin_${id}`);
    } catch (error) {
      console.error('Error getting health check-in:', error);
      return null;
    }
  }

  static async getHealthHistory(days = 30): Promise<HealthCheckIn[]> {
    try {
      const history = await StorageService.getItem<HealthCheckIn[]>('health_checkin_history') || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return history
        .filter(checkIn => new Date(checkIn.timestamp) > cutoffDate)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error getting health history:', error);
      return [];
    }
  }

  static async recordVitalSigns(vitalSigns: VitalSigns): Promise<void> {
    try {
      const existing = await StorageService.getItem<VitalSigns[]>('vital_signs_history') || [];
      existing.push(vitalSigns);

      // Keep only last 1000 entries
      const trimmed = existing.slice(-1000);
      
      await StorageService.setItem('vital_signs_history', trimmed);

      // Check for critical values
      await this.checkCriticalVitals(vitalSigns);

    } catch (error) {
      console.error('Error recording vital signs:', error);
      throw error;
    }
  }

  static async getVitalSignsHistory(days = 30): Promise<VitalSigns[]> {
    try {
      const history = await StorageService.getItem<VitalSigns[]>('vital_signs_history') || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return history.filter(vitals => {
        // Check any timestamp in the vital signs
        const timestamps = [
          vitals.bloodPressure?.timestamp,
          vitals.heartRate?.timestamp,
          vitals.temperature?.timestamp,
          vitals.oxygenSaturation?.timestamp,
          vitals.weight?.timestamp,
          vitals.glucoseLevel?.timestamp,
        ].filter(Boolean) as Date[];

        return timestamps.some(ts => new Date(ts) > cutoffDate);
      });
    } catch (error) {
      console.error('Error getting vital signs history:', error);
      return [];
    }
  }

  static async getHealthTrends(): Promise<HealthTrend[]> {
    try {
      const history = await this.getHealthHistory(90); // 3 months
      const trends: HealthTrend[] = [];

      // Analyze pain trends
      const painTrend = this.analyzeTrend(history, 'pain_level');
      if (painTrend) trends.push(painTrend);

      // Analyze mood trends
      const moodTrend = this.analyzeTrend(history, 'mood_rating');
      if (moodTrend) trends.push(moodTrend);

      // Analyze energy trends
      const energyTrend = this.analyzeTrend(history, 'energy_level');
      if (energyTrend) trends.push(energyTrend);

      // Analyze sleep trends
      const sleepTrend = this.analyzeTrend(history, 'sleep_quality');
      if (sleepTrend) trends.push(sleepTrend);

      return trends;
    } catch (error) {
      console.error('Error getting health trends:', error);
      return [];
    }
  }

  private static getQuestionsForType(type: HealthCheckIn['type']): HealthQuestion[] {
    switch (type) {
      case 'daily':
        return this.DAILY_QUESTIONS;
      case 'weekly':
        return [...this.DAILY_QUESTIONS, ...this.WEEKLY_QUESTIONS];
      case 'monthly':
        return [...this.DAILY_QUESTIONS, ...this.WEEKLY_QUESTIONS];
      case 'emergency':
        return [
          {
            id: 'emergency_description',
            question: 'Please describe what happened',
            type: 'text',
            required: true,
            category: 'general',
          },
          {
            id: 'emergency_severity',
            question: 'How severe is this emergency?',
            type: 'scale',
            required: true,
            category: 'general',
          },
        ];
      default:
        return this.DAILY_QUESTIONS;
    }
  }

  private static calculateOverallScore(responses: HealthResponse[]): number {
    const scaleResponses = responses.filter(r => typeof r.value === 'number');
    if (scaleResponses.length === 0) return 5; // Default middle score

    const sum = scaleResponses.reduce((acc, r) => acc + (r.value as number), 0);
    return Math.round(sum / scaleResponses.length);
  }

  private static shouldFlagCheckIn(responses: HealthResponse[], overallScore: number): boolean {
    // Flag if overall score is very low
    if (overallScore <= 3) return true;

    // Flag if pain level is high
    const painResponse = responses.find(r => r.questionId === 'pain_level');
    if (painResponse && typeof painResponse.value === 'number' && painResponse.value >= 8) {
      return true;
    }

    // Flag if mood is very low
    const moodResponse = responses.find(r => r.questionId === 'mood_rating');
    if (moodResponse && typeof moodResponse.value === 'number' && moodResponse.value <= 2) {
      return true;
    }

    // Flag emergency check-ins
    const emergencyResponse = responses.find(r => r.questionId === 'emergency_severity');
    if (emergencyResponse && typeof emergencyResponse.value === 'number' && emergencyResponse.value >= 7) {
      return true;
    }

    return false;
  }

  private static async addToHistory(checkIn: HealthCheckIn): Promise<void> {
    try {
      const history = await StorageService.getItem<HealthCheckIn[]>('health_checkin_history') || [];
      history.push(checkIn);

      // Keep only last 500 check-ins
      const trimmed = history.slice(-500);
      
      await StorageService.setItem('health_checkin_history', trimmed);
    } catch (error) {
      console.error('Error adding to health history:', error);
    }
  }

  private static async notifyCaregiver(checkIn: HealthCheckIn): Promise<void> {
    try {
      const message = `Health check-in flagged for review. Overall score: ${checkIn.overallScore}/10`;
      
      await NotificationService.sendCaregiverAlert(
        'Health Alert',
        message,
        'high',
        {
          checkInId: checkIn.id,
          timestamp: checkIn.timestamp.toISOString(),
          type: checkIn.type,
        }
      );

      // Update the check-in to mark caregiver as notified
      await StorageService.setItem(`health_checkin_${checkIn.id}`, {
        ...checkIn,
        caregiverNotified: true,
      });

    } catch (error) {
      console.error('Error notifying caregiver:', error);
    }
  }

  private static async scheduleNextCheckIn(type: HealthCheckIn['type']): Promise<void> {
    try {
      let nextCheckInDate = new Date();

      switch (type) {
        case 'daily':
          nextCheckInDate.setDate(nextCheckInDate.getDate() + 1);
          nextCheckInDate.setHours(9, 0, 0, 0); // 9 AM next day
          break;
        case 'weekly':
          nextCheckInDate.setDate(nextCheckInDate.getDate() + 7);
          nextCheckInDate.setHours(10, 0, 0, 0); // 10 AM next week
          break;
        case 'monthly':
          nextCheckInDate.setMonth(nextCheckInDate.getMonth() + 1);
          nextCheckInDate.setHours(10, 0, 0, 0); // 10 AM next month
          break;
        default:
          return; // Don't schedule for emergency or custom check-ins
      }

      await NotificationService.scheduleHealthCheckReminder(
        nextCheckInDate
      );

    } catch (error) {
      console.error('Error scheduling next check-in:', error);
    }
  }

  private static async checkCriticalVitals(vitalSigns: VitalSigns): Promise<void> {
    try {
      const alerts: string[] = [];

      // Check blood pressure
      if (vitalSigns.bloodPressure) {
        const { systolic, diastolic } = vitalSigns.bloodPressure;
        if (systolic > 180 || diastolic > 120) {
          alerts.push('Critically high blood pressure detected');
        } else if (systolic < 90 || diastolic < 60) {
          alerts.push('Low blood pressure detected');
        }
      }

      // Check heart rate
      if (vitalSigns.heartRate) {
        const { bpm } = vitalSigns.heartRate;
        if (bpm > 120) {
          alerts.push('Elevated heart rate detected');
        } else if (bpm < 50) {
          alerts.push('Low heart rate detected');
        }
      }

      // Check temperature
      if (vitalSigns.temperature) {
        const { value, unit } = vitalSigns.temperature;
        const tempF = unit === 'C' ? (value * 9/5) + 32 : value;
        if (tempF > 102) {
          alerts.push('High fever detected');
        } else if (tempF < 95) {
          alerts.push('Low body temperature detected');
        }
      }

      // Check oxygen saturation
      if (vitalSigns.oxygenSaturation) {
        const { percentage } = vitalSigns.oxygenSaturation;
        if (percentage < 90) {
          alerts.push('Low oxygen saturation detected');
        }
      }

      // Send alerts if any critical values found
      for (const alert of alerts) {
        await NotificationService.sendEmergencyAlert(
          `Critical Vital Signs: ${alert}`
        );
      }

    } catch (error) {
      console.error('Error checking critical vitals:', error);
    }
  }

  private static analyzeTrend(history: HealthCheckIn[], questionId: string): HealthTrend | null {
    try {
      const responses = history
        .flatMap(checkIn => checkIn.responses)
        .filter(response => response.questionId === questionId && typeof response.value === 'number')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (responses.length < 5) return null; // Need at least 5 data points

      const values = responses.map(r => r.value as number);
      const recent = values.slice(-7); // Last 7 values
      const older = values.slice(-14, -7); // Previous 7 values

      if (older.length === 0) return null;

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

      const difference = recentAvg - olderAvg;
      const percentChange = Math.abs(difference / olderAvg);

      let trend: 'improving' | 'stable' | 'declining';
      let confidence = Math.min(percentChange * 100, 95); // Max 95% confidence

      if (Math.abs(difference) < 0.5) {
        trend = 'stable';
      } else if (questionId === 'pain_level') {
        // For pain, lower is better
        trend = difference < 0 ? 'improving' : 'declining';
      } else {
        // For mood, energy, sleep, higher is better
        trend = difference > 0 ? 'improving' : 'declining';
      }

      const categoryMap: Record<string, string> = {
        'pain_level': 'Pain Management',
        'mood_rating': 'Mental Health',
        'energy_level': 'Energy & Vitality',
        'sleep_quality': 'Sleep Quality',
      };

      return {
        category: categoryMap[questionId] || questionId,
        trend,
        confidence: Math.round(confidence),
        timeframe: 'week',
        recommendations: this.getRecommendationsForTrend(questionId, trend),
      };

    } catch (error) {
      console.error('Error analyzing trend:', error);
      return null;
    }
  }

  private static getRecommendationsForTrend(questionId: string, trend: 'improving' | 'stable' | 'declining'): string[] {
    const recommendations: Record<string, Record<string, string[]>> = {
      'pain_level': {
        'improving': ['Continue current pain management approach', 'Consider gentle exercise to maintain progress'],
        'stable': ['Monitor pain levels closely', 'Discuss pain management with healthcare provider'],
        'declining': ['Schedule appointment with healthcare provider', 'Review pain medication effectiveness'],
      },
      'mood_rating': {
        'improving': ['Keep up positive activities', 'Maintain social connections'],
        'stable': ['Try new mood-boosting activities', 'Consider counseling or support groups'],
        'declining': ['Reach out for mental health support', 'Consider professional counseling'],
      },
      'energy_level': {
        'improving': ['Maintain current sleep and exercise routine', 'Continue healthy diet'],
        'stable': ['Review sleep quality and nutrition', 'Consider gentle exercise program'],
        'declining': ['Evaluate sleep patterns', 'Discuss fatigue with healthcare provider'],
      },
      'sleep_quality': {
        'improving': ['Maintain good sleep hygiene', 'Continue bedtime routine'],
        'stable': ['Review sleep environment', 'Consider relaxation techniques'],
        'declining': ['Improve sleep hygiene', 'Avoid screens before bedtime'],
      },
    };

    return recommendations[questionId]?.[trend] || ['Consult with healthcare provider'];
  }

  static async getPendingCheckIns(): Promise<HealthCheckIn[]> {
    try {
      // This would typically check for scheduled check-ins that haven't been completed
      // For now, return empty array - would need more complex scheduling system
      return [];
    } catch (error) {
      console.error('Error getting pending check-ins:', error);
      return [];
    }
  }

  static async getHealthScore(): Promise<number> {
    try {
      const recentCheckIns = await this.getHealthHistory(7); // Last week
      if (recentCheckIns.length === 0) return 5; // Default middle score

      const totalScore = recentCheckIns.reduce((sum, checkIn) => sum + checkIn.overallScore, 0);
      return Math.round(totalScore / recentCheckIns.length);
    } catch (error) {
      console.error('Error calculating health score:', error);
      return 5;
    }
  }

  static async getTodaysMetrics(): Promise<HealthMetric[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const checkIns = await this.getHealthHistory(1); // Get today's data
      const todaysCheckIns = checkIns.filter((checkIn: HealthCheckIn) => {
        const checkInDate = new Date(checkIn.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === today.getTime();
      });

      const metrics: HealthMetric[] = [];

      // Extract vital signs from today's check-ins
      for (const checkIn of todaysCheckIns) {
        if (checkIn.vitalSigns) {
          const vitals = checkIn.vitalSigns;
          
          if (vitals.heartRate) {
            metrics.push({
              type: 'Heart Rate',
              value: vitals.heartRate.bpm,
              unit: 'bpm',
              timestamp: vitals.heartRate.timestamp,
              status: this.getHeartRateStatus(vitals.heartRate.bpm)
            });
          }

          if (vitals.bloodPressure) {
            metrics.push({
              type: 'Blood Pressure',
              value: vitals.bloodPressure.systolic,
              unit: 'mmHg',
              timestamp: vitals.bloodPressure.timestamp,
              status: this.getBloodPressureStatus(vitals.bloodPressure.systolic, vitals.bloodPressure.diastolic)
            });
          }

          if (vitals.temperature) {
            metrics.push({
              type: 'Temperature',
              value: vitals.temperature.value,
              unit: vitals.temperature.unit,
              timestamp: vitals.temperature.timestamp,
              status: this.getTemperatureStatus(vitals.temperature.value, vitals.temperature.unit)
            });
          }

          if (vitals.oxygenSaturation) {
            metrics.push({
              type: 'Oxygen Saturation',
              value: vitals.oxygenSaturation.percentage,
              unit: '%',
              timestamp: vitals.oxygenSaturation.timestamp,
              status: this.getOxygenSaturationStatus(vitals.oxygenSaturation.percentage)
            });
          }
        }
      }

      return metrics;
    } catch (error) {
      console.error('Error getting today\'s metrics:', error);
      return [];
    }
  }

  static async isDailyCheckCompleted(): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const checkIns = await this.getHealthHistory(1); // Get today's data
      const todaysCheckIns = checkIns.filter((checkIn: HealthCheckIn) => {
        const checkInDate = new Date(checkIn.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === today.getTime();
      });

      // Check if there's at least one daily check-in today
      return todaysCheckIns.some((checkIn: HealthCheckIn) => checkIn.type === 'daily');
    } catch (error) {
      console.error('Error checking daily check completion:', error);
      return false;
    }
  }

  static async recordDailyCheck(data: any): Promise<void> {
    try {
      // Create a basic daily check-in and then update it with the detailed data
      const checkInId = await this.createHealthCheckIn('daily', data.vitalSigns);
      
      // Store additional data
      const checkIns = await StorageService.getItem<HealthCheckIn[]>('health_checkins') || [];
      const checkInIndex = checkIns.findIndex(c => c.id === checkInId);
      
      if (checkInIndex !== -1) {
        checkIns[checkInIndex].notes = data.notes || '';
        checkIns[checkInIndex].flagged = this.shouldFlag(data);
        checkIns[checkInIndex].overallScore = this.calculateDailyScore(data);
        
        // Add custom responses
        const customResponses = this.convertDataToResponses(data);
        checkIns[checkInIndex].responses.push(...customResponses);
        
        await StorageService.setItem('health_checkins', checkIns);
      }
    } catch (error) {
      console.error('Error recording daily check:', error);
      throw error;
    }
  }

  // Helper methods for metrics status
  private static getHeartRateStatus(bpm: number): 'normal' | 'warning' | 'critical' {
    if (bpm < 60 || bpm > 100) return 'warning';
    if (bpm < 40 || bpm > 120) return 'critical';
    return 'normal';
  }

  private static getBloodPressureStatus(systolic: number, diastolic: number): 'normal' | 'warning' | 'critical' {
    if (systolic > 140 || diastolic > 90) return 'warning';
    if (systolic > 180 || diastolic > 110) return 'critical';
    if (systolic < 90 || diastolic < 60) return 'warning';
    return 'normal';
  }

  private static getTemperatureStatus(temp: number, unit: 'F' | 'C'): 'normal' | 'warning' | 'critical' {
    const fahrenheit = unit === 'C' ? (temp * 9/5) + 32 : temp;
    if (fahrenheit > 100.4) return 'warning';
    if (fahrenheit > 103) return 'critical';
    if (fahrenheit < 96) return 'warning';
    return 'normal';
  }

  private static getOxygenSaturationStatus(percentage: number): 'normal' | 'warning' | 'critical' {
    if (percentage < 95) return 'warning';
    if (percentage < 90) return 'critical';
    return 'normal';
  }

  private static generateDailyQuestions(): HealthQuestion[] {
    return [
      {
        id: 'overall_feeling',
        question: 'How are you feeling overall today?',
        type: 'scale',
        required: true,
        category: 'general',
      },
      {
        id: 'pain_level',
        question: 'What is your pain level today?',
        type: 'scale',
        required: true,
        category: 'pain',
      },
      {
        id: 'energy_level',
        question: 'How is your energy level today?',
        type: 'scale',
        required: true,
        category: 'energy',
      },
    ];
  }

  private static convertDataToResponses(data: any): HealthResponse[] {
    const responses: HealthResponse[] = [];
    
    if (data.overallFeeling) {
      responses.push({
        questionId: 'overall_feeling',
        value: data.overallFeeling,
        timestamp: new Date(),
      });
    }

    if (data.painLevel !== undefined) {
      responses.push({
        questionId: 'pain_level',
        value: data.painLevel,
        timestamp: new Date(),
      });
    }

    if (data.energyLevel !== undefined) {
      responses.push({
        questionId: 'energy_level',
        value: data.energyLevel,
        timestamp: new Date(),
      });
    }

    return responses;
  }

  private static calculateDailyScore(data: any): number {
    let totalScore = 0;
    let factorCount = 0;

    if (data.overallFeeling) {
      const feelingScore = this.convertFeelingToNumber(data.overallFeeling);
      totalScore += feelingScore;
      factorCount++;
    }

    if (data.painLevel !== undefined) {
      // Invert pain level (0 pain = 10 score, 10 pain = 0 score)
      totalScore += (10 - data.painLevel);
      factorCount++;
    }

    if (data.energyLevel !== undefined) {
      totalScore += data.energyLevel;
      factorCount++;
    }

    return factorCount > 0 ? Math.round(totalScore / factorCount) : 5;
  }

  private static convertFeelingToNumber(feeling: string): number {
    const feelingMap: { [key: string]: number } = {
      'excellent': 10,
      'good': 8,
      'fair': 6,
      'poor': 4,
    };
    return feelingMap[feeling] || 5;
  }

  private static shouldFlag(data: any): boolean {
    // Flag if pain level is high or overall feeling is poor
    if (data.painLevel && data.painLevel > 7) return true;
    if (data.overallFeeling === 'poor') return true;
    if (data.symptoms && data.symptoms.length > 3) return true;
    return false;
  }
}

interface HealthMetric {
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
}
