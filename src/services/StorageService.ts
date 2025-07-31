/**
 * Storage Service
 * Handles local data storage and retrieval
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  private static readonly KEYS = {
    USER_PROFILE: 'user_profile',
    EMOTION_HISTORY: 'emotion_history',
    HEALTH_DATA: 'health_data',
    MEDICATIONS: 'medications',
    EMERGENCY_CONTACTS: 'emergency_contacts',
    WELLNESS_PREFERENCES: 'wellness_preferences',
    SETTINGS: 'app_settings',
    CAREGIVER_CONTACTS: 'caregiver_contacts',
    APPOINTMENTS: 'appointments',
    HEALTH_REPORTS: 'health_reports',
  };

  static async initialize(): Promise<void> {
    try {
      // Initialize default settings if they don't exist
      const settings = await this.getSettings();
      if (!settings) {
        await this.setSettings({
          emotionAnalysisEnabled: true,
          voiceCommandsEnabled: true,
          notificationsEnabled: true,
          emergencyContactsEnabled: true,
          privacyMode: false,
          dataRetentionDays: 30,
        });
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
      throw error;
    }
  }

  // Generic storage methods
  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  }

  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // User Profile
  static async getUserProfile(): Promise<any> {
    return this.getItem(this.KEYS.USER_PROFILE);
  }

  static async setUserProfile(profile: any): Promise<void> {
    return this.setItem(this.KEYS.USER_PROFILE, profile);
  }

  // Emotion History
  static async getEmotionHistory(): Promise<any[]> {
    const history = await this.getItem<any[]>(this.KEYS.EMOTION_HISTORY);
    return history || [];
  }

  static async setEmotionHistory(history: any[]): Promise<void> {
    return this.setItem(this.KEYS.EMOTION_HISTORY, history);
  }

  static async addEmotionEntry(entry: any): Promise<void> {
    const history = await this.getEmotionHistory();
    history.push(entry);
    
    // Keep only last 1000 entries
    const trimmedHistory = history.slice(-1000);
    return this.setEmotionHistory(trimmedHistory);
  }

  // Health Data
  static async getHealthData(): Promise<any> {
    return this.getItem(this.KEYS.HEALTH_DATA);
  }

  static async setHealthData(data: any): Promise<void> {
    return this.setItem(this.KEYS.HEALTH_DATA, data);
  }

  static async addHealthEntry(entry: any): Promise<void> {
    const data = await this.getHealthData() || { entries: [] };
    data.entries.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    
    // Keep only last 500 entries
    data.entries = data.entries.slice(-500);
    return this.setHealthData(data);
  }

  // Medications
  static async getMedications(): Promise<any[]> {
    const medications = await this.getItem<any[]>(this.KEYS.MEDICATIONS);
    return medications || [];
  }

  static async setMedications(medications: any[]): Promise<void> {
    return this.setItem(this.KEYS.MEDICATIONS, medications);
  }

  static async addMedication(medication: any): Promise<void> {
    const medications = await this.getMedications();
    medications.push({
      ...medication,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    return this.setMedications(medications);
  }

  static async updateMedication(id: string, updates: any): Promise<void> {
    const medications = await this.getMedications();
    const index = medications.findIndex(med => med.id === id);
    if (index !== -1) {
      medications[index] = { ...medications[index], ...updates };
      return this.setMedications(medications);
    }
  }

  // Emergency Contacts
  static async getEmergencyContacts(): Promise<any[]> {
    const contacts = await this.getItem<any[]>(this.KEYS.EMERGENCY_CONTACTS);
    return contacts || [];
  }

  static async setEmergencyContacts(contacts: any[]): Promise<void> {
    return this.setItem(this.KEYS.EMERGENCY_CONTACTS, contacts);
  }

  static async addEmergencyContact(contact: any): Promise<void> {
    const contacts = await this.getEmergencyContacts();
    contacts.push({
      ...contact,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    return this.setEmergencyContacts(contacts);
  }

  // Wellness Preferences
  static async getWellnessPreferences(): Promise<any> {
    return this.getItem(this.KEYS.WELLNESS_PREFERENCES);
  }

  static async setWellnessPreferences(preferences: any): Promise<void> {
    return this.setItem(this.KEYS.WELLNESS_PREFERENCES, preferences);
  }

  // App Settings
  static async getSettings(): Promise<any> {
    return this.getItem(this.KEYS.SETTINGS);
  }

  static async setSettings(settings: any): Promise<void> {
    return this.setItem(this.KEYS.SETTINGS, settings);
  }

  static async updateSettings(updates: any): Promise<void> {
    const currentSettings = await this.getSettings() || {};
    const updatedSettings = { ...currentSettings, ...updates };
    return this.setSettings(updatedSettings);
  }

  // Caregiver Contacts
  static async getCaregiverContacts(): Promise<any[]> {
    const contacts = await this.getItem<any[]>(this.KEYS.CAREGIVER_CONTACTS);
    return contacts || [];
  }

  static async setCaregiverContacts(contacts: any[]): Promise<void> {
    return this.setItem(this.KEYS.CAREGIVER_CONTACTS, contacts);
  }

  // Appointments
  static async getAppointments(): Promise<any[]> {
    const appointments = await this.getItem<any[]>(this.KEYS.APPOINTMENTS);
    return appointments || [];
  }

  static async setAppointments(appointments: any[]): Promise<void> {
    return this.setItem(this.KEYS.APPOINTMENTS, appointments);
  }

  static async addAppointment(appointment: any): Promise<void> {
    const appointments = await this.getAppointments();
    appointments.push({
      ...appointment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    return this.setAppointments(appointments);
  }

  // Health Reports
  static async getHealthReports(): Promise<any[]> {
    const reports = await this.getItem<any[]>(this.KEYS.HEALTH_REPORTS);
    return reports || [];
  }

  static async setHealthReports(reports: any[]): Promise<void> {
    return this.setItem(this.KEYS.HEALTH_REPORTS, reports);
  }

  static async addHealthReport(report: any): Promise<void> {
    const reports = await this.getHealthReports();
    reports.push({
      ...report,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    
    // Keep only last 50 reports
    const trimmedReports = reports.slice(-50);
    return this.setHealthReports(trimmedReports);
  }

  // Data cleanup methods
  static async cleanupOldData(): Promise<void> {
    try {
      const settings = await this.getSettings();
      const retentionDays = settings?.dataRetentionDays || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean emotion history
      const emotionHistory = await this.getEmotionHistory();
      const filteredEmotions = emotionHistory.filter(entry => 
        new Date(entry.timestamp) > cutoffDate
      );
      await this.setEmotionHistory(filteredEmotions);

      // Clean health data
      const healthData = await this.getHealthData();
      if (healthData?.entries) {
        healthData.entries = healthData.entries.filter((entry: any) => 
          new Date(entry.timestamp) > cutoffDate
        );
        await this.setHealthData(healthData);
      }

      console.log('Data cleanup completed');
    } catch (error) {
      console.error('Error during data cleanup:', error);
    }
  }

  // Export data for backup or sharing
  static async exportData(): Promise<any> {
    try {
      const data = {
        userProfile: await this.getUserProfile(),
        emotionHistory: await this.getEmotionHistory(),
        healthData: await this.getHealthData(),
        medications: await this.getMedications(),
        emergencyContacts: await this.getEmergencyContacts(),
        wellnessPreferences: await this.getWellnessPreferences(),
        settings: await this.getSettings(),
        caregiverContacts: await this.getCaregiverContacts(),
        appointments: await this.getAppointments(),
        healthReports: await this.getHealthReports(),
        exportedAt: new Date().toISOString(),
      };
      
      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Import data from backup
  static async importData(data: any): Promise<void> {
    try {
      if (data.userProfile) await this.setUserProfile(data.userProfile);
      if (data.emotionHistory) await this.setEmotionHistory(data.emotionHistory);
      if (data.healthData) await this.setHealthData(data.healthData);
      if (data.medications) await this.setMedications(data.medications);
      if (data.emergencyContacts) await this.setEmergencyContacts(data.emergencyContacts);
      if (data.wellnessPreferences) await this.setWellnessPreferences(data.wellnessPreferences);
      if (data.settings) await this.setSettings(data.settings);
      if (data.caregiverContacts) await this.setCaregiverContacts(data.caregiverContacts);
      if (data.appointments) await this.setAppointments(data.appointments);
      if (data.healthReports) await this.setHealthReports(data.healthReports);
      
      console.log('Data import completed');
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
}
