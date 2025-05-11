import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import type { SocialMediaAccount } from '../../types/SociaMedia';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { fetchSocialMediaAccounts } from '../../lib/Services/dbService';
interface PostModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPost: (contentDescription: string, unixTimestamp: number, content_id?: number, user_providers?: string[]) => void;
  item?: any;
  selectedDate: string;
  contentMode: string;
  imageResizeNeeded: boolean;
  imageResizeOptions: 'portrait' | 'landscape' | 'square';
  setImageResizeOptions: React.Dispatch<React.SetStateAction<'portrait' | 'landscape' | 'square'>>;
}

const PostModal: React.FC<PostModalProps> = ({ isVisible, onClose, onPost, item, selectedDate, contentMode, imageResizeNeeded, setImageResizeOptions, imageResizeOptions }) => {
  const [contentDescription, setContent] = useState('');
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  
  const [selectedTime, setSelectedTime] = useState<Date | null>(null); 
  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false); 
  const [showAccountList, setShowAccountList] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const toggleAccountSelection = (id: string) => {
    setSelectedAccounts((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((uid) => uid !== id)
        : [...prev, id];
  
      if (item) {
        item.user_providers = [...updated]; 
      }
  
      return updated;
    });
  };
  


  useEffect(() => {
    const useEffectAsync = async () => {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      fetchSocialMediaAccounts(db, setAccounts);
      console.log('Social Media Accounts:', accounts);

      if (item) {
        setContent(item.description);
        if (item.user_providers) {
          try {
            const parsed = JSON.parse(item.user_providers);
            if (Array.isArray(parsed)) {
              setSelectedAccounts(parsed.map(String));
            } else {
              setSelectedAccounts([]);
            }
          } catch (e) {
            console.warn('Failed to parse user_providers:', e);
            setSelectedAccounts([]);
          }
        } else {
          setSelectedAccounts([]);
        }
        

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
    };

    useEffectAsync();
  }, [item, selectedDate]);

  useEffect(() => {
    if (!item && accounts.length > 0) {
      setSelectedAccounts(accounts.map(acc => acc.provider_user_id.toString()));
    }
  }, [accounts, item]);

  const handlePost = () => {
    if (contentDescription.trim() && selectedTime && selectedDate && selectedAccounts.length > 0) {
      // Combine selectedDate and selectedTime to create full timestamp
      const [year, month, day] = selectedDate.split('-').map(Number);
      const fullDateTime = new Date(year, month - 1, day, selectedTime.getHours(), selectedTime.getMinutes());

      // Convert to Unix time
      const unixTimestamp = Math.floor(fullDateTime.getTime() / 1000);

      onPost(contentDescription, unixTimestamp, item?.content_id, selectedAccounts); 
      setContent('');
      setSelectedTime(null);
    } else {
      Alert.alert('Incomplete Post', 'Please write something, pick a time, and select at least one account.');
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
      <TouchableOpacity onPress={() => setShowAccountList(!showAccountList)} style={styles.timeButton}>
  <Text style={styles.timeButtonText}>Select Accounts</Text>
</TouchableOpacity>

{showAccountList && (
  <View style={{ backgroundColor: '#fff', borderRadius: 5, padding: 10, marginBottom: 20 }}>
    {accounts.filter(account => contentMode === 'post' ? 
                                account.provider_name.toLocaleLowerCase() !== 'instagram' && 
                                account.provider_name.toLocaleLowerCase() !== 'youtube' &&
                                account.provider_name.toLocaleLowerCase() !== 'tiktok' : true).map(account => (
      <TouchableOpacity
        key={account.provider_user_id}
        style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}
        onPress={() => toggleAccountSelection(account.provider_user_id.toString())}
      >
        <View style={{
          width: 20, height: 20, marginRight: 10, borderRadius: 3,
          borderWidth: 1, borderColor: '#000', backgroundColor: selectedAccounts.includes(account.provider_user_id.toString()) ? '#1DA1F2' : '#fff'
        }} />
        <Text>{account.provider_name}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}


      <View style={styles.modalContainer}>
        <Text style={styles.title}>Create a Post</Text>

        {imageResizeNeeded && (
<View style={{ marginBottom: 20 }}>
  <Text style={{ color: 'white', fontSize: 16, marginBottom: 10 }}>Resize Options:</Text>

  <TouchableOpacity onPress={() => setImageResizeOptions('portrait')}>
    <Text
      style={{
        fontSize: 16,
        marginTop: 0,
        color: imageResizeOptions === 'portrait' ? 'cyan' : 'lightblue',
        fontWeight: imageResizeOptions === 'portrait' ? 'bold' : 'normal',
      }}
    >
      Resize to 1080x1350 (4:5 portrait)
    </Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => setImageResizeOptions('square')}>
    <Text
      style={{
        fontSize: 16,
        marginTop: 10,
        color: imageResizeOptions === 'square' ? 'cyan' : 'lightblue',
        fontWeight: imageResizeOptions === 'square' ? 'bold' : 'normal',
      }}
    >
      Resize to 1080x1080 (1:1 square)
    </Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => setImageResizeOptions('landscape')}>
    <Text
      style={{
        fontSize: 16,
        marginTop: 10,
        color: imageResizeOptions === 'landscape' ? 'cyan' : 'lightblue',
        fontWeight: imageResizeOptions === 'landscape' ? 'bold' : 'normal',
      }}
    >
      Resize to 1080x566 (1.91:1 landscape)
    </Text>
  </TouchableOpacity>
</View>

)}


        <TextInput
          style={styles.textInput}
          placeholder="What's happening?"
          multiline
          value={contentDescription}
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
