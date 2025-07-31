/**
 * Health Data Module
 * Manages health data collection, storage, and visualization
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Card, ProgressBar } from 'react-native-paper';
import { LineChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';

import { HealthDataService } from '../services/HealthDataService';
import { EmotionAnalysisService } from '../services/EmotionAnalysisService';

const { width } = Dimensions.get('window');

interface HealthDataModuleProps {
  currentEmotion: string;
}

interface HealthMetrics {
  heartRate?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  temperature?: number;
  oxygenSaturation?: number;
  steps?: number;
  sleep?: { hours: number; quality: string };
  weight?: number;
  moodScore?: number;
}

interface TrendData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

const HealthDataModule: React.FC<HealthDataModuleProps> = ({
  currentEmotion,
}) => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({});
  const [emotionTrends, setEmotionTrends] = useState<TrendData | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  useEffect(() => {
    updateCurrentMood();
  }, [currentEmotion]);

  const loadHealthData = async () => {
    try {
      setIsLoading(true);
      
      // Load current health metrics
      const metrics = await HealthDataService.getCurrentMetrics();
      setHealthMetrics(metrics);
      
      // Load emotion trends
      const emotions = await EmotionAnalysisService.getEmotionTrends(selectedTimeframe);
      setEmotionTrends(emotions);
      
      // Load weekly statistics
      const stats = await HealthDataService.getWeeklyStats();
      setWeeklyStats(stats);
      
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentMood = async () => {
    try {
      const moodScore = getMoodScore(currentEmotion);
      await HealthDataService.recordMoodEntry({
        emotion: currentEmotion,
        score: moodScore,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error updating mood:', error);
    }
  };

  const getMoodScore = (emotion: string): number => {
    const moodScores: { [key: string]: number } = {
      happy: 5,
      neutral: 3,
      sad: 1,
      angry: 1,
      surprised: 4,
      fearful: 2,
      disgusted: 2,
    };
    return moodScores[emotion] || 3;
  };

  const getHealthStatus = (metric: string, value: number): 'good' | 'warning' | 'critical' => {
    const ranges: { [key: string]: { good: [number, number]; warning: [number, number] } } = {
      heartRate: { good: [60, 100], warning: [50, 120] },
      temperature: { good: [36.1, 37.2], warning: [35.5, 38.0] },
      oxygenSaturation: { good: [95, 100], warning: [90, 95] },
      moodScore: { good: [3, 5], warning: [2, 3] },
    };

    const range = ranges[metric];
    if (!range) return 'good';

    if (value >= range.good[0] && value <= range.good[1]) return 'good';
    if (value >= range.warning[0] && value <= range.warning[1]) return 'warning';
    return 'critical';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#6366F1',
    },
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    unit: string,
    icon: string,
    status?: 'good' | 'warning' | 'critical'
  ) => {
    const statusColor = status ? getStatusColor(status) : '#6B7280';
    
    return (
      <Card style={styles.metricCard}>
        <Card.Content style={styles.metricContent}>
          <View style={styles.metricHeader}>
            <Icon name={icon} size={24} color={statusColor} />
            <Text style={styles.metricTitle}>{title}</Text>
          </View>
          <Text style={[styles.metricValue, { color: statusColor }]}>
            {value} {unit}
          </Text>
          {status && (
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{status.toUpperCase()}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const emotionDistributionData = weeklyStats?.emotionDistribution?.map((item: any, index: number) => ({
    name: item.emotion,
    count: item.count,
    color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384'][index % 7],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  })) || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Time frame selector */}
      <View style={styles.timeframeSelectorContainer}>
        {['day', 'week', 'month'].map((timeframe) => (
          <TouchableOpacity
            key={timeframe}
            style={[
              styles.timeframeButton,
              selectedTimeframe === timeframe && styles.selectedTimeframe,
            ]}
            onPress={() => setSelectedTimeframe(timeframe as any)}
          >
            <Text
              style={[
                styles.timeframeText,
                selectedTimeframe === timeframe && styles.selectedTimeframeText,
              ]}
            >
              {timeframe.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Health Metrics */}
      <Text style={styles.sectionTitle}>Current Health Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsRow}>
        {healthMetrics.heartRate && renderMetricCard(
          'Heart Rate',
          healthMetrics.heartRate,
          'bpm',
          'favorite',
          getHealthStatus('heartRate', healthMetrics.heartRate)
        )}
        
        {healthMetrics.temperature && renderMetricCard(
          'Temperature',
          healthMetrics.temperature.toFixed(1),
          '°C',
          'device-thermostat',
          getHealthStatus('temperature', healthMetrics.temperature)
        )}
        
        {healthMetrics.oxygenSaturation && renderMetricCard(
          'Oxygen',
          healthMetrics.oxygenSaturation,
          '%',
          'air',
          getHealthStatus('oxygenSaturation', healthMetrics.oxygenSaturation)
        )}
        
        {healthMetrics.moodScore && renderMetricCard(
          'Mood Score',
          healthMetrics.moodScore.toFixed(1),
          '/5',
          'psychology',
          getHealthStatus('moodScore', healthMetrics.moodScore)
        )}
      </ScrollView>

      {/* Blood Pressure */}
      {healthMetrics.bloodPressure && (
        <Card style={styles.bpCard}>
          <Card.Content>
            <View style={styles.bpHeader}>
              <Icon name="monitor-heart" size={24} color="#EF4444" />
              <Text style={styles.bpTitle}>Blood Pressure</Text>
            </View>
            <View style={styles.bpValues}>
              <Text style={styles.bpValue}>
                {healthMetrics.bloodPressure.systolic}/{healthMetrics.bloodPressure.diastolic}
              </Text>
              <Text style={styles.bpUnit}>mmHg</Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Emotion Trends Chart */}
      {emotionTrends && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Emotion Trends</Text>
          <LineChart
            data={emotionTrends}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Weekly Emotion Distribution */}
      {emotionDistributionData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Weekly Emotion Distribution</Text>
          <PieChart
            data={emotionDistributionData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>
      )}

      {/* Activity Summary */}
      {weeklyStats && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Weekly Summary</Text>
            
            <View style={styles.summaryRow}>
              <Icon name="directions-walk" size={20} color="#10B981" />
              <Text style={styles.summaryLabel}>Average Steps</Text>
              <Text style={styles.summaryValue}>{weeklyStats.averageSteps || 0}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Icon name="bedtime" size={20} color="#3B82F6" />
              <Text style={styles.summaryLabel}>Average Sleep</Text>
              <Text style={styles.summaryValue}>{weeklyStats.averageSleep || '0h'}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Icon name="psychology" size={20} color="#8B5CF6" />
              <Text style={styles.summaryLabel}>Mood Stability</Text>
              <View style={styles.stabilityContainer}>
                <ProgressBar
                  progress={weeklyStats.moodStability || 0}
                  color="#8B5CF6"
                  style={styles.stabilityBar}
                />
                <Text style={styles.stabilityText}>
                  {Math.round((weeklyStats.moodStability || 0) * 100)}%
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    top: 120,
    width: width * 0.35,
    maxHeight: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  timeframeSelectorContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedTimeframe: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  timeframeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  selectedTimeframeText: {
    opacity: 1,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metricCard: {
    width: 120,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  metricContent: {
    alignItems: 'center',
    padding: 12,
  },
  metricHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  bpCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bpTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bpValues: {
    alignItems: 'center',
  },
  bpValue: {
    color: '#EF4444',
    fontSize: 24,
    fontWeight: 'bold',
  },
  bpUnit: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.7,
  },
  chartContainer: {
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  stabilityBar: {
    flex: 1,
    height: 6,
    marginRight: 8,
  },
  stabilityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HealthDataModule;
