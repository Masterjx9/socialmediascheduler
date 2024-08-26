import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onLogOut: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isVisible, onClose, onLogOut }) => {
  return (
    <Modal
      presentationStyle="fullScreen"
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.capture} onPress={onLogOut}>
          <Text style={styles.captureText}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.capture} onPress={onClose}>
          <Text style={styles.captureText}>Close Settings</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
  capture: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
  captureText: {
    fontSize: 14,
  },
});

export default SettingsModal;
