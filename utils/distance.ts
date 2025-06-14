/**
 * Calcule la distance entre deux points géographiques en mètres
 * Utilise la formule de Haversine
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Vérifie si l'utilisateur est assez proche pour révéler un souffle
 */
export function isWithinRevealDistance(
  userLat: number,
  userLon: number,
  souffleLat: number,
  souffleLon: number,
  maxDistance: number = 15
): boolean {
  const distance = calculateDistance(userLat, userLon, souffleLat, souffleLon);
  return distance <= maxDistance;
}

/**
 * Vérifie si un souffle est dans le rayon de visibilité
 */
export function isWithinVisibilityRange(
  userLat: number,
  userLon: number,
  souffleLat: number,
  souffleLon: number,
  maxDistance: number = 500
): boolean {
  const distance = calculateDistance(userLat, userLon, souffleLat, souffleLon);
  return distance <= maxDistance;
}