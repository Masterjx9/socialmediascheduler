import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import SQLite, { Transaction } from 'react-native-sqlite-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { fetchDbData } from '../../lib/Services/dbService';
import { Calendar } from 'react-native-calendars';
import FooterNavBar from './FooterNavBar';
import styles from '../../styles/AppStyles';
import type { SocialMediaAccount } from '../../types/SociaMedia';

interface CalendarModalProps {
  isCalendarVisible: boolean;
  setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onDayPress: (day: any, setSelectedDate: React.Dispatch<React.SetStateAction<string>>, setDbData: React.Dispatch<React.SetStateAction<any[]>>) => void;
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  setDbData: React.Dispatch<React.SetStateAction<any[]>>;
  dbData: any[];
  setIsAccountsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedItem: React.Dispatch<React.SetStateAction<any>>;
  setContentMode: React.Dispatch<React.SetStateAction<"post" | "image" | "video">>;
  setSelectedFile: React.Dispatch<React.SetStateAction<string>>;
  setImageResizeNeeded: React.Dispatch<React.SetStateAction<boolean>>;
  contentMode: string;
  unsupportedAudioCodec: boolean;
  setUnsupportedAudioCodec: React.Dispatch<React.SetStateAction<boolean>>;
  youtubeTitle: string;
  setYoutubeTitle: React.Dispatch<React.SetStateAction<string>>;
  youtubePrivacy: 'public' | 'private' | 'unlisted';
  setYoutubePrivacy: React.Dispatch<React.SetStateAction<'public' | 'private' | 'unlisted'>>;
  accounts: SocialMediaAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>;
}

    const renderItem = ({ item }: { item: any },
        setDbData: React.Dispatch<React.SetStateAction<any[]>>,  
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>, 
    setSelectedItem: React.Dispatch<React.SetStateAction<any>>,
    setContentMode: React.Dispatch<React.SetStateAction<"post" | "image" | "video">>,
    setImageResizeNeeded: React.Dispatch<React.SetStateAction<boolean>>
) => (
    <View style={styles.listItemContainer}>
    <Text style={styles.listItemText}>
      Post Date: {new Date(item.post_date * 1000).toLocaleString()}
    </Text>
    <Text style={styles.listItemText}>{item.content_type}</Text>
    <View style={styles.iconContainer}>

    <TouchableOpacity style={styles.listItem}
    onPress={() => {
      console.log('Edit button pressed for item:', item);
      setSelectedItem(item);
      setIsPostVisible(true);
    }}
    >
      <FontAwesomeIcon icon={faEdit} size={24} style={styles.icon} />
    </TouchableOpacity>

    <TouchableOpacity style={styles.listItem}
    onPress={async () => {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      db.transaction((tx: Transaction) => {
        tx.executeSql(
          `DELETE FROM content WHERE content_id = ?`,
          [item.content_id],
          (_, results) => {
            console.log('Post deleted from the database');
            fetchDbData(db, setDbData); 
          },
          (error) => {
            console.log('Error deleting post from the database:', error);
          }
        );
      });
    }}    
    
    >
      <FontAwesomeIcon icon={faTrash} size={24} style={styles.icon} />
    </TouchableOpacity>


    </View>
  </View>
  );

const CalendarModal: React.FC<CalendarModalProps> = ({
  isCalendarVisible,
  setIsCalendarVisible,
  onDayPress,
  selectedDate,
  setSelectedDate,
  setDbData,
  dbData,
  setIsAccountsVisible,
  setIsPostVisible,
  setIsSettingsVisible,
    setSelectedItem,
    setContentMode,
  setSelectedFile,
  setImageResizeNeeded,
  contentMode,
  unsupportedAudioCodec,
  setUnsupportedAudioCodec,
  youtubeTitle,
  setYoutubeTitle,
  youtubePrivacy,
  setYoutubePrivacy,
  accounts,
  setAccounts,
}) => {
  return (
    <Modal
      presentationStyle="fullScreen"
      visible={isCalendarVisible}
      animationType="slide"
      onRequestClose={() => setIsCalendarVisible(false)}
    >
      <Calendar
        onDayPress={(day:any) => onDayPress(day, setSelectedDate, setDbData)}
        markedDates={{
          [selectedDate]: { selected: true, marked: true, selectedColor: 'blue' },
        }}
        theme={{
          'stylesheet.calendar.main': {
            base: {
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            },
          },
        }}
      />
      <FlatList
        data={dbData} // Use the data fetched from the database
        keyExtractor={(item) => item.content_id.toString()} // Use a unique key (e.g., content_id)
        renderItem={({ item }) => renderItem({ item }, setDbData, setIsPostVisible, setSelectedItem, setContentMode, setImageResizeNeeded)} // Render each item using the renderItem function
        style={styles.listContainer} // Style for the list container
      />
      <FooterNavBar
        setSelectedFile={setSelectedFile}
        setIsAccountsVisible={setIsAccountsVisible}
        setIsPostVisible={setIsPostVisible}
        setIsSettingsVisible={setIsSettingsVisible}
        setContentMode={setContentMode} 
        setImageResizeNeeded={setImageResizeNeeded}
        contentMode={contentMode}
        unsupportedAudioCodec={unsupportedAudioCodec}
        setUnsupportedAudioCodec={setUnsupportedAudioCodec}
        accounts={accounts}
        setAccounts={setAccounts}
      />
    </Modal>
  );
};

export default CalendarModal;
