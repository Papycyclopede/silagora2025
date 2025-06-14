import { View } from 'react-native';

// Cet écran est une destination factice pour l'onglet "Bolt" de la barre de navigation.
// L'événement de clic sur l'onglet est intercepté dans le fichier _layout.tsx pour ouvrir un lien externe,
// donc cet écran ne sera jamais réellement visible par l'utilisateur.
export default function BoltScreen() {
  // On ne retourne rien car l'écran n'est jamais atteint.
  return null;
}
