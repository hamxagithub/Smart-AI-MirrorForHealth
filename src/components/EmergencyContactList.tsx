/**
 * Emergency Contact List Component
 * Displays emergency contacts with quick call functionality
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  IconButton,
  Avatar,
  Button,
} from 'react-native-paper';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  avatar?: string;
  isPrimary?: boolean;
}

interface EmergencyContactListProps {
  contacts: EmergencyContact[];
  onEditContact: (contactId: string) => void;
  onAddContact: () => void;
}

const EmergencyContactList: React.FC<EmergencyContactListProps> = ({
  contacts,
  onEditContact,
  onAddContact,
}) => {
  const handleCall = async (contact: EmergencyContact) => {
    const phoneUrl = `tel:${contact.phoneNumber}`;
    
    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to make phone call');
    }
  };

  const handleSMS = async (contact: EmergencyContact) => {
    const smsUrl = `sms:${contact.phoneNumber}`;
    
    try {
      const supported = await Linking.canOpenURL(smsUrl);
      if (supported) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert('Error', 'SMS is not supported on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send SMS');
    }
  };

  const handleEmail = async (contact: EmergencyContact) => {
    if (!contact.email) {
      Alert.alert('Error', 'No email address available for this contact');
      return;
    }

    const emailUrl = `mailto:${contact.email}?subject=Emergency Contact&body=This is an emergency message.`;
    
    try {
      const supported = await Linking.canOpenURL(emailUrl);
      if (supported) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert('Error', 'Email is not supported on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send email');
    }
  };

  const confirmEmergencyCall = (contact: EmergencyContact) => {
    Alert.alert(
      'Emergency Call',
      `Call ${contact.name} (${contact.relationship})?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call',
          style: 'destructive',
          onPress: () => handleCall(contact),
        },
      ]
    );
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <Button
          mode="contained"
          onPress={onAddContact}
          icon="plus"
          compact
        >
          Add Contact
        </Button>
      </View>

      {sortedContacts.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>
              No emergency contacts added yet.
            </Text>
            <Text style={styles.emptySubtext}>
              Add contacts to quickly reach help in emergencies.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        sortedContacts.map((contact) => (
          <Card key={contact.id} style={styles.contactCard}>
            <Card.Content>
              <View style={styles.contactHeader}>
                <View style={styles.contactInfo}>
                  <Avatar.Text
                    size={48}
                    label={contact.name.split(' ').map(n => n[0]).join('')}
                    style={[
                      styles.avatar,
                      contact.isPrimary && styles.primaryAvatar,
                    ]}
                  />
                  <View style={styles.contactDetails}>
                    <View style={styles.nameRow}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.isPrimary && (
                        <Text style={styles.primaryBadge}>PRIMARY</Text>
                      )}
                    </View>
                    <Text style={styles.contactRelationship}>
                      {contact.relationship}
                    </Text>
                    <Text style={styles.contactPhone}>
                      {contact.phoneNumber}
                    </Text>
                    {contact.email && (
                      <Text style={styles.contactEmail}>
                        {contact.email}
                      </Text>
                    )}
                  </View>
                </View>
                <IconButton
                  icon="pencil"
                  onPress={() => onEditContact(contact.id)}
                  size={20}
                />
              </View>

              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={() => confirmEmergencyCall(contact)}
                  icon="phone"
                  style={[styles.actionButton, styles.callButton]}
                  labelStyle={styles.buttonLabel}
                >
                  Call
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleSMS(contact)}
                  icon="message"
                  style={styles.actionButton}
                  labelStyle={styles.buttonLabel}
                >
                  SMS
                </Button>
                {contact.email && (
                  <Button
                    mode="outlined"
                    onPress={() => handleEmail(contact)}
                    icon="email"
                    style={styles.actionButton}
                    labelStyle={styles.buttonLabel}
                  >
                    Email
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      {/* Emergency Services */}
      <Card style={styles.emergencyServicesCard}>
        <Card.Title title="Emergency Services" />
        <Card.Content>
          <View style={styles.emergencyServices}>
            <Button
              mode="contained"
              onPress={() => handleCall({ id: '911', name: 'Emergency Services', relationship: '', phoneNumber: '911' })}
              icon="phone"
              style={[styles.emergencyButton, styles.policeButton]}
            >
              911
            </Button>
            <Button
              mode="contained"
              onPress={() => handleCall({ id: 'poison', name: 'Poison Control', relationship: '', phoneNumber: '1-800-222-1222' })}
              icon="bottle-tonic"
              style={[styles.emergencyButton, styles.poisonButton]}
            >
              Poison Control
            </Button>
          </View>
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
  emptyCard: {
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  contactCard: {
    marginVertical: 8,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  contactInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  primaryAvatar: {
    backgroundColor: '#FF5722',
  },
  contactDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  primaryBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF5722',
    backgroundColor: '#FFE0DB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contactRelationship: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  buttonLabel: {
    fontSize: 12,
  },
  emergencyServicesCard: {
    marginTop: 16,
    backgroundColor: '#FFF3E0',
  },
  emergencyServices: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  emergencyButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  policeButton: {
    backgroundColor: '#F44336',
  },
  poisonButton: {
    backgroundColor: '#FF9800',
  },
});

export default EmergencyContactList;
