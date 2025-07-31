/**
 * Telemedicine Module
 * Handles video calls with healthcare providers and emergency contacts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { Card, Button, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';

// Note: You would need to implement actual WebRTC functionality
// This is a simplified version for demonstration
import { TelemedicineService } from '../services/TelemedicineService';

import EmergencyContactList from '../components/EmergencyContactList';

const { width, height } = Dimensions.get('window');

interface TelemedicineModuleProps {}

interface HealthcareProvider {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  isAvailable: boolean;
  rating: number;
  nextAvailable?: Date;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
  avatar?: string;
}

interface CallSession {
  id: string;
  participantId: string;
  participantName: string;
  type: 'healthcare' | 'emergency' | 'caregiver';
  startTime: Date;
  status: 'connecting' | 'active' | 'ended';
}

const TelemedicineModule: React.FC<TelemedicineModuleProps> = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);

  useEffect(() => {
    loadProviders();
    loadEmergencyContacts();
    
    // Listen for emergency triggers
    const checkEmergencyTriggers = setInterval(checkForEmergencyTriggers, 5000);
    return () => clearInterval(checkEmergencyTriggers);
  }, []);

  const loadProviders = async () => {
    try {
      const providerList = await TelemedicineService.getAvailableProviders();
      setProviders(providerList);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const loadEmergencyContacts = async () => {
    try {
      const contacts = await TelemedicineService.getEmergencyContacts();
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
    }
  };

  const checkForEmergencyTriggers = async () => {
    try {
      const emergencyDetected: boolean = await TelemedicineService.checkEmergencyTriggers();
      if (emergencyDetected && !emergencyTriggered) {
        setEmergencyTriggered(true);
        handleEmergencyTrigger();
      }
    } catch (error) {
      console.error('Error checking emergency triggers:', error);
    }
  };

  const handleEmergencyTrigger = () => {
    Alert.alert(
      'Emergency Detected',
      'Critical health indicators detected. Would you like to contact emergency services or a healthcare provider?',
      [
        {
          text: 'Call Emergency Services',
          onPress: () => initiateEmergencyCall(),
          style: 'destructive',
        },
        {
          text: 'Contact Healthcare Provider',
          onPress: () => setShowEmergencyModal(true),
        },
        {
          text: 'False Alarm',
          onPress: () => setEmergencyTriggered(false),
          style: 'cancel',
        },
      ]
    );
  };

  const initiateCall = async (providerId: string, type: 'healthcare' | 'emergency' | 'caregiver') => {
    try {
      const provider = providers.find(p => p.id === providerId) || 
                     emergencyContacts.find(c => c.id === providerId);
      
      if (!provider) {
        Alert.alert('Error', 'Contact not found');
        return;
      }

      const callSession = await TelemedicineService.initiateCall(providerId, type);
      
      setCurrentCall({
        id: callSession.id,
        participantId: providerId,
        participantName: provider.name,
        type,
        startTime: new Date(),
        status: 'connecting',
      });

      // Auto-dismiss the module during call
      setIsVisible(false);
      
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Call Failed', 'Unable to connect. Please try again.');
    }
  };

  const initiateEmergencyCall = async () => {
    try {
      // First try to contact the highest priority emergency contact
      const primaryContact = emergencyContacts.find(c => c.priority === 1);
      if (primaryContact) {
        await initiateCall(primaryContact.id, 'emergency');
      } else {
        // Fallback to emergency services
        await TelemedicineService.callEmergencyServices();
      }
    } catch (error) {
      console.error('Error initiating emergency call:', error);
      Alert.alert('Emergency Call Failed', 'Please call emergency services directly.');
    }
  };

  const endCall = async () => {
    if (currentCall) {
      try {
        await TelemedicineService.endCall(currentCall.id);
        setCurrentCall(null);
        setEmergencyTriggered(false);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
  };

  const scheduleAppointment = async (providerId: string) => {
    try {
      const success = await TelemedicineService.scheduleAppointment(providerId);
      if (success) {
        Alert.alert('Success', 'Appointment scheduled successfully');
      } else {
        Alert.alert('Error', 'Failed to schedule appointment');
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error);
    }
  };

  const sendHealthSummary = async (providerId: string) => {
    try {
      await TelemedicineService.sendHealthSummary(providerId);
      Alert.alert('Success', 'Health summary sent to your healthcare provider');
    } catch (error) {
      console.error('Error sending health summary:', error);
      Alert.alert('Error', 'Failed to send health summary');
    }
  };

  // Auto-show module in case of emergency
  useEffect(() => {
    if (emergencyTriggered) {
      setIsVisible(true);
    }
  }, [emergencyTriggered]);

  const renderProviderCard = (provider: HealthcareProvider) => (
    <Card key={provider.id} style={styles.providerCard}>
      <Card.Content style={styles.providerContent}>
        <View style={styles.providerHeader}>
          <Avatar.Image
            source={{ uri: provider.avatar }}
            size={50}
            style={styles.providerAvatar}
          />
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.name}</Text>
            <Text style={styles.providerSpecialty}>{provider.specialty}</Text>
            <View style={styles.availabilityContainer}>
              <View
                style={[
                  styles.availabilityDot,
                  { backgroundColor: provider.isAvailable ? '#10B981' : '#EF4444' },
                ]}
              />
              <Text style={styles.availabilityText}>
                {provider.isAvailable ? 'Available Now' : 'Busy'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.providerActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              !provider.isAvailable && styles.disabledButton,
            ]}
            onPress={() => initiateCall(provider.id, 'healthcare')}
            disabled={!provider.isAvailable}
          >
            <Icon name="video-call" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Call Now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => scheduleAppointment(provider.id)}
          >
            <Icon name="schedule" size={20} color="#2563EB" />
            <Text style={styles.secondaryButtonText}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => sendHealthSummary(provider.id)}
          >
            <Icon name="description" size={20} color="#2563EB" />
            <Text style={styles.secondaryButtonText}>Send Report</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  // Placeholder VideoCallInterface component
  const VideoCallInterface: React.FC<{
    callSession: CallSession;
    onEndCall: () => void;
    onCallStatusChange: (status: CallSession['status']) => void;
  }> = ({ callSession, onEndCall }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>
        Video Call with {callSession.participantName}
      </Text>
      <Button mode="contained" onPress={onEndCall}>
        End Call
      </Button>
    </View>
  );
  
  if (currentCall) {
    return (
      <VideoCallInterface
        callSession={currentCall}
        onEndCall={endCall}
        onCallStatusChange={(status) => 
          setCurrentCall(prev => prev ? { ...prev, status } : null)
        }
      />
    );
  }

  return (
    <>
      {/* Quick Access Button */}
      <TouchableOpacity
        style={styles.quickAccessButton}
        onPress={() => setIsVisible(true)}
      >
        <Icon name="video-call" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Emergency Alert */}
      {emergencyTriggered && (
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          style={styles.emergencyAlert}
        >
          <Icon name="warning" size={32} color="#FFFFFF" />
          <Text style={styles.emergencyText}>EMERGENCY DETECTED</Text>
        </Animatable.View>
      )}

      {/* Main Module Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Telemedicine</Text>
            <TouchableOpacity
              onPress={() => setIsVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {emergencyTriggered && (
            <Card style={styles.emergencyCard}>
              <Card.Content>
                <View style={styles.emergencyHeader}>
                  <Icon name="warning" size={24} color="#EF4444" />
                  <Text style={styles.emergencyTitle}>Emergency Detected</Text>
                </View>
                <Text style={styles.emergencyDescription}>
                  Critical health indicators detected. Please contact a healthcare provider immediately.
                </Text>
                <Button
                  mode="contained"
                  style={styles.emergencyButton}
                  onPress={initiateEmergencyCall}
                >
                  Call Emergency Contact
                </Button>
              </Card.Content>
            </Card>
          )}

          <Text style={styles.sectionTitle}>Available Healthcare Providers</Text>
          {providers.map(renderProviderCard)}

          <TouchableOpacity
            style={styles.emergencyContactsButton}
            onPress={() => setShowEmergencyModal(true)}
          >
            <Icon name="emergency" size={24} color="#EF4444" />
            <Text style={styles.emergencyContactsText}>Emergency Contacts</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Emergency Contacts Modal */}
      <Modal
        visible={showEmergencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <EmergencyContactList
          contacts={emergencyContacts}
          onContactCall={(contactId: string) => {
            initiateCall(contactId, 'emergency');
            setShowEmergencyModal(false);
          }}
          onClose={() => setShowEmergencyModal(false)}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  quickAccessButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emergencyAlert: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: -100,
    width: 200,
    padding: 16,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    elevation: 10,
    zIndex: 50,
  },
  emergencyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    marginBottom: 20,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginLeft: 8,
  },
  emergencyDescription: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 16,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: '#EF4444',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  providerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  providerContent: {
    padding: 16,
  },
  providerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  providerAvatar: {
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  providerSpecialty: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availabilityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  providerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 4,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emergencyContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  emergencyContactsText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TelemedicineModule;
