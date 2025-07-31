/**
 * Medication Service
 * Handles medication schedules, reminders, and tracking
 */

import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: 'once' | 'twice' | 'three_times' | 'four_times' | 'as_needed';
  schedule: string[]; // Array of times like ['08:00', '20:00']
  nextDose: Date;
  taken: boolean;
  color: string;
  notes?: string;
  prescribedBy?: string;
  startDate: Date;
  endDate?: Date;
  sideEffects?: string[];
  instructions?: string;
}

interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'taken' | 'skipped' | 'missed';
  notes?: string;
  sideEffectsExperienced?: string[];
}

export class MedicationService {
  static async getMedications(): Promise<Medication[]> {
    try {
      const medications = await StorageService.getMedications();
      return medications.map(med => ({
        ...med,
        nextDose: new Date(med.nextDose),
        startDate: new Date(med.startDate),
        endDate: med.endDate ? new Date(med.endDate) : undefined,
      }));
    } catch (error) {
      console.error('Error getting medications:', error);
      return [];
    }
  }

  static async addMedication(medication: Omit<Medication, 'id' | 'taken' | 'nextDose'>): Promise<string> {
    try {
      const id = Date.now().toString();
      const nextDose = this.calculateNextDose(medication.schedule);
      
      const newMedication: Medication = {
        ...medication,
        id,
        taken: false,
        nextDose,
      };

      await StorageService.addMedication(newMedication);
      
      // Schedule notifications for this medication
      await this.scheduleNotifications(newMedication);
      
      return id;
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  }

  static async updateMedication(id: string, updates: Partial<Medication>): Promise<void> {
    try {
      await StorageService.updateMedication(id, updates);
      
      // If schedule changed, update notifications
      if (updates.schedule) {
        const medication = await this.getMedicationById(id);
        if (medication) {
          await this.updateNotifications(medication);
        }
      }
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  }

  static async deleteMedication(id: string): Promise<void> {
    try {
      const medications = await StorageService.getMedications();
      const filtered = medications.filter(med => med.id !== id);
      await StorageService.setMedications(filtered);
      
      // Cancel notifications for this medication
      await this.cancelNotifications(id);
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }

  static async markAsTaken(medicationId: string): Promise<void> {
    try {
      const now = new Date();
      
      // Update medication status
      await StorageService.updateMedication(medicationId, { 
        taken: true,
        nextDose: await this.calculateNextDoseForMedication(medicationId),
      });
      
      // Log the medication intake
      await this.logMedicationIntake(medicationId, 'taken', now);
      
    } catch (error) {
      console.error('Error marking medication as taken:', error);
      throw error;
    }
  }

  static async markAsSkipped(medicationId: string, reason: string): Promise<void> {
    try {
      const now = new Date();
      
      // Update next dose time
      await StorageService.updateMedication(medicationId, {
        nextDose: await this.calculateNextDoseForMedication(medicationId),
      });
      
      // Log the skipped medication
      await this.logMedicationIntake(medicationId, 'skipped', now, reason);
      
    } catch (error) {
      console.error('Error marking medication as skipped:', error);
      throw error;
    }
  }

  private static async getMedicationById(id: string): Promise<Medication | null> {
    try {
      const medications = await this.getMedications();
      return medications.find(med => med.id === id) || null;
    } catch (error) {
      console.error('Error getting medication by ID:', error);
      return null;
    }
  }

  private static calculateNextDose(schedule: string[]): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find the next scheduled time today or tomorrow
    for (const timeStr of schedule.sort()) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      if (scheduledTime > now) {
        return scheduledTime;
      }
    }
    
    // No more doses today, schedule for tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [hours, minutes] = schedule[0].split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);
    
    return tomorrow;
  }

  private static async calculateNextDoseForMedication(medicationId: string): Promise<Date> {
    const medication = await this.getMedicationById(medicationId);
    if (!medication) {
      throw new Error('Medication not found');
    }
    
    return this.calculateNextDose(medication.schedule);
  }

  private static async scheduleNotifications(medication: Medication): Promise<void> {
    try {
      for (const timeStr of medication.schedule) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const notificationTime = new Date();
        notificationTime.setHours(hours, minutes, 0, 0);
        
        await NotificationService.scheduleMedicationReminder(
          medication.name,
          medication.dosage,
          notificationTime,
          true // repeat daily
        );
      }
    } catch (error) {
      console.error('Error scheduling medication notifications:', error);
    }
  }

  private static async updateNotifications(medication: Medication): Promise<void> {
    try {
      // Cancel existing notifications
      await this.cancelNotifications(medication.id);
      
      // Schedule new notifications
      await this.scheduleNotifications(medication);
    } catch (error) {
      console.error('Error updating medication notifications:', error);
    }
  }

  private static async cancelNotifications(medicationId: string): Promise<void> {
    try {
      // In a real implementation, you would need to track notification IDs
      // and cancel them individually
      console.log(`Canceling notifications for medication ${medicationId}`);
    } catch (error) {
      console.error('Error canceling medication notifications:', error);
    }
  }

  private static async logMedicationIntake(
    medicationId: string,
    status: 'taken' | 'skipped' | 'missed',
    time: Date,
    notes?: string
  ): Promise<void> {
    try {
      const log: MedicationLog = {
        id: Date.now().toString(),
        medicationId,
        scheduledTime: time, // This should be the actual scheduled time
        actualTime: status === 'taken' ? time : undefined,
        status,
        notes,
      };

      const existingLogs = await StorageService.getItem<MedicationLog[]>('medication_logs') || [];
      existingLogs.push(log);
      
      // Keep only last 1000 logs
      const trimmedLogs = existingLogs.slice(-1000);
      
      await StorageService.setItem('medication_logs', trimmedLogs);
    } catch (error) {
      console.error('Error logging medication intake:', error);
    }
  }

  static async getMedicationLogs(medicationId?: string, days?: number): Promise<MedicationLog[]> {
    try {
      const logs = await StorageService.getItem<MedicationLog[]>('medication_logs') || [];
      
      let filteredLogs = logs;
      
      if (medicationId) {
        filteredLogs = filteredLogs.filter(log => log.medicationId === medicationId);
      }
      
      if (days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.scheduledTime) > cutoffDate
        );
      }
      
      return filteredLogs.sort((a, b) => 
        new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
      );
    } catch (error) {
      console.error('Error getting medication logs:', error);
      return [];
    }
  }

  static async getAdherenceRate(medicationId?: string, days = 30): Promise<number> {
    try {
      const logs = await this.getMedicationLogs(medicationId, days);
      
      if (logs.length === 0) return 1; // Perfect adherence if no data
      
      const takenCount = logs.filter(log => log.status === 'taken').length;
      const totalCount = logs.length;
      
      return takenCount / totalCount;
    } catch (error) {
      console.error('Error calculating adherence rate:', error);
      return 0;
    }
  }

  static async getMissedMedications(): Promise<Medication[]> {
    try {
      const medications = await this.getMedications();
      const now = new Date();
      
      return medications.filter(medication => 
        !medication.taken && 
        medication.nextDose < now &&
        (now.getTime() - medication.nextDose.getTime()) > 3600000 // More than 1 hour late
      );
    } catch (error) {
      console.error('Error getting missed medications:', error);
      return [];
    }
  }

  static async getUpcomingMedications(hours = 2): Promise<Medication[]> {
    try {
      const medications = await this.getMedications();
      const now = new Date();
      const futureTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
      
      return medications.filter(medication => 
        !medication.taken && 
        medication.nextDose >= now &&
        medication.nextDose <= futureTime
      );
    } catch (error) {
      console.error('Error getting upcoming medications:', error);
      return [];
    }
  }

  static async resetDailyMedications(): Promise<void> {
    try {
      // This should be called daily to reset medication status
      const medications = await this.getMedications();
      
      for (const medication of medications) {
        await StorageService.updateMedication(medication.id, {
          taken: false,
          nextDose: this.calculateNextDose(medication.schedule),
        });
      }
    } catch (error) {
      console.error('Error resetting daily medications:', error);
    }
  }
}
