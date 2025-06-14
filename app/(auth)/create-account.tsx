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
import { router } from 'expo-router'; // Assurez-vous que router est importé
import { ArrowLeft, Mail, Phone, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreateAccountScreen() {
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { createAccount } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!contact.trim()) {
      Alert.alert(t('error'), t('createAccount.errorContactRequired'));
      return;
    }

    setIsLoading(true);
    
    const result = await createAccount({
      contact: contact.trim(),
      type: contactType,
      pseudo: pseudo.trim() || undefined,
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
        {/* MODIFICATION ICI */}
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) { // Vérifie si il est possible de revenir en arrière
              router.back(); //
            } else {
              // Si on ne peut pas revenir en arrière, on peut naviguer vers une page "sûre"
              // comme l'écran de bienvenue, ou simplement ne rien faire.
              // Pour la démo, on pourrait choisir de remplacer par l'écran de bienvenue.
              router.replace('/(auth)/welcome'); //
            }
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#8B7355" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('createAccount.title')}</Text>
          <Text style={styles.subtitle}>{t('createAccount.subtitle')}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sélection du type de contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createAccount.howToConnect')}</Text>
          
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
            {contactType === 'email' ? t('createAccount.emailLabel') : t('createAccount.phoneLabel')}
          </Text>
          <View style={styles.inputContainer}>
            {contactType === 'email' ? (
              <Mail size={18} color="#8B7355" style={styles.inputIcon} />
            ) : (
              <Phone size={18} color="#8B7355" style={styles.inputIcon} />
            )}
            <TextInput
              style={styles.textInput}
              placeholder={contactType === 'email' ? t('createAccount.emailPlaceholder') : t('createAccount.phonePlaceholder')}
              placeholderTextColor="#B8A082"
              value={contact}
              onChangeText={setContact}
              keyboardType={contactType === 'email' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Pseudo - vraiment optionnel */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>{t('createAccount.pseudoLabel')}</Text>
          <Text style={styles.inputHint}>
            {t('createAccount.pseudoHint')}
          </Text>
          <View style={styles.inputContainer}>
            <User size={18} color="#8B7355" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('createAccount.pseudoPlaceholder')}
              placeholderTextColor="#B8A082"
              value={pseudo}
              onChangeText={setPseudo}
              maxLength={20}
            />
          </View>
        </View>

        {/* Informations sur l'authentification */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('createAccount.authTitle')}</Text>
          <Text style={styles.infoText}>
            {t('createAccount.authText', { contactType: contactType === 'email' ? t('email') : t('sms') })}
          </Text>
          <Text style={styles.infoText}>
            {t('createAccount.authBenefits')}
          </Text>
        </View>

        {/* Éthique et confidentialité */}
        <View style={styles.ethicsSection}>
          <Text style={styles.ethicsTitle}>{t('createAccount.commitmentTitle')}</Text>
          <View style={styles.ethicsItem}>
            <Text style={styles.ethicsEmoji}>🔒</Text>
            <Text style={styles.ethicsText}>
              {t('createAccount.commitment1')}
            </Text>
          </View>
          <View style={styles.ethicsItem}>
            <Text style={styles.ethicsEmoji}>👤</Text>
            <Text style={styles.ethicsText}>
              {t('createAccount.commitment2')}
            </Text>
          </View>
          <View style={styles.ethicsItem}>
            <Text style={styles.ethicsEmoji}>🌱</Text>
            <Text style={styles.ethicsText}>
              {t('createAccount.commitment3')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bouton de création */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!contact.trim() || isLoading) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={!contact.trim() || isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? t('createAccount.submitButtonLoading') : t('createAccount.submitButton')}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          {t('createAccount.terms')}
        </Text>
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
  section: {
    marginTop: 25,
    marginBottom: 20,
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
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 11,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 16,
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
  infoSection: {
    backgroundColor: 'rgba(139, 115, 85, 0.08)',
    borderRadius: 15,
    padding: 20,
    marginVertical: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 18,
    marginBottom: 8,
  },
  ethicsSection: {
    marginVertical: 20,
  },
  ethicsTitle: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 15,
    textAlign: 'center',
  },
  ethicsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ethicsEmoji: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  ethicsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: 'rgba(249, 245, 240, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
  },
  createButton: {
    backgroundColor: '#8B7355',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
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
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F5F0',
    letterSpacing: 0.8,
  },
  termsText: {
    fontSize: 10,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 14,
    fontStyle: 'italic',
  },
});