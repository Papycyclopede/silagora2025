import type { EchoPlace, Souffle } from '@/types/souffle';
import { calculateDistance } from '@/utils/distance';

export interface EchoTrail {
  id: string;
  fromPlaceId: string;
  toPlaceId: string;
  intensity: number; // 0-1, pour l'opacité
  isActive: boolean;
  lastActivity: Date;
  emotionalResonance?: string; // Type de résonance émotionnelle
}

export interface EnhancedEchoPlace extends EchoPlace {
  intensity: 'murmure' | 'echo' | 'sanctuaire';
  colorTheme: string; // Couleur aquarelle
  connectedTrails: string[];
  emotionalSignature?: string; // Signature émotionnelle dominante
  lastVisited?: Date;
}

// Noms simples et poétiques pour les lieux d'écho
const SIMPLE_PLACE_NAMES = [
  'Jardin des Murmures',
  'Carrefour Silencieux',
  'Alcôve Secrète',
  'Refuge Tranquille',
  'Bosquet Paisible',
  'Clairière Douce',
  'Coin Contemplatif',
  'Havre de Paix',
  'Nid de Pensées',
  'Sanctuaire Discret',
  'Oasis Cachée',
  'Retraite Sereine',
  'Abri Poétique',
  'Enclave Mystérieuse',
  'Théâtre Intime'
];

// Couleurs douces pour les lieux d'écho
const PLACE_COLORS = [
  '#A8C8E1', // Bleu doux
  '#B8E6B8', // Vert tendre
  '#F4E4BC', // Beige chaud
  '#E6C8A8', // Sable
  '#D4A574', // Ocre
  '#C8D4E6', // Lavande
  '#F0C8E6', // Rose pâle
  '#E6A8A8', // Corail doux
];

// Résonances émotionnelles pour les sentiers
const EMOTIONAL_RESONANCES = [
  'mélancolie-nostalgie',
  'optimisme',
  'paix-intérieure',
  'douceur-amère',
  'enthousiasme'
];

export class EchoSimulation {
  private static instance: EchoSimulation;
  private simulatedPlaces: EnhancedEchoPlace[] = [];
  private simulatedTrails: EchoTrail[] = [];
  private isSimulationActive = false;

  static getInstance(): EchoSimulation {
    if (!EchoSimulation.instance) {
      EchoSimulation.instance = new EchoSimulation();
    }
    return EchoSimulation.instance;
  }

  // Génère des lieux d'écho simples autour de la position
  generateSimulatedEchoPlaces(
    centerLat: number, 
    centerLon: number, 
    radius: number = 2000
  ): EnhancedEchoPlace[] {
    const places: EnhancedEchoPlace[] = [];
    const placeCount = Math.floor(Math.random() * 6) + 4; // 4-9 lieux

    for (let i = 0; i < placeCount; i++) {
      // Position aléatoire dans le rayon
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      
      const lat = centerLat + (distance * Math.cos(angle)) / 111320;
      const lon = centerLon + (distance * Math.sin(angle)) / (111320 * Math.cos(centerLat * Math.PI / 180));

      const souffleCount = Math.floor(Math.random() * 15) + 3;
      const intensity = souffleCount < 5 ? 'murmure' : souffleCount < 10 ? 'echo' : 'sanctuaire';
      const colorTheme = PLACE_COLORS[Math.floor(Math.random() * PLACE_COLORS.length)];
      
      const place: EnhancedEchoPlace = {
        id: `sim_echo_${i}`,
        name: SIMPLE_PLACE_NAMES[Math.floor(Math.random() * SIMPLE_PLACE_NAMES.length)],
        latitude: lat,
        longitude: lon,
        souffleCount,
        description: this.generateSimpleDescription(intensity, souffleCount),
        intensity,
        colorTheme,
        connectedTrails: [],
        emotionalSignature: this.generateEmotionalSignature(),
      };

      places.push(place);
    }

    this.simulatedPlaces = places;
    return places;
  }

  // Génère des sentiers simples entre les lieux
  generateSimpleTrails(places: EnhancedEchoPlace[]): EchoTrail[] {
    const trails: EchoTrail[] = [];

    places.forEach((place, index) => {
      // Connecter chaque lieu à 1-2 autres lieux proches
      const connectionCount = Math.floor(Math.random() * 2) + 1;
      const nearbyPlaces = places
        .filter((other, otherIndex) => otherIndex !== index)
        .map(other => ({
          place: other,
          distance: calculateDistance(
            place.latitude,
            place.longitude,
            other.latitude,
            other.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, connectionCount);

      nearbyPlaces.forEach(({ place: targetPlace, distance }) => {
        // Éviter les doublons
        const existingTrail = trails.find(trail => 
          (trail.fromPlaceId === place.id && trail.toPlaceId === targetPlace.id) ||
          (trail.fromPlaceId === targetPlace.id && trail.toPlaceId === place.id)
        );

        if (!existingTrail && distance < 1200) { // Seulement si < 1.2km
          const trail: EchoTrail = {
            id: `trail_${place.id}_${targetPlace.id}`,
            fromPlaceId: place.id,
            toPlaceId: targetPlace.id,
            intensity: Math.random() * 0.6 + 0.3, // Entre 0.3 et 0.9
            isActive: Math.random() > 0.4, // 60% de chance d'être actif
            lastActivity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
            emotionalResonance: EMOTIONAL_RESONANCES[Math.floor(Math.random() * EMOTIONAL_RESONANCES.length)]
          };

          trails.push(trail);
          
          // Ajouter la référence dans les lieux
          place.connectedTrails.push(trail.id);
          targetPlace.connectedTrails.push(trail.id);
        }
      });
    });

    this.simulatedTrails = trails;
    return trails;
  }

  // Active la simulation complète
  activateSimulation(centerLat: number, centerLon: number): {
    places: EnhancedEchoPlace[];
    trails: EchoTrail[];
  } {
    console.log('🌟 Activation de la simulation des lieux d\'écho');
    
    const places = this.generateSimulatedEchoPlaces(centerLat, centerLon);
    const trails = this.generateSimpleTrails(places);
    
    this.isSimulationActive = true;
    
    console.log(`✨ ${places.length} lieux d'écho générés`);
    console.log(`🌊 ${trails.length} sentiers créés`);
    
    return { places, trails };
  }

  // Désactive la simulation
  deactivateSimulation(): void {
    this.simulatedPlaces = [];
    this.simulatedTrails = [];
    this.isSimulationActive = false;
    console.log('🔄 Simulation désactivée');
  }

  // Getters pour accéder aux données simulées
  getSimulatedPlaces(): EnhancedEchoPlace[] {
    return this.simulatedPlaces;
  }

  getSimulatedTrails(): EchoTrail[] {
    return this.simulatedTrails;
  }

  isActive(): boolean {
    return this.isSimulationActive;
  }

  // Méthodes privées pour la génération
  private generateSimpleDescription(intensity: string, souffleCount: number): string {
    const descriptions = {
      'murmure': [
        'Un lieu discret où quelques voix se mêlent',
        'Petit carrefour de confidences',
        'Coin tranquille de partage'
      ],
      'echo': [
        'Lieu de rencontres et d\'échanges',
        'Carrefour vivant de la communauté',
        'Point de convergence apprécié'
      ],
      'sanctuaire': [
        'Lieu très fréquenté et apprécié',
        'Carrefour majeur de la communauté',
        'Point de rassemblement privilégié'
      ]
    };

    const baseDesc = descriptions[intensity as keyof typeof descriptions];
    return `${baseDesc[Math.floor(Math.random() * baseDesc.length)]} (${souffleCount} souffles)`;
  }

  private generateEmotionalSignature(): string {
    const emotions = [
      'mélancolique', 'joyeux', 'serein', 'nostalgique', 
      'contemplatif', 'inspirant', 'apaisant', 'énergisant'
    ];
    return emotions[Math.floor(Math.random() * emotions.length)];
  }
}