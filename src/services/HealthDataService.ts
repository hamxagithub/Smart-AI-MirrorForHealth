/**
 * Health Data Service
 * Handles health metrics, trends analysis, and data visualization
 */

import { StorageService } from './StorageService';

interface HealthMetric {
  id: string;
  type: 'mood' | 'pain' | 'energy' | 'sleep' | 'steps' | 'heart_rate' | 'blood_pressure' | 'weight' | 'temperature' | 'glucose';
  value: number | { systolic: number; diastolic: number; } | string;
  unit: string;
  timestamp: Date;
  source: 'manual' | 'device' | 'estimation' | 'checkin';
  notes?: string;
  tags?: string[];
}

interface HealthTrend {
  metricType: HealthMetric['type'];
  period: '24h' | '7d' | '30d' | '90d';
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  change: number; // Percentage change
  confidence: number; // 0-100
  dataPoints: number;
  lastValue: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
  recommendations: string[];
}

interface HealthGoal {
  id: string;
  type: HealthMetric['type'];
  targetValue: number;
  currentValue: number;
  timeframe: 'daily' | 'weekly' | 'monthly';
  deadline?: Date;
  isActive: boolean;
  progress: number; // 0-100 percentage
  streakDays: number;
  lastAchieved?: Date;
}

interface HealthInsight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'neutral' | 'concern' | 'achievement';
  priority: 'low' | 'medium' | 'high';
  category: 'trend' | 'goal' | 'correlation' | 'recommendation';
  timestamp: Date;
  data?: any;
  actionable: boolean;
  dismissed: boolean;
}

interface HealthCorrelation {
  primaryMetric: HealthMetric['type'];
  secondaryMetric: HealthMetric['type'];
  correlation: number; // -1 to 1
  confidence: number; // 0-100
  description: string;
  timeframe: string;
}

export class HealthDataService {
  static async recordHealthMetric(
    type: HealthMetric['type'],
    value: HealthMetric['value'],
    unit: string,
    source: HealthMetric['source'],
    notes?: string,
    tags?: string[]
  ): Promise<string> {
    try {
      const id = Date.now().toString();
      const metric: HealthMetric = {
        id,
        type,
        value,
        unit,
        timestamp: new Date(),
        source,
        notes,
        tags,
      };

      await this.saveHealthMetric(metric);
      
      // Update trends and insights
      await this.updateTrends(type);
      await this.generateInsights(type);
      
      return id;
    } catch (error) {
      console.error('Error recording health metric:', error);
      throw error;
    }
  }

  static async getHealthMetrics(
    type?: HealthMetric['type'],
    days = 30,
    limit?: number
  ): Promise<HealthMetric[]> {
    try {
      const allMetrics = await StorageService.getItem<HealthMetric[]>('health_metrics') || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let filteredMetrics = allMetrics.filter(metric => 
        new Date(metric.timestamp) > cutoffDate
      );

      if (type) {
        filteredMetrics = filteredMetrics.filter(metric => metric.type === type);
      }

      // Sort by timestamp (newest first)
      filteredMetrics.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (limit) {
        filteredMetrics = filteredMetrics.slice(0, limit);
      }

      return filteredMetrics;
    } catch (error) {
      console.error('Error getting health metrics:', error);
      return [];
    }
  }

  static async getHealthTrend(
    type: HealthMetric['type'],
    period: HealthTrend['period'] = '30d'
  ): Promise<HealthTrend | null> {
    try {
      const days = this.periodToDays(period);
      const metrics = await this.getHealthMetrics(type, days);
      
      if (metrics.length < 3) {
        return {
          metricType: type,
          period,
          trend: 'insufficient_data',
          change: 0,
          confidence: 0,
          dataPoints: metrics.length,
          lastValue: 0,
          averageValue: 0,
          minValue: 0,
          maxValue: 0,
          recommendations: ['Need more data points to analyze trends'],
        };
      }

      const values = metrics.map(m => this.normalizeValue(m.value));
      const timestamps = metrics.map(m => new Date(m.timestamp).getTime());
      
      // Calculate trend using linear regression
      const { slope, correlation } = this.calculateLinearRegression(timestamps, values);
      
      const lastValue = values[0]; // Most recent (sorted desc)
      const averageValue = values.reduce((a, b) => a + b, 0) / values.length;
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      
      // Determine trend direction
      let trend: HealthTrend['trend'];
      const changeThreshold = 0.05; // 5% change threshold
      
      if (Math.abs(slope) < changeThreshold) {
        trend = 'stable';
      } else if (this.isPositiveImprovement(type, slope > 0)) {
        trend = 'improving';
      } else {
        trend = 'declining';
      }

      const change = ((lastValue - averageValue) / averageValue) * 100;
      const confidence = Math.min(Math.abs(correlation) * 100, 95);

      return {
        metricType: type,
        period,
        trend,
        change: Math.round(change),
        confidence: Math.round(confidence),
        dataPoints: values.length,
        lastValue: Math.round(lastValue * 100) / 100,
        averageValue: Math.round(averageValue * 100) / 100,
        minValue: Math.round(minValue * 100) / 100,
        maxValue: Math.round(maxValue * 100) / 100,
        recommendations: this.getTrendRecommendations(type, trend, change),
      };
    } catch (error) {
      console.error('Error getting health trend:', error);
      return null;
    }
  }

  static async getAllTrends(period: HealthTrend['period'] = '30d'): Promise<HealthTrend[]> {
    try {
      const metricTypes: HealthMetric['type'][] = [
        'mood', 'pain', 'energy', 'sleep', 'heart_rate', 'blood_pressure', 'weight'
      ];
      
      const trends: HealthTrend[] = [];
      
      for (const type of metricTypes) {
        const trend = await this.getHealthTrend(type, period);
        if (trend && trend.trend !== 'insufficient_data') {
          trends.push(trend);
        }
      }
      
      return trends.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error getting all trends:', error);
      return [];
    }
  }

  static async setHealthGoal(
    type: HealthMetric['type'],
    targetValue: number,
    timeframe: HealthGoal['timeframe'],
    deadline?: Date
  ): Promise<string> {
    try {
      const id = Date.now().toString();
      const currentMetrics = await this.getHealthMetrics(type, 7, 1);
      const currentValue = currentMetrics.length > 0 
        ? this.normalizeValue(currentMetrics[0].value)
        : 0;
      
      const goal: HealthGoal = {
        id,
        type,
        targetValue,
        currentValue,
        timeframe,
        deadline,
        isActive: true,
        progress: 0,
        streakDays: 0,
      };

      await this.saveHealthGoal(goal);
      return id;
    } catch (error) {
      console.error('Error setting health goal:', error);
      throw error;
    }
  }

  static async getHealthGoals(activeOnly = true): Promise<HealthGoal[]> {
    try {
      const goals = await StorageService.getItem<HealthGoal[]>('health_goals') || [];
      
      if (activeOnly) {
        return goals.filter(goal => goal.isActive);
      }
      
      return goals;
    } catch (error) {
      console.error('Error getting health goals:', error);
      return [];
    }
  }

  static async updateGoalProgress(): Promise<void> {
    try {
      const goals = await this.getHealthGoals(true);
      
      for (const goal of goals) {
        const recentMetrics = await this.getHealthMetrics(goal.type, 1, 1);
        if (recentMetrics.length > 0) {
          const currentValue = this.normalizeValue(recentMetrics[0].value);
          const progress = this.calculateGoalProgress(goal, currentValue);
          
          await this.updateHealthGoal(goal.id, {
            currentValue,
            progress,
            lastAchieved: progress >= 100 ? new Date() : goal.lastAchieved,
          });
        }
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  }

  static async getHealthInsights(days = 7): Promise<HealthInsight[]> {
    try {
      const insights = await StorageService.getItem<HealthInsight[]>('health_insights') || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return insights
        .filter(insight => 
          !insight.dismissed && 
          new Date(insight.timestamp) > cutoffDate
        )
        .sort((a, b) => {
          // Sort by priority (high -> medium -> low) then by timestamp
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    } catch (error) {
      console.error('Error getting health insights:', error);
      return [];
    }
  }

  static async dismissInsight(insightId: string): Promise<void> {
    try {
      const insights = await StorageService.getItem<HealthInsight[]>('health_insights') || [];
      const index = insights.findIndex(i => i.id === insightId);
      
      if (index !== -1) {
        insights[index].dismissed = true;
        await StorageService.setItem('health_insights', insights);
      }
    } catch (error) {
      console.error('Error dismissing insight:', error);
    }
  }

  static async getHealthCorrelations(): Promise<HealthCorrelation[]> {
    try {
      return await StorageService.getItem<HealthCorrelation[]>('health_correlations') || [];
    } catch (error) {
      console.error('Error getting health correlations:', error);
      return [];
    }
  }

  static async calculateCorrelations(): Promise<void> {
    try {
      const metricPairs = [
        ['mood', 'sleep'],
        ['pain', 'mood'],
        ['energy', 'sleep'],
        ['mood', 'steps'],
        ['sleep', 'heart_rate'],
      ];

      const correlations: HealthCorrelation[] = [];

      for (const [primary, secondary] of metricPairs) {
        const correlation = await this.calculateMetricCorrelation(
          primary as HealthMetric['type'],
          secondary as HealthMetric['type']
        );
        
        if (correlation) {
          correlations.push(correlation);
        }
      }

      await StorageService.setItem('health_correlations', correlations);
    } catch (error) {
      console.error('Error calculating correlations:', error);
    }
  }

  static async getHealthSummary(): Promise<{
    overallScore: number;
    trends: HealthTrend[];
    goals: HealthGoal[];
    insights: HealthInsight[];
    recentMetrics: HealthMetric[];
  }> {
    try {
      const trends = await this.getAllTrends('7d');
      const goals = await this.getHealthGoals(true);
      const insights = await this.getHealthInsights(3);
      const recentMetrics = await this.getHealthMetrics(undefined, 1, 10);
      
      // Calculate overall health score
      const overallScore = this.calculateOverallHealthScore(trends, goals);

      return {
        overallScore,
        trends,
        goals,
        insights,
        recentMetrics,
      };
    } catch (error) {
      console.error('Error getting health summary:', error);
      return {
        overallScore: 50,
        trends: [],
        goals: [],
        insights: [],
        recentMetrics: [],
      };
    }
  }

  private static async saveHealthMetric(metric: HealthMetric): Promise<void> {
    try {
      const metrics = await StorageService.getItem<HealthMetric[]>('health_metrics') || [];
      metrics.push(metric);
      
      // Keep only last 10,000 metrics
      const trimmed = metrics.slice(-10000);
      await StorageService.setItem('health_metrics', trimmed);
    } catch (error) {
      console.error('Error saving health metric:', error);
      throw error;
    }
  }

  private static async saveHealthGoal(goal: HealthGoal): Promise<void> {
    try {
      const goals = await StorageService.getItem<HealthGoal[]>('health_goals') || [];
      goals.push(goal);
      await StorageService.setItem('health_goals', goals);
    } catch (error) {
      console.error('Error saving health goal:', error);
      throw error;
    }
  }

  private static async updateHealthGoal(id: string, updates: Partial<HealthGoal>): Promise<void> {
    try {
      const goals = await StorageService.getItem<HealthGoal[]>('health_goals') || [];
      const index = goals.findIndex(g => g.id === id);
      
      if (index !== -1) {
        goals[index] = { ...goals[index], ...updates };
        await StorageService.setItem('health_goals', goals);
      }
    } catch (error) {
      console.error('Error updating health goal:', error);
    }
  }

  private static normalizeValue(value: HealthMetric['value']): number {
    if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'object' && 'systolic' in value && 'diastolic' in value) {
      // For blood pressure, use systolic as primary value
      return value.systolic;
    } else if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private static periodToDays(period: HealthTrend['period']): number {
    switch (period) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  }

  private static calculateLinearRegression(x: number[], y: number[]): { slope: number; correlation: number; } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return { slope: slope || 0, correlation: correlation || 0 };
  }

  private static isPositiveImprovement(type: HealthMetric['type'], isIncreasing: boolean): boolean {
    // For some metrics, higher is better; for others, lower is better
    const higherIsBetter = ['mood', 'energy', 'sleep', 'steps'];
    const lowerIsBetter = ['pain'];
    
    if (higherIsBetter.includes(type)) {
      return isIncreasing;
    } else if (lowerIsBetter.includes(type)) {
      return !isIncreasing;
    }
    
    return isIncreasing; // Default assumption
  }

  private static getTrendRecommendations(
    type: HealthMetric['type'],
    trend: HealthTrend['trend'],
    change: number
  ): string[] {
    const recommendations: Record<string, Record<string, string[]>> = {
      'mood': {
        'improving': ['Continue current positive activities', 'Maintain social connections'],
        'stable': ['Try new mood-boosting activities', 'Consider mindfulness practices'],
        'declining': ['Reach out for support', 'Consider professional help if needed'],
      },
      'pain': {
        'improving': ['Continue current pain management', 'Maintain gentle exercise'],
        'stable': ['Monitor pain levels', 'Discuss with healthcare provider'],
        'declining': ['Review pain management plan', 'Consider medical consultation'],
      },
      'sleep': {
        'improving': ['Maintain good sleep hygiene', 'Keep consistent bedtime'],
        'stable': ['Optimize sleep environment', 'Try relaxation techniques'],
        'declining': ['Improve sleep routine', 'Limit screen time before bed'],
      },
      'energy': {
        'improving': ['Keep up current lifestyle', 'Maintain exercise routine'],
        'stable': ['Consider gentle exercise', 'Review nutrition'],
        'declining': ['Evaluate sleep and stress', 'Consider medical check-up'],
      },
    };

    return recommendations[type]?.[trend] || ['Monitor closely and consult healthcare provider'];
  }

  private static calculateGoalProgress(goal: HealthGoal, currentValue: number): number {
    const distance = Math.abs(goal.targetValue - goal.currentValue);
    const progress = Math.abs(goal.targetValue - currentValue);
    
    if (distance === 0) return 100;
    
    const progressPercent = Math.max(0, Math.min(100, ((distance - progress) / distance) * 100));
    return Math.round(progressPercent);
  }

  private static async updateTrends(type: HealthMetric['type']): Promise<void> {
    try {
      // This would typically update cached trend data
      // For now, trends are calculated on-demand
      console.log(`Updating trends for ${type}`);
    } catch (error) {
      console.error('Error updating trends:', error);
    }
  }

  private static async generateInsights(type: HealthMetric['type']): Promise<void> {
    try {
      const trend = await this.getHealthTrend(type, '7d');
      if (!trend || trend.trend === 'insufficient_data') return;

      const insights = await StorageService.getItem<HealthInsight[]>('health_insights') || [];
      
      // Generate insight based on trend
      if (Math.abs(trend.change) > 20 && trend.confidence > 70) {
        const insight: HealthInsight = {
          id: Date.now().toString(),
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${trend.trend}`,
          description: `Your ${type} has ${trend.trend} by ${Math.abs(trend.change)}% over the past week.`,
          type: trend.trend === 'improving' ? 'positive' : 
                trend.trend === 'declining' ? 'concern' : 'neutral',
          priority: Math.abs(trend.change) > 30 ? 'high' : 'medium',
          category: 'trend',
          timestamp: new Date(),
          data: { trend },
          actionable: trend.trend === 'declining',
          dismissed: false,
        };

        insights.push(insight);
        
        // Keep only last 50 insights
        const trimmed = insights.slice(-50);
        await StorageService.setItem('health_insights', trimmed);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  }

  private static async calculateMetricCorrelation(
    primary: HealthMetric['type'],
    secondary: HealthMetric['type']
  ): Promise<HealthCorrelation | null> {
    try {
      const primaryMetrics = await this.getHealthMetrics(primary, 30);
      const secondaryMetrics = await this.getHealthMetrics(secondary, 30);

      if (primaryMetrics.length < 5 || secondaryMetrics.length < 5) {
        return null;
      }

      // Find matching timestamps (within 24 hours)
      const matches: Array<{ primary: number; secondary: number; }> = [];
      
      for (const pMetric of primaryMetrics) {
        const pTime = new Date(pMetric.timestamp);
        const sMetric = secondaryMetrics.find(s => {
          const sTime = new Date(s.timestamp);
          const timeDiff = Math.abs(pTime.getTime() - sTime.getTime());
          return timeDiff < 24 * 60 * 60 * 1000; // Within 24 hours
        });
        
        if (sMetric) {
          matches.push({
            primary: this.normalizeValue(pMetric.value),
            secondary: this.normalizeValue(sMetric.value),
          });
        }
      }

      if (matches.length < 5) return null;

      const primaryValues = matches.map(m => m.primary);
      const secondaryValues = matches.map(m => m.secondary);
      
      const { correlation } = this.calculateLinearRegression(primaryValues, secondaryValues);
      
      if (Math.abs(correlation) < 0.3) return null; // Not significant enough

      return {
        primaryMetric: primary,
        secondaryMetric: secondary,
        correlation: Math.round(correlation * 100) / 100,
        confidence: Math.min(Math.abs(correlation) * 100, 95),
        description: this.getCorrelationDescription(primary, secondary, correlation),
        timeframe: '30 days',
      };
    } catch (error) {
      console.error('Error calculating metric correlation:', error);
      return null;
    }
  }

  private static getCorrelationDescription(
    primary: HealthMetric['type'],
    secondary: HealthMetric['type'],
    correlation: number
  ): string {
    const strength = Math.abs(correlation) > 0.7 ? 'strong' : 
                   Math.abs(correlation) > 0.5 ? 'moderate' : 'weak';
    const direction = correlation > 0 ? 'positive' : 'negative';
    
    return `There is a ${strength} ${direction} correlation between ${primary} and ${secondary}.`;
  }

  private static calculateOverallHealthScore(trends: HealthTrend[], goals: HealthGoal[]): number {
    let score = 50; // Base score
    
    // Factor in trends
    for (const trend of trends) {
      if (trend.trend === 'improving') {
        score += trend.confidence * 0.3;
      } else if (trend.trend === 'declining') {
        score -= trend.confidence * 0.2;
      }
    }
    
    // Factor in goal progress
    const activeGoals = goals.filter(g => g.isActive);
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length;
      score += (avgProgress - 50) * 0.3;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
