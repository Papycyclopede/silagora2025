import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { ChartBar as BarChart3, MapPin, Eye, Edit3, Calendar } from 'lucide-react-native';
import { useSouffle } from '@/contexts/SouffleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEmotionDisplay } from '@/utils/emotionUtils';

const { width } = Dimensions.get('window');

interface UserStats {
  soufflesCreated: number;
  soufflesRevealed: number;
  totalDistance: number;
  placesVisited: number;
  daysActive: number;
  favoriteEmotion: string;
  longestStreak: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  emoji: string;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

interface DailyActivity {
  date: string;
  soufflesCreated: number;
  soufflesRevealed: number;
  distanceWalked: number;
}

const ACHIEVEMENTS_LOGIC: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  { id: 'first_souffle', emoji: '🌱', target: 1 },
  { id: 'explorer', emoji: '🗺️', target: 10 },
  { id: 'poet', emoji: '🪶', target: 25 },
  { id: 'wanderer', emoji: '🚶', target: 10000 },
  { id: 'consistent', emoji: '📅', target: 7 },
  { id: 'social', emoji: '🤝', target: 5 },
];

export default function DashboardScreen() {
  const { souffles } = useSouffle();
  const { isAuthenticated, user } = useAuth();
  const { t, currentLanguage } = useLanguage();

  const [userStats, setUserStats] = useState<UserStats>({
    soufflesCreated: 0,
    soufflesRevealed: 0,
    totalDistance: 0,
    placesVisited: 0,
    daysActive: 0,
    favoriteEmotion: '',
    longestStreak: 0,
    achievements: [],
  });

  const [weeklyActivity, setWeeklyActivity] = useState<DailyActivity[]>([]);

  // Calcul des achievements et stats
  const calculateAchievements = (stats: Partial<UserStats>): Achievement[] => {
    return ACHIEVEMENTS_LOGIC.map(achievement => {
      let progress = 0;
      let unlockedAt: Date | undefined;
      switch (achievement.id) {
        case 'first_souffle': progress = Math.min(stats.soufflesCreated || 0, achievement.target || 1); break;
        case 'explorer': progress = Math.min(stats.soufflesRevealed || 0, achievement.target || 10); break;
        case 'poet': progress = Math.min(stats.soufflesCreated || 0, achievement.target || 25); break;
        case 'wanderer': progress = Math.min(stats.totalDistance || 0, achievement.target || 10000); break;
        case 'consistent': progress = Math.min(stats.daysActive || 0, achievement.target || 7); break;
        case 'social': progress = Math.min(stats.placesVisited || 0, achievement.target || 5); break;
      }
      if (progress >= (achievement.target || 1)) {
        unlockedAt = new Date();
      }
      return { ...achievement, progress, unlockedAt };
    });
  };

  const calculateLongestStreak = (activity: DailyActivity[]): number => {
    if (activity.length === 0) return 0;
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    const sortedActivity = [...activity].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedActivity.forEach((day: DailyActivity) => {
      const currentDate = new Date(day.date);
      if (lastDate && (currentDate.getTime() - lastDate.getTime()) === (24 * 60 * 60 * 1000)) {
        currentStreak++;
      }
      else if (!lastDate || (currentDate.getTime() - lastDate.getTime()) > (24 * 60 * 60 * 1000)) {
        currentStreak = 1;
      }
      lastDate = currentDate;
      maxStreak = Math.max(maxStreak, currentStreak);
    });
    return maxStreak;
  };

  const loadUserStats = async () => {
    try {
      const savedActivity = await AsyncStorage.getItem('@souffle:user_activity');
      const revealedSoufflesData = await AsyncStorage.getItem('@souffle:revealed_souffles');

      const revealedSouffles = revealedSoufflesData ? JSON.parse(revealedSoufflesData) : [];
      const activity = savedActivity ? JSON.parse(savedActivity) : [];

      const myCreatedSouffles = souffles.filter(s => s.isSimulated === false || typeof s.isSimulated === 'undefined');
      const emotionCounts: { [key: string]: number } = {};

      myCreatedSouffles.forEach(souffle => {
        if (souffle.content.jeMeSens) {
          emotionCounts[souffle.content.jeMeSens] = (emotionCounts[souffle.content.jeMeSens] || 0) + 1;
        }
      });

      const favoriteEmotion = Object.keys(emotionCounts).length > 0 ? Object.keys(emotionCounts).reduce((a, b) =>
        emotionCounts[a] > emotionCounts[b] ? a : b, ''
      ) : '';

      const placesVisited = new Set(myCreatedSouffles.map(s => `${Math.round(s.latitude * 1000)}_${Math.round(s.longitude * 1000)}`)).size;
      const totalDistance = activity.reduce((sum: number, day: DailyActivity) => sum + (day.distanceWalked || 0), 0);

      const achievements = calculateAchievements({
        soufflesCreated: myCreatedSouffles.length,
        soufflesRevealed: revealedSouffles.length,
        totalDistance: totalDistance,
        daysActive: activity.length,
        placesVisited: placesVisited,
      });

      const stats: UserStats = {
        soufflesCreated: myCreatedSouffles.length,
        soufflesRevealed: revealedSouffles.length,
        totalDistance: totalDistance,
        placesVisited: placesVisited,
        daysActive: activity.length,
        favoriteEmotion,
        longestStreak: calculateLongestStreak(activity),
        achievements,
      };

      setUserStats(stats);

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const loadWeeklyActivity = async () => {
    try {
      const savedActivity = await AsyncStorage.getItem('@souffle:user_activity');
      if (savedActivity) {
        const activity: DailyActivity[] = JSON.parse(savedActivity);
        const last7Days: DailyActivity[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const foundDay = activity.find((a: DailyActivity) => a.date === dateStr);
          last7Days.push(foundDay || { date: dateStr, soufflesCreated: 0, soufflesRevealed: 0, distanceWalked: 0 });
        }
        setWeeklyActivity(last7Days);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'activité:', error);
    }
  };

  useEffect(() => {
    loadUserStats();
    loadWeeklyActivity();
  }, [souffles, currentLanguage, isAuthenticated]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const renderStatCard = (titleKey: string, value: string | number, icon: React.ReactNode, subtitleKey: string) => (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{String(value)}</Text>
      <Text style={styles.statTitle}>{t(titleKey)}</Text>
      <Text style={styles.statSubtitle}>{t(subtitleKey)}</Text>
    </View>
  );

  const renderAchievement = (achievement: Achievement) => (
    <View key={achievement.id} style={[styles.achievementCard, achievement.unlockedAt && styles.achievementUnlocked]}>
      <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
      <View style={styles.achievementContent}>
        <Text style={[styles.achievementTitle, achievement.unlockedAt && styles.achievementTitleUnlocked]}>
          {t(`achievements.${achievement.id}.title`)}
        </Text>
        <Text style={styles.achievementDescription}>{t(`achievements.${achievement.id}.description`)}</Text>
        {!achievement.unlockedAt && achievement.target && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, ((achievement.progress || 0) / achievement.target) * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{`${achievement.progress || 0} / ${achievement.target}`}</Text>
          </View>
        )}
        {achievement.unlockedAt && (<Text style={styles.unlockedText}>{t('dashboard.achievementUnlocked')} ✨</Text>)}
      </View>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('dashboard.title')}</Text>
          <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>
        </View>
        <View style={styles.anonymousContainer}>
          <BarChart3 size={48} color="#8B7D6B" />
          <Text style={styles.anonymousTitle}>{t('dashboard.anonymous.title')}</Text>
          <Text style={styles.anonymousText}>{t('dashboard.anonymous.text')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('dashboard.title')}</Text>
        <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>
        {user?.pseudo && (<Text style={styles.welcomeText}>{t('dashboard.welcome', { pseudo: user.pseudo })}</Text>)}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          {renderStatCard('dashboard.stats.created', userStats.soufflesCreated, <Edit3 size={20} color="#8B7D6B" />, 'dashboard.stats.createdSubtitle')}
          {renderStatCard('dashboard.stats.revealed', userStats.soufflesRevealed, <Eye size={20} color="#8B7D6B" />, 'dashboard.stats.revealedSubtitle')}
          {renderStatCard('dashboard.stats.distance', formatDistance(userStats.totalDistance), <MapPin size={20} color="#8B7D6B" />, 'dashboard.stats.distanceSubtitle')}
          {renderStatCard('dashboard.stats.activeDays', userStats.daysActive, <Calendar size={20} color="#8B7D6B" />, 'dashboard.stats.activeDaysSubtitle')}
        </View>

        {userStats.favoriteEmotion && (
          <View style={styles.emotionCard}>
            <Text style={styles.emotionTitle}>{t('dashboard.emotion.title')}</Text>
            <View style={styles.emotionDisplay}>
              <Text style={styles.emotionEmoji}>{getEmotionDisplay(userStats.favoriteEmotion)?.emoji}</Text>
              <Text style={styles.emotionLabel}>{t(`emotions.${userStats.favoriteEmotion}`)}</Text>
            </View>
            <Text style={styles.emotionSubtext}>{t('dashboard.emotion.subtitle')}</Text>
          </View>
        )}

        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>{t('dashboard.weeklyActivity.title')}</Text>
          <View style={styles.activityChart}>
            {weeklyActivity.map((day) => {
              const maxActivity = Math.max(...weeklyActivity.map(d => d.soufflesCreated + d.soufflesRevealed), 1);
              const height = ((day.soufflesCreated + day.soufflesRevealed) / maxActivity) * 60;
              return (
                <View key={day.date} style={styles.activityBar}>
                  <View style={[styles.activityBarFill, { height: Math.max(height, 5) }]} />
                  <Text style={styles.activityDay}>{new Date(day.date).toLocaleDateString(currentLanguage, { weekday: 'short' })}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>{t('dashboard.achievements.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('dashboard.achievements.subtitle')}</Text>
          <View style={styles.achievementsList}>{userStats.achievements.map(renderAchievement)}</View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4', },
  header: { paddingHorizontal: 24, paddingVertical: 20, paddingTop: 60, alignItems: 'center', backgroundColor: 'rgba(249, 247, 244, 0.98)', borderBottomWidth: 1, borderBottomColor: 'rgba(139, 125, 107, 0.08)', },
  title: { fontSize: 24, fontFamily: 'Georgia', color: '#5D4E37', letterSpacing: 1, marginBottom: 6, fontStyle: 'italic', },
  subtitle: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', letterSpacing: 0.5, marginBottom: 8, fontStyle: 'italic', },
  welcomeText: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic', },
  content: { flex: 1, paddingHorizontal: 24, },
  anonymousContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, },
  anonymousTitle: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', marginTop: 20, marginBottom: 15, fontStyle: 'italic', },
  anonymousText: { fontSize: 14, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', lineHeight: 22, fontStyle: 'italic', },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20, marginBottom: 25, },
  statCard: { width: (width - 60) / 2, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 18, padding: 20, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, },
  statIcon: { marginBottom: 12, },
  statValue: { fontSize: 24, fontFamily: 'Georgia', color: '#5D4E37', fontWeight: 'bold', marginBottom: 6, fontStyle: 'italic', },
  statTitle: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic', },
  statSubtitle: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', marginTop: 4, fontStyle: 'italic', opacity: 0.7, },
  emotionCard: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 18, padding: 25, marginBottom: 25, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)', },
  emotionTitle: { fontSize: 16, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 15, fontStyle: 'italic', },
  emotionDisplay: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, },
  emotionEmoji: { fontSize: 32, marginRight: 15, },
  emotionLabel: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic', },
  emotionSubtext: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic', },
  activitySection: { marginBottom: 30, },
  sectionTitle: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 8, fontStyle: 'italic', },
  sectionSubtitle: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', marginBottom: 20, fontStyle: 'italic', },
  activityChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 75, marginTop: 10, marginBottom: 12, },
  activityBar: { alignItems: 'center', flex: 1, },
  activityBarFill: { width: 20, backgroundColor: '#A8C8E1', borderRadius: 10, marginBottom: 10, },
  activityDay: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic', },
  achievementsSection: { marginBottom: 30, },
  achievementsList: { gap: 12, },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.08)',
    opacity: 0.7,
  },
  achievementUnlocked: {
    backgroundColor: 'rgba(168, 200, 225, 0.1)',
    borderColor: 'rgba(168, 200, 225, 0.3)',
    opacity: 1,
  },
  achievementEmoji: { fontSize: 24, marginRight: 15, marginTop: 2, },
  achievementContent: { flex: 1, },
  achievementTitle: { fontSize: 14, fontFamily: 'Georgia', color: '#8B7D6B', marginBottom: 4, fontStyle: 'italic', },
  achievementTitleUnlocked: { color: '#5D4E37', fontWeight: '500', },
  achievementDescription: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', marginBottom: 8, fontStyle: 'italic', },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, },
  progressBar: { flex: 1, height: 4, backgroundColor: 'rgba(139, 125, 107, 0.2)', borderRadius: 2, },
  progressFill: { height: '100%', backgroundColor: '#A8C8E1', borderRadius: 2, },
  progressText: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic', },
  unlockedText: { fontSize: 11, fontFamily: 'Georgia', color: '#A8C8E1', fontStyle: 'italic', },
  bottomSpacing: { height: 40, },
});
