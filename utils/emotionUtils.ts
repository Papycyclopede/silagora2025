/**
 * Ce fichier utilitaire permet de centraliser la correspondance entre un ID d'émotion et son affichage (emoji et label).
 */
export const getEmotionDisplay = (jeMeSens: string): { emoji: string; label: string } | null => {
  const EMOTIONS_MAP: { [key: string]: { emoji: string; label: string } } = {
    'joyeux': { emoji: '😀', label: 'Joyeux(se)' },
    'triste': { emoji: '😢', label: 'Triste' },
    'colere': { emoji: '😡', label: 'En colère' },
    'anxieux': { emoji: '😰', label: 'Anxieux(se)' },
    'aimant': { emoji: '🥰', label: 'Aimant(e)' },
    'fatigue': { emoji: '😴', label: 'Fatigué(e)' },
    'detendu': { emoji: '😎', label: 'Détendu(e)' },
    'pensif': { emoji: '🤔', label: 'Pensif(ve)' },
    'bouleverse': { emoji: '😭', label: 'Bouleversé(e)' },
    'apaise': { emoji: '😇', label: 'Apaisé(e)' },
    'perdu': { emoji: '😕', label: 'Perdu(e)' },
    'ironique': { emoji: '🙃', label: 'Ironique' },
    'silencieux': { emoji: '😶', label: 'Silencieux(se)' },
    'emu': { emoji: '🥹', label: 'Ému(e)' },
    'honteux': { emoji: '🫣', label: 'Honteux(se)' },
  };
  return EMOTIONS_MAP[jeMeSens] || null;
};
