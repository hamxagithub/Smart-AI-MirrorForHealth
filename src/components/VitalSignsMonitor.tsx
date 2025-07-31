/**
 * Vital Signs Monitor Component
 * Displays real-time vital signs data and trends
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Card,
  Text,
  ProgressBar,
  IconButton,
  Chip,
} from 'react-native-paper';

interface VitalSigns {
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  temperature: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  timestamp: Date;
}

interface VitalSignsMonitorProps {
  onRefresh: () => void;
  isLoading?: boolean;
}

const VitalSignsMonitor: React.FC<VitalSignsMonitorProps> = ({
  onRefresh,
  isLoading = false,
}) => {
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    heartRate: 72,
    bloodPressure: {
      systolic: 120,
      diastolic: 80,
    },
    temperature: 98.6,
    oxygenSaturation: 98,
    respiratoryRate: 16,
    timestamp: new Date(),
  });

  const getHeartRateStatus = (hr: number) => {
    if (hr < 60) return { status: 'Low', color: '#FF9800' };
    if (hr > 100) return { status: 'High', color: '#F44336' };
    return { status: 'Normal', color: '#4CAF50' };
  };

  const getBloodPressureStatus = (systolic: number, diastolic: number) => {
    if (systolic > 140 || diastolic > 90) {
      return { status: 'High', color: '#F44336' };
    }
    if (systolic < 90 || diastolic < 60) {
      return { status: 'Low', color: '#FF9800' };
    }
    return { status: 'Normal', color: '#4CAF50' };
  };

  const getTemperatureStatus = (temp: number) => {
    if (temp > 100.4) return { status: 'Fever', color: '#F44336' };
    if (temp < 96.8) return { status: 'Low', color: '#FF9800' };
    return { status: 'Normal', color: '#4CAF50' };
  };

  const getOxygenSaturationStatus = (o2: number) => {
    if (o2 < 95) return { status: 'Low', color: '#F44336' };
    if (o2 < 98) return { status: 'Monitor', color: '#FF9800' };
    return { status: 'Normal', color: '#4CAF50' };
  };

  const heartRateStatus = getHeartRateStatus(vitalSigns.heartRate);
  const bpStatus = getBloodPressureStatus(
    vitalSigns.bloodPressure.systolic,
    vitalSigns.bloodPressure.diastolic
  );
  const tempStatus = getTemperatureStatus(vitalSigns.temperature);
  const o2Status = getOxygenSaturationStatus(vitalSigns.oxygenSaturation);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setVitalSigns(prev => ({
        ...prev,
        heartRate: prev.heartRate + (Math.random() - 0.5) * 4,
        oxygenSaturation: Math.max(95, Math.min(100, prev.oxygenSaturation + (Math.random() - 0.5) * 2)),
        timestamp: new Date(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vital Signs Monitor</Text>
        <IconButton
          icon="refresh"
          onPress={onRefresh}
          disabled={isLoading}
        />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ProgressBar indeterminate />
          <Text style={styles.loadingText}>Updating vital signs...</Text>
        </View>
      )}

      {/* Heart Rate */}
      <Card style={styles.vitalCard}>
        <Card.Content>
          <View style={styles.vitalHeader}>
            <Text style={styles.vitalLabel}>Heart Rate</Text>
            <Chip
              mode="outlined"
              textStyle={{ color: heartRateStatus.color }}
              style={{ borderColor: heartRateStatus.color }}
            >
              {heartRateStatus.status}
            </Chip>
          </View>
          <Text style={styles.vitalValue}>
            {Math.round(vitalSigns.heartRate)} BPM
          </Text>
          <ProgressBar
            progress={vitalSigns.heartRate / 200}
            color={heartRateStatus.color}
            style={styles.progressBar}
          />
        </Card.Content>
      </Card>

      {/* Blood Pressure */}
      <Card style={styles.vitalCard}>
        <Card.Content>
          <View style={styles.vitalHeader}>
            <Text style={styles.vitalLabel}>Blood Pressure</Text>
            <Chip
              mode="outlined"
              textStyle={{ color: bpStatus.color }}
              style={{ borderColor: bpStatus.color }}
            >
              {bpStatus.status}
            </Chip>
          </View>
          <Text style={styles.vitalValue}>
            {vitalSigns.bloodPressure.systolic}/{vitalSigns.bloodPressure.diastolic} mmHg
          </Text>
          <View style={styles.bpBars}>
            <View style={styles.bpBar}>
              <Text style={styles.bpLabel}>Systolic</Text>
              <ProgressBar
                progress={vitalSigns.bloodPressure.systolic / 200}
                color={bpStatus.color}
                style={styles.progressBar}
              />
            </View>
            <View style={styles.bpBar}>
              <Text style={styles.bpLabel}>Diastolic</Text>
              <ProgressBar
                progress={vitalSigns.bloodPressure.diastolic / 120}
                color={bpStatus.color}
                style={styles.progressBar}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Temperature */}
      <Card style={styles.vitalCard}>
        <Card.Content>
          <View style={styles.vitalHeader}>
            <Text style={styles.vitalLabel}>Temperature</Text>
            <Chip
              mode="outlined"
              textStyle={{ color: tempStatus.color }}
              style={{ borderColor: tempStatus.color }}
            >
              {tempStatus.status}
            </Chip>
          </View>
          <Text style={styles.vitalValue}>
            {vitalSigns.temperature.toFixed(1)}°F
          </Text>
          <ProgressBar
            progress={(vitalSigns.temperature - 95) / 10}
            color={tempStatus.color}
            style={styles.progressBar}
          />
        </Card.Content>
      </Card>

      {/* Oxygen Saturation */}
      <Card style={styles.vitalCard}>
        <Card.Content>
          <View style={styles.vitalHeader}>
            <Text style={styles.vitalLabel}>Oxygen Saturation</Text>
            <Chip
              mode="outlined"
              textStyle={{ color: o2Status.color }}
              style={{ borderColor: o2Status.color }}
            >
              {o2Status.status}
            </Chip>
          </View>
          <Text style={styles.vitalValue}>
            {Math.round(vitalSigns.oxygenSaturation)}%
          </Text>
          <ProgressBar
            progress={vitalSigns.oxygenSaturation / 100}
            color={o2Status.color}
            style={styles.progressBar}
          />
        </Card.Content>
      </Card>

      {/* Respiratory Rate */}
      <Card style={styles.vitalCard}>
        <Card.Content>
          <View style={styles.vitalHeader}>
            <Text style={styles.vitalLabel}>Respiratory Rate</Text>
            <Chip mode="outlined">Normal</Chip>
          </View>
          <Text style={styles.vitalValue}>
            {vitalSigns.respiratoryRate} breaths/min
          </Text>
          <ProgressBar
            progress={vitalSigns.respiratoryRate / 40}
            color="#4CAF50"
            style={styles.progressBar}
          />
        </Card.Content>
      </Card>

      <Text style={styles.timestamp}>
        Last updated: {vitalSigns.timestamp.toLocaleTimeString()}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  vitalCard: {
    marginVertical: 8,
    elevation: 2,
  },
  vitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vitalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vitalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  bpBars: {
    marginTop: 8,
  },
  bpBar: {
    marginVertical: 4,
  },
  bpLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timestamp: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 32,
  },
});

export default VitalSignsMonitor;
