import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import styles from './styles/AppStyles';
import RNFS from 'react-native-fs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Calendar, DateData } from 'react-native-calendars';
import SQLite, { Transaction } from 'react-native-sqlite-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import SettingsModal from './components/Modals/SettingsModal'; 
import PostModal from './components/Modals/PostModal';
import AccountsModal from './components/Modals/AccountsModal';
import FooterNavBar from './components/App/FooterNavBar';
import LoginModal from './components/Modals/LoginModal';
import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from '@env';


import { handlePost } from './lib/Helpers/postHelper';
import { createTables, 
          fetchDbData,
          listDirectoryContents,
         } from './lib/Services/dbService';
import { logOutALL, checkSignInStatus } from './lib/Services/authService.ts';
import { onDayPress } from './lib/Helpers/dateHelper.ts';
const App = () => {
  console.log("hello")
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [inputText, setInputText] = useState('');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isAccountsVisible, setIsAccountsVisible] = useState(false);
  const [isImportVisible, setIsImportVisible] = useState(false);
  const [isPostVisible, setIsPostVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dbData, setDbData] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState(null);

  
  // In the useEffect:
  useEffect(() => {

    // Settings.initializeSDK();
    // Settings.setAppID(FACEBOOK_APP_ID);
    // Settings.setClientToken(FACEBOOK_CLIENT_TOKEN);  

      // Set today's date when the calendar becomes visible
      if (isCalendarVisible) {
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        setSelectedDate(today);
      }

    // Google sign in configuration
    console.log('Google Web Client ID:', GOOGLE_WEB_CLIENT_ID);
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID, // Client ID from Google Developer Console
      offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
      scopes: ['profile', 'email', 'openid'], // array of scopes
    });




      checkSignInStatus(setCurrentUserId, setIsCalendarVisible, setIsLoginVisible);


    // requestPermissions();
    // const dbPath = '/data/data/com.socialmediaschedulerapp/databases/database_default.sqlite3';
    const dbPath = '/data/data/com.socialmediaschedulerapp/databases/database_default.sqlite3';
    console.log('Database path:', dbPath);
  

    // console.log('Document directory path:', RNFS.DocumentDirectoryPath);
    listDirectoryContents('/data/data/com.socialmediaschedulerapp/databases');
  
    RNFS.exists(dbPath)
      .then((exists) => {
        if (exists) {
          const db = SQLite.openDatabase(
            { name: 'database_default.sqlite3', location: 'default' },
            () => {
              console.log('Database opened');
              // insertFakeData(db);
              fetchDbData(db, setDbData);
            },
            (error) => {
              console.log('Error opening database:', error);
            }
          );
        } else 
        {
          const filePath = `/data/data/com.socialmediaschedulerapp/databases/database_default.sqlite3`;
          RNFS.writeFile(filePath, '', 'utf8')
            .then(() => {
              console.log('SQLite database file created:', filePath);
              const db = SQLite.openDatabase(
                { name: 'database_default.sqlite3', location: 'default' },
                () => {
                  console.log('New database created and opened');
                  db.transaction((tx: Transaction) => {
                    createTables(tx);
                  }, (error: any) => {
                    console.log('Transaction error:', error);
                  }, () => {
                    console.log('Tables created successfully');
                    // insertFakeData(db);
                    listDirectoryContents(RNFS.DocumentDirectoryPath);
                  });
                },
                (error) => {
                  console.log('Error creating new database:', error);
                }
              );
            })
            .catch((error) => {
              console.error('Error creating SQLite database file:', error);
            });
        }
      })
      .catch((error) => {
        console.log('Error checking if database exists:', error);
      });

      // End of useEffect
    }, [isCalendarVisible]);

  
  




  

  const renderItem = ({ item }: { item: any }) => (
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

  // Render the app
  return (
    <View style={styles.container}>
      {isCalendarVisible ? (
        <>
          {currentUserId !== null && <AccountsModal isVisible={isAccountsVisible} onClose={() => setIsAccountsVisible(false)} currentUserId={currentUserId} GoogleSignin={GoogleSignin} setIsLoginVisible={setIsLoginVisible} setIsAccountsVisible={setIsAccountsVisible} setIsCalendarVisible={setIsCalendarVisible} />}
          
          <PostModal
            isVisible={isPostVisible}
            onClose={() => {
              setIsPostVisible(false);
              setSelectedItem(null); 
            }}
            onPost={async (content, unixTimestamp, content_id) => await handlePost(content, unixTimestamp, setDbData, setIsPostVisible, setSelectedItem, content_id)}
            selectedDate={selectedDate}
            item={selectedItem} 
          />
          <SettingsModal isVisible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} onLogOut={() => logOutALL(setCurrentUserId, setIsSettingsVisible, setIsCalendarVisible, setIsLoginVisible)}/>

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
              data={dbData}  // Use the data fetched from the database
              keyExtractor={(item) => item.content_id.toString()}  // Use a unique key (e.g., content_id)
              renderItem={renderItem}  // Render each item
              style={styles.listContainer}  // Style for the list container
            />
            <FooterNavBar 
              setIsAccountsVisible={setIsAccountsVisible} 
              setIsPostVisible={setIsPostVisible} 
              setIsSettingsVisible={setIsSettingsVisible} 
            />
            
          </Modal>
        </>
      ) : (
        <>

          {/* login modal */}
          <LoginModal
            isLoginVisible={isLoginVisible}
            setIsLoginVisible={setIsLoginVisible}
            setCurrentUserId={setCurrentUserId}
            setIsCalendarVisible={setIsCalendarVisible}
          />



        </>
      )}
    </View>
  );
  
  
  
};



export default App;
