import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function VerifyOTPScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [attempts, setAttempts] = useState(0);
  
  const { verifyOTP, resendOTP, pendingVerification } = useAuth();
  const { t } = useLanguage();
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pendingVerification) {
      router.replace('/(auth)/welcome');
      return;
    }

    // Démarrer le compte à rebours
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingVerification]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return; // Empêcher la saisie de plusieurs caractères
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Passer au champ suivant automatiquement
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Vérifier automatiquement si le code est complet
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const codeToVerify = otpCode || code.join('');
    
    if (codeToVerify.length !== 6) {
      Alert.alert(t('error'), t('verifyOtp.errorIncomplete'));
      return;
    }

    setIsLoading(true);
    
    const result = await verifyOTP(codeToVerify);
    
    setIsLoading(false);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setAttempts(prev => prev + 1);
      
      // Animation de secousse en cas d'erreur
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();

      // Effacer le code
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      Alert.alert(t('verifyOtp.errorTitle'), result.error || t('verifyOtp.errorMessage'));
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setIsLoading(true);
    
    const result = await resendOTP();
    
    setIsLoading(false);

    if (result.success) {
      setCanResend(false);
      setCountdown(30);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      Alert.alert(t('verifyOtp.resendTitle'), t('verifyOtp.resendMessage'));
    } else {
      Alert.alert(t('error'), result.error || t('verifyOtp.resendError'));
    }
  };

  if (!pendingVerification) {
    return null;
  }
  
  const expirationMinutes = Math.ceil((pendingVerification.expiresAt.getTime() - Date.now()) / 60000);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#8B7355" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('verifyOtp.title')}</Text>
          <Text style={styles.subtitle}>{t('verifyOtp.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Icône de sécurité */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Shield size={32} color="#8B7355" />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>{t('verifyOtp.codeSentTitle')}</Text>
          <Text style={styles.instructionsText}>
            {t('verifyOtp.codeSentTo')}
            {'\n'}
            <Text style={styles.contactText}>
              {pendingVerification.contact}
            </Text>
          </Text>
          <Text style={styles.instructionsSubtext}>
            {t('verifyOtp.expiresIn', { count: expirationMinutes })}
          </Text>
        </View>

        {/* Saisie du code OTP */}
        <Animated.View 
          style={[
            styles.otpContainer,
            { transform: [{ translateX: shakeAnimation }] }
          ]}
        >
          {code.map((digit, index) => (
            <TextInput
              key={index}
              /*
               * CORRECTION DE L'ERREUR TYPESCRIPT
               * Utilisation de accolades {} au lieu de parenthèses () pour que la fonction ne retourne rien.
               */
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                attempts > 0 && !digit && styles.otpInputError,
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </Animated.View>

        {/* Informations sur les tentatives */}
        {attempts > 0 && (
          <View style={styles.attemptsInfo}>
            <Text style={styles.attemptsText}>
              {t('verifyOtp.attemptsRemaining', { count: 5 - attempts })}
            </Text>
          </View>
        )}

        {/* Bouton de renvoi */}
        <View style={styles.resendSection}>
          {canResend ? (
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={isLoading}
            >
              <RefreshCw size={16} color="#8B7355" />
              <Text style={styles.resendButtonText}>{t('verifyOtp.resendCode')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdownText}>
              {t('verifyOtp.resendCodeWait', { count: countdown })}
            </Text>
          )}
        </View>

        {/* Conseils */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>{t('verifyOtp.tipsTitle')}</Text>
          <Text style={styles.tipsText}>
            {t('verifyOtp.tips')}
          </Text>
        </View>
      </View>

      {/* Bouton de vérification manuelle */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (code.join('').length !== 6 || isLoading) && styles.disabledButton,
          ]}
          onPress={() => handleVerify()}
          disabled={code.join('').length !== 6 || isLoading}
        >
          <Text style={styles.verifyButtonText}>
            {isLoading ? t('verifyOtp.submitButtonLoading') : t('verifyOtp.submitButton')}
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
    marginBottom: 8,
  },
  contactText: {
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
  },
  instructionsSubtext: {
    fontSize: 11,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    fontStyle: 'italic',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: 'rgba(139, 115, 85, 0.2)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: 20,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#8B7355',
    backgroundColor: 'rgba(139, 115, 85, 0.05)',
  },
  otpInputError: {
    borderColor: '#C17B5C',
    backgroundColor: 'rgba(193, 123, 92, 0.05)',
  },
  attemptsInfo: {
    marginBottom: 20,
  },
  attemptsText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#C17B5C',
    textAlign: 'center',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.2)',
  },
  resendButtonText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Medium',
    color: '#8B7355',
    marginLeft: 8,
  },
  countdownText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    fontStyle: 'italic',
  },
  tipsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 20,
    width: '100%',
  },
  tipsTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 10,
    textAlign: 'center',
  },
  tipsText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 16,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: 'rgba(249, 245, 240, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
  },
  verifyButton: {
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
  verifyButtonText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F5F0',
    letterSpacing: 0.8,
  },
});