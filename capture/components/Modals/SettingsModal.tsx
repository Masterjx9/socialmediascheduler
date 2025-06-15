import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchAppSettingsFromDb, insertAppSettingsIntoDb } from '../../lib/Services/dbService';
import { scheduleOptions } from '../../types/SociaMedia';
interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
}



const SettingsModal: React.FC<SettingsModalProps> = ({
  isVisible,
  onClose,
}) => {
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showScheduleOptions, setShowScheduleOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
  (async () => {
    const defaultSchedule = await fetchAppSettingsFromDb('default_schedule_option');
    const defaultTime = await fetchAppSettingsFromDb('default_schedule_time');
    console.log('Fetched default schedule:', defaultSchedule);
    console.log('Fetched default time:', defaultTime);
    if (defaultSchedule) setSelectedOption(defaultSchedule);
    if (defaultTime) {
      const [hours, minutes] = defaultTime.split(':');
      const date = new Date();
      date.setHours(parseInt(hours));
      date.setMinutes(parseInt(minutes));
      setTime(date);
    }
  })();
}, []);

  const onChangeTime = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');

    insertAppSettingsIntoDb('default_schedule_time', currentTime.toTimeString().slice(0, 5), 'update');
    setTime(currentTime);
  };

  const handleSelectScheduleOption = (option: string) => {
    
    insertAppSettingsIntoDb('default_schedule_option', option, 'update');
    insertAppSettingsIntoDb('default_schedule_time', time.toTimeString().slice(0, 5), 'update');
  };

  return (
    <Modal
      presentationStyle="fullScreen"
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Text style={styles.title}>Settings</Text>

        <TouchableOpacity
          style={styles.capture}
          onPress={() => {
            setShowScheduleOptions(true);
          }}>
          <Text style={styles.captureText}>
            Select Default Post/Tweet/Threads Schedule
          </Text>
        </TouchableOpacity>

        <Modal
          transparent={true}
          visible={showScheduleOptions}
          animationType="slide"
          onRequestClose={() => setShowScheduleOptions(false)}>
          <View style={styles.optionsModalContainer}>
            <View style={styles.optionsContainer}>
            
            {scheduleOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.radioOption}
              onPress={() => {
                handleSelectScheduleOption(option);
                setSelectedOption(option);
              }}>
              <View style={styles.radioCircle}>
                {selectedOption === option && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}

            
              <TouchableOpacity
                style={styles.capture}
                onPress={() => setShowTimePicker(true)}>
                <Text style={styles.captureText}>
                  {`Select default Time: ${time.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.capture}
                onPress={() => setShowScheduleOptions(false)}>
                <Text style={styles.captureText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={onChangeTime}
          />
        )}
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
  radioOption: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 10,
},
radioCircle: {
  height: 20,
  width: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: '#444',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
},
radioDot: {
  height: 10,
  width: 10,
  borderRadius: 5,
  backgroundColor: '#444',
},

});

export default SettingsModal;
