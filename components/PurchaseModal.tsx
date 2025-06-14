import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
  Image,
} from 'react-native';
import { X, Sparkles, Gift, CreditCard, Star, Heart } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { AVAILABLE_BACKGROUNDS, SouffleBackground } from '@/utils/backgrounds';
import { router } from 'expo-router';

interface PurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchase: (itemId: string) => Promise<void>;
}

interface PurchaseItem {
  id: string;
  name: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  benefits: string[];
  popular?: boolean;
  preview?: SouffleBackground;
}

export default function PurchaseModal({ visible, onClose, onPurchase }: PurchaseModalProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { placeSuspendedTicket } = useSouffle();

  const backgroundItems: PurchaseItem[] = AVAILABLE_BACKGROUNDS
    .filter(bg => bg.isPremium)
    .map(bg => ({
      id: bg.id,
      // Correction ici: Utilisation de la clé complète pour la traduction
      name: t(`shop.items.${bg.id}.name`), 
      description: t(`shop.items.${bg.id}.description`), 
      price: '1,99 €',
      icon: <Sparkles size={24} color="#C19A6B" />,
      benefits: [
        t(`shop.items.${bg.id}.benefit1`),
        t(`shop.items.${bg.id}.benefit2`),
        t(`shop.items.${bg.id}.benefit3`),
      ],
      preview: bg,
    }));

  const ticketItems: PurchaseItem[] = [
    {
      id: 'ticket_pack_5',
      name: t('shop.items.ticket_pack_5.name'),
      description: t('shop.items.ticket_pack_5.description'),
      price: '1,99 €',
      icon: <Gift size={24} color="#8B7355" />,
      benefits: [
        t('shop.items.ticket_pack_5.benefit1'),
        t('shop.items.ticket_pack_5.benefit2'),
        t('shop.items.ticket_pack_5.benefit3'),
      ],
      popular: true,
    },
    {
      id: 'suspended_ticket',
      name: t('shop.items.suspended_ticket.name'),
      description: t('shop.items.suspended_ticket.description'),
      price: '0,99 €',
      icon: <Heart size={24} color="#C17B5C" />,
      benefits: [
        t('shop.items.suspended_ticket.benefit1'),
        t('shop.items.suspended_ticket.benefit2'),
        t('shop.items.suspended_ticket.benefit3'),
        t('shop.items.suspended_ticket.benefit4'),
      ],
    },
  ];

  const handleGoToCreateAccount = () => {
    onClose();
    router.push('/(auth)/create-account');
  };
  
  const handlePurchaseAttempt = async (itemId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        t('shop.item_alert_account_required_title'),
        t('shop.item_alert_account_required_text'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('shop.item_alert_account_required_cta'), onPress: handleGoToCreateAccount }
        ]
      );
      return;
    }

    setIsProcessing(true);
    try {
      if (itemId === 'suspended_ticket') {
        await placeSuspendedTicket();
        Alert.alert(
          t('shop.item_alert_thanks_title'),
          t('shop.item_alert_thanks_text'),
          [{ text: t('shop.item_alert_thanks_cta'), onPress: onClose }]
        );
      } else {
        await onPurchase(itemId);
        Alert.alert(
          t('shop.item_alert_purchase_success_title'),
          t('shop.item_alert_purchase_success_text'),
          [{ text: t('shop.item_alert_purchase_success_cta'), onPress: onClose }]
        );
      }
    } catch (error) {
      Alert.alert(
        t('shop.item_alert_error_title'),
        t('shop.item_alert_error_text'),
        [{ text: t('understood') }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPurchaseItem = (item: PurchaseItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.purchaseItem, selectedItem === item.id && styles.selectedItem]}
      onPress={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
    >
      {item.popular && (<View style={styles.popularBadge}><Text style={styles.popularBadgeText}>{t('shop.item_popular')}</Text></View>)}
      <View style={styles.itemHeader}>
        {item.preview && item.preview.source ? (
          <ImageBackground 
            source={item.preview.source} 
            style={[styles.itemPreview, item.preview.shape === 'square' ? styles.itemPreviewSquare : styles.itemPreviewCircle]} 
            imageStyle={item.preview.shape === 'square' ? {borderRadius: 6} : {borderRadius: 22}} 
          />
        ) : (
          <View style={styles.itemIcon}>{item.icon}</View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>
        </View>
        <Text style={styles.itemPrice}>{item.price}</Text>
      </View>
      {selectedItem === item.id && (
        <View style={styles.itemDetails}>
          <Text style={styles.benefitsTitle}>{t('shop.item_includes')}</Text>
          {item.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <Text style={styles.benefitBullet}>•</Text>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.purchaseButton, isProcessing && styles.processingButton]}
            onPress={() => handlePurchaseAttempt(item.id)}
            disabled={isProcessing}
          >
            <CreditCard size={18} color="#F9F5F0" />
            <Text style={styles.purchaseButtonText}>
              {isProcessing
                ? t('shop.item_button_processing')
                : item.id === 'suspended_ticket'
                ? t('shop.item_button_offer', { price: item.price })
                : t('shop.item_button_buy', { price: item.price })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={22} color="#8B7355" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>{t('shop.title')}</Text>
                <Text style={styles.subtitle}>{t('shop.subtitle')}</Text>
            </View>
            <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.ethicsMessage}>
            <Text style={styles.ethicsTitle}>{t('shop.ethics_title')}</Text>
            <Text style={styles.ethicsText}>{t('shop.ethics_text')}</Text>
          </View>
          <Text style={styles.sectionTitle}>{t('shop.sections_backgrounds')}</Text>
          <View style={styles.itemsSection}>{backgroundItems.map(renderPurchaseItem)}</View>
          <Text style={styles.sectionTitle}>{t('shop.sections_tickets')}</Text>
          <View style={styles.itemsSection}>{ticketItems.map(renderPurchaseItem)}</View>
          <View style={styles.legalSection}>
            <Text style={styles.legalTitle}>{t('shop.legal_title')}</Text>
            <Text style={styles.legalText}>{t('shop.legal_text')}</Text>
          </View>
          {!isAuthenticated && (
            <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptTitle}>{t('shop.login_prompt_title')}</Text>
                <Text style={styles.loginPromptText}>{t('shop.login_prompt_text')}</Text>
                <TouchableOpacity style={styles.loginButton} onPress={handleGoToCreateAccount}>
                    <Text style={styles.loginButtonText}>{t('shop.login_prompt_button')}</Text>
                </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F5F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 115, 85, 0.08)', backgroundColor: 'rgba(249, 245, 240, 0.98)' },
  closeButton: { padding: 8 },
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 18, fontFamily: 'Quicksand-Medium', color: '#4D3B2F', marginBottom: 4 },
  subtitle: { fontSize: 12, fontFamily: 'Quicksand-Light', color: '#8B7355', fontStyle: 'italic' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 20 },
  ethicsMessage: { backgroundColor: 'rgba(139, 115, 85, 0.08)', borderRadius: 15, padding: 20, marginTop: 20, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: '#8B7355' },
  ethicsTitle: { fontSize: 16, fontFamily: 'Quicksand-Medium', color: '#4D3B2F', marginBottom: 10 },
  ethicsText: { fontSize: 13, fontFamily: 'Quicksand-Regular', color: '#8B7355', lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Quicksand-Medium', color: '#4D3B2F', marginBottom: 15, marginTop: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 115, 85, 0.1)' },
  itemsSection: { marginBottom: 25 },
  purchaseItem: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 18, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(139, 115, 85, 0.15)', position: 'relative' },
  selectedItem: { borderColor: '#8B7355', backgroundColor: 'rgba(139, 115, 85, 0.05)' },
  popularItem: { borderColor: '#C19A6B', borderWidth: 1.5 },
  popularBadge: { position: 'absolute', top: -8, right: 20, backgroundColor: '#C19A6B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularBadgeText: { fontSize: 10, fontFamily: 'Quicksand-Medium', color: '#F9F5F0' },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { marginRight: 15, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  itemPreview: { width: 44, height: 44, marginRight: 15, borderWidth: 1, borderColor: 'rgba(139, 115, 85, 0.2)' },
  itemPreviewCircle: { borderRadius: 22 },
  itemPreviewSquare: { borderRadius: 6 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontFamily: 'Quicksand-Medium', color: '#4D3B2F', marginBottom: 4 },
  itemDescription: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: '#8B7355', lineHeight: 18 },
  itemPrice: { fontSize: 18, fontFamily: 'Satisfy-Regular', color: '#4D3B2F', paddingLeft: 10 },
  itemDetails: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(139, 115, 85, 0.15)' },
  benefitsTitle: { fontSize: 14, fontFamily: 'Quicksand-Medium', color: '#4D3B2F', marginBottom: 10 },
  benefitItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  benefitBullet: { fontSize: 14, color: '#8B7355', marginRight: 8, marginTop: 2 },
  benefitText: { fontSize: 12, fontFamily: 'Quicksand-Regular', color: '#8B7355', flex: 1, lineHeight: 18 },
  purchaseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B7355', paddingVertical: 15, borderRadius: 25, marginTop: 15, shadowColor: '#4D3B2F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  processingButton: { backgroundColor: '#B8A082', opacity: 0.7 },
  purchaseButtonText: { fontSize: 15, fontFamily: 'Quicksand-Medium', color: '#F9F5F0', marginLeft: 8 },
  legalSection: { backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 12, padding: 15, marginBottom: 25 },
  legalTitle: { fontSize: 14, fontFamily: 'Quicksand-Medium', color: '#4D3B2F', marginBottom: 8 },
  legalText: { fontSize: 11, fontFamily: 'Quicksand-Light', color: '#8B7355', lineHeight: 16 },
  loginPrompt: { backgroundColor: 'rgba(139, 115, 85, 0.08)', borderRadius: 15, padding: 20, marginBottom: 30, alignItems: 'center' },
  loginPromptTitle: { fontSize: 16, fontFamily: 'Quicksand-Medium', color: '#4D3B2F', marginBottom: 10 },
  loginPromptText: { fontSize: 13, fontFamily: 'Quicksand-Regular', color: '#8B7355', textAlign: 'center', lineHeight: 20, marginBottom: 15 },
  loginButton: { backgroundColor: '#8B7355', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 20 },
  loginButtonText: { fontSize: 14, fontFamily: 'Quicksand-Medium', color: '#F9F5F0' },
});