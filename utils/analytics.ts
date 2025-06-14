import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  type: 'souffle_created' | 'souffle_revealed' | 'distance_walked' | 'session_start' | 'achievement_unlocked';
  data: any;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface DailyActivity {
  date: string;
  soufflesCreated: number;
  soufflesRevealed: number;
  distanceWalked: number;
  sessionDuration: number;
  achievements: string[];
}

export class Analytics {
  private static STORAGE_KEY = '@souffle:analytics';
  private static ACTIVITY_KEY = '@souffle:user_activity';

  static async trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
    try {
      const fullEvent: AnalyticsEvent = {
        ...event,
        timestamp: new Date(),
      };

      // Sauvegarder l'événement
      const existingEvents = await this.getEvents();
      existingEvents.push(fullEvent);
      
      // Garder seulement les 1000 derniers événements
      const recentEvents = existingEvents.slice(-1000);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentEvents));

      // Mettre à jour l'activité quotidienne
      await this.updateDailyActivity(fullEvent);

    } catch (error) {
      console.error('Erreur lors du tracking d\'événement:', error);
    }
  }

  static async getEvents(): Promise<AnalyticsEvent[]> {
    try {
      const events = await AsyncStorage.getItem(this.STORAGE_KEY);
      return events ? JSON.parse(events) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return [];
    }
  }

  static async getDailyActivity(): Promise<DailyActivity[]> {
    try {
      const activity = await AsyncStorage.getItem(this.ACTIVITY_KEY);
      return activity ? JSON.parse(activity) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'activité:', error);
      return [];
    }
  }

  private static async updateDailyActivity(event: AnalyticsEvent): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const activities = await this.getDailyActivity();
      
      let todayActivity = activities.find(a => a.date === today);
      if (!todayActivity) {
        todayActivity = {
          date: today,
          soufflesCreated: 0,
          soufflesRevealed: 0,
          distanceWalked: 0,
          sessionDuration: 0,
          achievements: [],
        };
        activities.push(todayActivity);
      }

      // Mettre à jour selon le type d'événement
      switch (event.type) {
        case 'souffle_created':
          todayActivity.soufflesCreated++;
          break;
        case 'souffle_revealed':
          todayActivity.soufflesRevealed++;
          break;
        case 'distance_walked':
          todayActivity.distanceWalked += event.data.distance || 0;
          break;
        case 'achievement_unlocked':
          if (!todayActivity.achievements.includes(event.data.achievementId)) {
            todayActivity.achievements.push(event.data.achievementId);
          }
          break;
      }

      // Garder seulement les 30 derniers jours
      const recentActivities = activities.slice(-30);
      await AsyncStorage.setItem(this.ACTIVITY_KEY, JSON.stringify(recentActivities));

    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'activité quotidienne:', error);
    }
  }

  static async getWeeklyStats(): Promise<{
    totalSoufflesCreated: number;
    totalSoufflesRevealed: number;
    totalDistance: number;
    averageDaily: number;
  }> {
    try {
      const activities = await this.getDailyActivity();
      const lastWeek = activities.slice(-7);

      const stats = lastWeek.reduce((acc, day) => ({
        totalSoufflesCreated: acc.totalSoufflesCreated + day.soufflesCreated,
        totalSoufflesRevealed: acc.totalSoufflesRevealed + day.soufflesRevealed,
        totalDistance: acc.totalDistance + day.distanceWalked,
        averageDaily: 0, // Calculé après
      }), {
        totalSoufflesCreated: 0,
        totalSoufflesRevealed: 0,
        totalDistance: 0,
        averageDaily: 0,
      });

      stats.averageDaily = lastWeek.length > 0 
        ? (stats.totalSoufflesCreated + stats.totalSoufflesRevealed) / lastWeek.length 
        : 0;

      return stats;
    } catch (error) {
      console.error('Erreur lors du calcul des stats hebdomadaires:', error);
      return {
        totalSoufflesCreated: 0,
        totalSoufflesRevealed: 0,
        totalDistance: 0,
        averageDaily: 0,
      };
    }
  }

  static async clearOldData(): Promise<void> {
    try {
      // Nettoyer les données de plus de 90 jours
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const events = await this.getEvents();
      const recentEvents = events.filter(event => 
        new Date(event.timestamp) > cutoffDate
      );

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentEvents));

      const activities = await this.getDailyActivity();
      const recentActivities = activities.filter(activity => 
        new Date(activity.date) > cutoffDate
      );

      await AsyncStorage.setItem(this.ACTIVITY_KEY, JSON.stringify(recentActivities));

    } catch (error) {
      console.error('Erreur lors du nettoyage des anciennes données:', error);
    }
  }
}