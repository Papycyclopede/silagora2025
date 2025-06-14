import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Play, Pause, RotateCcw, Eye, Waves } from 'lucide-react-native';
import { useLocation } from '@/contexts/LocationContext';
import { useAudio } from '@/contexts/AudioContext';
import { EchoSimulation } from '@/utils/echoSimulation';

interface SimulationControlPanelProps {
  isVisible: boolean;
  onToggleVisibility: (visible: boolean) => void;
  onToggleTrails: (visible: boolean) => void;
  showTrails: boolean;
}

export default function SimulationControlPanel({ 
  isVisible, 
  onToggleVisibility, 
  onToggleTrails, 
  showTrails 
}: SimulationControlPanelProps) {
  const { location } = useLocation();
  const { playInteractionSound } = useAudio();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const echoSimulation = EchoSimulation.getInstance();
  const isSimulationActive = echoSimulation.isActive();

  const handleToggleSimulation = () => {
    playInteractionSound('navigate');
    onToggleVisibility(!isVisible);
  };

  const handleResetSimulation = () => {
    playInteractionSound('navigate');
    if (location) {
      echoSimulation.deactivateSimulation();
      setTimeout(() => {
        onToggleVisibility(true);
      }, 100);
    }
  };

  const handleToggleTrails = () => {
    playInteractionSound('navigate');
    onToggleTrails(!showTrails);
  };

  return (
    <View style={styles.container}>
      {/* Bouton principal simplifié */}
      <TouchableOpacity
        style={[
          styles.mainButton,
          isSimulationActive && styles.activeButton,
        ]}
        onPress={handleToggleSimulation}
      >
        {isSimulationActive ? (
          <Pause size={18} color="#F9F7F4" />
        ) : (
          <Play size={18} color="#8B7D6B" />
        )}
      </TouchableOpacity>

      {/* Contrôles simplifiés */}
      {isSimulationActive && (
        <View style={styles.controlPanel}>
          <View style={styles.controlRow}>
            <Eye size={12} color="#8B7D6B" />
            <Text style={styles.controlText}>Lieux</Text>
            <Switch
              value={isVisible}
              onValueChange={onToggleVisibility}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          <View style={styles.controlRow}>
            <Waves size={12} color="#8B7D6B" />
            <Text style={styles.controlText}>Sentiers</Text>
            <Switch
              value={showTrails}
              onValueChange={handleToggleTrails}
              trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }}
              thumbColor="#F9F7F4"
            />
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetSimulation}
          >
            <RotateCcw size={12} color="#8B7D6B" />
            <Text style={styles.resetButtonText}>Nouveau</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 200,
    right: 20,
    zIndex: 10,
  },
  mainButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  activeButton: {
    backgroundColor: '#A8C8E1',
    borderColor: '#A8C8E1',
  },
  controlPanel: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.15)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 140,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  controlText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 125, 107, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
  },
  resetButtonText: {
    fontSize: 10,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
});