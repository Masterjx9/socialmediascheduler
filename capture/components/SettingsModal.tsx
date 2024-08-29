import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onLogOut: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isVisible, onClose, onLogOut }) => {
  const [time, setTime] = useState(new Date());
  const [selectedContext, setSelectedContext] = useState('video');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showScheduleOptions, setShowScheduleOptions] = useState(false);

  const handleSelectFolder = async () => {
    try {
      let result;

      if (Platform.OS === 'ios') {
        result = await DocumentPicker.pickDirectory();
      } else {
        result = await DocumentPicker.pickDirectory();
      }

      if (result) {
        console.log('Selected folder:', result.uri);
        Alert.alert('Folder Selected', `You selected: ${result.uri}`);
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('Canceled folder selection');
      } else {
        console.error('Unknown error: ', err);
      }
    }
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  const handleSelectScheduleOption = (option: string) => {
    Alert.alert('Schedule Selected', `You selected: ${option}`);
    setShowScheduleOptions(false); // Close the options modal
  };

  return (
    <Modal
      presentationStyle="fullScreen"
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Text style={styles.title}>Settings</Text>

        <TouchableOpacity style={styles.capture} onPress={handleSelectFolder}>
          <Text style={styles.captureText}>Select Default Picture Folder</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.capture} onPress={handleSelectFolder}>
          <Text style={styles.captureText}>Select Default Video Folder</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.capture} onPress={() => {
  setSelectedContext('video');
  setShowScheduleOptions(true);
}}>
  <Text style={styles.captureText}>Select Default Video Schedule</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.capture} onPress={() => {
  setSelectedContext('picture');
  setShowScheduleOptions(true);
}}>
  <Text style={styles.captureText}>Select Default Picture Schedule</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.capture} onPress={() => {
  setSelectedContext('post');
  setShowScheduleOptions(true);
}}>
  <Text style={styles.captureText}>Select Default Post/Tweet/Threads Schedule</Text>
</TouchableOpacity>






        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={onChangeTime}
          />
        )}

<Modal
  transparent={true}
  visible={showScheduleOptions}
  animationType="slide"
  onRequestClose={() => setShowScheduleOptions(false)}
>
  <View style={styles.optionsModalContainer}>
    <View style={styles.optionsContainer}>
      <TouchableOpacity onPress={() => handleSelectScheduleOption(`Next available day (No ${selectedContext} scheduled)`)}>
        <Text style={styles.optionText}>Next available day (No {selectedContext} scheduled)</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleSelectScheduleOption(`Next available day (No content scheduled)`)}>
        <Text style={styles.optionText}>Next available day (No content scheduled)</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleSelectScheduleOption(`Every first of the month`)}>
        <Text style={styles.optionText}>Every first of the month</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleSelectScheduleOption(`Every 15th of the month`)}>
        <Text style={styles.optionText}>Every 15th of the month</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleSelectScheduleOption(`Pick days throughout the week`)}>
        <Text style={styles.optionText}>Pick days throughout the week</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.capture} onPress={() => setShowTimePicker(true)}>
        <Text style={styles.captureText}>
          {`Select default Time: ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.capture} onPress={() => setShowScheduleOptions(false)}>
        <Text style={styles.captureText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


        <TouchableOpacity style={styles.capture} onPress={onLogOut}>
          <Text style={styles.captureText}>Log Out</Text>
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
  optionsModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  optionsContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    padding: 10,
  },
});

export default SettingsModal;
