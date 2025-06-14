import { ImageSourcePropType } from 'react-native';

export interface SouffleBackground {
  id: string;
  name: string;
  description: string;
  source?: ImageSourcePropType; // La source est optionnelle pour le fond par défaut
  isPremium: boolean;
  shape: 'circle' | 'square';
}

export const AVAILABLE_BACKGROUNDS: SouffleBackground[] = [
  {
    id: 'default',
    name: 'Classique', // Nom par défaut, sera traduit via t('shop.items.default.name') si besoin
    description: 'Le fond par défaut, simple et épuré.', // Description par défaut
    // Aucune source d'image pour le fond par défaut pour éviter les erreurs
    isPremium: false,
    shape: 'circle',
  },
  {
    id: 'background_autumn', // Correction: Alignement avec la clé de traduction
    name: 'Automne Doux', // Ce nom sera écrasé par la traduction via t()
    description: 'Une douce lumière sur des feuilles d\'automne.', // Sera écrasé par la traduction
    source: require('@/assets/images/backgrounds/automn.png'),
    isPremium: true,
    shape: 'square',
  },
  {
    id: 'background_sunray', // Correction: Alignement avec la clé de traduction
    name: 'Lueur Solaire', // Ce nom sera écrasé par la traduction via t()
    description: 'Un halo de lumière chaude et bienveillante.', // Sera écrasé par la traduction
    source: require('@/assets/images/backgrounds/soleil.png'),
    isPremium: true,
    shape: 'square',
  },
  
];

export function getBackgroundById(id?: string): SouffleBackground {
  if (!id) return AVAILABLE_BACKGROUNDS[0]; 
  return AVAILABLE_BACKGROUNDS.find(bg => bg.id === id) || AVAILABLE_BACKGROUNDS[0];
}