import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Shield, CheckCircle2, XCircle, RefreshCw } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { validateSouffleContent } from '@/utils/moderation';
import type { Souffle } from '@/types/souffle';
import { getEmotionDisplay } from '@/utils/emotionUtils'; // <-- AJOUTEZ CETTE LIGNE

export default function ModerationScreen() {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { souffles, reportSouffle } = useSouffle();
  const [moderationQueue, setModerationQueue] = useState<Souffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Si l'utilisateur n'est pas authentifié ou n'a pas premiumAccess, on désactive le chargement
    if (!isAuthenticated || !user?.premiumAccess) {
      setIsLoading(false);
      return;
    }
    loadModerationQueue();
  }, [isAuthenticated, user, souffles]); // Dépend de ces variables pour recharger la file

  const loadModerationQueue = async () => {
    setIsLoading(true);
    // Simule la récupération de souffles à modérer
    // Ici, nous filtrons les souffles qui sont "flagged" et non encore révélés.
    const simulatedFlaggedSouffles: Souffle[] = souffles.filter(s => {
      // Pour la démonstration, on valide le contenu de chaque souffle pour voir s'il est "flagged"
      // En production, cette information viendrait du backend.
      const validation = validateSouffleContent(s.content);
      // On n'affiche que les souffles non révélés pour la modération
      return validation.status === 'flagged' && !s.isRevealed;
    });
    setModerationQueue(simulatedFlaggedSouffles);
    setIsLoading(false);
  };

  const handleApprove = async (souffleId: string) => {
    Alert.alert(
      t('moderation.approveTitle'),
      t('moderation.approveMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('moderation.approveConfirm'),
          onPress: () => {
            // Logique de simulation d'approbation : retire le souffle de la file
            // En production, cela enverrait une requête au backend pour approuver le souffle
            setModerationQueue(prev => prev.filter(s => s.id !== souffleId));
            Alert.alert(t('moderation.approvedConfirmation'));
          },
        },
      ]
    );
  };

  const handleReject = async (souffleId: string) => {
    Alert.alert(
      t('moderation.rejectTitle'),
      t('moderation.rejectMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('moderation.rejectConfirm'),
          style: 'destructive',
          onPress: async () => {
            // Logique de simulation de rejet : retire le souffle et le "signale" via le SouffleContext
            // reportSouffle le masque aussi de la carte pour tout le monde
            await reportSouffle(souffleId);
            setModerationQueue(prev => prev.filter(s => s.id !== souffleId));
            Alert.alert(t('moderation.rejectedConfirmation'));
          },
        },
      ]
    );
  };

  // Si l'utilisateur n'est pas authentifié ou n'a pas premiumAccess, afficher un message d'erreur
  if (!isAuthenticated || !user?.premiumAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('moderation.title')}</Text>
          <Text style={styles.subtitle}>{t('moderation.subtitle')}</Text>
        </View>
        <View style={styles.notAuthorizedContainer}>
          <Shield size={48} color="#8B7D6B" />
          <Text style={styles.notAuthorizedTitle}>{t('moderation.notAuthorizedTitle')}</Text>
          <Text style={styles.notAuthorizedText}>{t('moderation.notAuthorizedText')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('moderation.title')}</Text>
        <Text style={styles.subtitle}>{t('moderation.subtitle')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#8B7D6B" style={styles.loadingIndicator} />
        ) : moderationQueue.length === 0 ? (
          <View style={styles.emptyQueue}>
            <Shield size={60} color="#A8C8E1" />
            <Text style={styles.emptyQueueText}>{t('moderation.emptyQueue')}</Text>
            <Text style={styles.emptyQueueSubtext}>{t('moderation.emptyQueueSubtext')}</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadModerationQueue}>
              <RefreshCw size={16} color="#8B7D6B" />
              <Text style={styles.refreshButtonText}>{t('moderation.refresh')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          moderationQueue.map(souffle => (
            <View key={souffle.id} style={styles.souffleCard}>
              {/* Le contenu du souffle (messageLibre) n'est pas traduit car c'est du contenu utilisateur */}
              <Text style={styles.souffleContent}>{souffle.content.messageLibre}</Text>
              {souffle.content.jeMeSens && (
                <Text style={styles.souffleEmotion}>
                  {/* Utilise getEmotionDisplay pour l'emoji et t() pour le libellé de l'émotion */}
                  {getEmotionDisplay(souffle.content.jeMeSens)?.emoji} {t(`emotions.${souffle.content.jeMeSens}`)}
                </Text>
              )}
              <Text style={styles.souffleInfo}>
                {t('moderation.souffleId')}: {souffle.id.substring(0, 15)}...
              </Text>
              <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(souffle.id)}>
                  <CheckCircle2 size={18} color="#F9F7F4" />
                  <Text style={styles.approveButtonText}>{t('moderation.approve')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(souffle.id)}>
                  <XCircle size={18} color="#F9F7F4" />
                  <Text style={styles.rejectButtonText}>{t('moderation.reject')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  header: { paddingHorizontal: 24, paddingVertical: 20, paddingTop: 60, alignItems: 'center', backgroundColor: 'rgba(249, 247, 244, 0.98)', borderBottomWidth: 1, borderBottomColor: 'rgba(139, 125, 107, 0.08)' },
  title: { fontSize: 24, fontFamily: 'Georgia', color: '#5D4E37', letterSpacing: 1, marginBottom: 6, fontStyle: 'italic' },
  subtitle: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', letterSpacing: 0.5, fontStyle: 'italic' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  loadingIndicator: { marginTop: 50 },
  notAuthorizedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  notAuthorizedTitle: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', marginTop: 20, marginBottom: 15, fontStyle: 'italic' },
  notAuthorizedText: { fontSize: 14, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  emptyQueue: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
  emptyQueueText: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', marginTop: 20, marginBottom: 10, fontStyle: 'italic' },
  emptyQueueSubtext: { fontSize: 13, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', lineHeight: 20, marginBottom: 30, fontStyle: 'italic' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 125, 107, 0.1)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.2)' },
  refreshButtonText: { fontSize: 14, fontFamily: 'Georgia', color: '#8B7D6B', marginLeft: 8, fontStyle: 'italic' },
  souffleCard: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 18, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(193, 123, 92, 0.2)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  souffleContent: { fontSize: 15, fontFamily: 'Georgia', color: '#5D4E37', lineHeight: 22, marginBottom: 10, fontStyle: 'italic' },
  souffleEmotion: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic', marginBottom: 10 },
  souffleInfo: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic', opacity: 0.7 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(139, 125, 107, 0.08)', paddingTop: 15 },
  approveButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#A8C8E1', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 20, shadowColor: '#4D3B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  approveButtonText: { fontSize: 13, fontFamily: 'Georgia', color: '#F9F7F4', marginLeft: 8, fontStyle: 'italic' },
  rejectButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C17B5C', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 20, shadowColor: '#4D3B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  rejectButtonText: { fontSize: 13, fontFamily: 'Georgia', color: '#F9F7F4', marginLeft: 8, fontStyle: 'italic' },
});