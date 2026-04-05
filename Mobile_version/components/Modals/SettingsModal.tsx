import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Modal from '../../lib/Compat/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  fetchAppSettingsFromDb,
  insertAppSettingsIntoDb,
} from '../../lib/Services/dbService';
import { scheduleOptions } from '../../types/SociaMedia';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const formatTimeHHmm = (value: Date): string => {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const withMinutesDelta = (value: Date, deltaMinutes: number): Date => {
  const next = new Date(value);
  next.setMinutes(next.getMinutes() + deltaMinutes);
  return next;
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isVisible, onClose }) => {
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>(
    scheduleOptions[0] ?? 'Next available day',
  );

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    (async () => {
      const defaultSchedule = await fetchAppSettingsFromDb('default_schedule_option');
      const defaultTime = await fetchAppSettingsFromDb('default_schedule_time');

      if (defaultSchedule) {
        setSelectedOption(defaultSchedule);
      }

      if (defaultTime && defaultTime.includes(':')) {
        const [hours, minutes] = defaultTime.split(':');
        const date = new Date();
        date.setHours(Number(hours), Number(minutes), 0, 0);
        setTime(date);
      }
    })().catch((error) => {
      console.log('Error loading settings:', error);
    });
  }, [isVisible]);

  const persistSettings = async (option: string, nextTime: Date) => {
    await insertAppSettingsIntoDb('default_schedule_option', option, 'update');
    await insertAppSettingsIntoDb('default_schedule_time', formatTimeHHmm(nextTime), 'update');
  };

  const handleSelectScheduleOption = async (option: string) => {
    setSelectedOption(option);
    await persistSettings(option, time);
  };

  const handleTimeDelta = async (deltaMinutes: number) => {
    const nextTime = withMinutesDelta(time, deltaMinutes);
    setTime(nextTime);
    await persistSettings(selectedOption, nextTime);
  };

  const onChangeTime = async (_event: any, selectedTime?: Date) => {
    if (!selectedTime) {
      setShowTimePicker(false);
      return;
    }

    setShowTimePicker(Platform.OS === 'ios');
    setTime(selectedTime);
    await persistSettings(selectedOption, selectedTime);
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
        <Text style={styles.sectionTitle}>Default Schedule</Text>

        {scheduleOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.radioOption}
            onPress={() => {
              handleSelectScheduleOption(option).catch((error) =>
                console.log('Error saving schedule option:', error),
              );
            }}
          >
            <View style={styles.radioCircle}>
              {selectedOption === option && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Default Time</Text>
        {Platform.OS === 'windows' ? (
          <View style={styles.windowsTimeContainer}>
            <TouchableOpacity
              style={styles.timeControlButton}
              onPress={() => {
                handleTimeDelta(-15).catch((error) =>
                  console.log('Error updating time:', error),
                );
              }}
            >
              <Text style={styles.timeControlText}>-15m</Text>
            </TouchableOpacity>
            <Text style={styles.timeValue}>{formatTimeHHmm(time)}</Text>
            <TouchableOpacity
              style={styles.timeControlButton}
              onPress={() => {
                handleTimeDelta(15).catch((error) =>
                  console.log('Error updating time:', error),
                );
              }}
            >
              <Text style={styles.timeControlText}>+15m</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.capture}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.captureText}>
              {`Select default time: ${time.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`}
            </Text>
          </TouchableOpacity>
        )}

        {showTimePicker && Platform.OS !== 'windows' && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={(event, selected) => {
              onChangeTime(event, selected).catch((error) =>
                console.log('Error setting time:', error),
              );
            }}
          />
        )}

        <TouchableOpacity style={styles.capture} onPress={onClose}>
          <Text style={styles.captureText}>Close</Text>
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    color: 'black',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  capture: {
    backgroundColor: 'rgba(0, 52, 112, 0.95)',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 16,
  },
  captureText: {
    fontSize: 14,
    color: 'white',
  },
  optionText: {
    fontSize: 16,
    paddingVertical: 6,
    color: '#111827',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    width: '100%',
    maxWidth: 420,
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
  windowsTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  timeControlButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  timeControlText: {
    color: '#111827',
    fontWeight: '600',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 12,
    color: '#111827',
    minWidth: 70,
    textAlign: 'center',
  },
});

export default SettingsModal;
