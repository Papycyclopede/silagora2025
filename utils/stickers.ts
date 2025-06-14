export interface Sticker {
  id: string;
  emoji: string;
  name: string;
  category: 'emotion' | 'nature' | 'object' | 'symbol';
  isPremium?: boolean;
}

export const AVAILABLE_STICKERS: Sticker[] = [
  // Émotions gratuites
  { id: 'heart', emoji: '💙', name: 'Cœur', category: 'emotion' },
  { id: 'smile', emoji: '😊', name: 'Sourire', category: 'emotion' },
  { id: 'peace', emoji: '✌️', name: 'Paix', category: 'emotion' },
  { id: 'hug', emoji: '🤗', name: 'Câlin', category: 'emotion' },
  
  // Nature gratuite
  { id: 'leaf', emoji: '🍃', name: 'Feuille', category: 'nature' },
  { id: 'flower', emoji: '🌸', name: 'Fleur', category: 'nature' },
  { id: 'sun', emoji: '☀️', name: 'Soleil', category: 'nature' },
  { id: 'moon', emoji: '🌙', name: 'Lune', category: 'nature' },
  
  // Objets gratuits
  { id: 'feather', emoji: '🪶', name: 'Plume', category: 'object' },
  { id: 'book', emoji: '📖', name: 'Livre', category: 'object' },
  { id: 'candle', emoji: '🕯️', name: 'Bougie', category: 'object' },
  
  // Symboles gratuits
  { id: 'star', emoji: '⭐', name: 'Étoile', category: 'symbol' },
  { id: 'infinity', emoji: '∞', name: 'Infini', category: 'symbol' },
  
  // Stickers premium
  { id: 'rainbow', emoji: '🌈', name: 'Arc-en-ciel', category: 'nature', isPremium: true },
  { id: 'butterfly', emoji: '🦋', name: 'Papillon', category: 'nature', isPremium: true },
  { id: 'crystal', emoji: '💎', name: 'Cristal', category: 'object', isPremium: true },
  { id: 'magic', emoji: '✨', name: 'Magie', category: 'symbol', isPremium: true },
];

export function getStickerById(id: string): Sticker | undefined {
  return AVAILABLE_STICKERS.find(sticker => sticker.id === id);
}

export function getStickersByCategory(category: Sticker['category']): Sticker[] {
  return AVAILABLE_STICKERS.filter(sticker => sticker.category === category);
}

export function getFreeStickersByCategory(category: Sticker['category']): Sticker[] {
  return AVAILABLE_STICKERS.filter(sticker => 
    sticker.category === category && !sticker.isPremium
  );
}