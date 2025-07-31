/**
 * Voice Command Service
 * Processes and interprets voice commands using natural language processing
 */

import Voice from '@react-native-community/voice';
import Tts from 'react-native-tts';
import { StorageService } from './StorageService';

interface VoiceCommand {
  intent: string;
  parameters: { [key: string]: string };
  confidence: number;
}

export class VoiceCommandService {
  private static readonly commandPatterns = [
    // Greetings
    {
      patterns: ['hello', 'hi', 'hey mirror', 'good morning', 'good afternoon', 'good evening'],
      intent: 'greeting',
      confidence: 0.9,
    },
    
    // Wellness commands
    {
      patterns: ['how am i doing', 'check my wellness', 'wellness status', 'how do i look'],
      intent: 'wellness_check',
      confidence: 0.8,
    },
    
    // Medication reminders
    {
      patterns: ['medication time', 'pill reminder', 'check my medications', 'medicine schedule'],
      intent: 'medication_reminder',
      confidence: 0.9,
    },
    
    // Breathing exercises
    {
      patterns: ['breathing exercise', 'help me breathe', 'relaxation', 'calm me down', 'stress relief'],
      intent: 'breathing_exercise',
      confidence: 0.8,
    },
    
    // Mood check
    {
      patterns: ['how do i feel', 'check my mood', 'mood analysis', 'emotional state'],
      intent: 'mood_check',
      confidence: 0.8,
    },
    
    // Emergency
    {
      patterns: ['emergency', 'help me', 'i need help', 'call for help', 'urgent'],
      intent: 'emergency',
      confidence: 0.95,
    },
    
    // Caregiver contact
    {
      patterns: ['call my caregiver', 'contact caregiver', 'call family', 'call doctor'],
      intent: 'call_caregiver',
      confidence: 0.9,
    },
    
    // Health report
    {
      patterns: ['health report', 'health summary', 'my health data', 'show health stats'],
      intent: 'health_report',
      confidence: 0.8,
    },
    
    // Music therapy
    {
      patterns: ['play music', 'relaxing music', 'music therapy', 'calming sounds'],
      intent: 'music_therapy',
      confidence: 0.7,
    },
    
    // Appointment scheduling
    {
      patterns: ['schedule appointment', 'book appointment', 'make appointment', 'see doctor'],
      intent: 'schedule_appointment',
      confidence: 0.8,
    },
    
    // Mindfulness
    {
      patterns: ['mindfulness', 'meditation', 'guided meditation', 'mindful moment'],
      intent: 'mindfulness',
      confidence: 0.8,
    },
  ];

  static async parseCommand(text: string): Promise<VoiceCommand | null> {
    try {
      const normalizedText = text.toLowerCase().trim();
      
      // Find the best matching pattern
      let bestMatch: VoiceCommand | null = null;
      let highestConfidence = 0;

      for (const command of this.commandPatterns) {
        for (const pattern of command.patterns) {
          const confidence = this.calculateSimilarity(normalizedText, pattern);
          
          if (confidence > highestConfidence && confidence > 0.5) {
            highestConfidence = confidence;
            bestMatch = {
              intent: command.intent,
              parameters: this.extractParameters(normalizedText, pattern),
              confidence: confidence * command.confidence,
            };
          }
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Error parsing voice command:', error);
      return null;
    }
  }

  private static calculateSimilarity(text: string, pattern: string): number {
    // Simple similarity calculation using word overlap
    const textWords = text.split(' ');
    const patternWords = pattern.split(' ');
    
    let matches = 0;
    let totalWords = Math.max(textWords.length, patternWords.length);
    
    for (const word of textWords) {
      if (patternWords.includes(word)) {
        matches++;
      }
    }
    
    // Bonus for exact phrase match
    if (text.includes(pattern)) {
      matches += patternWords.length;
      totalWords += patternWords.length;
    }
    
    return totalWords > 0 ? matches / totalWords : 0;
  }

  private static extractParameters(text: string, pattern: string): { [key: string]: string } {
    const parameters: { [key: string]: string } = {};
    
    // Extract time-related parameters
    const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      parameters.time = timeMatch[0];
    }
    
    // Extract emotion-related parameters
    const emotions = ['happy', 'sad', 'angry', 'stressed', 'anxious', 'calm', 'excited'];
    for (const emotion of emotions) {
      if (text.includes(emotion)) {
        parameters.emotion = emotion;
        break;
      }
    }
    
    // Extract medication names (simple pattern)
    const medicationRegex = /take (\w+)|(\w+) medication/i;
    const medicationMatch = text.match(medicationRegex);
    if (medicationMatch) {
      parameters.medication = medicationMatch[1] || medicationMatch[2];
    }
    
    // Extract contact types
    const contacts = ['doctor', 'caregiver', 'family', 'emergency', 'therapist'];
    for (const contact of contacts) {
      if (text.includes(contact)) {
        parameters.contactType = contact;
        break;
      }
    }
    
    return parameters;
  }

  static getAvailableCommands(): Array<{
    intent: string;
    description: string;
    examples: string[];
  }> {
    return [
      {
        intent: 'greeting',
        description: 'Start a conversation with the mirror',
        examples: ['Hello', 'Hey Mirror', 'Good morning'],
      },
      {
        intent: 'wellness_check',
        description: 'Check your current wellness status',
        examples: ['How am I doing?', 'Check my wellness', 'Wellness status'],
      },
      {
        intent: 'medication_reminder',
        description: 'Get medication reminders and schedule',
        examples: ['Medication time', 'Check my medications', 'Medicine schedule'],
      },
      {
        intent: 'breathing_exercise',
        description: 'Start a guided breathing exercise',
        examples: ['Breathing exercise', 'Help me relax', 'Stress relief'],
      },
      {
        intent: 'mood_check',
        description: 'Analyze your current emotional state',
        examples: ['How do I feel?', 'Check my mood', 'Emotional state'],
      },
      {
        intent: 'emergency',
        description: 'Emergency assistance and contacts',
        examples: ['Emergency', 'I need help', 'Call for help'],
      },
      {
        intent: 'call_caregiver',
        description: 'Contact your caregiver or family',
        examples: ['Call my caregiver', 'Contact family', 'Call doctor'],
      },
      {
        intent: 'health_report',
        description: 'View your health data and reports',
        examples: ['Health report', 'Health summary', 'Show health stats'],
      },
      {
        intent: 'music_therapy',
        description: 'Play relaxing music for therapy',
        examples: ['Play music', 'Relaxing music', 'Music therapy'],
      },
      {
        intent: 'schedule_appointment',
        description: 'Schedule medical appointments',
        examples: ['Schedule appointment', 'Book appointment', 'See doctor'],
      },
    ];
  }

  static getHelpText(): string {
    return `
Voice Commands Help:

You can say things like:
• "Hey Mirror" - Start a conversation
• "How am I doing?" - Check wellness status
• "Breathing exercise" - Start relaxation
• "Check my medications" - View medication schedule
• "I need help" - Emergency assistance
• "Call my caregiver" - Contact support person
• "Health report" - View health summary
• "Schedule appointment" - Book medical visit

Speak clearly and wait for the mirror to respond. The mirror will provide visual and audio feedback for your commands.
    `;
  }

  static async getContextualSuggestions(currentEmotion: string, timeOfDay: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Emotion-based suggestions
    switch (currentEmotion) {
      case 'sad':
        suggestions.push('Try a breathing exercise');
        suggestions.push('Call a friend or family member');
        break;
      case 'angry':
        suggestions.push('Start a calming breathing exercise');
        suggestions.push('Try some relaxing music');
        break;
      case 'stressed':
        suggestions.push('Take a mindfulness break');
        suggestions.push('Check your wellness plan');
        break;
      case 'happy':
        suggestions.push('Share your good mood with someone');
        suggestions.push('Check your wellness achievements');
        break;
    }
    
    // Time-based suggestions
    const hour = parseInt(timeOfDay.split(':')[0]);
    if (hour < 12) {
      suggestions.push('Check your morning medication schedule');
      suggestions.push('Set your wellness goals for today');
    } else if (hour > 18) {
      suggestions.push('Review your day\'s wellness activities');
      suggestions.push('Try an evening relaxation exercise');
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
}
