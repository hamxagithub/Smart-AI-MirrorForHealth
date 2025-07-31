/**
 * Wellness Advice Service
 * Provides personalized wellness advice based on emotions and context
 */

import { EmotionAnalysisService } from './EmotionAnalysisService';
import { StorageService } from './StorageService';

interface WellnessAdvice {
  type: 'breathing' | 'mindfulness' | 'motivation' | 'professional';
  title: string;
  content: string;
  duration?: number;
  icon: string;
  color: string;
}

export class WellnessAdviceService {
  private static readonly adviceDatabase = {
    happy: [
      {
        type: 'motivation' as const,
        title: 'Embrace Your Joy',
        content: 'You\'re radiating positive energy! This is a perfect time to tackle challenges or help others around you.',
        icon: 'sentiment-very-satisfied',
        color: '#10B981',
      },
      {
        type: 'mindfulness' as const,
        title: 'Gratitude Practice',
        content: 'Take a moment to appreciate what brought you this happiness. Practicing gratitude can help maintain positive feelings.',
        duration: 3,
        icon: 'favorite',
        color: '#EC4899',
      },
    ],
    sad: [
      {
        type: 'breathing' as const,
        title: 'Calming Breath',
        content: 'When sadness feels overwhelming, focused breathing can help regulate your emotions and bring clarity.',
        duration: 5,
        icon: 'air',
        color: '#3B82F6',
      },
      {
        type: 'mindfulness' as const,
        title: 'Self-Compassion',
        content: 'It\'s okay to feel sad. Treat yourself with the same kindness you\'d show a good friend going through a difficult time.',
        duration: 5,
        icon: 'self-improvement',
        color: '#8B5CF6',
      },
      {
        type: 'professional' as const,
        title: 'Consider Support',
        content: 'If sadness persists, reaching out to a counselor or trusted friend can provide valuable perspective and support.',
        icon: 'support-agent',
        color: '#06B6D4',
      },
    ],
    angry: [
      {
        type: 'breathing' as const,
        title: 'Cool Down Breathing',
        content: 'Take slow, deep breaths to activate your body\'s relaxation response and gain better control over intense emotions.',
        duration: 4,
        icon: 'air',
        color: '#EF4444',
      },
      {
        type: 'mindfulness' as const,
        title: 'Pause and Reflect',
        content: 'Before reacting, take a step back. Ask yourself: What triggered this anger? Is there a constructive way to address it?',
        duration: 3,
        icon: 'pause-circle',
        color: '#F59E0B',
      },
    ],
    fearful: [
      {
        type: 'breathing' as const,
        title: 'Grounding Breath',
        content: 'Fear can make us feel disconnected. Slow, intentional breathing helps ground you in the present moment.',
        duration: 6,
        icon: 'air',
        color: '#6366F1',
      },
      {
        type: 'mindfulness' as const,
        title: '5-4-3-2-1 Technique',
        content: 'Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.',
        duration: 4,
        icon: 'visibility',
        color: '#8B5CF6',
      },
    ],
    surprised: [
      {
        type: 'mindfulness' as const,
        title: 'Embrace the Moment',
        content: 'Surprise can be energizing! Take a moment to fully experience this unexpected feeling.',
        duration: 2,
        icon: 'lightbulb',
        color: '#F59E0B',
      },
    ],
    disgusted: [
      {
        type: 'mindfulness' as const,
        title: 'Reset Your Focus',
        content: 'Shift your attention to something pleasant or neutral. Sometimes we need to redirect our mental energy.',
        duration: 3,
        icon: 'refresh',
        color: '#84CC16',
      },
    ],
    neutral: [
      {
        type: 'mindfulness' as const,
        title: 'Mindful Check-in',
        content: 'Use this calm moment to check in with yourself. How is your body feeling? What do you need right now?',
        duration: 3,
        icon: 'psychology',
        color: '#6B7280',
      },
    ],
  };

  private static readonly stressReliefTechniques = [
    {
      name: 'Progressive Muscle Relaxation',
      description: 'Tense and release different muscle groups to reduce physical tension.',
      duration: 10,
      steps: [
        'Start with your toes, tense for 5 seconds then relax',
        'Move to your calves, then thighs',
        'Continue with your abdomen, chest, and arms',
        'Finish with your neck and face muscles',
      ],
    },
    {
      name: 'Box Breathing',
      description: 'Equal counts for inhale, hold, exhale, hold - creating a "box" pattern.',
      duration: 5,
      steps: [
        'Inhale for 4 counts',
        'Hold for 4 counts',
        'Exhale for 4 counts',
        'Hold empty for 4 counts',
        'Repeat the cycle',
      ],
    },
    {
      name: 'Body Scan Meditation',
      description: 'Systematically focus attention on different parts of your body.',
      duration: 8,
      steps: [
        'Lie down comfortably',
        'Start at the top of your head',
        'Slowly scan down through your body',
        'Notice sensations without judgment',
        'End at your toes',
      ],
    },
  ];

  static async getAdviceForEmotion(emotion: string): Promise<WellnessAdvice> {
    try {
      const emotionAdvice = this.adviceDatabase[emotion as keyof typeof this.adviceDatabase];
      
      if (!emotionAdvice || emotionAdvice.length === 0) {
        return this.getDefaultAdvice();
      }

      // Get user preferences to personalize advice
      const preferences = await StorageService.getWellnessPreferences();
      const filteredAdvice = this.filterAdviceByPreferences(emotionAdvice, preferences);
      
      // Select advice based on recent usage to avoid repetition
      const selectedAdvice = await this.selectLeastRecentlyUsed(filteredAdvice, emotion);
      
      // Record usage for future personalization
      await this.recordAdviceUsage(selectedAdvice, emotion);
      
      return selectedAdvice;
    } catch (error) {
      console.error('Error getting advice for emotion:', error);
      return this.getDefaultAdvice();
    }
  }

  private static filterAdviceByPreferences(
    advice: WellnessAdvice[], 
    preferences: any
  ): WellnessAdvice[] {
    if (!preferences) return advice;

    return advice.filter(item => {
      if (preferences.disableBreathingExercises && item.type === 'breathing') {
        return false;
      }
      if (preferences.disableProfessionalSuggestions && item.type === 'professional') {
        return false;
      }
      if (preferences.maxDuration && item.duration && item.duration > preferences.maxDuration) {
        return false;
      }
      return true;
    });
  }

  private static async selectLeastRecentlyUsed(
    advice: WellnessAdvice[], 
    emotion: string
  ): Promise<WellnessAdvice> {
    try {
      const usageHistory: { [key: string]: { [key: string]: number } } = await StorageService.getItem('advice_usage_history') || {};
      const emotionHistory = usageHistory[emotion] || {};

      // Sort by least recently used
      const sortedAdvice = advice.sort((a, b) => {
        const aLastUsed = emotionHistory[a.title] || 0;
        const bLastUsed = emotionHistory[b.title] || 0;
        return aLastUsed - bLastUsed;
      });

      return sortedAdvice[0];
    } catch (error) {
      console.error('Error selecting advice:', error);
      return advice[Math.floor(Math.random() * advice.length)];
    }
  }

  private static async recordAdviceUsage(advice: WellnessAdvice, emotion: string): Promise<void> {
    try {
      const usageHistory: { [key: string]: { [key: string]: number } } = await StorageService.getItem('advice_usage_history') || {};
      
      if (!usageHistory[emotion]) {
        usageHistory[emotion] = {};
      }
      
      usageHistory[emotion][advice.title] = Date.now();
      
      await StorageService.setItem('advice_usage_history', usageHistory);
    } catch (error) {
      console.error('Error recording advice usage:', error);
    }
  }

  private static getDefaultAdvice(): WellnessAdvice {
    return {
      type: 'mindfulness',
      title: 'Take a Moment',
      content: 'Take a deep breath and be present in this moment. Notice what you\'re feeling without judgment.',
      duration: 3,
      icon: 'psychology',
      color: '#6B7280',
    };
  }

  static async getPersonalizedWellnessPlan(): Promise<{
    dailyGoals: string[];
    weeklyActivities: string[];
    recommendations: string[];
  }> {
    try {
      const emotionHistory = await EmotionAnalysisService.getEmotionHistory();
      const concerns = await EmotionAnalysisService.detectEmotionalConcerns();
      const preferences = await StorageService.getWellnessPreferences();
      const recentEmotions = emotionHistory.slice(-7);
      const dailyGoals = [
        'Practice 5 minutes of mindful breathing',
        'Take 3 moments to check in with your emotions',
        'Engage in one activity that brings you joy',
      ];

      const weeklyActivities = [
        'Complete at least 3 guided meditation sessions',
        'Try a new stress-relief technique',
        'Connect with a friend or family member',
        'Spend time in nature or natural light',
      ];

      const recommendations = [
        'Maintain a consistent sleep schedule',
        'Stay hydrated throughout the day',
        'Practice gratitude before bedtime',
      ];

      // Personalize based on emotional patterns
      if (concerns.hasConsistentNegativeEmotions) {
        recommendations.push('Consider speaking with a mental health professional');
        dailyGoals.push('Practice self-compassion exercises');
      }

      if (concerns.hasLowMoodStability) {
        dailyGoals.push('Use mood tracking to identify patterns');
        weeklyActivities.push('Explore stress management workshops');
      }

      return {
        dailyGoals,
        weeklyActivities,
        recommendations,
      };
    } catch (error) {
      console.error('Error generating wellness plan:', error);
      return {
        dailyGoals: ['Practice mindful breathing'],
        weeklyActivities: ['Try meditation'],
        recommendations: ['Stay hydrated'],
      };
    }
  }

  static getStressReliefTechniques() {
    return this.stressReliefTechniques;
  }

  static async getCrisisResources(): Promise<{
    hotlines: Array<{ name: string; number: string; available: string }>;
    onlineResources: Array<{ name: string; url: string; description: string }>;
    emergencySteps: string[];
  }> {
    return {
      hotlines: [
        {
          name: 'National Suicide Prevention Lifeline',
          number: '988',
          available: '24/7',
        },
        {
          name: 'Crisis Text Line',
          number: 'Text HOME to 741741',
          available: '24/7',
        },
        {
          name: 'SAMHSA National Helpline',
          number: '1-800-662-4357',
          available: '24/7',
        },
      ],
      onlineResources: [
        {
          name: 'Mental Health America',
          url: 'https://www.mhanational.org',
          description: 'Mental health resources and screening tools',
        },
        {
          name: 'National Alliance on Mental Illness',
          url: 'https://www.nami.org',
          description: 'Support and education for mental health',
        },
      ],
      emergencySteps: [
        'Take slow, deep breaths',
        'Remove yourself from immediate stressors if possible',
        'Contact a trusted friend, family member, or professional',
        'Use grounding techniques (5-4-3-2-1 method)',
        'If in immediate danger, call emergency services',
      ],
    };
  }
}
