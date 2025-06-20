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
import { onDayPress } from '../../lib/Helpers/dateHelper';
interface CalendarModalProps {
  isCalendarVisible: boolean;
  setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>;
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



 {!item.published?.includes('"final":"success"') && (
    <TouchableOpacity style={styles.listItem}
    onPress={() => {
      console.log('Edit button pressed for item:', item);
      setSelectedItem(item);
      setIsPostVisible(true);
    }}
    >
      <FontAwesomeIcon icon={faEdit} size={24} style={styles.icon} />
    </TouchableOpacity>
)}

 {!item.published?.includes('"final":"success"') && (
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
)}


{item.published?.includes('"final":"success"') && (
    <Text style={styles.postedItem}>Posted</Text>
)}


    </View>
  </View>
  );

const CalendarModal: React.FC<CalendarModalProps> = ({
  isCalendarVisible,
  setIsCalendarVisible,
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
  accounts,
  setAccounts,
}) => {
  const [calendarMode, setCalendarMode] = React.useState<'day' | 'month'>('day');
  const [lastDayPressed, setLastDayPressed] = React.useState<any>(null);

  React.useEffect(() => {
  if (lastDayPressed) {
    console.log('Calendar mode changed:', calendarMode);
    onDayPress(lastDayPressed, setSelectedDate, setDbData, calendarMode);
  }
}, [calendarMode]);



  return (
    <Modal
      presentationStyle="fullScreen"
      visible={isCalendarVisible}
      animationType="slide"
      onRequestClose={() => setIsCalendarVisible(false)}
    >
      <Calendar
        onDayPress={async (day:any) => {
          setLastDayPressed(day)
          await onDayPress(day, setSelectedDate, setDbData, calendarMode);
          console.log('datadbData:', dbData);
        }}
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
    
    
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10 }}>
  <TouchableOpacity
    onPress={() => setCalendarMode('day')}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 10,
    }}
  >
    <View
      style={{
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
      }}
    >
      {calendarMode === 'day' && (
        <View
          style={{
            height: 10,
            width: 10,
            borderRadius: 5,
            backgroundColor: '#007AFF',
          }}
        />
      )}
    </View>
    <Text>Day</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => setCalendarMode('month')}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 10,
    }}
  >
    <View
      style={{
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
      }}
    >
      {calendarMode === 'month' && (
        <View
          style={{
            height: 10,
            width: 10,
            borderRadius: 5,
            backgroundColor: '#007AFF',
          }}
        />
      )}
    </View>
    <Text>Month</Text>
  </TouchableOpacity>
</View>


      <FlatList
        data={dbData} // Use the data fetched from the database
        keyExtractor={(item) => item.content_id.toString()} // Use a unique key (e.g., content_id)
        
        renderItem={({ item }) => renderItem({ item }, setDbData, setIsPostVisible, setSelectedItem, setContentMode, setImageResizeNeeded)} // Render each item using the renderItem function
        style={styles.listContainer} // Style for the list container
        contentContainerStyle={{ paddingBottom: 80 }}
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
