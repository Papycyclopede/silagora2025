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
import { ArrowLeft, Mail, Phone } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginScreen() {
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!contact.trim()) {
      Alert.alert(t('error'), t('login.errorContactRequired'));
      return;
    }

    setIsLoading(true);
    
    const result = await login({
      contact: contact.trim(),
      type: contactType,
    });

    setIsLoading(false);

    if (result.success) {
      router.push('/(auth)/verify-otp');
    } else {
      Alert.alert(t('error'), result.error || t('unexpectedError'));
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
          <Text style={styles.title}>{t('login.title')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Message de bienvenue */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{t('login.welcomeBack')}</Text>
          <Text style={styles.welcomeText}>
            {t('login.instructions')}
          </Text>
        </View>

        {/* Sélection du type de contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('login.connectionMethod')}</Text>
          
          <View style={styles.contactTypeButtons}>
            <TouchableOpacity
              style={[
                styles.contactTypeButton,
                contactType === 'email' && styles.activeContactTypeButton,
              ]}
              onPress={() => setContactType('email')}
            >
              <Mail size={20} color={contactType === 'email' ? '#F9F5F0' : '#8B7355'} />
              <Text style={[
                styles.contactTypeText,
                contactType === 'email' && styles.activeContactTypeText,
              ]}>
                {t('email')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.contactTypeButton,
                contactType === 'phone' && styles.activeContactTypeButton,
              ]}
              onPress={() => setContactType('phone')}
            >
              <Phone size={20} color={contactType === 'phone' ? '#F9F5F0' : '#8B7355'} />
              <Text style={[
                styles.contactTypeText,
                contactType === 'phone' && styles.activeContactTypeText,
              ]}>
                {t('phone')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saisie du contact */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>
            {contactType === 'email' ? t('login.emailLabel') : t('login.phoneLabel')}
          </Text>
          <View style={styles.inputContainer}>
            {contactType === 'email' ? (
              <Mail size={18} color="#8B7355" style={styles.inputIcon} />
            ) : (
              <Phone size={18} color="#8B7355" style={styles.inputIcon} />
            )}
            <TextInput
              style={styles.textInput}
              placeholder={contactType === 'email' ? t('login.emailPlaceholder') : t('login.phonePlaceholder')}
              placeholderTextColor="#B8A082"
              value={contact}
              onChangeText={setContact}
              keyboardType={contactType === 'email' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Informations sur le processus */}
        <View style={styles.processSection}>
          <Text style={styles.processTitle}>{t('login.howItWorks')}</Text>
          <View style={styles.processStep}>
            <Text style={styles.processNumber}>1.</Text>
            <Text style={styles.processText}>
              {t('login.step1', { contactType: contactType === 'email' ? t('email').toLowerCase() : t('login.phone_number_text') })}
            </Text>
          </View>
          <View style={styles.processStep}>
            <Text style={styles.processNumber}>2.</Text>
            <Text style={styles.processText}>
              {t('login.step2')}
            </Text>
          </View>
          <View style={styles.processStep}>
            <Text style={styles.processNumber}>3.</Text>
            <Text style={styles.processText}>
              {t('login.step3')}
            </Text>
          </View>
        </View>

        {/* Aide */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>{t('login.needHelp')}</Text>
          <Text style={styles.helpText}>
            {t('login.helpText')}
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => router.push('/(auth)/create-account')}
          >
            <Text style={styles.helpButtonText}>{t('login.createNewAccount')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bouton de connexion */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.loginButton,
            (!contact.trim() || isLoading) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={!contact.trim() || isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? t('login.submitButtonLoading') : t('login.submitButton')}
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
  },
  welcomeSection: {
    backgroundColor: 'rgba(139, 115, 85, 0.08)',
    borderRadius: 15,
    padding: 20,
    marginTop: 25,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 16,
    fontFamily: 'Satisfy-Regular',
    color: '#4D3B2F',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 15,
  },
  contactTypeButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  contactTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.2)',
  },
  activeContactTypeButton: {
    backgroundColor: '#8B7355',
    borderColor: '#8B7355',
  },
  contactTypeText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#8B7355',
    marginLeft: 8,
  },
  activeContactTypeText: {
    color: '#F9F5F0',
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
  processSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  processTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 15,
    textAlign: 'center',
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  processNumber: {
    fontSize: 14,
    fontFamily: 'Satisfy-Regular',
    color: '#8B7355',
    marginRight: 12,
    marginTop: 2,
  },
  processText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 18,
  },
  helpSection: {
    marginBottom: 30,
  },
  helpTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 18,
    marginBottom: 15,
  },
  helpButton: {
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.2)',
    alignItems: 'center',
  },
  helpButtonText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
    color: '#8B7355',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: 'rgba(249, 245, 240, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
  },
  loginButton: {
    backgroundColor: '#8B7355',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
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
    letterSpacing: 0.8,
  },
});