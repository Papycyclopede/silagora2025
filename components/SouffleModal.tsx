import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { X, MapPin, Clock, Sparkles, ChevronDown } from 'lucide-react-native';
import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { AVAILABLE_STICKERS, getStickersByCategory } from '@/utils/stickers';
import type { Sticker } from '@/utils/stickers';
import { AVAILABLE_BACKGROUNDS, SouffleBackground } from '@/utils/backgrounds'; // MODIFIÉ
import { validateSouffleContent } from '@/utils/moderation';

const { width } = Dimensions.get('window');

interface SouffleModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMOTIONS = [
  { id: '', label: 'Choisir une émotion...', emoji: '' },
  { id: 'joyeux', label: 'Joyeux(se)', emoji: '😀' },
  { id: 'triste', label: 'Triste', emoji: '😢' },
  { id: 'colere', label: 'En colère', emoji: '😡' },
  { id: 'anxieux', label: 'Anxieux(se)', emoji: '😰' },
  { id: 'aimant', label: 'Aimant(e)', emoji: '🥰' },
  { id: 'fatigue', label: 'Fatigué(e)', emoji: '😴' },
  { id: 'detendu', label: 'Détendu(e)', emoji: '😎' },
  { id: 'pensif', label: 'Pensif(ve)', emoji: '🤔' },
  { id: 'bouleverse', label: 'Bouleversé(e)', emoji: '😭' },
  { id: 'apaise', label: 'Apaisé(e)', emoji: '😇' },
  { id: 'perdu', label: 'Perdu(e)', emoji: '😕' },
  { id: 'ironique', label: 'Ironique', emoji: '🙃' },
  { id: 'silencieux', label: 'Silencieux(se)', emoji: '😶' },
  { id: 'emu', label: 'Ému(e)', emoji: '🥹' },
  { id: 'honteux', label: 'Honteux(se)', emoji: '🫣' },
];

export default function SouffleModal({ visible, onClose }: SouffleModalProps) {
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState('');
  const [duration, setDuration] = useState<24 | 48>(24);
  const [selectedSticker, setSelectedSticker] = useState<string | undefined>();
  const [showStickers, setShowStickers] = useState(false);
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState<string>('default');

  const { location } = useLocation();
  const { createSouffle } = useSouffle();
  const { t } = useLanguage();
  const { isAuthenticated, user, spendPremiumCredit } = useAuth(); // MODIFIÉ
  const { playInteractionSound } = useAudio();

  const maxLength = 280;
  const remainingChars = maxLength - content.length;

  useEffect(() => {
    if (!visible) {
      setContent('');
      setEmotion('');
      setSelectedSticker(undefined);
      setShowStickers(false);
      setShowEmotionPicker(false);
      setIsSubmitting(false);
      setDuration(24);
      setSelectedBackground('default');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!location) { Alert.alert('Erreur', 'Position non disponible'); return; }
    setIsSubmitting(true);
    const souffleContent = { jeMeSens: emotion || '', messageLibre: content.trim(), ceQueJaimerais: '' };
    const validationResult = validateSouffleContent(souffleContent);

    if (validationResult.status === 'blocked') {
      Alert.alert('Message bloqué', `Votre souffle n'a pas pu être déposé pour la ou les raison(s) suivante(s) :\n- ${validationResult.reasons.join('\n- ')}`);
      setIsSubmitting(false);
      return;
    }
    
    let finalContent = souffleContent;
    if (validationResult.status === 'flagged' && validationResult.sanitizedContent) {
      finalContent = JSON.parse(validationResult.sanitizedContent);
      Alert.alert('Contenu modifié', 'Certains mots de votre souffle ont été masqués pour respecter les règles de la communauté.');
    }

    try {
      if (playInteractionSound) playInteractionSound('deposit');
      const result = await createSouffle({ content: finalContent, latitude: location.latitude, longitude: location.longitude, duration, sticker: selectedSticker, backgroundId: selectedBackground });
      if (result.success) {
        onClose();
        setTimeout(() => Alert.alert('Souffle déposé', 'Votre souffle a été délicatement déposé en ce lieu.', [{ text: 'Merveilleux', style: 'default' }]), 100);
      } else {
        Alert.alert('Erreur', result.error || 'Une erreur est survenue', [{ text: 'Compris', style: 'default' }]);
      }
    } catch (error) {
      console.error('Erreur dans handleSubmit:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite', [{ text: 'Compris', style: 'default' }]);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // NOUVELLE FONCTION : Gère la sélection d'un fond d'écran
  const handleBackgroundSelect = async (background: SouffleBackground) => {
    if (!background.isPremium) {
      setSelectedBackground(background.id);
      return;
    }

    // Si le fond est premium
    if (user?.premiumAccess) {
      // L'utilisateur a un accès premium global
      setSelectedBackground(background.id);
      return;
    }

    const currentCredits = user?.premiumUsageCredits || 0;
    if (currentCredits > 0) {
      Alert.alert(
        "Utiliser un crédit ?",
        `Vous pouvez utiliser 1 crédit premium pour ce fond. Il vous en restera ${currentCredits - 1}.`,
        [
          { text: "Annuler", style: "cancel" },
          { 
            text: "Utiliser 1 crédit",
            onPress: async () => {
              const success = await spendPremiumCredit();
              if (success) {
                setSelectedBackground(background.id);
                Alert.alert("Crédit utilisé !", `Le fond "${background.name}" a été appliqué.`);
              }
            }
          }
        ]
      );
    } else {
      Alert.alert("Crédit Premium Requis", "Trouvez des tickets suspendus sur la carte pour gagner des crédits et utiliser des fonds premium.");
    }
  };

  const handleClose = () => onClose();
  const handleEmotionSelect = (emotionId: string) => { setEmotion(emotionId); setShowEmotionPicker(false); };
  const handleStickerToggle = () => setShowStickers(!showStickers);
  const handleStickerSelect = (stickerId: string) => setSelectedSticker(selectedSticker === stickerId ? undefined : stickerId);
  const handleDurationChange = (newDuration: 24 | 48) => setDuration(newDuration);
  const getSelectedEmotionDisplay = () => { const selected = EMOTIONS.find(e => e.id === emotion); return !selected || !selected.id ? 'Choisir une émotion...' : `${selected.emoji} ${selected.label}`; };

  const renderStickerCategory = (category: Sticker['category'], title: string) => {
    const stickers = getStickersByCategory(category).filter(sticker => !sticker.isPremium);
    if (stickers.length === 0) return null;
    return (
      <View key={category} style={styles.stickerCategory}><Text style={styles.stickerCategoryTitle}>{title}</Text><View style={styles.stickerGrid}>{stickers.map(sticker => (<TouchableOpacity key={sticker.id} style={[styles.stickerItem, selectedSticker === sticker.id && styles.selectedStickerItem]} onPress={() => handleStickerSelect(sticker.id)}><Text style={styles.stickerEmoji}>{sticker.emoji}</Text></TouchableOpacity>))}</View></View>
    );
  };
  
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}><TouchableOpacity onPress={handleClose} style={styles.closeButton}><X size={20} color="#8B7D6B" /></TouchableOpacity><View style={styles.titleContainer}><Text style={styles.title}>Composer un souffle</Text><View style={styles.decorativeLine} /><Text style={styles.subtitle}>Laissez votre trace en ce lieu</Text></View><View style={styles.placeholder} /></View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!isAuthenticated && (<View style={styles.anonymousNotice}><Text style={styles.anonymousNoticeTitle}>Mode anonyme</Text><Text style={styles.anonymousNoticeText}>Votre souffle sera déposé de manière anonyme. Il flottera librement, sans être lié à une identité.</Text></View>)}
          <View style={styles.emotionSection}><Text style={styles.emotionLabel}>🧭 Comment vous sentez-vous ?</Text><Text style={styles.emotionHint}>Votre émotion accompagnera discrètement votre souffle</Text><TouchableOpacity style={styles.emotionSelector} onPress={() => setShowEmotionPicker(true)}><Text style={[styles.emotionSelectorText, !emotion && styles.emotionPlaceholder]}>{getSelectedEmotionDisplay()}</Text><ChevronDown size={18} color="#8B7D6B" /></TouchableOpacity>{emotion && (<View style={styles.selectedEmotionContainer}><Text style={styles.selectedEmotionText}>{EMOTIONS.find(e => e.id === emotion)?.emoji} {EMOTIONS.find(e => e.id === emotion)?.label}</Text></View>)}</View>
          <View style={styles.textContainer}><View style={styles.inkWell}><Text style={styles.featherIcon}>🪶</Text></View><TextInput style={styles.textInput} placeholder="Que souhaitez-vous murmurer à ce lieu ?" placeholderTextColor="#B8A082" multiline value={content} onChangeText={setContent} maxLength={maxLength} textAlignVertical="top" /></View>
          <View style={styles.charCounter}><View style={styles.inkDrop} /><Text style={[styles.charCountText, remainingChars < 20 && styles.charCountWarning, remainingChars < 0 && styles.charCountError]}>{remainingChars} caractères restants</Text></View>
          {selectedSticker && (<View style={styles.selectedStickerContainer}><Text style={styles.selectedStickerLabel}>Ornement choisi :</Text><Text style={styles.selectedStickerEmoji}>{AVAILABLE_STICKERS.find(s => s.id === selectedSticker)?.emoji}</Text><TouchableOpacity onPress={() => setSelectedSticker(undefined)} style={styles.removeStickerButton}><X size={14} color="#8B7D6B" /></TouchableOpacity></View>)}
          <TouchableOpacity style={styles.stickerToggleButton} onPress={handleStickerToggle}><Sparkles size={14} color="#8B7D6B" /><Text style={styles.stickerToggleText}>{showStickers ? 'Masquer les ornements' : 'Ajouter un ornement'}</Text></TouchableOpacity>
          {showStickers && (<View style={styles.stickerSection}><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.stickerCategories}>{renderStickerCategory('emotion', 'Émotions')}{renderStickerCategory('nature', 'Nature')}{renderStickerCategory('object', 'Objets')}{renderStickerCategory('symbol', 'Symboles')}</View></ScrollView><View style={styles.premiumNote}><Text style={styles.premiumNoteText}>✨ Trouvez des tickets suspendus sur la carte pour débloquer les ornements premium !</Text></View></View>)}
          
          <View style={styles.backgroundSection}>
            <View style={styles.sectionHeader}><Sparkles size={14} color="#8B7D6B" /><Text style={styles.sectionTitle}>Fond du Souffle</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
              {AVAILABLE_BACKGROUNDS.map(bg => (
                <TouchableOpacity
                  key={bg.id}
                  onPress={() => handleBackgroundSelect(bg)} // MODIFIÉ
                  style={[styles.backgroundItem, bg.shape === 'square' ? styles.backgroundItemSquare : styles.backgroundItemCircle, selectedBackground === bg.id && styles.selectedBackgroundItem]}
                >
                  <Image source={bg.source} style={[styles.backgroundImagePreview, bg.shape === 'square' ? {borderRadius: 6} : {borderRadius: 30}]} />
                  {bg.isPremium && <Text style={styles.premiumIcon}>✨</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.backgroundHint}>Utilisez vos crédits gagnés pour débloquer les fonds premium.</Text>
          </View>
          
          <View style={styles.durationSection}><View style={styles.sectionHeader}><Clock size={14} color="#8B7D6B" /><Text style={styles.sectionTitle}>Durée de vie du souffle</Text></View><View style={styles.durationButtons}><TouchableOpacity style={[styles.durationButton, duration === 24 && styles.activeDurationButton]} onPress={() => handleDurationChange(24)}><Text style={[styles.durationButtonText, duration === 24 && styles.activeDurationButtonText]}>24 heures</Text><View style={[styles.durationDot, duration === 24 && styles.activeDurationDot]} /></TouchableOpacity><TouchableOpacity style={[styles.durationButton, duration === 48 && styles.activeDurationButton]} onPress={() => handleDurationChange(48)}><Text style={[styles.durationButtonText, duration === 48 && styles.activeDurationButtonText]}>48 heures</Text><View style={[styles.durationDot, duration === 48 && styles.activeDurationDot]} /></TouchableOpacity></View></View>
          {location && (<View style={styles.locationInfo}><MapPin size={12} color="#8B7D6B" /><Text style={styles.locationText}>Votre souffle sera ancré à ce lieu précis, comme une empreinte invisible</Text></View>)}
          <View style={styles.poeticMessage}><Text style={styles.poeticQuote}>"</Text><Text style={styles.poeticText}>Un souffle déposé ici ne pourra être révélé que par ceux qui fouleront ce même sol, créant une rencontre fortuite entre âmes errantes.</Text><Text style={styles.poeticQuote}>"</Text></View>
        </ScrollView>

        <View style={styles.footer}><TouchableOpacity style={[styles.submitButton, (!content.trim() || !location || isSubmitting) && styles.disabledButton]} onPress={handleSubmit} disabled={!content.trim() || !location || isSubmitting}><Text style={styles.submitButtonIcon}>🪶</Text><Text style={styles.submitButtonText}>{isSubmitting ? 'Dépôt en cours...' : 'Déposer délicatement'}</Text></TouchableOpacity></View>

        {showEmotionPicker && (<Modal visible={showEmotionPicker} transparent={true} animationType="fade" onRequestClose={() => setShowEmotionPicker(false)}><View style={styles.modalOverlay}><View style={styles.emotionPickerModal}><View style={styles.emotionPickerHeader}><Text style={styles.emotionPickerTitle}>Choisir une émotion</Text><TouchableOpacity onPress={() => setShowEmotionPicker(false)} style={styles.emotionCloseButton}><X size={20} color="#8B7D6B" /></TouchableOpacity></View><ScrollView style={styles.emotionList} showsVerticalScrollIndicator={false}>{EMOTIONS.map((emotionItem) => (<TouchableOpacity key={emotionItem.id} style={[styles.emotionOption, emotion === emotionItem.id && styles.selectedEmotionOption]} onPress={() => handleEmotionSelect(emotionItem.id)}><Text style={styles.emotionOptionEmoji}>{emotionItem.emoji}</Text><Text style={[styles.emotionOptionText, emotion === emotionItem.id && styles.selectedEmotionOptionText]}>{emotionItem.label}</Text></TouchableOpacity>))}</ScrollView></View></View></Modal>)}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 125, 107, 0.08)', backgroundColor: 'rgba(249, 247, 244, 0.98)' },
  closeButton: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 16 },
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 16, fontFamily: 'Georgia', color: '#5D4E37', letterSpacing: 0.8, marginBottom: 8, fontStyle: 'italic' },
  decorativeLine: { width: 50, height: 1, backgroundColor: 'rgba(139, 125, 107, 0.3)', marginBottom: 6 },
  subtitle: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 24 },
  anonymousNotice: { backgroundColor: 'rgba(139, 125, 107, 0.06)', borderRadius: 16, padding: 16, marginTop: 20, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#8B7D6B' },
  anonymousNoticeTitle: { fontSize: 12, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 6, fontStyle: 'italic' },
  anonymousNoticeText: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', lineHeight: 16, fontStyle: 'italic' },
  emotionSection: { marginTop: 20, marginBottom: 24 },
  emotionLabel: { fontSize: 14, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 6, fontStyle: 'italic' },
  emotionHint: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic', marginBottom: 16, lineHeight: 16 },
  emotionSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)', paddingHorizontal: 16, paddingVertical: 14 },
  emotionSelectorText: { fontSize: 14, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic', flex: 1 },
  emotionPlaceholder: { color: '#B8A082' },
  selectedEmotionContainer: { backgroundColor: 'rgba(139, 125, 107, 0.08)', borderRadius: 12, padding: 12, marginTop: 12, alignItems: 'center' },
  selectedEmotionText: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  textContainer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 20, minHeight: 140, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.12)', flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, marginTop: 20 },
  inkWell: { marginTop: 2, marginRight: 16, padding: 4 },
  featherIcon: { fontSize: 16, opacity: 0.7 },
  textInput: { flex: 1, fontSize: 15, fontFamily: 'Georgia', color: '#5D4E37', lineHeight: 24, fontStyle: 'italic' },
  charCounter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, marginBottom: 20 },
  inkDrop: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#8B7D6B', marginRight: 8, opacity: 0.6 },
  charCountText: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', letterSpacing: 0.3, fontStyle: 'italic' },
  charCountWarning: { color: '#D4A574' },
  charCountError: { color: '#C17B5C' },
  selectedStickerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 125, 107, 0.06)', padding: 12, borderRadius: 16, marginBottom: 16 },
  selectedStickerLabel: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', marginRight: 8, fontStyle: 'italic' },
  selectedStickerEmoji: { fontSize: 18, marginRight: 8 },
  removeStickerButton: { marginLeft: 'auto', padding: 4, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 12 },
  stickerToggleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.85)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)', marginBottom: 16 },
  stickerToggleText: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', marginLeft: 8, fontStyle: 'italic' },
  stickerSection: { marginBottom: 20 },
  stickerCategories: { flexDirection: 'row', paddingVertical: 10 },
  stickerCategory: { marginRight: 20, alignItems: 'center' },
  stickerCategoryTitle: { fontSize: 11, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 10, textAlign: 'center', fontStyle: 'italic' },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 140 },
  stickerItem: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(255, 255, 255, 0.85)', alignItems: 'center', justifyContent: 'center', margin: 4, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.12)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  selectedStickerItem: { backgroundColor: '#A8C8E1', borderColor: '#A8C8E1' },
  stickerEmoji: { fontSize: 18 },
  premiumNote: { backgroundColor: 'rgba(244, 228, 188, 0.1)', borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: 'rgba(244, 228, 188, 0.3)' },
  premiumNoteText: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic' },
  backgroundSection: { marginBottom: 20 },
  backgroundItem: { width: 60, height: 60, marginHorizontal: 5, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  backgroundItemCircle: { borderRadius: 30 },
  backgroundItemSquare: { borderRadius: 8 },
  selectedBackgroundItem: { borderColor: '#A8C8E1' },
  backgroundImagePreview: { width: '100%', height: '100%' },
  premiumIcon: { position: 'absolute', bottom: -2, right: -2, fontSize: 14, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  backgroundHint: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  durationSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', marginLeft: 8, letterSpacing: 0.5, fontStyle: 'italic' },
  durationButtons: { flexDirection: 'row', gap: 16 },
  durationButton: { flex: 1, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  activeDurationButton: { backgroundColor: '#A8C8E1', borderColor: '#A8C8E1' },
  durationButtonText: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', letterSpacing: 0.3, fontStyle: 'italic' },
  activeDurationButtonText: { color: '#F9F7F4' },
  durationDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(139, 125, 107, 0.3)', marginLeft: 8 },
  activeDurationDot: { backgroundColor: '#F9F7F4' },
  locationInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 125, 107, 0.06)', padding: 16, borderRadius: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)' },
  locationText: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', marginLeft: 10, fontStyle: 'italic', flex: 1, letterSpacing: 0.2, lineHeight: 16 },
  poeticMessage: { backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: 20, borderRadius: 18, borderLeftWidth: 3, borderLeftColor: '#8B7D6B', flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  poeticQuote: { fontSize: 20, fontFamily: 'Georgia', color: '#8B7D6B', opacity: 0.5 },
  poeticText: { fontSize: 12, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic', lineHeight: 18, textAlign: 'center', flex: 1, marginHorizontal: 8, letterSpacing: 0.3 },
  footer: { paddingHorizontal: 24, paddingVertical: 28, backgroundColor: 'rgba(249, 247, 244, 0.98)', borderTopWidth: 1, borderTopColor: 'rgba(139, 125, 107, 0.08)' },
  submitButton: { backgroundColor: '#A8C8E1', paddingVertical: 18, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  disabledButton: { backgroundColor: '#B8A082', opacity: 0.6 },
  submitButtonIcon: { fontSize: 16, marginRight: 10 },
  submitButtonText: { fontSize: 14, fontFamily: 'Georgia', color: '#F9F7F4', letterSpacing: 0.8, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(93, 78, 55, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  emotionPickerModal: { backgroundColor: '#F9F7F4', borderRadius: 24, padding: 24, maxWidth: 400, width: '100%', maxHeight: '70%', borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },
  emotionPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 125, 107, 0.1)' },
  emotionPickerTitle: { fontSize: 16, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  emotionCloseButton: { padding: 4, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 12 },
  emotionList: { maxHeight: 300 },
  emotionOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4, backgroundColor: 'rgba(255, 255, 255, 0.6)' },
  selectedEmotionOption: { backgroundColor: '#A8C8E1' },
  emotionOptionEmoji: { fontSize: 20, marginRight: 12, width: 24, textAlign: 'center' },
  emotionOptionText: { fontSize: 14, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic', flex: 1 },
  selectedEmotionOptionText: { color: '#F9F7F4' },
});