import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Key, Crown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext'; // Ajouté

export default function MasterLoginScreen() {
  const [masterCode, setMasterCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { createMasterAccount } = useAuth();
  const { t } = useLanguage(); // Ajouté

  const handleMasterLogin = async () => {
    if (!masterCode.trim()) {
      Alert.alert(t('error'), t('masterLogin.error.emptyCode'));
      return;
    }

    // Code maître pour la démo du hackathon
    // NOTE: En production, ce code serait géré via des variables d'environnement sécurisées
    if (masterCode !== 'DEMO2024') {
      Alert.alert(t('error'), t('masterLogin.error.incorrectCode'));
      return;
    }

    setIsLoading(true);
    
    try {
      // Création d'un compte maître avec tous les privilèges
      const result = await createMasterAccount();
      
      if (result.success) {
        Alert.alert(
          t('masterLogin.success.title'),
          t('masterLogin.success.message'),
          [{ text: t('continue'), onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        Alert.alert(t('error'), result.error || t('masterLogin.error.creationFailed'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#8B7355" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('masterLogin.title')}</Text>
          <Text style={styles.subtitle}>{t('masterLogin.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Icône de sécurité */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Crown size={32} color="#8B7355" />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>{t('masterLogin.instructions.title')}</Text>
          <Text style={styles.instructionsText}>
            {t('masterLogin.instructions.text')}
          </Text>
          <Text style={styles.demoNote}>
            {t('masterLogin.instructions.hint')}
          </Text>
        </View>

        {/* Saisie du code */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>{t('masterLogin.input.label')}</Text>
          <View style={styles.inputContainer}>
            <Key size={18} color="#8B7355" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('masterLogin.input.placeholder')}
              placeholderTextColor="#B8A082"
              value={masterCode}
              onChangeText={setMasterCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Avantages du compte maître */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>{t('masterLogin.benefits.title')}</Text>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>✨</Text>
            <Text style={styles.benefitText}>{t('masterLogin.benefits.item1')}</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>🎫</Text>
            <Text style={styles.benefitText}>{t('masterLogin.benefits.item2')}</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>🛡️</Text>
            <Text style={styles.benefitText}>{t('masterLogin.benefits.item3')}</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>🔧</Text>
            <Text style={styles.benefitText}>{t('masterLogin.benefits.item4')}</Text>
          </View>
        </View>

        {/* Note de sécurité */}
        <View style={styles.securityNote}>
          <Text style={styles.securityNoteTitle}>{t('masterLogin.security.title')}</Text>
          <Text style={styles.securityNoteText}>
            {t('masterLogin.security.text')}
          </Text>
        </View>
      </View>

      {/* Footer avec bouton */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.loginButton,
            (!masterCode.trim() || isLoading) && styles.disabledButton,
          ]}
          onPress={handleMasterLogin}
          disabled={!masterCode.trim() || isLoading}
        >
          <Crown size={18} color="#F9F5F0" />
          <Text style={styles.loginButtonText}>
            {isLoading ? t('masterLogin.button.loading') : t('masterLogin.button.text')}
          </Text>
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
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 30,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 115, 85, 0.2)',
  },
  instructionsSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionsTitle: {
    fontSize: 18,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 15,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  demoNote: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    textAlign: 'center',
  },
  inputSection: {
    width: '100%',
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 12,
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
  benefitsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.15)',
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 15,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitEmoji: {
    fontSize: 16,
    marginRight: 12,
  },
  benefitText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
  },
  securityNote: {
    backgroundColor: 'rgba(193, 123, 92, 0.08)',
    borderRadius: 15,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(193, 123, 92, 0.15)',
  },
  securityNoteTitle: {
    fontSize: 12,
    fontFamily: 'Quicksand-Medium',
    color: '#C17B5C',
    marginBottom: 8,
    textAlign: 'center',
  },
  securityNoteText: {
    fontSize: 10,
    fontFamily: 'Quicksand-Light',
    color: '#C17B5C',
    textAlign: 'center',
    lineHeight: 14,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: 'rgba(249, 245, 240, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B7355',
    paddingVertical: 18,
    borderRadius: 30,
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
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F5F0',
    marginLeft: 10,
    letterSpacing: 0.8,
  },
});