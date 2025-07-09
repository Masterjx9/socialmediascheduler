import React, { useState, useEffect } from 'react';
import { 
  startForegroundService 
} from './lib/Services/backgroundService.ts';
import type { SocialMediaAccount } from './types/SociaMedia';

import { View, Text, Alert, AppState } from 'react-native';
import styles from './styles/AppStyles';
import RNFS from 'react-native-fs';
import SQLite, { Transaction } from 'react-native-sqlite-storage';
import ModalsContainer from './components/App/Modals.tsx';
import CalendarModal from './components/App/Calendar.tsx';
import AccountsModal from './components/Modals/AccountsModal';
import BackgroundFetch from 'react-native-background-fetch';

import { createTables, 
          fetchDbData,
          listDirectoryContents,
         } from './lib/Services/dbService';
import { checkIfAccountsExist } from './lib/Services/dbService.ts';


BackgroundFetch.configure(
  {
    minimumFetchInterval: 15,     
    stopOnTerminate: false,       
    startOnBoot: true,            
    enableHeadless: true,         
  },
  async taskId => {
    // await doWork(taskId);
    console.log('Background fetch task:', taskId);
  },
  async taskId => {
    // await doWork(taskId);         // timeout / fallback
  },
);

const App = () => {
  const [inputText, setInputText] = useState('');
  const [isCalendarVisible, _setIsCalendarVisible] = useState(false);
    const setIsCalendarVisible = (val: boolean) => {
    console.trace('setIsCalendarVisible called with:', val);
    _setIsCalendarVisible(val);
  };
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
  const [isMadeForKids, setIsMadeForKids] = useState(false);
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubePrivacy, setYoutubePrivacy] = useState<'public' | 'private' | 'unlisted'>('public');
  const [accounts, setAccounts]   = useState<SocialMediaAccount[]>([]);
  const [youtubeCategory, setYoutubeCategory] = useState(22);
  const [selectedThumbnail, setSelectedThumbnail] = useState<null | { uri: string; type: string; name: string }>(null);
  const [youtubeTags, setYoutubeTags] = useState<string>('');
  const [calendarMode, setCalendarMode] = React.useState<'day' | 'month'>('day');
  const [lastDayPressed, setLastDayPressed] = React.useState<any>(null);


  // In the useEffect:
  useEffect(() => {





      if (isCalendarVisible === false) {
    const dbPath = '/data/data/com.socialmediaschedulerapp/databases/database_default.sqlite3';
    // console.log('Database path:', dbPath);
  

    // Check if the database file exists
    // listDirectoryContents('/data/data/com.socialmediaschedulerapp/databases');
  
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
    }

          // Set today's date when the calendar becomes visible
      if (isCalendarVisible) {
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        setSelectedDate(today);
        // setupNotificationService();
        if (AppState.currentState === 'active' || AppState.currentState === 'background') {
          startForegroundService();
        }
      }

    }, [isCalendarVisible]);


  // Render the app
  return (
    <View style={styles.container}>
      {isCalendarVisible ? (
        <>
          <ModalsContainer
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
            setIsCalendarVisible={_setIsCalendarVisible}
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
            isMadeForKids={isMadeForKids}
            setIsMadeForKids={setIsMadeForKids}
            youtubePrivacy={youtubePrivacy}
            setYoutubePrivacy={setYoutubePrivacy}
            accounts={accounts}
            setAccounts={setAccounts}
            youtubeCategory={youtubeCategory}
            setYoutubeCategory={setYoutubeCategory}
            selectedThumbnail={selectedThumbnail}
            setSelectedThumbnail={setSelectedThumbnail}
            youtubeTags={youtubeTags}
            setYoutubeTags={setYoutubeTags}
            calendarMode={calendarMode}
            setCalendarMode={setCalendarMode}
            lastDayPressed={lastDayPressed}
            setLastDayPressed={setLastDayPressed}
            setSelectedDate={setSelectedDate}
            />
          <CalendarModal
            isCalendarVisible={isCalendarVisible}
            setIsCalendarVisible={_setIsCalendarVisible}
            setContentMode={setContentMode}
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
            accounts={accounts}
            setAccounts={setAccounts}
            calendarMode={calendarMode}
            setCalendarMode={setCalendarMode}
            lastDayPressed={lastDayPressed}
            setLastDayPressed={setLastDayPressed}
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
