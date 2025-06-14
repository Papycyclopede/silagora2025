import type { Souffle, UserLocation } from '@/types/souffle';

const randomMessages = [
  "Le vent murmure une histoire que seul ce banc semble connaître.",
  "J'ai laissé un sourire ici, j'espère que quelqu'un le trouvera.",
  "Juste un instant de paix dans le tumulte de la ville.",
  "Si les murs pouvaient parler, que raconteraient-ils de nous ?",
  "Aujourd'hui, le ciel a la couleur de la mélancolie.",
  "Un café chaud, un livre, et ce petit coin du monde. Le bonheur.",
  "J'ai fermé les yeux et j'ai souhaité que ce moment dure toujours.",
  "Je me demande combien de personnes ont regardé ce même horizon avant moi.",
  "Cette lumière du soir est une promesse.",
  "Ici, même le silence a une voix.",
];

const randomEmotions = ['joyeux', 'pensif', 'triste', 'apaise', 'emu', 'silencieux'];
const randomStickers = ['heart', 'leaf', 'feather', 'star', 'flower'];

/**
 * Génère un seul souffle aléatoire près d'une localisation donnée.
 */
export function generateRandomSouffle(location: UserLocation): Souffle {
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * 500 + 50; // Entre 50 et 550 mètres
  const latOffset = (radius * Math.cos(angle)) / 111320;
  const lonOffset = (radius * Math.sin(angle)) / (111320 * Math.cos(location.latitude * Math.PI / 180));

  const now = Date.now();
  const duration = Math.random() > 0.5 ? 48 : 24; // 24 ou 48h

  return {
    id: `sim_${now}_${Math.random()}`,
    content: {
      jeMeSens: randomEmotions[Math.floor(Math.random() * randomEmotions.length)],
      messageLibre: randomMessages[Math.floor(Math.random() * randomMessages.length)],
      ceQueJaimerais: '',
    },
    latitude: location.latitude + latOffset,
    longitude: location.longitude + lonOffset,
    createdAt: new Date(now),
    expiresAt: new Date(now + duration * 60 * 60 * 1000),
    // availableAt: new Date(now + availableIn), // SUPPRIMÉ : Cette propriété n'existe plus et causait l'erreur.
    isRevealed: false,
    sticker: Math.random() > 0.6 ? randomStickers[Math.floor(Math.random() * randomStickers.length)] : undefined,
    isSimulated: true,
  };
}

/**
 * Génère un lot initial de souffles pour peupler la carte.
 */
export function generateInitialSouffleBatch(location: UserLocation, count: number): Souffle[] {
  const batch: Souffle[] = [];
  for (let i = 0; i < count; i++) {
    batch.push(generateRandomSouffle(location));
  }
  return batch;
}

/**
 * Génère un nom poétique pour un lieu.
 */
export function generatePoeticalPlaceName(): string {
  const adjectives = [
    'Silencieux', 'Murmurant', 'Éthéré', 'Lumineux', 'Mystérieux',
    'Doux', 'Serein', 'Enchanteur', 'Paisible', 'Mélancolique'
  ];
  
  const nouns = [
    'Carrefour', 'Jardin', 'Refuge', 'Sanctuaire', 'Bosquet',
    'Clairière', 'Passage', 'Coin', 'Recoin', 'Alcôve'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective} ${noun}`;
}