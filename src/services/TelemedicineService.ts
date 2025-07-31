/**
 * Telemedicine Service
 * Handles video calls, provider management, and healthcare appointments
 */

import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';

interface HealthcareProvider {
  id: string;
  name: string;
  title: string;
  specialty: string;
  email: string;
  phone: string;
  avatar?: string;
  isAvailable: boolean;
  rating: number;
  bio?: string;
  languages: string[];
  workingHours: {
    [key: string]: { start: string; end: string; }; // e.g., 'monday': { start: '09:00', end: '17:00' }
  };
  consultationFee?: number;
}

interface Appointment {
  id: string;
  providerId: string;
  patientId: string;
  scheduledTime: Date;
  duration: number; // in minutes
  type: 'consultation' | 'follow_up' | 'emergency' | 'routine_check';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  prescription?: string;
  followUpRequired: boolean;
  callId?: string;
  recordingEnabled: boolean;
}

interface VideoCallSession {
  id: string;
  appointmentId: string;
  startTime: Date;
  endTime?: Date;
  participants: string[];
  status: 'waiting' | 'connected' | 'ended' | 'failed';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues?: string[];
  recordingPath?: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  isHealthcareProvider: boolean;
  priority: number; // 1 = highest priority
  available24x7: boolean;
}

export class TelemedicineService {
  static async getHealthcareProviders(): Promise<HealthcareProvider[]> {
    try {
      return await StorageService.getItem<HealthcareProvider[]>('healthcare_providers') || [];
    } catch (error) {
      console.error('Error getting healthcare providers:', error);
      return [];
    }
  }

  static async addHealthcareProvider(provider: Omit<HealthcareProvider, 'id'>): Promise<string> {
    try {
      const id = Date.now().toString();
      const newProvider: HealthcareProvider = { ...provider, id };
      
      const providers = await this.getHealthcareProviders();
      providers.push(newProvider);
      
      await StorageService.setItem('healthcare_providers', providers);
      return id;
    } catch (error) {
      console.error('Error adding healthcare provider:', error);
      throw error;
    }
  }

  static async getProvider(id: string): Promise<HealthcareProvider | null> {
    try {
      const providers = await this.getHealthcareProviders();
      return providers.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Error getting provider:', error);
      return null;
    }
  }

  static async searchProviders(
    specialty?: string,
    isAvailable?: boolean,
    language?: string
  ): Promise<HealthcareProvider[]> {
    try {
      let providers = await this.getHealthcareProviders();
      
      if (specialty) {
        providers = providers.filter(p => 
          p.specialty.toLowerCase().includes(specialty.toLowerCase())
        );
      }
      
      if (isAvailable !== undefined) {
        providers = providers.filter(p => p.isAvailable === isAvailable);
      }
      
      if (language) {
        providers = providers.filter(p => 
          p.languages.some(lang => 
            lang.toLowerCase().includes(language.toLowerCase())
          )
        );
      }
      
      return providers.sort((a, b) => b.rating - a.rating);
    } catch (error) {
      console.error('Error searching providers:', error);
      return [];
    }
  }

  static async scheduleAppointment(
    providerId: string,
    scheduledTime: Date,
    type: Appointment['type'],
    notes?: string
  ): Promise<string> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      if (!provider.isAvailable) {
        throw new Error('Provider is not available');
      }

      // Check if time slot is available
      const isAvailable = await this.isTimeSlotAvailable(providerId, scheduledTime);
      if (!isAvailable) {
        throw new Error('Time slot is not available');
      }

      const appointmentId = Date.now().toString();
      const appointment: Appointment = {
        id: appointmentId,
        providerId,
        patientId: await this.getPatientId(),
        scheduledTime,
        duration: 30, // Default 30 minutes
        type,
        status: 'scheduled',
        notes,
        followUpRequired: false,
        recordingEnabled: false,
      };

      await this.saveAppointment(appointment);
      
      // Schedule notification reminder
      await this.scheduleAppointmentReminder(appointment);
      
      return appointmentId;
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      throw error;
    }
  }

  static async getAppointments(
    status?: Appointment['status'],
    days = 30
  ): Promise<Appointment[]> {
    try {
      const appointments = await StorageService.getItem<Appointment[]>('appointments') || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let filtered = appointments.filter(apt => 
        new Date(apt.scheduledTime) > cutoffDate
      );

      if (status) {
        filtered = filtered.filter(apt => apt.status === status);
      }

      return filtered.sort((a, b) => 
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );
    } catch (error) {
      console.error('Error getting appointments:', error);
      return [];
    }
  }

  static async getUpcomingAppointments(hours = 24): Promise<Appointment[]> {
    try {
      const appointments = await this.getAppointments('scheduled');
      const now = new Date();
      const futureTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));

      return appointments.filter(apt => {
        const aptTime = new Date(apt.scheduledTime);
        return aptTime >= now && aptTime <= futureTime;
      });
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      return [];
    }
  }

  static async startVideoCall(appointmentId: string): Promise<VideoCallSession> {
    try {
      const appointment = await this.getAppointment(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.status !== 'scheduled') {
        throw new Error('Appointment is not scheduled');
      }

      const callId = Date.now().toString();
      const session: VideoCallSession = {
        id: callId,
        appointmentId,
        startTime: new Date(),
        participants: [appointment.patientId, appointment.providerId],
        status: 'waiting',
        quality: 'good',
      };

      await this.saveVideoCallSession(session);
      
      // Update appointment status
      await this.updateAppointment(appointmentId, { 
        status: 'in_progress',
        callId: callId,
      });

      return session;
    } catch (error) {
      console.error('Error starting video call:', error);
      throw error;
    }
  }

  static async endVideoCall(callId: string, quality: VideoCallSession['quality']): Promise<void> {
    try {
      const sessions = await StorageService.getItem<VideoCallSession[]>('video_call_sessions') || [];
      const sessionIndex = sessions.findIndex(s => s.id === callId);
      
      if (sessionIndex === -1) {
        throw new Error('Call session not found');
      }

      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        endTime: new Date(),
        status: 'ended',
        quality,
      };

      await StorageService.setItem('video_call_sessions', sessions);

      // Update appointment status
      const appointment = await this.getAppointment(sessions[sessionIndex].appointmentId);
      if (appointment) {
        await this.updateAppointment(appointment.id, { status: 'completed' });
      }
    } catch (error) {
      console.error('Error ending video call:', error);
      throw error;
    }
  }

  static async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const contacts = await StorageService.getItem<EmergencyContact[]>('emergency_contacts') || [];
      return contacts.sort((a, b) => a.priority - b.priority);
    } catch (error) {
      console.error('Error getting emergency contacts:', error);
      return [];
    }
  }

  static async addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<string> {
    try {
      const id = Date.now().toString();
      const newContact: EmergencyContact = { ...contact, id };
      
      const contacts = await this.getEmergencyContacts();
      contacts.push(newContact);
      
      await StorageService.setItem('emergency_contacts', contacts);
      return id;
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      throw error;
    }
  }

  static async initiateEmergencyCall(reason: string): Promise<void> {
    try {
      const emergencyContacts = await this.getEmergencyContacts();
      const availableContacts = emergencyContacts.filter(c => c.available24x7);
      
      if (availableContacts.length === 0) {
        throw new Error('No emergency contacts available');
      }

      const primaryContact = availableContacts[0];
      
      // Log emergency event
      await this.logEmergencyEvent(reason, primaryContact.id);
      
      // Send emergency alert
        await NotificationService.sendEmergencyAlert(
        `Emergency call initiated: ${reason}. Contacting ${primaryContact.name}`
      );

      // In a real implementation, this would initiate actual call
      console.log(`Initiating emergency call to ${primaryContact.name}: ${primaryContact.phone}`);
      
    } catch (error) {
      console.error('Error initiating emergency call:', error);
      throw error;
    }
  }

  static async cancelAppointment(appointmentId: string, reason: string): Promise<void> {
    try {
      await this.updateAppointment(appointmentId, { 
        status: 'cancelled',
        notes: reason,
      });

      // Notify provider (in real implementation)
      const appointment = await this.getAppointment(appointmentId);
      if (appointment) {
        console.log(`Appointment ${appointmentId} cancelled: ${reason}`);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  static async rescheduleAppointment(
    appointmentId: string,
    newTime: Date
  ): Promise<void> {
    try {
      const appointment = await this.getAppointment(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check if new time slot is available
      const isAvailable = await this.isTimeSlotAvailable(appointment.providerId, newTime);
      if (!isAvailable) {
        throw new Error('New time slot is not available');
      }

      await this.updateAppointment(appointmentId, { scheduledTime: newTime });
      
      // Update notification reminder
      await this.scheduleAppointmentReminder({ ...appointment, scheduledTime: newTime });
      
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      throw error;
    }
  }

  private static async getPatientId(): Promise<string> {
    try {
      let patientId = await StorageService.getItem<string>('patient_id');
      if (!patientId) {
        patientId = Date.now().toString();
        await StorageService.setItem('patient_id', patientId);
      }
      return patientId;
    } catch (error) {
      console.error('Error getting patient ID:', error);
      return 'default_patient';
    }
  }

  private static async isTimeSlotAvailable(
    providerId: string,
    scheduledTime: Date
  ): Promise<boolean> {
    try {
      const appointments = await this.getAppointments('scheduled');
      const conflictingAppointments = appointments.filter(apt => {
        if (apt.providerId !== providerId) return false;
        
        const aptTime = new Date(apt.scheduledTime);
        const aptEndTime = new Date(aptTime.getTime() + (apt.duration * 60 * 1000));
        const newEndTime = new Date(scheduledTime.getTime() + (30 * 60 * 1000)); // Assuming 30 min duration
        
        return (scheduledTime < aptEndTime && newEndTime > aptTime);
      });
      
      return conflictingAppointments.length === 0;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return false;
    }
  }

  private static async saveAppointment(appointment: Appointment): Promise<void> {
    try {
      const appointments = await StorageService.getItem<Appointment[]>('appointments') || [];
      appointments.push(appointment);
      await StorageService.setItem('appointments', appointments);
    } catch (error) {
      console.error('Error saving appointment:', error);
      throw error;
    }
  }

  private static async getAppointment(id: string): Promise<Appointment | null> {
    try {
      const appointments = await StorageService.getItem<Appointment[]>('appointments') || [];
      return appointments.find(apt => apt.id === id) || null;
    } catch (error) {
      console.error('Error getting appointment:', error);
      return null;
    }
  }

  private static async updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
    try {
      const appointments = await StorageService.getItem<Appointment[]>('appointments') || [];
      const index = appointments.findIndex(apt => apt.id === id);
      
      if (index !== -1) {
        appointments[index] = { ...appointments[index], ...updates };
        await StorageService.setItem('appointments', appointments);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  private static async saveVideoCallSession(session: VideoCallSession): Promise<void> {
    try {
      const sessions = await StorageService.getItem<VideoCallSession[]>('video_call_sessions') || [];
      sessions.push(session);
      
      // Keep only last 100 sessions
      const trimmed = sessions.slice(-100);
      await StorageService.setItem('video_call_sessions', trimmed);
    } catch (error) {
      console.error('Error saving video call session:', error);
      throw error;
    }
  }

  private static async scheduleAppointmentReminder(appointment: Appointment): Promise<void> {
    try {
      const reminderTime = new Date(appointment.scheduledTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - 15); // 15 minutes before

      const provider = await this.getProvider(appointment.providerId);
      const message = `Upcoming appointment with ${provider?.name || 'your healthcare provider'} in 15 minutes`;

      await NotificationService.scheduleNotification({
        title: 'Appointment Reminder',
        message: message,
        type: 'appointment',
        priority: 'high',
        scheduledTime: reminderTime,
        repeatType: undefined,
        isActive: true,
      });
    } catch (error) {
      console.error('Error scheduling appointment reminder:', error);
    }
  }

  private static async logEmergencyEvent(reason: string, contactId: string): Promise<void> {
    try {
      const emergencyEvents = await StorageService.getItem<any[]>('emergency_events') || [];
      emergencyEvents.push({
        id: Date.now().toString(),
        timestamp: new Date(),
        reason,
        contactId,
        resolved: false,
      });
      
      // Keep only last 50 emergency events
      const trimmed = emergencyEvents.slice(-50);
      await StorageService.setItem('emergency_events', trimmed);
    } catch (error) {
      console.error('Error logging emergency event:', error);
    }
  }

  static async getCallHistory(days = 30): Promise<VideoCallSession[]> {
    try {
      const sessions = await StorageService.getItem<VideoCallSession[]>('video_call_sessions') || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return sessions
        .filter(session => new Date(session.startTime) > cutoffDate)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } catch (error) {
      console.error('Error getting call history:', error);
      return [];
    }
  }

  static async getProviderAvailability(providerId: string, date: Date): Promise<string[]> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider || !provider.isAvailable) {
        return [];
      }

      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const workingHours = provider.workingHours[dayOfWeek];
      
      if (!workingHours) {
        return [];
      }

      // Generate available time slots (simplified)
      const slots: string[] = [];
      const start = parseInt(workingHours.start.split(':')[0]);
      const end = parseInt(workingHours.end.split(':')[0]);
      
      for (let hour = start; hour < end; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }

      // Filter out booked slots
      const appointments = await this.getAppointments('scheduled');
      const bookedSlots = appointments
        .filter(apt => {
          const aptDate = new Date(apt.scheduledTime);
          return apt.providerId === providerId &&
                 aptDate.toDateString() === date.toDateString();
        })
        .map(apt => {
          const aptTime = new Date(apt.scheduledTime);
          return `${aptTime.getHours().toString().padStart(2, '0')}:${aptTime.getMinutes().toString().padStart(2, '0')}`;
        });

      return slots.filter(slot => !bookedSlots.includes(slot));
    } catch (error) {
      console.error('Error getting provider availability:', error);
      return [];
    }
  }

  static async getAvailableProviders(): Promise<HealthcareProvider[]> {
    try {
      const providers = await this.getHealthcareProviders();
      return providers.filter(p => p.isAvailable);
    } catch (error) {
      console.error('Error getting available providers:', error);
      return [];
    }
  }

  static async checkEmergencyTriggers(): Promise<boolean> {
    try {
      // In a real implementation, this would check various health metrics
      // and patterns to determine if emergency intervention is needed
      
      // Mock emergency detection logic
      const healthMetrics = await this.getCurrentHealthMetrics();
      
      // Check for critical vital signs
      if (healthMetrics.heartRate > 120 || healthMetrics.heartRate < 50) {
        return true;
      }
      
      if (healthMetrics.bloodPressure.systolic > 180 || healthMetrics.bloodPressure.systolic < 90) {
        return true;
      }
      
      // Check for emergency keywords in recent interactions
      const recentNotes = await this.getRecentPatientNotes();
      const emergencyKeywords = ['emergency', 'urgent', 'chest pain', 'difficulty breathing', 'severe pain'];
      
      for (const note of recentNotes) {
        for (const keyword of emergencyKeywords) {
          if (note.toLowerCase().includes(keyword)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking emergency triggers:', error);
      return false;
    }
  }

  static async initiateCall(providerId: string, type: Appointment['type']): Promise<VideoCallSession> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      if (!provider.isAvailable) {
        throw new Error('Provider is not available');
      }

      const callSession: VideoCallSession = {
        id: Date.now().toString(),
        appointmentId: '', // Will be set if this is for a scheduled appointment
        startTime: new Date(),
        participants: [providerId, 'patient'],
        status: 'waiting',
        quality: 'excellent',
        issues: [],
      };

      // Save the call session
      await this.saveCallSession(callSession);
      
      // In a real implementation, this would initiate the actual video call
      console.log(`Initiating ${type} call with provider ${provider.name}`);
      
      return callSession;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  static async callEmergencyServices(): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Contact emergency services (911)
      // 2. Send location data
      // 3. Provide medical history summary
      // 4. Notify emergency contacts
      
      console.log('Calling emergency services...');
      
      // Notify emergency contacts
      const emergencyContacts = await this.getEmergencyContacts();
      for (const contact of emergencyContacts) {
        await this.notifyEmergencyContact(contact, 'Emergency call initiated');
      }
      
      // Log the emergency call
      await this.logEmergencyCall();
      
    } catch (error) {
      console.error('Error calling emergency services:', error);
      throw error;
    }
  }

  static async endCall(callId: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(callId);
      if (!callSession) {
        throw new Error('Call session not found');
      }

      callSession.endTime = new Date();
      callSession.status = 'ended';
      
      await this.updateCallSession(callSession);
      
      console.log(`Call ${callId} ended`);
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  static async sendHealthSummary(providerId: string): Promise<void> {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      // Gather health data summary
      const healthSummary = await this.generateHealthSummary();
      
      // In a real implementation, this would send the summary via secure channels
      console.log(`Sending health summary to ${provider.name}:`, healthSummary);
      
      // Log the transmission
      await this.logHealthSummaryTransmission(providerId, healthSummary);
      
    } catch (error) {
      console.error('Error sending health summary:', error);
      throw error;
    }
  }

  // Helper methods
  private static async getCurrentHealthMetrics(): Promise<any> {
    // Mock health metrics
    return {
      heartRate: 72,
      bloodPressure: { systolic: 120, diastolic: 80 },
      temperature: 98.6,
      oxygenSaturation: 98,
    };
  }

  private static async getRecentPatientNotes(): Promise<string[]> {
    // Mock patient notes
    return [
      'Patient reports feeling well today',
      'Completed medication as prescribed',
      'No adverse symptoms reported',
    ];
  }

  private static async saveCallSession(session: VideoCallSession): Promise<void> {
    try {
      const sessions = await StorageService.getItem<VideoCallSession[]>('call_sessions') || [];
      sessions.push(session);
      await StorageService.setItem('call_sessions', sessions);
    } catch (error) {
      console.error('Error saving call session:', error);
    }
  }

  private static async getCallSession(callId: string): Promise<VideoCallSession | null> {
    try {
      const sessions = await StorageService.getItem<VideoCallSession[]>('call_sessions') || [];
      return sessions.find(s => s.id === callId) || null;
    } catch (error) {
      console.error('Error getting call session:', error);
      return null;
    }
  }

  private static async updateCallSession(session: VideoCallSession): Promise<void> {
    try {
      const sessions = await StorageService.getItem<VideoCallSession[]>('call_sessions') || [];
      const index = sessions.findIndex(s => s.id === session.id);
      if (index !== -1) {
        sessions[index] = session;
        await StorageService.setItem('call_sessions', sessions);
      }
    } catch (error) {
      console.error('Error updating call session:', error);
    }
  }

  private static async notifyEmergencyContact(contact: EmergencyContact, message: string): Promise<void> {
    try {
      // In a real implementation, this would send SMS, email, or push notification
      console.log(`Notifying emergency contact ${contact.name}: ${message}`);
    } catch (error) {
      console.error('Error notifying emergency contact:', error);
    }
  }

  private static async logEmergencyCall(): Promise<void> {
    try {
      const logs = await StorageService.getItem<any[]>('emergency_logs') || [];
      logs.push({
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'emergency_call',
        details: 'Emergency services contacted via smart mirror',
      });
      await StorageService.setItem('emergency_logs', logs);
    } catch (error) {
      console.error('Error logging emergency call:', error);
    }
  }

  private static async generateHealthSummary(): Promise<any> {
    // Mock health summary
    return {
      patientId: 'patient_001',
      timestamp: new Date(),
      vitals: await this.getCurrentHealthMetrics(),
      medications: ['Medication A', 'Medication B'],
      recentSymptoms: [],
      moodTrend: 'stable',
      alerts: [],
    };
  }

  private static async logHealthSummaryTransmission(providerId: string, summary: any): Promise<void> {
    try {
      const logs = await StorageService.getItem<any[]>('health_summary_logs') || [];
      logs.push({
        id: Date.now().toString(),
        timestamp: new Date(),
        providerId,
        summaryId: summary.timestamp,
        type: 'health_summary_transmission',
      });
      await StorageService.setItem('health_summary_logs', logs);
    } catch (error) {
      console.error('Error logging health summary transmission:', error);
    }
  }
}
