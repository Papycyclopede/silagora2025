import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Souffle } from '@/types/souffle';
import { calculateDistance } from '@/utils/distance';

interface ClusterData {
  id: string;
  latitude: number;
  longitude: number;
  souffles: Souffle[];
  isCluster: boolean;
}

interface MapClusterProps {
  souffles: Souffle[];
  userLocation: { latitude: number; longitude: number };
  zoomLevel?: number;
  onClusterPress?: (cluster: ClusterData) => void;
}

export default function MapCluster({ 
  souffles, 
  userLocation, 
  zoomLevel = 16,
  onClusterPress 
}: MapClusterProps) {
  
  const clusters = useMemo(() => {
    return createClusters(souffles, zoomLevel);
  }, [souffles, zoomLevel]);

  return (
    <>
      {clusters.map((cluster) => (
        <ClusterMarker
          key={cluster.id}
          cluster={cluster}
          userLocation={userLocation}
          onPress={onClusterPress}
        />
      ))}
    </>
  );
}

interface ClusterMarkerProps {
  cluster: ClusterData;
  userLocation: { latitude: number; longitude: number };
  onPress?: (cluster: ClusterData) => void;
}

function ClusterMarker({ cluster, userLocation, onPress }: ClusterMarkerProps) {
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    cluster.latitude,
    cluster.longitude
  );

  const canReveal = distance <= 15;
  const isNearby = distance <= 100;

  if (cluster.isCluster) {
    return (
      <View style={[
        styles.clusterMarker,
        isNearby && styles.clusterNearby,
        canReveal && styles.clusterCanReveal
      ]}>
        <Text style={styles.clusterCount}>{cluster.souffles.length}</Text>
        <Text style={styles.clusterLabel}>souffles</Text>
      </View>
    );
  }

  const souffle = cluster.souffles[0];
  return (
    <View style={[
      styles.souffleMarker,
      souffle.isRevealed && styles.souffleRevealed,
      canReveal && !souffle.isRevealed && styles.souffleCanReveal,
      isNearby && styles.souffleNearby
    ]}>
      {souffle.isRevealed ? (
        <Text style={styles.souffleEmoji}>💬</Text>
      ) : (
        <View style={styles.souffleHalo}>
          {canReveal && <Text style={styles.revealIcon}>👁</Text>}
        </View>
      )}
    </View>
  );
}

function createClusters(souffles: Souffle[], zoomLevel: number): ClusterData[] {
  const clusters: ClusterData[] = [];
  const processed = new Set<string>();
  
  // Distance de clustering basée sur le niveau de zoom
  const clusterDistance = getClusterDistance(zoomLevel);
  
  souffles.forEach((souffle) => {
    if (processed.has(souffle.id)) return;
    
    const nearby = souffles.filter((other) => {
      if (processed.has(other.id) || other.id === souffle.id) return false;
      
      const distance = calculateDistance(
        souffle.latitude,
        souffle.longitude,
        other.latitude,
        other.longitude
      );
      
      return distance <= clusterDistance;
    });
    
    if (nearby.length > 0) {
      // Créer un cluster
      const allSouffles = [souffle, ...nearby];
      const avgLat = allSouffles.reduce((sum, s) => sum + s.latitude, 0) / allSouffles.length;
      const avgLon = allSouffles.reduce((sum, s) => sum + s.longitude, 0) / allSouffles.length;
      
      clusters.push({
        id: `cluster_${souffle.id}`,
        latitude: avgLat,
        longitude: avgLon,
        souffles: allSouffles,
        isCluster: true
      });
      
      allSouffles.forEach(s => processed.add(s.id));
    } else {
      // Souffle individuel
      clusters.push({
        id: souffle.id,
        latitude: souffle.latitude,
        longitude: souffle.longitude,
        souffles: [souffle],
        isCluster: false
      });
      
      processed.add(souffle.id);
    }
  });
  
  return clusters;
}

function getClusterDistance(zoomLevel: number): number {
  // Plus le zoom est élevé, plus la distance de clustering est petite
  if (zoomLevel >= 18) return 10; // Très zoomé
  if (zoomLevel >= 16) return 25; // Zoom moyen
  if (zoomLevel >= 14) return 50; // Zoom large
  return 100; // Vue d'ensemble
}

const styles = StyleSheet.create({
  clusterMarker: {
    backgroundColor: 'rgba(139, 125, 107, 0.15)',
    borderRadius: 25,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 125, 107, 0.3)',
    minWidth: 50,
    minHeight: 50,
  },
  clusterNearby: {
    backgroundColor: 'rgba(168, 200, 225, 0.2)',
    borderColor: 'rgba(168, 200, 225, 0.5)',
  },
  clusterCanReveal: {
    backgroundColor: 'rgba(168, 200, 225, 0.3)',
    borderColor: '#A8C8E1',
    shadowColor: '#A8C8E1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  clusterCount: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  clusterLabel: {
    fontSize: 8,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
  souffleMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.2)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  souffleRevealed: {
    backgroundColor: '#F4E4BC',
    borderColor: '#F4E4BC',
  },
  souffleCanReveal: {
    backgroundColor: '#A8C8E1',
    borderColor: '#A8C8E1',
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: '#A8C8E1',
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  souffleNearby: {
    borderWidth: 2,
    borderColor: 'rgba(168, 200, 225, 0.6)',
  },
  souffleEmoji: {
    fontSize: 18,
  },
  souffleHalo: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'rgba(139, 125, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  revealIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontSize: 12,
    backgroundColor: '#A8C8E1',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
});