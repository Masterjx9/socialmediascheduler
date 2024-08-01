import React, { useState, useEffect } from 'react';
import { TextInput, View, Text, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform, Modal } from 'react-native';
import RNFS from 'react-native-fs';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Calendar, DateData } from 'react-native-calendars';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [dbData, setDbData] = useState<any[]>([]);

  const insertFakeData = (db: SQLiteDatabase) => {
    db.transaction((tx: Transaction) => {
      const unixTime = Math.floor(Date.now() / 1000);
      tx.executeSql(
        `INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)`,
        [1, 'post', 'testphone', unixTime, 0],
        () => {
          console.log('Fake data inserted successfully');
        },
        (error) => {
          console.log('Error inserting fake data:', error);
        }
      );
    });
  };
  

  
  // In the useEffect:
  useEffect(() => {
    const dbPath = `${RNFS.DocumentDirectoryPath}/database_default.sqlite3`;
    console.log('Database path:', dbPath);
  
    const listDirectoryContents = async (path: string) => {
      try {
        const files = await RNFS.readDir(path);
        console.log('Directory contents:', files);
      } catch (error) {
        console.error('Error reading directory:', error);
      }
    };
  
    listDirectoryContents(RNFS.DocumentDirectoryPath);
  
    RNFS.exists(dbPath)
      .then((exists) => {
        if (exists) {
          const db = SQLite.openDatabase(
            { name: 'database_default.sqlite3', location: 'default' },
            () => {
              console.log('Database opened');
              // insertFakeData(db);
              fetchDbData(db);
            },
            (error) => {
              console.log('Error opening database:', error);
            }
          );
        } else {
          const filePath = `${RNFS.DocumentDirectoryPath}/database_default.sqlite3`;
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
  }, []);
  
  
  const createTables = (tx: Transaction) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS social_media_accounts (
        account_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        platform_name TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS scheduler (
        scheduler_id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id INTEGER,
        social_media_account_id INTEGER,
        scheduled_time DATETIME,
        FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE,
        FOREIGN KEY (social_media_account_id) REFERENCES social_media_accounts(account_id) ON DELETE CASCADE
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS content (
        content_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id INTEGER NOT NULL,
        content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'post')),
        content_data TEXT NOT NULL,
        post_date DATE NOT NULL,
        description TEXT,
        tags TEXT,
        published INTEGER NOT NULL DEFAULT (0),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS meta_accounts (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER,
        meta_id TEXT,
        meta_token TEXT,
        account_name TEXT
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS twitter_accounts (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER,
        twitter_consumer_key TEXT,
        twitter_access_token TEXT,
        twitter_access_token_secret TEXT,
        account_name TEXT,
        twitter_consumer_secret TEXT
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS linkedin_accounts (
        app_id TEXT,
        account_id INTEGER PRIMARY KEY REFERENCES social_media_accounts (account_id),
        app_secret TEXT,
        app_token TEXT,
        app_refresh_token TEXT,
        app_token_expires_in INTEGER,
        app_token_refresh_expires_in INTEGER,
        account_name TEXT,
        timestamp DATETIME
      );
    `);
  };
  
  
  const fetchDbData = (db: SQLiteDatabase) => {
    db.transaction((tx: Transaction) => {
      tx.executeSql('SELECT * FROM content', [], (tx: Transaction, results: ResultSet) => {
        const rows = results.rows;
        let data: any[] = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        console.log('Fetched data:', data);
        setDbData(data);
      });
    });
  };
  

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);
        if (
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('You can use the camera and access storage');
        } else {
          console.log('Permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      const cameraPermission = await request(PERMISSIONS.IOS.CAMERA);
      const storagePermission = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      if (cameraPermission !== RESULTS.GRANTED || storagePermission !== RESULTS.GRANTED) {
        console.log('Permission denied');
      }
    }
  };

  const takePicture = async () => {
    const options: CameraOptions = {
      durationLimit: 10,
      saveToPhotos: true,
      cameraType: 'back',
      mediaType: 'photo',
    };
    const result = await launchCamera(options);
    if (result.didCancel) {
      console.log('User cancelled image picker');
    } else if (result.errorCode) {
      console.log('ImagePicker Error: ', result.errorMessage);
    } else if (result.assets && result.assets.length > 0) {
      const data = result.assets[0];
      console.log(data.uri);

      const destinationPath = `${RNFS.ExternalStorageDirectoryPath}/DCIM/capturedImage.jpg`;
      if (await RNFS.exists(destinationPath)) {
        await RNFS.unlink(destinationPath);
      }
      console.log('Image saved to:', destinationPath);
    }
  };

  const capturePost = async () => {
    try {
      const filePath = `${RNFS.ExternalStorageDirectoryPath}/capturedText.txt`;
      await RNFS.writeFile(filePath, inputText, 'utf8');
      console.log('Text saved to:', filePath);
    } catch (error) {
      console.error(error);
    }
  };

  const schedulePost = () => {
    setIsCalendarVisible(true);
  };

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setIsCalendarVisible(false);
    console.log('Selected date: ', day.dateString);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social media scheduler</Text>
      <View style={styles.captureContainer}>
        <TouchableOpacity onPress={takePicture} style={styles.capture}>
          <Text style={styles.captureText}>SNAP</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.captureContainer}>
        <TouchableOpacity onPress={capturePost} style={styles.capture}>
          <Text style={styles.captureText}>POST</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.captureContainer}>
        <TouchableOpacity onPress={schedulePost} style={styles.capture}>
          <Text style={styles.captureText}>SCHEDULE</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.textInput}
        placeholder="Enter text to save"
        value={inputText}
        onChangeText={setInputText}
      />

      <Modal
        presentationStyle="fullScreen"
        visible={isCalendarVisible}
        animationType="slide"
        onRequestClose={() => setIsCalendarVisible(false)}
      >
        <Calendar
          onDayPress={onDayPress}
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
      </Modal>

      <View>
        <Text style={styles.title}>Database Data:</Text>
        {dbData.map((item, index) => (
          <Text key={index} style={styles.dbText}>
            {JSON.stringify(item)}
          </Text>
        ))}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  fullScreenModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  calendarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
  captureContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  capture: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
  captureText: {
    fontSize: 14,
  },
  textInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    margin: 20,
    padding: 10,
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dbText: {
    color: 'white',
  },
});


export default App;
