import React, { useState, useEffect } from 'react';

import { setupNotificationService } from './lib/Services/backgroundService.ts';


import { View } from 'react-native';
import styles from './styles/AppStyles';
import RNFS from 'react-native-fs';
import SQLite, { Transaction } from 'react-native-sqlite-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import ModalsContainer from './components/App/Modals.tsx';
import CalendarModal from './components/App/Calendar.tsx';
import LoginModal from './components/Modals/LoginModal';
import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from '@env';


import { createTables, 
          fetchDbData,
          listDirectoryContents,
         } from './lib/Services/dbService';
import { checkSignInStatus } from './lib/Services/authService.ts';
import { onDayPress } from './lib/Helpers/dateHelper.ts';
const App = () => {
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

      setupNotificationService();
    }, [isCalendarVisible]);


  // Render the app
  return (
    <View style={styles.container}>
      {isCalendarVisible ? (
        <>
          <ModalsContainer
            GoogleSignin={GoogleSignin}
            currentUserId={currentUserId}
            isAccountsVisible={isAccountsVisible}
            setIsAccountsVisible={setIsAccountsVisible}
            isPostVisible={isPostVisible}
            setIsPostVisible={setIsPostVisible}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            selectedDate={selectedDate}
            isSettingsVisible={isSettingsVisible}
            setIsSettingsVisible={setIsSettingsVisible}
            setCurrentUserId={setCurrentUserId}
            setIsCalendarVisible={setIsCalendarVisible}
            setIsLoginVisible={setIsLoginVisible}
            setDbData={setDbData}
          />
          <CalendarModal
            isCalendarVisible={isCalendarVisible}
            setIsCalendarVisible={setIsCalendarVisible}
            onDayPress={onDayPress}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            setDbData={setDbData}
            dbData={dbData}
            setIsAccountsVisible={setIsAccountsVisible}
            setIsPostVisible={setIsPostVisible}
            setIsSettingsVisible={setIsSettingsVisible}
            setSelectedItem={setSelectedItem}
          />
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
