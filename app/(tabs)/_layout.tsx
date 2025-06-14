// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import { MapPin, Settings, CircleHelp as HelpCircle, ChartBar as BarChart3, Shield } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// MODIFICATION : Ajout de Text pour le label personnalisé
import { Image, Linking, StyleSheet, Text } from 'react-native';

export default function TabLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fef9e3',
          borderTopWidth: 1,
          borderTopColor: 'rgba(139, 125, 107, 0.08)',
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
          // La hauteur est suffisante pour deux lignes
          height: 70 + insets.bottom,
        },
        tabBarActiveTintColor: '#A8C8E1',
        tabBarInactiveTintColor: '#B8A082',
        tabBarIconStyle: {
          marginBottom: -4,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ size, color }) => (<MapPin size={size} color={color} />),
          // MODIFICATION : Remplacement du style par un composant Label personnalisé
          tabBarLabel: ({ color, children }) => (
            <Text style={{ color, fontSize: 9, fontFamily: 'Georgia', fontStyle: 'italic', textAlign: 'center' }}>{children}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ size, color }) => (<BarChart3 size={size} color={color} />),
          // MODIFICATION : Remplacement du style par un composant Label personnalisé
          tabBarLabel: ({ color, children }) => (
            <Text style={{ color, fontSize: 9, fontFamily: 'Georgia', fontStyle: 'italic', textAlign: 'center' }}>{children}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="moderation"
        options={{
          title: t('tabs.moderation'),
          tabBarIcon: ({ size, color }) => (<Shield size={size} color={color} />),
          // MODIFICATION : Remplacement du style par un composant Label personnalisé
          tabBarLabel: ({ color, children }) => (
            <Text style={{ color, fontSize: 9, fontFamily: 'Georgia', fontStyle: 'italic', textAlign: 'center' }}>{children}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: t('tabs.about'),
          tabBarIcon: ({ size, color }) => (<HelpCircle size={size} color={color} />),
          // MODIFICATION : Remplacement du style par un composant Label personnalisé
          tabBarLabel: ({ color, children }) => (
            <Text style={{ color, fontSize: 9, fontFamily: 'Georgia', fontStyle: 'italic', textAlign: 'center' }}>{children}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ size, color }) => (<Settings size={size} color={color} />),
          // MODIFICATION : Remplacement du style par un composant Label personnalisé
          tabBarLabel: ({ color, children }) => (
            <Text style={{ color, fontSize: 9, fontFamily: 'Georgia', fontStyle: 'italic', textAlign: 'center' }}>{children}</Text>
          ),
        }}
      />

      {/* Cet onglet n'a pas besoin de la modification car son titre est déjà géré différemment */}
      <Tabs.Screen
        name="bolt"
        options={{
          title: 'Built on Bolt',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../assets/images/white_circle_360x360.png')}
              style={[styles.badgeIcon, { opacity: focused ? 1 : 0.8 }]}
            />
          ),
          // On peut aussi lui ajouter un label personnalisé si besoin
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 9, fontFamily: 'Georgia', fontStyle: 'italic', textAlign: 'center' }}>Built on Bolt</Text>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            Linking.openURL('https://bolt.new/');
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badgeIcon: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 14,
  },
});