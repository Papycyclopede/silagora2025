import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, User, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext'; // Importe le hook useLanguage

export default function CompleteProfileScreen() {
  const [pseudo, setPseudo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { updateProfile, user } = useAuth();
  const { t } = useLanguage(); // Utilise le hook de langue

  const handleSubmit = async () => {
    if (pseudo.trim().length < 2) {
      Alert.alert(t('error'), t('pseudoTooShort')); // Traduit les messages d'alerte
      return;
    }

    setIsLoading(true);

    const result = await updateProfile({
      pseudo: pseudo.trim(),
    });

    setIsLoading(false);

    if (result.success) {
      Alert.alert(
        t('profileCompletedTitle'), // Traduit le titre de l'alerte
        t('profileCompletedMessage'), // Traduit le message
        [{ text: t('start'), onPress: () => router.replace('/(tabs)') }] // Traduit "Commencer"
      );
    } else {
      Alert.alert(t('error'), result.error || t('unexpectedError')); // Traduit l'erreur
    }
  };

  const handleSkip = () => {
    Alert.alert(
      t('skipStepTitle'), // Traduit le titre de l'alerte
      t('skipStepMessage'), // Traduit le message
      [
        { text: t('stayHere'), style: 'cancel' }, // Traduit "Rester ici"
        { text: t('skip'), onPress: () => router.replace('/(tabs)') } // Traduit "Passer"
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#8B7355" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('completeProfileTitle')}</Text> {/* Traduit "Finaliser le profil" */}
          <Text style={styles.subtitle}>{t('completeProfileSubtitle')}</Text> {/* Traduit "Dernière étape avant l'envol" */}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Message de bienvenue */}
        <View style={styles.welcomeSection}>
          <Sparkles size={32} color="#8B7355" />
          <Text style={styles.welcomeTitle}>{t('welcomeTitleCompleteProfile')}</Text> {/* Traduit "Félicitations ! 🌸" */}
          <Text style={styles.welcomeText}>
            {t('welcomeTextCompleteProfile')} {/* Traduit le texte de bienvenue */}
          </Text>
        </View>

        {/* Informations du compte */}
        <View style={styles.accountInfo}>
          <Text style={styles.accountInfoTitle}>{t('yourAccount')}</Text> {/* Traduit "Votre compte" */}
          <View style={styles.accountDetail}>
            <Text style={styles.accountLabel}>{t('contactLabel')}</Text> {/* Traduit "Contact :" */}
            <Text style={styles.accountValue}>
              {user?.email || user?.phone}
            </Text>
          </View>
          <View style={styles.accountDetail}>
            <Text style={styles.accountLabel}>{t('typeLabel')}</Text> {/* Traduit "Type :" */}
            <Text style={styles.accountValue}>
              {user?.preferredContact === 'email' ? t('emailType') : t('phoneType')} {/* Traduit "Email" ou "Téléphone" */}
            </Text>
          </View>
        </View>

        {/* Pseudo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('choosePseudoTitle')}</Text> {/* Traduit "Choisissez votre pseudo" */}
          <Text style={styles.sectionDescription}>
            {t('pseudoDescription')} {/* Traduit la description du pseudo */}
          </Text>

          <View style={styles.inputContainer}>
            <User size={18} color="#8B7355" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('pseudoPlaceholder')} // Traduit "Votre pseudo"
              placeholderTextColor="#B8A082"
              value={pseudo}
              onChangeText={setPseudo}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.inputHint}>
            {t('pseudoHint')} {/* Traduit le hint du pseudo */}
          </Text>
        </View>

        {/* Avantages du compte */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>{t('accountBenefitsTitle')}</Text> {/* Traduit "Avec votre compte, vous pouvez :" */}

          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>💾</Text>
            <Text style={styles.benefitText}>
              {t('benefitSaveSync')} {/* Traduit le bénéfice 1 */}
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>✨</Text>
            <Text style={styles.benefitText}>
              {t('benefitPremiumFeatures')} {/* Traduit le bénéfice 2 */}
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>🎫</Text>
            <Text style={styles.benefitText}>
              {t('benefitOfferTickets')} {/* Traduit le bénéfice 3 */}
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>🛡️</Text>
            <Text style={styles.benefitText}>
              {t('benefitModeration')} {/* Traduit le bénéfice 4 */}
            </Text>
          </View>
        </View>

        {/* Rappel éthique */}
        <View style={styles.ethicsReminder}>
          <Text style={styles.ethicsTitle}>{t('ourPromise')}</Text> {/* Traduit "Notre promesse" */}
          <Text style={styles.ethicsText}>
            {t('ethicsReminderText')} {/* Traduit le texte du rappel éthique */}
          </Text>
        </View>
      </ScrollView>

      {/* Footer avec boutons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            (!pseudo.trim() || isLoading) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={!pseudo.trim() || isLoading}
        >
          <Sparkles size={18} color="#F9F5F0" />
          <Text style={styles.completeButtonText}>
            {isLoading ? t('finalizingProfile') : t('completeProfileButton')} {/* Traduit le texte du bouton de soumission */}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{t('skipStepButton')}</Text> {/* Traduit "Passer cette étape" */}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 115, 85, 0.08)',
    backgroundColor: 'rgba(249, 245, 240, 0.98)',
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    backgroundColor: 'rgba(139, 115, 85, 0.08)',
    borderRadius: 18,
    padding: 25,
    marginTop: 25,
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Satisfy-Regular',
    color: '#4D3B2F',
    marginTop: 15,
    marginBottom: 15,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 22,
    textAlign: 'center',
  },
  accountInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.15)',
  },
  accountInfoTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 15,
  },
  accountDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  accountLabel: {
    fontSize: 13,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
  },
  accountValue: {
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 18,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
    opacity: 0.7,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Quicksand-Regular',
    color: '#4D3B2F',
    paddingVertical: 14,
  },
  inputHint: {
    fontSize: 11,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    marginTop: 8,
    fontStyle: 'italic',
  },
  benefitsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.15)',
  },
  benefitsTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  benefitEmoji: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 20,
  },
  ethicsReminder: {
    backgroundColor: 'rgba(139, 115, 85, 0.08)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#8B7355',
  },
  ethicsTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 10,
  },
  ethicsText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: 'rgba(249, 245, 240, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B7355',
    paddingVertical: 18,
    borderRadius: 30,
    marginBottom: 15,
    shadowColor: '#4D3B2F',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#B8A082',
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F5F0',
    marginLeft: 10,
    letterSpacing: 0.8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    textDecorationLine: 'underline',
  },
});