import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface PostModalProps {
  isVisible: boolean;
  onClose: () => void;
  // onPost: (content: string, unixTimestamp: number) => void;
  onPost: (content: string, unixTimestamp: number, content_id?: number) => void;
  item?: any;
  selectedDate: string;
}

const PostModal: React.FC<PostModalProps> = ({ isVisible, onClose, onPost, item, selectedDate }) => {
  const [content, setContent] = useState('');
  const [selectedTime, setSelectedTime] = useState<Date | null>(null); 
  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false); 
  
  useEffect(() => {
    if (item) {
      setContent(item.content_data);

      // Extract date and time from item.post_date
      const postDate = new Date(item.post_date * 1000);
      setSelectedTime(postDate);
      const dateString = postDate.toISOString().split('T')[0]; // YYYY-MM-DD
      setLocalSelectedDate(dateString);
    } else {
      setContent('');
      setSelectedTime(null);
      setLocalSelectedDate(selectedDate);
    }
  }, [item, selectedDate]);

  const handlePost = () => {
    if (content.trim() && selectedTime && selectedDate) {
      // Combine selectedDate and selectedTime to create full timestamp
      const [year, month, day] = selectedDate.split('-').map(Number);
      const fullDateTime = new Date(year, month - 1, day, selectedTime.getHours(), selectedTime.getMinutes());

      // Convert to Unix time
      const unixTimestamp = Math.floor(fullDateTime.getTime() / 1000);

      onPost(content, unixTimestamp, item?.content_id); // Pass both content and timestamp
      setContent('');
      setSelectedTime(null);
    } else {
      Alert.alert('Incomplete Post', 'Please write something and pick a time before posting.');
    }
  };
  

  const showTimePicker = () => {
    setIsTimePickerVisible(true);
  };

  const hideTimePicker = () => {
    setIsTimePickerVisible(false);
  };

  const handleConfirmTime = (time: Date) => {
    setSelectedTime(time); 
    hideTimePicker();
  };

  return (
    <Modal
      presentationStyle="fullScreen"
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Text style={styles.title}>Create a Post</Text>

        <TextInput
          style={styles.textInput}
          placeholder="What's happening?"
          multiline
          value={content}
          onChangeText={setContent}
        />

      <TouchableOpacity onPress={showTimePicker} style={styles.timeButton}>
          <Text style={styles.timeButtonText}>
            {selectedTime ? selectedTime.toLocaleTimeString() : 'Pick a time'}
          </Text>
        </TouchableOpacity>

        <DateTimePickerModal
          isVisible={isTimePickerVisible}
          mode="time"
          onConfirm={handleConfirmTime}
          onCancel={hideTimePicker}
        />

        <TouchableOpacity onPress={handlePost} style={styles.postButton}>
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Cancel</Text>
        </TouchableOpacity> */}
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    minHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    textAlignVertical: 'top', // Align text to the top-left corner
    fontSize: 16,
    marginBottom: 20,
  },
  postButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 10,
    alignSelf: 'center',
  },
  postButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  timeButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  timeButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  closeButton: {
    backgroundColor: '#ff3333',
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignSelf: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#fff',
  },
});

export default PostModal;
