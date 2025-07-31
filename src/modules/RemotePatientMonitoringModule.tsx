/**
 * Remote Patient Monitoring Module
 * Handles medication reminders, health check-ins, and caregiver notifications
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Card, Button, Chip, Badge } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';

import { MedicationService } from '../services/MedicationService';
import { HealthCheckService } from '../services/HealthCheckService';
import { CaregiverService } from '../services/CaregiverService';
import MedicationReminder from '../components/MedicationReminder';
import HealthCheckIn from '../components/HealthCheckIn';
import VitalSignsMonitor from '../components/VitalSignsMonitor';

const { width, height } = Dimensions.get('window');

interface RemotePatientMonitoringModuleProps {
  isActive: boolean;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  schedule: string[];
  nextDose: Date;
  taken: boolean;
  color: string;
}

interface HealthMetric {
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
}

const RemotePatientMonitoringModule: React.FC<RemotePatientMonitoringModuleProps> = ({
  isActive,
}) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Medication[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [showMedicationReminder, setShowMedicationReminder] = useState(false);
  const [showHealthCheckIn, setShowHealthCheckIn] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<Medication | null>(null);
  const [dailyCheckCompleted, setDailyCheckCompleted] = useState(false);

  useEffect(() => {
    if (isActive) {
      initializeModule();
      const interval = setInterval(checkScheduledTasks, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const initializeModule = async () => {
    try {
      await loadMedications();
      await loadHealthMetrics();
      await checkDailyCheckIn();
    } catch (error) {
      console.error('Error initializing patient monitoring module:', error);
    }
  };

  const loadMedications = async () => {
    try {
      const meds = await MedicationService.getMedications();
      setMedications(meds);
      
      const upcoming = meds.filter(med => 
        !med.taken && med.nextDose.getTime() <= Date.now() + 3600000 // Next hour
      );
      setUpcomingReminders(upcoming);
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const loadHealthMetrics = async () => {
    try {
      const metrics = await HealthCheckService.getTodaysMetrics();
      setHealthMetrics(metrics);
    } catch (error) {
      console.error('Error loading health metrics:', error);
    }
  };

  const checkDailyCheckIn = async () => {
    try {
      const completed = await HealthCheckService.isDailyCheckCompleted();
      setDailyCheckCompleted(completed);
    } catch (error) {
      console.error('Error checking daily check-in:', error);
    }
  };

  const checkScheduledTasks = async () => {
    const now = new Date();
    
    // Check for medication reminders
    for (const med of medications) {
      if (!med.taken && med.nextDose.getTime() <= now.getTime()) {
        showMedicationAlert(med);
        break;
      }
    }

    // Check for daily health check-in
    if (!dailyCheckCompleted && now.getHours() >= 9) {
      setTimeout(() => {
        setShowHealthCheckIn(true);
      }, 2000);
    }
  };

  const showMedicationAlert = (medication: Medication) => {
    setCurrentReminder(medication);
    setShowMedicationReminder(true);
    
    // Send notification to caregivers if enabled
    CaregiverService.notifyMedicationDue(medication);
  };

  const handleMedicationTaken = async (medicationId: string) => {
    try {
      await MedicationService.markAsTaken(medicationId);
      await loadMedications();
      setShowMedicationReminder(false);
      setCurrentReminder(null);
    } catch (error) {
      console.error('Error marking medication as taken:', error);
      Alert.alert('Error', 'Failed to record medication intake');
    }
  };

  const handleMedicationSkipped = async (medicationId: string, reason: string) => {
    try {
      await MedicationService.markAsSkipped(medicationId, reason);
      await loadMedications();
      setShowMedicationReminder(false);
      setCurrentReminder(null);
      
      // Notify caregivers about skipped medication
      CaregiverService.notifyMedicationSkipped(medicationId, reason);
    } catch (error) {
      console.error('Error marking medication as skipped:', error);
    }
  };

  const handleHealthCheckComplete = async (data: any) => {
    try {
      await HealthCheckService.recordDailyCheck(data);
      setDailyCheckCompleted(true);
      setShowHealthCheckIn(false);
      await loadHealthMetrics();
      
      // Check if any metrics are concerning and notify caregivers
      await CaregiverService.checkAndNotifyHealthConcerns(data);
    } catch (error) {
      console.error('Error recording health check:', error);
    }
  };

  const getMetricStatusColor = (status: string): string => {
    switch (status) {
      case 'normal':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Medication Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Icon name="medication" size={20} color="#10B981" />
          <Text style={styles.statusText}>
            {medications.filter(m => m.taken).length}/{medications.length} taken today
          </Text>
        </View>
        
        {upcomingReminders.length > 0 && (
          <View style={styles.statusItem}>
            <Badge style={styles.reminderBadge}>{upcomingReminders.length}</Badge>
            <Text style={styles.statusText}>upcoming</Text>
          </View>
        )}
        
        <View style={styles.statusItem}>
          <Icon 
            name={dailyCheckCompleted ? 'check-circle' : 'schedule'} 
            size={20} 
            color={dailyCheckCompleted ? '#10B981' : '#F59E0B'} 
          />
          <Text style={styles.statusText}>
            Daily check {dailyCheckCompleted ? 'completed' : 'pending'}
          </Text>
        </View>
      </View>

      {/* Health Metrics Overview */}
      <ScrollView horizontal style={styles.metricsContainer}>
        {healthMetrics.map((metric, index) => (
          <Card key={index} style={styles.metricCard}>
            <Card.Content style={styles.metricContent}>
              <Text style={styles.metricType}>{metric.type}</Text>
              <Text style={[
                styles.metricValue,
                { color: getMetricStatusColor(metric.status) }
              ]}>
                {metric.value} {metric.unit}
              </Text>
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: getMetricStatusColor(metric.status) }
                ]}
                textStyle={styles.statusChipText}
              >
                {metric.status}
              </Chip>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* Medication Reminder Modal */}
      {showMedicationReminder && currentReminder && (
        <MedicationReminder
          medication={currentReminder}
          onTaken={handleMedicationTaken}
          onSkipped={handleMedicationSkipped}
          onClose={() => setShowMedicationReminder(false)}
        />
      )}

      {/* Health Check-in Modal */}
      {showHealthCheckIn && (
        <HealthCheckIn
          onComplete={handleHealthCheckComplete}
          onClose={() => setShowHealthCheckIn(false)}
        />
      )}

      {/* Vital Signs Monitor */}
      <VitalSignsMonitor
        isActive={isActive}
        onVitalSigns={(vitals) => {
          // Handle real-time vital signs if available
          console.log('Vital signs updated:', vitals);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.9,
  },
  reminderBadge: {
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
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
  metricType: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statusChip: {
    height: 24,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default RemotePatientMonitoringModule;
