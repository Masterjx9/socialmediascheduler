import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import SQLite, { Transaction } from 'react-native-sqlite-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { fetchDbData } from '../../lib/Services/dbService';
import { Calendar } from 'react-native-calendars';
import FooterNavBar from './FooterNavBar';
import styles from '../../styles/AppStyles';

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
}

    const renderItem = ({ item }: { item: any },
        setDbData: React.Dispatch<React.SetStateAction<any[]>>,  
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>, 
    setSelectedItem: React.Dispatch<React.SetStateAction<any>>
) => (
    <View style={styles.listItemContainer}>
    <Text style={styles.listItemText}>
      Post Date: {new Date(item.post_date * 1000).toLocaleString()}
    </Text>
    <View style={styles.iconContainer}>

    <TouchableOpacity style={styles.listItem}
    onPress={() => {
      console.log
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
    setSelectedItem
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
        renderItem={({ item }) => renderItem({ item }, setDbData, setIsPostVisible, setSelectedItem)} // Render the list items
        style={styles.listContainer} // Style for the list container
      />
      <FooterNavBar
        setIsAccountsVisible={setIsAccountsVisible}
        setIsPostVisible={setIsPostVisible}
        setIsSettingsVisible={setIsSettingsVisible}
      />
    </Modal>
  );
};

export default CalendarModal;
