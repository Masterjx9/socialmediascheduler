import React, { useState, useEffect } from 'react';
import { setupNotificationService } from './lib/Services/backgroundService.ts';
import type { SocialMediaAccount } from './types/SociaMedia';


import { View, Text, Alert } from 'react-native';
import styles from './styles/AppStyles';
import RNFS from 'react-native-fs';
import SQLite, { Transaction } from 'react-native-sqlite-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import ModalsContainer from './components/App/Modals.tsx';
import CalendarModal from './components/App/Calendar.tsx';
import AccountsModal from './components/Modals/AccountsModal';
import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from '@env';


import { createTables, 
          fetchDbData,
          listDirectoryContents,
         } from './lib/Services/dbService';
import { checkIfAccountsExist } from './lib/Services/dbService.ts';
import { onDayPress } from './lib/Helpers/dateHelper.ts';
const App = () => {
  const [inputText, setInputText] = useState('');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isAccountsVisible, setIsAccountsVisible] = useState(false);
  const [isImportVisible, setIsImportVisible] = useState(false);
  const [isPostVisible, setIsPostVisible] = useState(false);
  const [contentMode, setContentMode] = useState<"post" | "image" | "video">('post'); // 'post', 'image', or 'video'
  const [unsupportedAudioCodec, setUnsupportedAudioCodec] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const [imageResizeNeeded, setImageResizeNeeded] = useState(false);
  const [imageResizeOptions, setImageResizeOptions] = useState<"portrait" | "square" | "landscape">('portrait'); // 'portrait', 'square', 'landscape'
  const [isTwitterLoginVisible, setIsTwitterLoginVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dbData, setDbData] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubePrivacy, setYoutubePrivacy] = useState<'public' | 'private' | 'unlisted'>('public');
  const [accounts, setAccounts]   = useState<SocialMediaAccount[]>([]);

  
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

      // checkSignInStatus(setCurrentUserId, setIsCalendarVisible, setIsLoginVisible);

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
              // fetchDbData(db, setDbData);

              let accountcheck = checkIfAccountsExist();
              accountcheck.then((result) => {
                if (result) {
                  fetchDbData(db, setDbData);
                  setIsCalendarVisible(true);
                } else {
                  setIsLoginVisible(true);
                }
              });
              
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
                    setIsLoginVisible(true);

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
            isAccountsVisible={isAccountsVisible}
            setIsAccountsVisible={setIsAccountsVisible}
            isTwitterLoginVisible={isTwitterLoginVisible}
            setIsTwitterLoginVisible={setIsTwitterLoginVisible}
            isPostVisible={isPostVisible}
            setIsPostVisible={setIsPostVisible}
            contentMode={contentMode}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            selectedDate={selectedDate}
            isSettingsVisible={isSettingsVisible}
            setIsSettingsVisible={setIsSettingsVisible}
            setIsCalendarVisible={setIsCalendarVisible}
            setIsLoginVisible={setIsLoginVisible}
            setDbData={setDbData}
            selectedFile={selectedFile}
            imageResizeNeeded={imageResizeNeeded}
            setImageResizeNeeded={setImageResizeNeeded}
            setSelectedFile={setSelectedFile}
            imageResizeOptions={imageResizeOptions}
            setImageResizeOptions={setImageResizeOptions}
            unsupportedAudioCodec={unsupportedAudioCodec}
            setUnsupportedAudioCodec={setUnsupportedAudioCodec}
            youtubeTitle={youtubeTitle}
            setYoutubeTitle={setYoutubeTitle}
            youtubePrivacy={youtubePrivacy}
            setYoutubePrivacy={setYoutubePrivacy}
            accounts={accounts}
            setAccounts={setAccounts}
            />
          <CalendarModal
            isCalendarVisible={isCalendarVisible}
            setIsCalendarVisible={setIsCalendarVisible}
            setContentMode={setContentMode}
            onDayPress={onDayPress}
            contentMode={contentMode}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            setDbData={setDbData}
            dbData={dbData}
            setIsAccountsVisible={setIsAccountsVisible}
            setIsPostVisible={setIsPostVisible}
            setIsSettingsVisible={setIsSettingsVisible}
            setSelectedItem={setSelectedItem}
            setSelectedFile={setSelectedFile}
            setImageResizeNeeded={setImageResizeNeeded}
            unsupportedAudioCodec={unsupportedAudioCodec}
            setUnsupportedAudioCodec={setUnsupportedAudioCodec}
            youtubeTitle={youtubeTitle}
            setYoutubeTitle={setYoutubeTitle}
            youtubePrivacy={youtubePrivacy}
            setYoutubePrivacy={setYoutubePrivacy}
            accounts={accounts}
            setAccounts={setAccounts}
          />
        </>
      ) : (
        <>


        <AccountsModal
            isVisible={isLoginVisible}
            onClose={() => {
               let accountcheck = checkIfAccountsExist();
              accountcheck.then((result) => {
                if (!result) {
                  Alert.alert('No accounts found', 'Please login to at least one account to use the app.');
                } else {
                  setIsLoginVisible(false);
                }
            });
            }}
            setIsAccountsVisible={setIsAccountsVisible}
            setIsLoginVisible={setIsLoginVisible}
            setIsCalendarVisible={setIsCalendarVisible}
            isTwitterLoginVisible={isTwitterLoginVisible}
            setIsTwitterLoginVisible={setIsTwitterLoginVisible}
            accounts={accounts}
            setAccounts={setAccounts}
          />


        </>
      )}
    </View>
  );
};



export default App;
