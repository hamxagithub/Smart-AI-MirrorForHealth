/**
 * Caregiver Service
 * Handles caregiver communication, alerts, and remote monitoring
 */

import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';

interface Caregiver {
  id: string;
  name: string;
  relationship: 'family' | 'friend' | 'professional' | 'healthcare_provider';
  email?: string;
  phone?: string;
  isEmergencyContact: boolean;
  isPrimary: boolean;
  permissions: CaregiverPermission[];
  avatar?: string;
  notes?: string;
  lastContact?: Date;
}

interface CaregiverPermission {
  type: 'health_data' | 'medication' | 'emergency_alerts' | 'daily_reports' | 'vital_signs' | 'mood_tracking';
  granted: boolean;
  grantedDate: Date;
}

interface CaregiverAlert {
  id: string;
  caregiverId: string;
  type: 'emergency' | 'health_concern' | 'medication_missed' | 'daily_report' | 'vital_signs_critical';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
  data?: any;
  actionRequired?: boolean;
}

interface DailyReport {
  id: string;
  date: Date;
  patientName: string;
  overallHealthScore: number;
  medicationAdherence: number;
  moodAverage: number;
  painAverage: number;
  sleepQuality: number;
  energyLevel: number;
  keyEvents: string[];
  concerns: string[];
  recommendations: string[];
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
  };
}

export class CaregiverService {
  static async addCaregiver(caregiver: Omit<Caregiver, 'id' | 'lastContact'>): Promise<string> {
    try {
      const id = Date.now().toString();
      const newCaregiver: Caregiver = {
        ...caregiver,
        id,
        lastContact: undefined,
      };

      const caregivers = await this.getCaregivers();
      caregivers.push(newCaregiver);
      
      await StorageService.setItem('caregivers', caregivers);
      
      return id;
    } catch (error) {
      console.error('Error adding caregiver:', error);
      throw error;
    }
  }

  static async getCaregivers(): Promise<Caregiver[]> {
    try {
      return await StorageService.getItem<Caregiver[]>('caregivers') || [];
    } catch (error) {
      console.error('Error getting caregivers:', error);
      return [];
    }
  }

  static async getCaregiver(id: string): Promise<Caregiver | null> {
    try {
      const caregivers = await this.getCaregivers();
      return caregivers.find(c => c.id === id) || null;
    } catch (error) {
      console.error('Error getting caregiver:', error);
      return null;
    }
  }

  static async updateCaregiver(id: string, updates: Partial<Caregiver>): Promise<void> {
    try {
      const caregivers = await this.getCaregivers();
      const index = caregivers.findIndex(c => c.id === id);
      
      if (index === -1) {
        throw new Error('Caregiver not found');
      }

      caregivers[index] = { ...caregivers[index], ...updates };
      await StorageService.setItem('caregivers', caregivers);
    } catch (error) {
      console.error('Error updating caregiver:', error);
      throw error;
    }
  }

  static async removeCaregiver(id: string): Promise<void> {
    try {
      const caregivers = await this.getCaregivers();
      const filtered = caregivers.filter(c => c.id !== id);
      await StorageService.setItem('caregivers', filtered);
    } catch (error) {
      console.error('Error removing caregiver:', error);
      throw error;
    }
  }

  static async sendAlert(
    type: CaregiverAlert['type'],
    title: string,
    message: string,
    priority: CaregiverAlert['priority'],
    data?: any,
    targetCaregivers?: string[]
  ): Promise<void> {
    try {
      const caregivers = await this.getCaregivers();
      const eligibleCaregivers = targetCaregivers 
        ? caregivers.filter(c => targetCaregivers.includes(c.id))
        : caregivers.filter(c => this.hasPermissionForAlert(c, type));

      for (const caregiver of eligibleCaregivers) {
        const alert: CaregiverAlert = {
          id: Date.now().toString() + '_' + caregiver.id,
          caregiverId: caregiver.id,
          type,
          title,
          message,
          priority,
          timestamp: new Date(),
          acknowledged: false,
          data,
          actionRequired: priority === 'critical' || type === 'emergency',
        };

        await this.saveAlert(alert);
        await this.deliverAlert(caregiver, alert);
      }
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }

  static async getAlertsForCaregiver(caregiverId: string, days = 30): Promise<CaregiverAlert[]> {
    try {
      const alerts = await StorageService.getItem<CaregiverAlert[]>('caregiver_alerts') || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return alerts
        .filter(alert => 
          alert.caregiverId === caregiverId && 
          new Date(alert.timestamp) > cutoffDate
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error getting alerts for caregiver:', error);
      return [];
    }
  }

  static async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const alerts = await StorageService.getItem<CaregiverAlert[]>('caregiver_alerts') || [];
      const alertIndex = alerts.findIndex(a => a.id === alertId);
      
      if (alertIndex !== -1) {
        alerts[alertIndex].acknowledged = true;
        await StorageService.setItem('caregiver_alerts', alerts);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  }

  static async generateDailyReport(date: Date = new Date()): Promise<DailyReport> {
    try {
      // This would integrate with other services to gather data
      const report: DailyReport = {
        id: Date.now().toString(),
        date,
        patientName: await this.getPatientName(),
        overallHealthScore: await this.getHealthScore(date),
        medicationAdherence: await this.getMedicationAdherence(date),
        moodAverage: await this.getMoodAverage(date),
        painAverage: await this.getPainAverage(date),
        sleepQuality: await this.getSleepQuality(date),
        energyLevel: await this.getEnergyLevel(date),
        keyEvents: await this.getKeyEvents(date),
        concerns: await this.getConcerns(date),
        recommendations: await this.getRecommendations(date),
        vitalSigns: await this.getLatestVitalSigns(),
      };

      await this.saveDailyReport(report);
      return report;
    } catch (error) {
      console.error('Error generating daily report:', error);
      throw error;
    }
  }

  static async sendDailyReport(date: Date = new Date()): Promise<void> {
    try {
      const report = await this.generateDailyReport(date);
      const caregivers = await this.getCaregivers();
      const eligibleCaregivers = caregivers.filter(c => 
        this.hasPermissionForAlert(c, 'daily_report')
      );

      for (const caregiver of eligibleCaregivers) {
        await this.deliverDailyReport(caregiver, report);
      }
    } catch (error) {
      console.error('Error sending daily report:', error);
    }
  }

  static async getEmergencyContacts(): Promise<Caregiver[]> {
    try {
      const caregivers = await this.getCaregivers();
      return caregivers
        .filter(c => c.isEmergencyContact)
        .sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return 0;
        });
    } catch (error) {
      console.error('Error getting emergency contacts:', error);
      return [];
    }
  }

  static async notifyEmergencyContacts(
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const emergencyContacts = await this.getEmergencyContacts();
      
      for (const contact of emergencyContacts) {
        await this.sendAlert(
          'emergency',
          title,
          message,
          'critical',
          data,
          [contact.id]
        );
      }
    } catch (error) {
      console.error('Error notifying emergency contacts:', error);
    }
  }

  static async updatePermissions(
    caregiverId: string,
    permissions: CaregiverPermission[]
  ): Promise<void> {
    try {
      await this.updateCaregiver(caregiverId, { permissions });
    } catch (error) {
      console.error('Error updating permissions:', error);
      throw error;
    }
  }

  static async recordContact(caregiverId: string): Promise<void> {
    try {
      await this.updateCaregiver(caregiverId, { lastContact: new Date() });
    } catch (error) {
      console.error('Error recording contact:', error);
    }
  }

  private static hasPermissionForAlert(
    caregiver: Caregiver,
    alertType: CaregiverAlert['type']
  ): boolean {
    const permissionMap: Record<CaregiverAlert['type'], CaregiverPermission['type']> = {
      'emergency': 'emergency_alerts',
      'health_concern': 'health_data',
      'medication_missed': 'medication',
      'daily_report': 'daily_reports',
      'vital_signs_critical': 'vital_signs',
    };

    const requiredPermission = permissionMap[alertType];
    if (!requiredPermission) return false;

    return caregiver.permissions.some(p => 
      p.type === requiredPermission && p.granted
    );
  }

  private static async saveAlert(alert: CaregiverAlert): Promise<void> {
    try {
      const alerts = await StorageService.getItem<CaregiverAlert[]>('caregiver_alerts') || [];
      alerts.push(alert);
      
      // Keep only last 1000 alerts
      const trimmed = alerts.slice(-1000);
      await StorageService.setItem('caregiver_alerts', trimmed);
    } catch (error) {
      console.error('Error saving alert:', error);
    }
  }

  private static async deliverAlert(caregiver: Caregiver, alert: CaregiverAlert): Promise<void> {
    try {
      // In a real implementation, this would send email, SMS, push notification, etc.
      console.log(`Delivering alert to ${caregiver.name}:`, alert);
      
      // For now, just use local notifications
      await NotificationService.sendLocalNotification(
        alert.title,
        alert.message,
        alert.priority,
        alert.data
      );
    } catch (error) {
      console.error('Error delivering alert:', error);
    }
  }

  private static async deliverDailyReport(caregiver: Caregiver, report: DailyReport): Promise<void> {
    try {
      const message = `Daily report for ${report.patientName}: Health Score ${report.overallHealthScore}/10, Medication Adherence ${Math.round(report.medicationAdherence * 100)}%`;
      
      await this.deliverAlert(caregiver, {
        id: `daily_report_${report.id}_${caregiver.id}`,
        caregiverId: caregiver.id,
        type: 'daily_report',
        title: 'Daily Health Report',
        message,
        priority: 'low',
        timestamp: new Date(),
        acknowledged: false,
        data: report,
        actionRequired: false,
      });
    } catch (error) {
      console.error('Error delivering daily report:', error);
    }
  }

  private static async saveDailyReport(report: DailyReport): Promise<void> {
    try {
      const reports = await StorageService.getItem<DailyReport[]>('daily_reports') || [];
      reports.push(report);
      
      // Keep only last 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const filtered = reports.filter(r => new Date(r.date) > cutoffDate);
      
      await StorageService.setItem('daily_reports', filtered);
    } catch (error) {
      console.error('Error saving daily report:', error);
    }
  }

  // Helper methods for data gathering (would integrate with other services)
  private static async getPatientName(): Promise<string> {
    try {
      const patientInfo = await StorageService.getItem<any>('patient_info');
      return patientInfo?.name || 'Patient';
    } catch (error) {
      return 'Patient';
    }
  }

  private static async getHealthScore(date: Date): Promise<number> {
    // Would integrate with HealthCheckService
    return 7; // Mock value
  }

  private static async getMedicationAdherence(date: Date): Promise<number> {
    // Would integrate with MedicationService
    return 0.85; // Mock value (85%)
  }

  private static async getMoodAverage(date: Date): Promise<number> {
    // Would integrate with health check data
    return 6; // Mock value
  }

  private static async getPainAverage(date: Date): Promise<number> {
    // Would integrate with health check data
    return 4; // Mock value
  }

  private static async getSleepQuality(date: Date): Promise<number> {
    // Would integrate with health check data
    return 7; // Mock value
  }

  private static async getEnergyLevel(date: Date): Promise<number> {
    // Would integrate with health check data
    return 6; // Mock value
  }

  private static async getKeyEvents(date: Date): Promise<string[]> {
    // Would integrate with various services
    return [
      'Completed morning medication',
      'Participated in breathing exercise',
      'Health check-in completed',
    ];
  }

  private static async getConcerns(date: Date): Promise<string[]> {
    // Would analyze data for concerns
    return [];
  }

  private static async getRecommendations(date: Date): Promise<string[]> {
    // Would generate based on data analysis
    return [
      'Continue current medication schedule',
      'Consider gentle exercise routine',
    ];
  }

  private static async getLatestVitalSigns(): Promise<DailyReport['vitalSigns']> {
    // Would integrate with HealthCheckService
    return {
      bloodPressure: '120/80',
      heartRate: 72,
      temperature: 98.6,
      weight: 150,
    };
  }

  static async getDailyReports(days = 30): Promise<DailyReport[]> {
    try {
      const reports = await StorageService.getItem<DailyReport[]>('daily_reports') || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return reports
        .filter(report => new Date(report.date) > cutoffDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting daily reports:', error);
      return [];
    }
  }

  static async getUnacknowledgedAlerts(): Promise<CaregiverAlert[]> {
    try {
      const alerts = await StorageService.getItem<CaregiverAlert[]>('caregiver_alerts') || [];
      return alerts.filter(alert => !alert.acknowledged);
    } catch (error) {
      console.error('Error getting unacknowledged alerts:', error);
      return [];
    }
  }

  static async notifyMedicationDue(medication: any): Promise<void> {
    try {
      await this.sendAlert(
        'medication_missed',
        'Medication Reminder',
        `Time to take ${medication.name} (${medication.dosage})`,
        'medium',
        { medicationId: medication.id, medication }
      );
    } catch (error) {
      console.error('Error notifying medication due:', error);
    }
  }

  static async notifyMedicationSkipped(medicationId: string, reason: string): Promise<void> {
    try {
      await this.sendAlert(
        'medication_missed',
        'Medication Skipped',
        `Medication was skipped. Reason: ${reason}`,
        'medium',
        { medicationId, reason }
      );
    } catch (error) {
      console.error('Error notifying medication skipped:', error);
    }
  }

  static async checkAndNotifyHealthConcerns(data: any): Promise<void> {
    try {
      const concerns: string[] = [];
      
      // Check for concerning health data
      if (data.painLevel && data.painLevel > 7) {
        concerns.push(`High pain level reported: ${data.painLevel}/10`);
      }
      
      if (data.overallFeeling === 'poor') {
        concerns.push('Patient reported feeling poor overall');
      }
      
      if (data.symptoms && data.symptoms.length > 3) {
        concerns.push(`Multiple symptoms reported: ${data.symptoms.join(', ')}`);
      }
      
      // Check vital signs if available
      if (data.vitalSigns) {
        const vitals = data.vitalSigns;
        
        if (vitals.heartRate && (vitals.heartRate.bpm > 120 || vitals.heartRate.bpm < 50)) {
          concerns.push(`Abnormal heart rate: ${vitals.heartRate.bpm} BPM`);
        }
        
        if (vitals.bloodPressure && (vitals.bloodPressure.systolic > 180 || vitals.bloodPressure.diastolic > 110)) {
          concerns.push(`High blood pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`);
        }
        
        if (vitals.temperature && vitals.temperature.value > 101) {
          concerns.push(`Elevated temperature: ${vitals.temperature.value}°${vitals.temperature.unit}`);
        }
      }
      
      // Send alerts for each concern
      for (const concern of concerns) {
        await this.sendAlert(
          'health_concern',
          'Health Concern Detected',
          concern,
          concerns.length > 2 ? 'high' : 'medium',
          data
        );
      }
    } catch (error) {
      console.error('Error checking and notifying health concerns:', error);
    }
  }
}
