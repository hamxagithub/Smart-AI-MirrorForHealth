/**
 * Medication Reminder Component
 * Displays medication reminders and allows interaction
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
} from 'react-native-paper';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
}

interface MedicationReminderProps {
  medications: Medication[];
  onMedicationTaken: (medicationId: string) => void;
  onMedicationSkipped: (medicationId: string, reason: string) => void;
}

const MedicationReminder: React.FC<MedicationReminderProps> = ({
  medications,
  onMedicationTaken,
  onMedicationSkipped,
}) => {
  const pendingMedications = medications.filter(med => !med.taken);

  if (pendingMedications.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.noMedicationsText}>
            All medications taken for today! 🎉
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {pendingMedications.map((medication) => (
        <Card key={medication.id} style={styles.medicationCard}>
          <Card.Content>
            <View style={styles.medicationHeader}>
              <Text style={styles.medicationName}>{medication.name}</Text>
              <Chip mode="outlined" style={styles.timeChip}>
                {medication.time}
              </Chip>
            </View>
            <Text style={styles.dosage}>{medication.dosage}</Text>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => onMedicationTaken(medication.id)}
                style={styles.takenButton}
              >
                Taken
              </Button>
              <Button
                mode="outlined"
                onPress={() => onMedicationSkipped(medication.id, 'Skipped by user')}
                style={styles.skipButton}
              >
                Skip
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    margin: 8,
  },
  medicationCard: {
    marginVertical: 8,
    elevation: 2,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeChip: {
    backgroundColor: '#E3F2FD',
  },
  dosage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  takenButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginRight: 8,
  },
  skipButton: {
    flex: 1,
    marginLeft: 8,
  },
  noMedicationsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4CAF50',
  },
});

export default MedicationReminder;
