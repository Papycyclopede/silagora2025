import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Heart, MapPin, Clock, Shield, Mail, Github, ExternalLink } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext'; // Ajouté

export default function AboutScreen() {
  const { t } = useLanguage(); // Ajouté

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Header aquarelle */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('about.title')}</Text>
        <Text style={styles.etymology}>
          {t('about.etymology')}
        </Text>
        <View style={styles.decorativeLine} />
        <Text style={styles.description}>
          {t('about.description')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Philosophie aquarelle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={16} color="#8B7D6B" />
            <Text style={styles.sectionTitle}>{t('about.philosophy.title')}</Text>
          </View>
          <Text style={styles.text}>
            {t('about.philosophy.text1')}
          </Text>
          <Text style={styles.text}>
            {t('about.philosophy.text2')}
          </Text>
        </View>

        {/* Comment ça marche aquarelle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color="#8B7D6B" />
            <Text style={styles.sectionTitle}>{t('about.howItWorks.title')}</Text>
          </View>
          
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1.</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('about.howItWorks.step1.title')}</Text>
              <Text style={styles.stepText}>
                {t('about.howItWorks.step1.text')}
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>2.</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('about.howItWorks.step2.title')}</Text>
              <Text style={styles.stepText}>
                {t('about.howItWorks.step2.text')}
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>3.</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('about.howItWorks.step3.title')}</Text>
              <Text style={styles.stepText}>
                {t('about.howItWorks.step3.text')}
              </Text>
            </View>
          </View>
        </View>

        {/* Temporalité aquarelle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color="#8B7D6B" />
            <Text style={styles.sectionTitle}>{t('about.ephemeral.title')}</Text>
          </View>
          <Text style={styles.text}>
            {t('about.ephemeral.text1')}
          </Text>
          <Text style={styles.text}>
            {t('about.ephemeral.text2')}
          </Text>
        </View>

        {/* Lieux d'Écho aquarelle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about.echoPlaces.title')}</Text>
          <Text style={styles.text}>
            {t('about.echoPlaces.text')}
          </Text>
        </View>

        {/* Éthique aquarelle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={16} color="#8B7D6B" />
            <Text style={styles.sectionTitle}>{t('about.ethics.title')}</Text>
          </View>
          <Text style={styles.text}>{t('about.ethics.point1')}</Text>
          <Text style={styles.text}>{t('about.ethics.point2')}</Text>
          <Text style={styles.text}>{t('about.ethics.point3')}</Text>
          <Text style={styles.text}>{t('about.ethics.point4')}</Text>
          <Text style={styles.text}>{t('about.ethics.point5')}</Text>
        </View>

        {/* Contact et liens aquarelle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about.contact.title')}</Text>
          
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => openLink('mailto:skillhive.formation@gmail.com')}
          >
            <Mail size={14} color="#8B7D6B" />
            <Text style={styles.contactButtonText}>{t('about.contact.email')}</Text>
            <ExternalLink size={12} color="#8B7D6B" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => openLink('https://github.com/Papycyclopede/Silagora-final')}
          >
            <Github size={14} color="#8B7D6B" />
            <Text style={styles.contactButtonText}>{t('about.contact.openSource')}</Text>
            <ExternalLink size={12} color="#8B7D6B" />
          </TouchableOpacity>
        </View>

        {/* Citation finale aquarelle */}
        <View style={styles.finalQuote}>
          <Text style={styles.quoteText}>
            {t('about.quote.text')}
          </Text>
          <Text style={styles.quoteAuthor}>{t('about.quote.author')}</Text>
        </View>

        {/* Version aquarelle */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t('about.version', { version: '1.0.0' })}</Text>
          <Text style={styles.versionSubtext}>{t('about.hackathonCredit')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7F4',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 125, 107, 0.08)',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    letterSpacing: 1,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  etymology: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  decorativeLine: {
    width: 80,
    height: 1,
    backgroundColor: 'rgba(139, 125, 107, 0.3)',
    marginBottom: 16,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  text: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    marginRight: 16,
    marginTop: 2,
    fontStyle: 'italic',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.12)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  contactButtonText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    flex: 1,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  finalQuote: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 24,
    borderRadius: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#8B7D6B',
    marginBottom: 32,
  },
  quoteText: {
    fontSize: 14,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  quoteAuthor: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    textAlign: 'right',
    fontStyle: 'italic',
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 125, 107, 0.1)',
  },
  versionText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  versionSubtext: {
    fontSize: 9,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
});