/**
 * Health Check-In Component
 * Allows users to log daily health status and symptoms
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  RadioButton,
  TextInput,
  Chip,
} from 'react-native-paper';

interface HealthCheckInProps {
  onCheckInComplete: (checkInData: HealthCheckInData) => void;
}

interface HealthCheckInData {
  overallFeeling: string;
  symptoms: string[];
  painLevel: number;
  notes: string;
  timestamp: Date;
}

const SYMPTOMS = [
  'Headache',
  'Fatigue',
  'Nausea',
  'Dizziness',
  'Shortness of breath',
  'Chest pain',
  'Fever',
  'Cough',
];

const HealthCheckIn: React.FC<HealthCheckInProps> = ({ onCheckInComplete }) => {
  const [overallFeeling, setOverallFeeling] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [notes, setNotes] = useState('');

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSubmit = () => {
    const checkInData: HealthCheckInData = {
      overallFeeling,
      symptoms: selectedSymptoms,
      painLevel,
      notes,
      timestamp: new Date(),
    };
    onCheckInComplete(checkInData);
  };

  const isFormValid = overallFeeling !== '';

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Daily Health Check-In" />
        <Card.Content>
          {/* Overall Feeling */}
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>
          <RadioButton.Group
            onValueChange={setOverallFeeling}
            value={overallFeeling}
          >
            <View style={styles.radioOption}>
              <RadioButton value="excellent" />
              <Text>Excellent</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="good" />
              <Text>Good</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="fair" />
              <Text>Fair</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="poor" />
              <Text>Poor</Text>
            </View>
          </RadioButton.Group>

          {/* Symptoms */}
          <Text style={styles.sectionTitle}>Any symptoms today?</Text>
          <View style={styles.symptomsContainer}>
            {SYMPTOMS.map((symptom) => (
              <Chip
                key={symptom}
                selected={selectedSymptoms.includes(symptom)}
                onPress={() => handleSymptomToggle(symptom)}
                style={styles.symptomChip}
              >
                {symptom}
              </Chip>
            ))}
          </View>

          {/* Pain Level */}
          <Text style={styles.sectionTitle}>Pain Level (0-10)</Text>
          <View style={styles.painLevelContainer}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <Button
                key={level}
                mode={painLevel === level ? 'contained' : 'outlined'}
                onPress={() => setPainLevel(level)}
                style={styles.painButton}
                compact
              >
                {level}
              </Button>
            ))}
          </View>

          {/* Notes */}
          <TextInput
            label="Additional Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!isFormValid}
            style={styles.submitButton}
          >
            Submit Check-In
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  symptomChip: {
    margin: 4,
  },
  painLevelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  painButton: {
    marginVertical: 2,
    minWidth: 40,
  },
  notesInput: {
    marginVertical: 16,
  },
  submitButton: {
    marginTop: 16,
  },
});

export default HealthCheckIn;
