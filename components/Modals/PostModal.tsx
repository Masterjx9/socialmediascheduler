import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform  } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import type { SocialMediaAccount } from '../../types/SociaMedia';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { fetchSocialMediaAccounts, fetchAppSettingsFromDb, fetchNextAvailableScheduleDateFromDb } from '../../lib/Services/dbService';
import { YOUTUBE_CATEGORIES } from '../../types/SociaMedia';
import { handleThumbnailImport } from '../../lib/Helpers/fileHelper';

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
  unsupportedAudioCodec: boolean;
  setUnsupportedAudioCodec: React.Dispatch<React.SetStateAction<boolean>>;
  youtubeTitle: string;
  setYoutubeTitle: React.Dispatch<React.SetStateAction<string>>;
  contentPrivacy: 'public' | 'private' | 'unlisted';
  isMadeForKids?: boolean;
  setContentPrivacy: React.Dispatch<React.SetStateAction<'public' | 'private' | 'unlisted'>>;
  setIsMadeForKids: React.Dispatch<React.SetStateAction<boolean>>;
  accounts: SocialMediaAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>;
  selectedThumbnail: { uri: string; type: string; name: string } | null;
  setSelectedThumbnail: React.Dispatch<React.SetStateAction<{ uri: string; type: string; name: string } | null>>;
  youtubeCategory?: string | number;
  setYoutubeCategory?: React.Dispatch<React.SetStateAction<number>> 
  youtubeTags?: string;
  setYoutubeTags?: React.Dispatch<React.SetStateAction<string>>;
}

const PostModal: React.FC<PostModalProps> = ({ isVisible, 
                                                onClose, 
                                                onPost, 
                                                item, 
                                                selectedDate, 
                                                contentMode, 
                                                imageResizeNeeded, 
                                                setImageResizeOptions, 
                                                imageResizeOptions, 
                                                unsupportedAudioCodec, 
                                                youtubeTitle, 
                                                setYoutubeTitle,
                                                contentPrivacy,
                                                isMadeForKids,
                                                setContentPrivacy,
                                                setIsMadeForKids,
                                                accounts,
                                                setAccounts,
                                                selectedThumbnail,
                                                setSelectedThumbnail,
                                                youtubeCategory,
                                                setYoutubeCategory,
                                                youtubeTags,
                                                setYoutubeTags
                                               }) => {
  const [contentDescription, setContent] = useState('');
  
  const [selectedTime, setSelectedTime] = useState<Date | null>(null); 
  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate);
  const [defaultScheduleOption, setDefaultScheduleOption] = useState<string | null>(null);
  const [defaultScheduleTime, setDefaultScheduleTime] = useState<string | null>(null);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false); 
  const [showAccountList, setShowAccountList] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isDefaultSchedule, setIsDefaultSchedule] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [useThumbnail, setUseThumbnail] = useState(false);
  const [showError, setShowError] = useState(false);
  
  
// const [youtubeTitle, setYoutubeTitle] = useState('');
// const [contentPrivacy, setContentPrivacy] = useState<'public' | 'private' | 'unlisted'>('public');

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
  if (isVisible) {
    (async () => {
      const defaultSchedule = await fetchAppSettingsFromDb('default_schedule_option');
      setDefaultScheduleOption(defaultSchedule);
      const defaultTime = await fetchAppSettingsFromDb('default_schedule_time');
      setDefaultScheduleTime(defaultTime);
      console.log('Fetched default schedule:', defaultSchedule);
      console.log('Fetched default time:', defaultTime);
      if (defaultTime) {
        const [hours, minutes] = defaultTime.split(':');
        const date = new Date();
        date.setHours(parseInt(hours));
        date.setMinutes(parseInt(minutes));
        date.setSeconds(0);
        date.setMilliseconds(0);
        setSelectedTime(date);
      }
    })();
   if (accounts.length === 0 || item) return;

  let ids = accounts.map(acc => acc.provider_user_id.toString());

  if (contentMode === 'post') {
    ids = ids.filter(id => {
      const a = accounts.find(x => x.provider_user_id.toString() === id);
      return a && !['instagram', 'youtube', 'tiktok'].includes(a.provider_name.toLowerCase());
    });
  }

  if (contentMode === 'image') {
    ids = ids.filter(id => {
      const a = accounts.find(x => x.provider_user_id.toString() === id);
      return a && a.provider_name.toLowerCase() !== 'youtube';
    });
  }

  if (contentMode === 'video' && unsupportedAudioCodec) {
    ids = ids.filter(id => {
      const a = accounts.find(x => x.provider_user_id.toString() === id);
      return a && !['twitter', 'instagram', 'threads'].includes(a.provider_name.toLowerCase());
    });
  }

  setSelectedAccounts(ids);
  }
}, [isVisible, contentMode, unsupportedAudioCodec, accounts]);



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

        if (item.published !== '{}' && !item.published?.includes('"final":"success"')) {
          setShowError(true);
        }
      } else {
        setContent('');
        setSelectedTime(null);
        setLocalSelectedDate(selectedDate);
      }
    };

    useEffectAsync();
  }, [item, selectedDate, contentMode, isVisible]);

  const handlePost = async () => {
    if (contentDescription.trim() && selectedTime && (localSelectedDate || defaultScheduleOption) && selectedAccounts.length > 0) {
      let year: number | undefined, month: number | undefined, day: number | undefined;
      let fullDateTime: Date;
      console.log("localSelectedDate: ", localSelectedDate)
      console.log("localSelectedDate: ", localSelectedDate)
      console.log("localSelectedDate: ", localSelectedDate)
      if (isDefaultSchedule && defaultScheduleOption && defaultScheduleTime) {
        const result = await fetchNextAvailableScheduleDateFromDb(defaultScheduleOption);
        if (result)
        {
          [year, month, day] = result;
        }
      }
      else if (localSelectedDate) {
       
        [year, month, day] = localSelectedDate.split('-').map(Number);
        console.log("localSelectedDate: ", localSelectedDate)
    }

    console.log("year: ", year)
    console.log("year typeof: ", typeof year)
    console.log("month: ", month)
    console.log("month typeof: ", typeof month)
    console.log("day: ", day)
    console.log("day typeof: ", typeof day)

      if (typeof year === 'number' && typeof month === 'number' && typeof day === 'number') {
        fullDateTime = new Date(year, month - 1, day, selectedTime.getHours(), selectedTime.getMinutes());
        // Convert to Unix time
        const unixTimestamp = Math.floor(fullDateTime.getTime() / 1000);
        console.log(item);
        onPost(contentDescription, unixTimestamp, item?.content_id, selectedAccounts); 
        setContent('');
        setSelectedTime(null);
      } 

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
  {
    accounts
        .filter(account => {
          const lowerName = account.provider_name.toLowerCase();

          if (contentMode === 'post') {
            return lowerName !== 'instagram' &&
                  lowerName !== 'youtube' &&
                  lowerName !== 'tiktok';
          }
          if (contentMode === 'image') {
            return lowerName !== 'youtube';
          }

          if (contentMode === 'video' && unsupportedAudioCodec) {
            return lowerName !== 'twitter' &&
                  lowerName !== 'instagram' &&
                  lowerName !== 'threads';
          }

          return true;
        })
        .map(account => (
        <TouchableOpacity
          key={account.provider_user_id}
          style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}
          onPress={() => toggleAccountSelection(account.provider_user_id.toString())}
        >
          <View style={{
            width: 20, height: 20, marginRight: 10, borderRadius: 3,
            borderWidth: 1, borderColor: '#000', backgroundColor: selectedAccounts.includes(account.provider_user_id.toString()) ? '#1DA1F2' : '#fff'
          }} />
          <Text>{account.provider_name} - {account.account_name}</Text>
        </TouchableOpacity>
      ))
  }
  
  </View>
)}



  <KeyboardAvoidingView style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                          <ScrollView style={styles.modalContainer} keyboardShouldPersistTaps="handled"
                          contentContainerStyle={{ paddingBottom: 80 }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            padding: 15,
            zIndex: 10,
          }}>
  <TouchableOpacity
    onPress={() => {
      console.log('Default Schedule Selected');
        setIsDefaultSchedule(!isDefaultSchedule);
    }}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1DA1F2',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 5,
    }}
  >
    {/* CHECKMARK BOX LEFT SIDE */}
    <View style={{
      width: 20,
      height: 20,
      marginRight: 10,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: '#fff',
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* <Text style={{ color: '#1DA1F2', fontWeight: 'bold', fontSize: 14 }}>✓</Text> */}
      <Text 
      
      style={{ color: '#1DA1F2', fontWeight: 'bold', fontSize: 14 }}>
        {isDefaultSchedule ? '✓' : ''}
      </Text>
    </View>

    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
      Default Schedule
    </Text>
  </TouchableOpacity>
</View>

{showError && (
          <Text style={{ color: 'red', fontSize: 16, marginBottom: 20 }}>
            {'Error: Post not published successfully.'}
          </Text>
        )}


        <Text style={styles.title}>Create a Post</Text>

        {/* if one of the accounts selected is youtube then show title and privacy */}

{selectedAccounts.some(id => {
  const account = accounts.find(acc => acc.provider_user_id.toString() === id);
  return (
    account &&
    ['youtube', 'linkedin', 'instagram', 'tiktok'].includes(account.provider_name.toLowerCase()) && contentMode === 'video'
  );
}) && (
  <>
    <Text style={{ color: 'white', fontSize: 16, marginTop: 20 }}>Thumbnail:</Text>
    
    {/* Toggle thumbnail on/off */}
    <TouchableOpacity
      onPress={() => {
        setUseThumbnail(!useThumbnail);
        if (!useThumbnail) setSelectedThumbnail(null); // Clear previous thumbnail if turning off
      }}
      style={{ marginVertical: 10 }}
    >
      <Text style={{ color: useThumbnail ? 'cyan' : 'lightblue', fontSize: 16, fontWeight: 'bold' }}>
        Use Thumbnail: {useThumbnail ? 'ON' : 'OFF'}
      </Text>
    </TouchableOpacity>

    {/* If thumbnail is enabled, allow importing */}
    {useThumbnail && (
      <TouchableOpacity
        onPress={async () => {
          const files = await handleThumbnailImport();
          if (files && files.length > 0) {
          const { uri, type, name } = files[0];
          setSelectedThumbnail({
            uri,
            type: type ?? '', 
            name: name ?? '', 
          });
        }

        }}
        style={{ paddingVertical: 10 }}
      >
        <Text style={{ color: 'lightblue', fontSize: 16 }}>Select Thumbnail Image</Text>
      </TouchableOpacity>
    )}

    {/* Show selected file name */}
    {useThumbnail && selectedThumbnail?.name && (
      <Text style={{ color: 'gray', fontSize: 14, marginTop: 5 }}>
        Selected: {selectedThumbnail.name}
      </Text>
    )}
  </>
)}






{selectedAccounts.some(id => {
  const account = accounts.find(acc => acc.provider_user_id.toString() === id);
  return (
    account &&
    ['youtube', 'tiktok'].includes(account.provider_name.toLowerCase())
  );
}) && (

  
  <View style={{ marginBottom: 20 }}>

     {/* Title for youtube */}
    <TextInput
      style={styles.titleInput}
      placeholder="Title"
      value={youtubeTitle}
      onChangeText={setYoutubeTitle}
    />

    {/* Privacy options for youtube */}
    <Text style={{ color: 'white', fontSize: 16, marginBottom: 10 }}>Privacy Settings:</Text>
    <TouchableOpacity onPress={() => setContentPrivacy('private')}>
      <Text
        style={{
          fontSize: 16,
          marginTop: 0,
          color: contentPrivacy === 'private' ? 'cyan' : 'lightblue',
          fontWeight: contentPrivacy === 'private' ? 'bold' : 'normal',
        }}
      >
        Private
      </Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setContentPrivacy('unlisted')}>
      <Text
        style={{
          fontSize: 16,
          marginTop: 10,
          color: contentPrivacy === 'unlisted' ? 'cyan' : 'lightblue',
          fontWeight: contentPrivacy === 'unlisted' ? 'bold' : 'normal',
        }}
      >
        Unlisted
      </Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setContentPrivacy('public')}>
      <Text
        style={{
          fontSize: 16,
          marginTop: 10,
          color: contentPrivacy === 'public' ? 'cyan' : 'lightblue',
          fontWeight: contentPrivacy === 'public' ? 'bold' : 'normal',
        }}
      >
        Public
      </Text>
    </TouchableOpacity>

    </View>
)}

    {selectedAccounts.some(id => {
  const account = accounts.find(acc => acc.provider_user_id.toString() === id);
  return account && account.provider_name.toLowerCase() === 'youtube';
}
) && (
  <View style={{ marginBottom: 20 }}>
    {/* Made for kids option */}
<TouchableOpacity onPress={() => {
  setIsMadeForKids(!isMadeForKids)
  console.log('Made for Kids:', isMadeForKids);
  }}>
  <Text
    style={{
      fontSize: 16,
      marginTop: 10,
      color: isMadeForKids ? 'cyan' : 'lightblue',
      fontWeight: 'bold',
    }}
  >
    Made for Kids: {isMadeForKids ? 'ON' : 'OFF'}
  </Text>
</TouchableOpacity>


{/* YouTube Category selection */}
<Text style={{ color: 'white', fontSize: 16, marginTop: 20 }}>YouTube Category:</Text>
<TouchableOpacity
  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
  style={{
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    marginTop: 5,
  }}
>
  <Text style={{ color: 'white' }}>
    {YOUTUBE_CATEGORIES.find((c) => c.id === youtubeCategory)?.name || 'Select Category'}
  </Text>
</TouchableOpacity>
{showCategoryPicker && (
  <View style={{ marginTop: 10 }}>
    {YOUTUBE_CATEGORIES.map((category) => (
      <TouchableOpacity
        key={category.id}
        onPress={() => {
          if (setYoutubeCategory) {
            setYoutubeCategory(category.id);
          } else {
            console.warn('setYoutubeCategory function is not provided');
          }
          setShowCategoryPicker(false);
        }}
        style={{
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            color: category.id === youtubeCategory ? 'cyan' : 'lightblue',
            fontWeight: category.id === youtubeCategory ? 'bold' : 'normal',
            fontSize: 15,
          }}
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}

{/* Youtube Tags section - A single line input */}
<TextInput
  style={styles.textInput}
  placeholder="Enter YouTube Tags (comma separated)"
  value={youtubeTags}
  onChangeText={setYoutubeTags}
/>

  </View>
)}


        {imageResizeNeeded && contentMode === 'image' && (
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
      </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flexGrow: 1,
    backgroundColor: 'rgba(15, 5, 5, 0.95)',
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
  titleInput: {
    width: '100%',
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 5,
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
