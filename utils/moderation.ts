import type { SouffleContent } from '@/types/souffle';

// --- CONFIGURATION DE LA MODÉRATION ---

const THRESHOLD_BLOCK = 10; // Score à partir duquel le message est entièrement bloqué
const THRESHOLD_SANITIZE = 4; // Score à partir duquel on censure les mots (****)

// Pondération des infractions
const WEIGHTS = {
  FORBIDDEN_WORD: 5,
  SUSPICIOUS_WORD: 2,
  PERSONAL_INFO: 15, // Bloque quasi-instantanément
  EXCESSIVE_CAPS: 1,
  REPETITION: 3,
  URL: 15,
};

// --- DICTIONNAIRES ET PATTERNS ---

const FORBIDDEN_WORDS = [
  // Insultes fortes
  'connard', 'salope', 'putain', 'merde', 'con', 'conne', 'encule', 'fdp',
  // Haine & extrémisme
  'nazi', 'hitler', 'terroriste', 'raciste', 'daesh',
  // Drogues & Illégal
  'drogue', 'suicide', 'meurtre',
  // Spam & Pub
  'bitcoin', 'crypto', 'investissement', 'argent facile', 'promo', 'gratuit',
];

const SUSPICIOUS_WORDS = [
  'sexe', 'porn', 'weed', 'arnaque', 'secte', 'viagra'
];

// Caractères "confusables" pour contrer le leetspeak
const CONFUSABLE_CHARS: { [key: string]: string } = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '@': 'a', '$': 's', '€': 'e', '!': 'i',
};

// Expressions régulières pour détecter les informations personnelles
const REGEX_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+33|0)[1-9]([.\- ]?\d{2}){4}/g,
  URL: /(https?:\/\/[^\s]+)/g,
};

// --- FONCTIONS DE MODÉRATION ---

/**
 * Nettoie et "dé-obfusque" un texte pour l'analyse.
 * Met en minuscule, enlève les accents et remplace les caractères similaires (leetspeak).
 */
function normalizeAndDeobfuscate(text: string): string {
  let normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const char in CONFUSABLE_CHARS) {
    normalized = normalized.replace(new RegExp(`\\${char}`, 'g'), CONFUSABLE_CHARS[char]);
  }
  return normalized;
}

/**
 * Censure une liste de mots dans un texte en les remplaçant par des astérisques.
 */
export function sanitizeContent(content: string, wordsToSanitize: string[]): string {
  let sanitized = content;
  wordsToSanitize.forEach(word => {
    // Crée une regex insensible à la casse pour le mot exact
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '*'.repeat(word.length));
  });
  return sanitized;
}

interface ValidationResult {
  status: 'allowed' | 'flagged' | 'blocked';
  sanitizedContent?: string;
  reasons: string[];
}

/**
 * Valide un souffle en utilisant un système de score de toxicité.
 */
export function validateSouffleContent(content: SouffleContent): ValidationResult {
  const allText = `${content.jeMeSens || ''} ${content.messageLibre || ''} ${content.ceQueJaimerais || ''}`.trim();

  if (allText.length === 0) {
    return { status: 'blocked', reasons: ['Le souffle ne peut pas être vide.'] };
  }
  if (allText.length > 500) { // Limite plus stricte
    return { status: 'blocked', reasons: ['Le souffle est trop long (500 caractères max).'] };
  }

  const normalizedText = normalizeAndDeobfuscate(allText);
  let score = 0;
  const reasons: string[] = [];
  let wordsToSanitize: string[] = [];

  // 1. Détection de patterns (Regex)
  for (const key in REGEX_PATTERNS) {
    if (REGEX_PATTERNS[key as keyof typeof REGEX_PATTERNS].test(allText)) {
      score += WEIGHTS.PERSONAL_INFO;
      reasons.push('Informations personnelles ou liens détectés.');
    }
  }

  // 2. Détection de mots-clés
  FORBIDDEN_WORDS.forEach(word => {
    if (normalizedText.includes(word)) {
      score += WEIGHTS.FORBIDDEN_WORD;
      reasons.push(`Contenu inapproprié détecté (${word}).`);
      wordsToSanitize.push(word);
    }
  });
  SUSPICIOUS_WORDS.forEach(word => {
    if (normalizedText.includes(word)) {
      score += WEIGHTS.SUSPICIOUS_WORD;
      reasons.push(`Contenu suspect détecté (${word}).`);
      wordsToSanitize.push(word);
    }
  });

  // 3. Analyse comportementale
  const capsRatio = (allText.match(/[A-Z]/g)?.length || 0) / allText.length;
  if (capsRatio > 0.5 && allText.length > 20) {
    score += WEIGHTS.EXCESSIVE_CAPS;
    reasons.push('Usage excessif de majuscules.');
  }

  if (/(.)\1{3,}/.test(allText)) { // Détecte plus de 3 caractères identiques à la suite
    score += WEIGHTS.REPETITION;
    reasons.push('Répétition excessive de caractères.');
  }
  
  // 4. Décision finale basée sur le score
  if (score >= THRESHOLD_BLOCK) {
    return { status: 'blocked', reasons };
  }

  if (score >= THRESHOLD_SANITIZE) {
    const sanitizedText = sanitizeContent(allText, wordsToSanitize);
    // On ne censure que le message principal pour ne pas altérer les autres champs
    const sanitizedSouffleContent = {
      ...content,
      messageLibre: sanitizeContent(content.messageLibre, wordsToSanitize),
    };
    return {
      status: 'flagged',
      sanitizedContent: JSON.stringify(sanitizedSouffleContent), // On renvoie le contenu modifié
      reasons
    };
  }

  return { status: 'allowed', reasons: [] };
}