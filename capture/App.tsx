import React, { useState, useEffect } from 'react';
import { TextInput, View, Text, TouchableOpacity, Modal } from 'react-native';
import styles from './styles/AppStyles';
import RNFS from 'react-native-fs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faCalendar, faSave, faPen, faUserGroup, faFileImport, faGear } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faMicrosoft, faLinkedin, faTwitter, faFacebook } from '@fortawesome/free-brands-svg-icons';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Calendar, DateData } from 'react-native-calendars';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken, Settings } from 'react-native-fbsdk-next';
import DocumentPicker, { types } from 'react-native-document-picker';
import SettingsModal from './components/SettingsModal'; 
import PostModal from './components/PostModal';
import AccountsModal from './components/AccountsModal';
import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from '@env';

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

    // Settings.initializeSDK();
    // Settings.setAppID(FACEBOOK_APP_ID);
    // Settings.setClientToken(FACEBOOK_CLIENT_TOKEN);  

      // Set today's date when the calendar becomes visible
      if (isCalendarVisible) {
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        setSelectedDate(today);
      }

    // Google sign in configuration
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID, // Client ID from Google Developer Console
      offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
      scopes: ['profile', 'email', 'openid'], // array of scopes
    });


      const checkSignInStatus = async () => {
        const user = await GoogleSignin.getCurrentUser();
        const isSignedIn = user !== null;
        
        if (isSignedIn) {
          console.log('User is signed in:', user);
          const userId = await fetchUserIdFromDb(user.user.id);
          if (userId) {
            setCurrentUserId(userId);
            setIsCalendarVisible(true);
        } else {
            console.log('User ID not found in database, please sign in again.');
            setIsLoginVisible(true);
        }
        } else {
          console.log('User is not signed in');
          // setIsLoginVisible(true);
        }
      };

      checkSignInStatus();


    // requestPermissions();
    const dbPath = '/data/data/com.socialmediaschedulerapp/databases/database_default.sqlite3';
    console.log('Database path:', dbPath);
  
    const listDirectoryContents = async (path: string) => {
      try {
        const files = await RNFS.readDir(path);
        console.log('Directory contents:', files);
      } catch (error) {
        console.error('Error reading directory:', error);
      }
    };
    console.log('Document directory path:', RNFS.DocumentDirectoryPath);
    listDirectoryContents('/data/data/com.socialmediaschedulerapp/databases');
  
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
        } else 
        {
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



      // End of useEffect
    }, [isCalendarVisible]);

  
  
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
      CREATE TABLE IF NOT EXISTS user_providers (
      account_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider_name TEXT NOT NULL, -- e.g., 'google', 'meta', 'twitter', etc.
      provider_user_id TEXT NOT NULL, -- e.g., Google sub, Meta ID, etc.
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider_name) -- Ensures one provider entry per user
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
      // print all tables
      tx.executeSql("SELECT name FROM sqlite_master WHERE type='table'", [], (tx: Transaction, results: ResultSet) => {
        const rows = results.rows;
        for (let i = 0; i < rows.length; i++) {
          console.log('Table:', rows.item(i).name);
        }
      });

      // fetch all data from all tables
      tx.executeSql('SELECT * FROM users', [], (tx: Transaction, results: ResultSet) => {
        const rows = results.rows;
        let data: any[] = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        console.log('Fetched data:', data);
      });

      tx.executeSql('SELECT * FROM content', [], (tx: Transaction, results: ResultSet) => {
        const rows = results.rows;
        let data: any[] = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        console.log('Fetched data:', data);
        setDbData(data);
      });

      tx.executeSql('SELECT * FROM user_providers', [], (tx: Transaction, results: ResultSet) => {
        const rows = results.rows;
        let data: any[] = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        console.log('Fetched data:', data);
      });

    });
  };
  

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];
        console.log('Requesting permissions:', permissions); // Log the permissions being requested
  
        const granted = await PermissionsAndroid.requestMultiple(permissions);
  
        console.log('Permissions granted:', granted); // Log the results
  
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
    await requestPermissions();
    
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

  const signUP = () => {
    setIsLoginVisible(true);
  }
  
  const handlePost = async (content: string, unixTimestamp: number) => {
    console.log('Post content:', content);
    
    // Use the Unix timestamp directly
    console.log('Selected date (Unix timestamp):', unixTimestamp);
    
    try {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      db.transaction((tx: Transaction) => {
        tx.executeSql(
          `INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)`,
          [1, 'post', content, unixTimestamp, 0],  // Use the Unix timestamp as a number
          (_, result) => {
            console.log('Post saved to the database');
            console.log('Post ID:', result.insertId);
          },
          (error) => {
            console.log('Error saving post to the database:', error);
          }
        );
      });
    } catch (error) {
      console.log('Error opening database:', error);
    }
    
    setIsPostVisible(false); 
  };
  
  
  

  const handleFileImport = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [types.images, types.video],
      });

      if (res && res.length > 0) {
        res.forEach((file) => {
          console.log('Selected file:', file.uri);
          // Handle the file (e.g., upload it, save it to your app's storage, etc.)
          Alert.alert('File Selected', `You selected: ${file.name}`);
        });
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User canceled the picker');
      } else {
        console.error('Unknown error:', err);
      }
    }
  };

  //fix later with if statements using provider name in useeffect
  const logOutALL = async () => {
    try {
      // Google sign out
      const user = await GoogleSignin.getCurrentUser();
      const isSignedIn = user !== null;
      if (isSignedIn) {
        console.log('User is signed in:', user);
        console.log('User ID found in database, logging out...');
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        setCurrentUserId(null);
        setIsSettingsVisible(false);
        setIsCalendarVisible(false);
        setIsLoginVisible(false);
      }
      
      // Facebook sign out
      const currentAccessToken = await AccessToken.getCurrentAccessToken();
      const isSignedInFB = currentAccessToken !== null;
      if (isSignedInFB) {
        console.log('User is signed in with Facebook');
        console.log('User ID found in database, logging out...');
        await LoginManager.logOut();
        setCurrentUserId(null);
        setIsSettingsVisible(false);
        setIsCalendarVisible(false);
        setIsLoginVisible(false);
      }

    } catch (error) {
      console.error(error);
    }
  };
  
  const handleLogin = async (provider: string) => {
    try {
      if (provider === 'Google') {
        console.log('Google login');
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        console.log(userInfo);

        let userId = await fetchUserIdFromDb(userInfo.user.id);

        if (userId) {
            console.log('User already exists, signing in...');
        } else {
            console.log('New user, inserting into database...');
            await insertProviderIdIntoDb('google', userInfo.user.id, userInfo.user.email);
            userId = await fetchUserIdFromDb(userInfo.user.id);
        }

        setCurrentUserId(userId);

        
      }
      if (provider === 'Facebook') {
        console.log('Facebook login');
        // Start Facebook login process
        console.log(LoginManager)
        const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
  
        if (result.isCancelled) {
          console.log('Facebook login cancelled');
          return;
        }
  
        // Get the access token
        const data = await AccessToken.getCurrentAccessToken();
  
        if (!data) {
          throw new Error('Something went wrong obtaining access token');
        }
  
        console.log('Facebook Access Token:', data.accessToken.toString());
  
        // Use the access token to get the user's Facebook profile info
        const response = await fetch(`https://graph.facebook.com/me?access_token=${data.accessToken}&fields=id,name,email`);
        const userInfo = await response.json();
        console.log(userInfo);
  
        let userId = await fetchUserIdFromDb(userInfo.id);
  
        if (userId) {
          console.log('User already exists, signing in...');
        } else {
          console.log('New user, inserting into database...');
          await insertProviderIdIntoDb('facebook', userInfo.id, userInfo.email || userInfo.name);
          userId = await fetchUserIdFromDb(userInfo.id);
        }
  
        setCurrentUserId(userId);
      }
  
  
      // Show the calendar
      setIsCalendarVisible(true);
    } catch (error) {
      handleLoginError(error);
    }
  };
  
  const fetchUserIdFromDb = async (providerUserId: string): Promise<number | null> => {
    try {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        return new Promise<number | null>((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT user_id FROM user_providers WHERE provider_user_id = ?',
                    [providerUserId],
                    (_, results) => {
                        if (results.rows.length > 0) {
                            resolve(results.rows.item(0).user_id);
                        } else {
                            resolve(null);
                        }
                    },
                    (error) => {
                        console.log('Error fetching user_id from database:', error);
                        resolve(null);  // Resolve as null instead of rejecting
                    }
                );
            });
        });
    } catch (error) {
        console.error('Database operation failed:', error);
        return null;
    }
};


  const insertProviderIdIntoDb = (providerName: string, providerUserId: string, userName: string) => {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            // Insert the new user into the users table
            tx.executeSql(
              `INSERT INTO users (name) VALUES (?)`,
              [userName],
              (_, result) => {
                const userId = result.insertId; // Get the newly inserted user_id
  
                // Insert provider ID into the user_providers table
                tx.executeSql(
                  `INSERT OR REPLACE INTO user_providers (user_id, provider_name, provider_user_id) VALUES (?, ?, ?)`,
                  [userId, providerName, providerUserId],
                  () => {
                    console.log(`${providerName} ID stored in the database:`, providerUserId);
                    resolve();
                  },
                  (error) => {
                    console.log(`Error storing ${providerName} ID in the database:`, error);
                    reject(error);
                  }
                );
              },
              (error) => {
                console.log('Error inserting new user into the database:', error);
                reject(error);
              }
            );
          });
        },
        (error) => {
          console.log('Error opening database:', error);
          reject(error);
        }
      );
    });
  };
  
  const handleLoginError = (error: any) => {
    if (error instanceof Error && 'code' in error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login process');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Login is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play Services not available or outdated');
      } else {
        console.log('Some other error occurred', error);
      }
    } else {
      console.log('An unknown error occurred', error);
    }
  };
  



  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    // setIsCalendarVisible(false);
    console.log('Selected date: ', day.dateString);
  };

  // Render the app
  return (
    <View style={styles.container}>
      {isCalendarVisible ? (
        <>
          {currentUserId !== null && <AccountsModal isVisible={isAccountsVisible} onClose={() => setIsAccountsVisible(false)} currentUserId={currentUserId} GoogleSignin={GoogleSignin} setIsLoginVisible={setIsLoginVisible} setIsAccountsVisible={setIsAccountsVisible} setIsCalendarVisible={setIsCalendarVisible} />}
          <PostModal isVisible={isPostVisible} onClose={() => setIsPostVisible(false)} onPost={async (content, unixTimestamp) => await handlePost(content, unixTimestamp)}  selectedDate={selectedDate}  />

          <SettingsModal isVisible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} onLogOut={logOutALL} />

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
  
            <View style={styles.footerNavBar}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setIsAccountsVisible(true)}
              >
                <FontAwesomeIcon icon={faUserGroup} size={24} />
                <Text>Accounts</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={[styles.navButton]}
                onPress={handleFileImport}
              >
                <FontAwesomeIcon icon={faFileImport} size={24} />
                <Text>Import</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={[styles.navButton]}
                onPress={() => setIsPostVisible(true)}
              >
                <FontAwesomeIcon icon={faPen} size={24} />
                <Text>Post/Tweet</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={[styles.navButton]}
                onPress={takePicture}
              >
                <FontAwesomeIcon icon={faCamera} size={24} />
                <Text>Camera</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setIsSettingsVisible(true)}
              >
                <FontAwesomeIcon icon={faGear} size={24} />
                <Text>Settings</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </>
      ) : (
        <>
          <Text style={styles.title}>Social media scheduler</Text>
  
          <View style={styles.captureContainer}>
            <TouchableOpacity onPress={signUP} style={styles.capture}>
              <Text style={styles.captureText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
  
          {/* login modal */}
          <Modal
            presentationStyle="fullScreen"
            visible={isLoginVisible}
            animationType="slide"
            onRequestClose={() => setIsLoginVisible(false)}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.title}>Login</Text>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Google')}>
                <FontAwesomeIcon icon={faGoogle} size={24} />
                <Text style={styles.loginText}>Login with Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Facebook')}>
                <FontAwesomeIcon icon={faFacebook} size={24} />
                <Text style={styles.loginText}>Login with Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Microsoft')}>
                <FontAwesomeIcon icon={faMicrosoft} size={24} />
                <Text style={styles.loginText}>Login with Microsoft</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('LinkedIn')}>
                <FontAwesomeIcon icon={faLinkedin} size={24} />
                <Text style={styles.loginText}>Login with LinkedIn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Twitter')}>
                <FontAwesomeIcon icon={faTwitter} size={24} />
                <Text style={styles.loginText}>Login with Twitter</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
  
  
  
};



export default App;
