import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import type { SocialMediaAccount, HandleNewSignUpParams, LinkedInExpiryInfo } from '../../types/SociaMedia';
import RNFS from 'react-native-fs';
import { Alert } from 'react-native';
import { getLinkedInAccessToken, openLinkedInLogin, getLinkedInUserInfo } from '../Apis/linkedin';
import { getThreadsAccessToken, openThreadsLogin, getThreadsUserInfo,
  getInstagramUserInfo, getInstagramAccessToken, openInstagramLogin  } from '../Apis/meta';
import { getGoogleAccessToken, openGoogleLogin, getYoutubeUserInfo } from '../Apis/youtube';
import { Linking } from 'react-native';
import { getUnixTimestampsForDay } from '../Helpers/dateHelper';
import { scheduleOptions } from '../../types/SociaMedia';

export const listDirectoryContents = async (path: string) => {
    try {
      const files = await RNFS.readDir(path);
      console.log('Directory contents:', files);
    } catch (error) {
      console.error('Error reading directory:', error);
    }
  };



export const createTables = (tx: Transaction) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS user_providers (
      provider_name TEXT NOT NULL,
      provider_user_id TEXT NOT NULL
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS content (
        content_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'post')),
        content_data TEXT NOT NULL,
        post_date DATE NOT NULL,
        description TEXT,
        user_providers TEXT,
        tags TEXT,
        title TEXT,
        privacy TEXT,
        category TEXT,
        selfDeclaredMadeForKids boolean DEFAULT false,
        thumbnail TEXT,
        published TEXT NOT NULL DEFAULT '{}'
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS instagram_accounts (
        sub_id TEXT,
        access_token TEXT,
        access_token_expires_in TEXT,
        account_name TEXT,
        timestamp DATETIME
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS youtube_accounts (
        sub_id TEXT,
        access_token TEXT,
        access_token_expires_in TEXT,
        account_name TEXT,
        timestamp DATETIME
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS tiktok_accounts (
        sub_id TEXT,
        access_token TEXT,
        access_token_expires_in TEXT,
        account_name TEXT,
        timestamp DATETIME
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS twitter_accounts (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        sub_id TEXT,
        twitter_consumer_key TEXT,
        twitter_access_token TEXT,
        twitter_access_token_secret TEXT,
        twitter_consumer_secret TEXT,
        account_name TEXT
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS linkedin_accounts (
        app_token TEXT,
        app_refresh_token TEXT,
        app_token_expires_in TEXT,
        app_token_refresh_expires_in TEXT,
        account_name TEXT,
        timestamp DATETIME,
        sub_id TEXT
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS threads_accounts (
        sub_id TEXT,
        access_token TEXT,
        access_token_expires_in TEXT,
        account_name TEXT,
        timestamp DATETIME
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT
      );
    `);
    tx.executeSql(`
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value)
      VALUES 
        ('default_schedule_option', 'Next available day'),
        ('default_schedule_time', '09:00');
    `);
  };

  export const forceUpdateAccounts = async (setAccounts: React.Dispatch<React.SetStateAction<any[]>>) => {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      fetchSocialMediaAccounts(db, setAccounts)    
  }
  

  export const fetchSocialMediaAccounts = (db: SQLiteDatabase, setAccounts: React.Dispatch<React.SetStateAction<any[]>>) => {
  db.transaction((tx: Transaction) => {
    tx.executeSql(
      'SELECT provider_user_id, provider_name FROM user_providers',
      [],
      async (_, results: ResultSet) => {
        const rows = results.rows;
        console.log('Rows: ', rows);
        const accountsList: SocialMediaAccount[] = [];

        for (let i = 0; i < rows.length; i++) { 
          console.log('Row:', rows.item(i));
          const row = rows.item(i);
          const provider = row.provider_name;
          const id = row.provider_user_id;

          let accountName = '';

          try {
            if (provider === 'LinkedIn') {
              const creds = await fetchLinkedInCredentials(id);
              accountName = creds?.accountName ?? '';
            } else if (provider === 'Instagram') {
              const creds = await fetchInstagramCredentials(id);
              accountName = creds?.accountName ?? '';
            } else if (provider === 'YouTube') {
              const creds = await fetchYoutubeCredentials(id);
              accountName = creds?.accountName ?? '';
            } else if (provider === 'Threads') {
              const creds = await fetchThreadsCredentials(id);
              accountName = creds?.accountName ?? '';
            } else if (provider === 'Twitter') {
              const creds = await fetchTwitterCredentials(id);
              accountName = ''; // placeholder
            }
          } catch (e) {
            console.log(`Error getting account name for ${provider} (${id}):`, e);
          }

          accountsList.push({
            provider_user_id: id,
            provider_name: provider,
            account_name: accountName,
          });
        }

        console.log('Accounts: ', accountsList);
        setAccounts(accountsList);
      },
      (error) => {
        console.log('Error fetching accounts: ', error);
      }
    );
  });
};



export const fetchDbData = (db: SQLiteDatabase, setDbData: React.Dispatch<React.SetStateAction<any[]>>) => {
    db.transaction((tx: Transaction) => {
      // print all tables
      tx.executeSql("SELECT name FROM sqlite_master WHERE type='table'", [], (tx: Transaction, results: ResultSet) => {
        const rows = results.rows;
        for (let i = 0; i < rows.length; i++) {
          console.log('Table:', rows.item(i).name);
        }
      });

      // fetch all data from all tables

      tx.executeSql('SELECT * FROM linkedin_accounts', [], (tx: Transaction, results: ResultSet) => {
        const rows = results.rows;
        let data: any[] = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        console.log('Fetched data:', data);
      });

      tx.executeSql('SELECT * FROM twitter_accounts', [], (tx: Transaction, results: ResultSet) => {
        const rows = results.rows;
        let data: any[] = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        console.log('Fetched data:', data);
      });

      tx.executeSql(`SELECT * FROM content WHERE (published NOT LIKE '%"final":"success"%')`, [], (tx: Transaction, results: ResultSet) => {
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

  export async function refreshDbDataForDate(
    dateString: string,
    setDbData: React.Dispatch<React.SetStateAction<any[]>>
  ) {
    const { startOfDayUnix, endOfDayUnix } = getUnixTimestampsForDay(dateString);
    console.log('Start of day (Unix):', startOfDayUnix);
    console.log('End of day (Unix):', endOfDayUnix);
    try {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      db.transaction((tx: Transaction) => {
        tx.executeSql(
          `SELECT * FROM content WHERE post_date BETWEEN ? AND ? AND published NOT LIKE '%"final":"success"%'`,
          [startOfDayUnix, endOfDayUnix],
          (_, results) => {
            const rows = results.rows;
            const data: any[] = [];
            for (let i = 0; i < rows.length; i++) {
              data.push(rows.item(i));
            }
            setDbData(data);
          },
          (error) => {
            console.log('Error fetching content from the database:', error);
          }
        );
      });
    } catch (error) {
      console.log('Error opening database:', error);
    }
  }

  

// check if there are any rows in user_providers to confirm if any accounts exist
export const checkIfAccountsExist = async (): Promise<boolean> => {
    try {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        return new Promise<boolean>((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT COUNT(*) as count FROM user_providers',
                    [],
                    (_, results) => {
                        const count = results.rows.item(0).count;
                        resolve(count > 0);
                    },
                    (error) => {
                        console.log('Error checking accounts:', error);
                        reject(error);
                    }
                );
            });
        });
    } catch (error) {
        console.error('Database operation failed:', error);
        return false;
    }
}

export const fetchContentFromBeforeCurrentTime = async () => {
  console.log("fetchContentFromBeforeCurrentTime called");
    try {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        return new Promise<any[]>((resolve, reject) => {
            db.transaction(tx => {
                const currentTime = Math.floor(Date.now() / 1000);

                tx.executeSql(
                  `SELECT * FROM content WHERE post_date < ? AND published = '{}'`,
                    [currentTime],
                    (_, results) => {
                        const rows = results.rows;
                        let data: any[] = [];
                        for (let i = 0; i < rows.length; i++) {
                            data.push(rows.item(i));
                        }
                        if (data.length > 0) {
                            console.log('Fetched content:', data);
                            console.log("there is a weird error where if I do > or < all the content keeps coming back when it shouldnt")
                            console.log('post_date:', data[0].post_date)
                            console.log('current_time:', currentTime)
                            resolve(data);
                        } else {
                            console.log('No content found before current time.');
                            resolve([]);
                        }
                    },
                    (error) => {
                        console.log('Error fetching content:', error);
                        reject(error);
                    }
                );
            });
        });
    } catch (error) {
        console.error('Database operation failed:', error);
        return [];
    }
};

export const fetchUserIdFromDb = async (providerUserId: string): Promise<number | null> => {
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

export const fetchAppSettingsFromDb = async (settingKey: string): Promise<string | null> => {
    try {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        return new Promise<string | null>((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT setting_value FROM app_settings WHERE setting_key = ?',
                    [settingKey],
                    (_, results) => {
                        if (results.rows.length > 0) {
                            resolve(results.rows.item(0).setting_value);
                        } else {
                            resolve(null);
                        }
                    },
                    (error) => {
                        console.log('Error fetching app setting from database:', error);
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

export const insertAppSettingsIntoDb = async (settingKey: string, settingValue: string, mode: string): Promise<void> => {
    try {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        return new Promise<void>((resolve, reject) => {
            db.transaction(tx => {
                const query = mode === 'insert' ?
                    'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)' :
                    'UPDATE app_settings SET setting_value = ? WHERE setting_key = ?';
                const params = mode === 'insert' ? [settingKey, settingValue] : [settingValue, settingKey];
                tx.executeSql(
                    query,
                    params,
                    () => {
                        resolve();
                    },
                    (error) => {
                        console.log('Error inserting/updating app setting in database:', error);
                        reject(error);
                    }
                );
            });
        });
    } catch (error) {
        console.error('Database operation failed:', error);
    }
}

export const fetchNextAvailableScheduleDateFromDb = async (
  scheduleOption: string,
): Promise<[number, number, number] | null> => {
  try {
    const db = await SQLite.openDatabase({
      name: 'database_default.sqlite3',
      location: 'default',
    });

    return new Promise((resolve, reject) => {
      db.transaction((tx: Transaction) => {
        tx.executeSql(
          `SELECT post_date FROM content WHERE published NOT LIKE '%"final":"success"%'`,
          [],
          (_, results) => {
            const usedDates = new Set<string>();

            for (let i = 0; i < results.rows.length; i++) {
              const ts = results.rows.item(i).post_date;
              const d = new Date(ts * 1000);
              usedDates.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
            }

            const nextDaily = (): [number, number, number] => {
              const d = new Date();

              while (true) {
                const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
                if (!usedDates.has(key)) return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
                d.setDate(d.getDate() + 1);
              }
            };

            const nextMonthly = (day: number): [number, number, number] => {
              const today = new Date();
              let y = today.getFullYear();
              let m = today.getMonth() + 1;

              // If today's date is equal to or past the target day, start from next month
              if (today.getDate() >= day) {
                m += 1;
                if (m > 12) {
                  m = 1;
                  y += 1;
                }
              }

              while (true) {
                const candidate = new Date(y, m - 1, day);
                const key = `${candidate.getFullYear()}-${candidate.getMonth() + 1}-${candidate.getDate()}`;
                if (!usedDates.has(key)) return [candidate.getFullYear(), candidate.getMonth() + 1, candidate.getDate()];
                m += 1;
                if (m > 12) {
                  m = 1;
                  y += 1;
                }
              }
            };

            if (scheduleOption === 'Every first of the month') {
              resolve(nextMonthly(1));
            } else if (scheduleOption === 'Every 15th of the month') {
              resolve(nextMonthly(15));
            } else {
              resolve(nextDaily());
            }
          },
          (err) => {
            console.log('Error fetching scheduled content:', err);
            reject(err);
          },
        );
      });
    });
  } catch (error) {
    console.error('Database operation failed:', error);
    return null;
  }
};



export const handleNewSignUp = async ({ 
  provider, 
  setIsNewAccountVisible,
  setIsCalendarVisible,
  isCalendarVisible,
  setAccounts,
  mode
 }: HandleNewSignUpParams) : Promise<string | void> => {
  try {
    if (provider === 'YouTube') {
      console.log('Youtube SignUp');
     // We will do the same flow as LinkedIn for now
      // Inside handleDeepLink:
      const handleDeepLink = async (event: { url: string }) => {
        const match = event.url.match(/code=([^&]+)/);
        const code = match?.[1];
        if (code) {
          console.log('Got Youtube Code:', code);
          subscription.remove(); 
          const googleAC = await getGoogleAccessToken({
            grant_type: 'authorization_code',
            code: code,
          });
          console.log('Google Access Token:', googleAC);
          // do whatever with `code`
          const accountInfo = await getYoutubeUserInfo(googleAC.access_token);
          console.log('Youtube Account Info:', accountInfo);
          console.log('Channel name:', accountInfo.items[0].snippet.title);
          const existingProviderId = await fetchProviderIdFromDb(accountInfo.id);
          console.log('Existing Provider ID: ', existingProviderId);
          if (existingProviderId && mode === 'insert') {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          // now we will immediately get a refresh token as the getGoogleAccessToken accepts refresh_token as a param for grant_type
          // const googleRT = await getGoogleAccessToken({
          //   grant_type: 'refresh_token',
          //   access_token: googleAC.refresh_token
          // });

          // console.log('Google Refresh Token:', googleRT);
          if (mode === 'insert'){
          await insertProviderIdIntoDb(provider, accountInfo.items[0].id);
          }
          await insertYoutubeAccountIntoDb(
            mode,
            accountInfo.items[0].id,
            googleAC.refresh_token,
            googleAC.expires_in.toString(),
            new Date().toISOString(),
            accountInfo.items[0].snippet.title
          );
          forceUpdateAccounts(setAccounts);
          if (isCalendarVisible){
          setIsCalendarVisible(true);
          } else {
          setIsCalendarVisible(false);
          return "test";
          }

        }
      };
      const subscription = Linking.addEventListener('url', handleDeepLink);
      openGoogleLogin();

    }
    if (provider === 'Instagram') {
      console.log('Instagram SignUp');
      // We will do the same flow as LinkedIn for now
      // Inside handleDeepLink:
      const handleDeepLink = async (event: { url: string }) => {
        const match = event.url.match(/code=([^&]+)/);
        const code = match?.[1];
        if (code) {
          console.log('Got Instagram Code:', code);
          subscription.remove(); 
          const instagramAC = await getInstagramAccessToken({
            grant_type: 'authorization_code',
            code: code,
          });
          console.log('Instagram Access Token:', instagramAC);
          // do whatever with `code`
          const accountInfo = await getInstagramUserInfo(instagramAC.access_token);
          console.log('Instagram Account Info:', accountInfo);
          const existingProviderId = await fetchProviderIdFromDb(accountInfo.id);
          console.log('Existing Provider ID: ', existingProviderId);
          if (existingProviderId && mode === 'insert') {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          // now we will immediately get a refresh token as the getInstagramAccessToken accepts refresh_token as a param for grant_type
          const instagramXT = await getInstagramAccessToken({
            grant_type: 'ig_exchange_token',
            access_token: instagramAC.access_token
          });
          console.log('Instagram Refresh Token:', instagramXT);

          const instagramRT = await getInstagramAccessToken({
            grant_type: 'ig_refresh_token',
            access_token: instagramXT.access_token
          });

          console.log('Instagram Refresh Token:', instagramRT);
          if (mode === 'insert'){
          await insertProviderIdIntoDb(provider, accountInfo.id);
          }
          await insertInstagramAccountIntoDb(
            mode,
            accountInfo.id,
            instagramRT.access_token,
            instagramRT.expires_in.toString(),
            new Date().toISOString(),
            accountInfo.username
          );
          forceUpdateAccounts(setAccounts);
          setIsCalendarVisible(true);

        }
      };

      const subscription = Linking.addEventListener('url', handleDeepLink);
      openInstagramLogin();

    }
    
    if (provider === 'LinkedIn') {
      console.log('LinkedIn SignUp');

      
      // Inside handleDeepLink:
      const handleDeepLink = async (event: { url: string }) => {
        const match = event.url.match(/code=([^&]+)/);
        const code = match?.[1];
        if (code) {
          console.log('Got LinkedIn Code:', code);
          subscription.remove(); 
          const linkedAC = await getLinkedInAccessToken({
            grant_type: 'authorization_code',
            code: code,
          });
          
          
          console.log('LinkedIn Access Token:', linkedAC);
          // do whatever with `code`
          const accountInfo = await getLinkedInUserInfo(linkedAC.access_token);
          console.log('LinkedIn Account Info:', accountInfo);
          const existingProviderId = await fetchProviderIdFromDb(accountInfo.sub);
          console.log('Existing Provider ID: ', existingProviderId);
          if (existingProviderId && mode === 'insert') {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          // now we will immediately get a refresh token as the getLinkedInAccessToken accepts refresh_token as a param for grant_type
          
          if (mode === 'insert'){
          await insertProviderIdIntoDb(provider, accountInfo.sub);
          }
          await insertLinkedInAccountIntoDb(
            mode,
            linkedAC.access_token,
            accountInfo.name,
            new Date().toISOString(),
            accountInfo.sub,
            linkedAC.expires_in, 
            // for testing we make the expires_in 6 hours
            // 21600, // 6 hours in seconds
            // linkedAC.refresh_token,
            // linkedAC.refresh_token_expires_in
          );
          forceUpdateAccounts(setAccounts);
          setIsCalendarVisible(true);

        }
      };
      
      const subscription = Linking.addEventListener('url', handleDeepLink);
        openLinkedInLogin();
    }

    if (provider === 'Threads') {
      console.log('Threads SignUp');

      // We will do the same flow as LinkedIn for now
      // Inside handleDeepLink:
      const handleDeepLink = async (event: { url: string }) => {
        const match = event.url.match(/code=([^&]+)/);
        const code = match?.[1];
        if (code) {
          console.log('Got Threads Code:', code);
          subscription.remove(); 
          const threadsAC = await getThreadsAccessToken({
            grant_type: 'authorization_code',
            code: code,
          });

          console.log('Threads Access Token:', threadsAC);
          // do whatever with `code`
          const accountInfo = await getThreadsUserInfo(threadsAC.access_token);
          console.log('Threads Account Info:', accountInfo);
          // We will test from here first before inserting into the db
          // successful test - lets continue
          const existingProviderId = await fetchProviderIdFromDb(accountInfo.id);
          console.log('Existing Provider ID: ', existingProviderId);
          if (existingProviderId && mode === 'insert') {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          if (mode === 'insert'){
          await insertProviderIdIntoDb(provider, accountInfo.id);
          }
          await insertThreadsAccountIntoDb(
            mode,
            accountInfo.id,
            threadsAC.access_token,
            threadsAC.expires_in.toString(),
            new Date().toISOString(),
            accountInfo.username
          );
          forceUpdateAccounts(setAccounts);
          setIsCalendarVisible(true);

    }
  };
  
        const subscription = Linking.addEventListener('url', handleDeepLink);
          openThreadsLogin();
      }

    setIsNewAccountVisible(false);
  } catch (error) {
    console.log('Error signing in: ', error);
  }
};


export const fetchProviderIdFromDb  = async (providerUserId: string): Promise<boolean> => {
        try {
            console.log('Fetching provider_user_id from database:', providerUserId);
            const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
            return new Promise<boolean>((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql(
                        'SELECT COUNT(*) as count FROM user_providers WHERE provider_user_id = ?',
                        [providerUserId],
                        (_, results) => {
                            if (results.rows.item(0).count > 0) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        },
                        (error) => {
                            console.log('Error fetching provider_user_id from database:', error);
                            resolve(false);  
                        }
                    );
                });
            });
        } catch (error) {
            console.error('Database operation failed:', error);
            return false;
        }
    };
    


export const insertProviderIdIntoDb = (providerName: string, providerUserId: string) => {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
                console.log("providerName:", providerName);
                console.log("providerUserId:", providerUserId);
                // Insert provider ID into the user_providers table
                tx.executeSql(
                  `INSERT OR REPLACE INTO user_providers (provider_name, provider_user_id) VALUES (?, ?)`,
                  [providerName, providerUserId],
                  () => {
                    console.log(`${providerName} ID stored in the database:`, providerUserId);
                    resolve();
                  },
                  (error) => {
                    console.log(`Error storing ${providerName} ID in the database:`, error);
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

  export const insertTwitterAccountIntoDb = (consumerKey: string, 
    consumerSecret: string, 
    accessToken: string, 
    accessTokenSecret: string,
    accountName: string,
    subId: string) => {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {

                // Insert Twitter account into the twitter_accounts table
                tx.executeSql(
                  `INSERT INTO twitter_accounts (twitter_consumer_key, twitter_consumer_secret, twitter_access_token, twitter_access_token_secret, account_name, sub_id) VALUES (?, ?, ?, ?, ?, ?)`,
                  [consumerKey, consumerSecret, accessToken, accessTokenSecret, accountName, subId],
                  () => {
                    console.log('Twitter account stored in the database');
                    resolve();
                  },
                  (error) => {
                    console.log('Error storing Twitter account in the database:', error);
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
    }
    );
  }

  export const insertLinkedInAccountIntoDb = (
    mode: string,
    appToken: string,
    accountName: string,
    timestamp: string,
    subId: string,
    appTokenExpiresIn: number,
    appRefreshToken?: string,
    appTokenRefreshExpiresIn?: number
  ) => {
    if (mode === 'insert') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          console.log(appToken, accountName, timestamp, subId, appTokenExpiresIn, appRefreshToken, appTokenRefreshExpiresIn);
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `INSERT INTO linkedin_accounts 
                (app_token, app_refresh_token, app_token_expires_in, app_token_refresh_expires_in, account_name, timestamp, sub_id) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                appToken,
                appRefreshToken ?? null,
                appTokenExpiresIn,
                appTokenRefreshExpiresIn ?? null,
                accountName,
                timestamp,
                subId,
              ],
              () => {
                console.log('LinkedIn account stored in the database');
                resolve();
              },
              (error) => {
                console.log('Error storing LinkedIn account in the database:', error);
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
  } if (mode === 'update') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `UPDATE linkedin_accounts 
                SET app_token = ?, app_refresh_token = ?, app_token_expires_in = ?, app_token_refresh_expires_in = ?, account_name = ?
               WHERE sub_id = ?`,
              [
                appToken,
                appRefreshToken ?? null,
                appTokenExpiresIn,
                appTokenRefreshExpiresIn ?? null,
                accountName,
                subId,
              ],
              () => {
                console.log('LinkedIn account updated in the database');
                resolve();
              },
              (error) => {
                console.log('Error updating LinkedIn account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error) => {
          console.log('Error opening database:', error);
          reject(error);
        });
    })
  }
  };

  export const insertThreadsAccountIntoDb = (
    mode: string,
    subId: string,
    accessToken: string,
    accessTokenExpiresIn: string,
    timestamp: string,
    accountName: string
  ) => {
    if (mode === 'insert') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `INSERT INTO threads_accounts 
                (sub_id, access_token, access_token_expires_in, timestamp, account_name)
               VALUES (?, ?, ?, ?, ?)`,
              [
                subId,
                accessToken,
                accessTokenExpiresIn,
                timestamp,
                accountName,
              ],
              () => {
                console.log('Threads account stored in the database');
                resolve();
              },
              (error) => {
                console.log('Error storing Threads account in the database:', error);
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
  } if (mode === 'update') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `UPDATE threads_accounts 
                SET access_token = ?, access_token_expires_in = ?, timestamp = ?, account_name = ?
               WHERE sub_id = ?`,
              [
                accessToken,
                accessTokenExpiresIn,
                timestamp,
                accountName,
                subId,
              ],
              () => {
                console.log('Threads account updated in the database');
                resolve();
              },
              (error) => {
                console.log('Error updating Threads account in the database:', error);
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
  }};


export const insertYoutubeAccountIntoDb = (
    mode: string,
    subId: string,
    accessToken: string,
    accessTokenExpiresIn: string,
    timestamp: string,
    accountName: string
  ) => {
    if (mode === 'insert') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `INSERT INTO youtube_accounts 
                (sub_id, access_token, access_token_expires_in, timestamp, account_name)
               VALUES (?, ?, ?, ?, ?)`,
              [
                subId,
                accessToken,
                accessTokenExpiresIn,
                timestamp,
                accountName,
              ],
              () => {
                console.log('Youtube account stored in the database');
                resolve();
              },
              (error) => {
                console.log('Error storing Youtube account in the database:', error);
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
  } if (mode === 'update') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `UPDATE youtube_accounts 
                SET access_token = ?, access_token_expires_in = ?, timestamp = ?, account_name = ?
               WHERE sub_id = ?`,
              [
                accessToken,
                accessTokenExpiresIn,
                timestamp,
                accountName,
                subId,
              ],
              () => {
                console.log('Youtube account updated in the database');
                resolve();
              },
              (error) => {
                console.log('Error updating Youtube account in the database:', error);
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
  }};


export const insertInstagramAccountIntoDb = (
    mode: string,
    subId: string,
    accessToken: string,
    accessTokenExpiresIn: string,
    timestamp: string,
    accountName: string
  ) => {
    if (mode === 'insert') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `INSERT INTO instagram_accounts 
                (sub_id, access_token, access_token_expires_in, timestamp, account_name)
               VALUES (?, ?, ?, ?, ?)`,
              [
                subId,
                accessToken,
                accessTokenExpiresIn,
                timestamp,
                accountName,
              ],
              () => {
                console.log('Instagram account stored in the database');
                resolve();
              },
              (error) => {
                console.log('Error storing Instagram account in the database:', error);
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
  } if (mode === 'update') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `UPDATE instagram_accounts 
                SET access_token = ?, access_token_expires_in = ?, timestamp = ?, account_name = ?
               WHERE sub_id = ?`,
              [
                accessToken,
                accessTokenExpiresIn,
                timestamp,
                accountName,
                subId,
              ],
              () => {
                console.log('Instagram account updated in the database');
                resolve();
              },
              (error) => {
                console.log('Error updating Instagram account in the database:', error);
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
  }};

  export const resyncAccount = async(providerId: string, provider: string) => {
    switch (provider.toLowerCase()) {
      case 'linkedin':
        await insertLinkedInAccountIntoDb('update', '', '', new Date().toISOString(), providerId, 0);
        break;
      case 'instagram':
        await insertInstagramAccountIntoDb('update', providerId, '', '0', new Date().toISOString(), '');
        break;
      case 'youtube':
        await insertYoutubeAccountIntoDb('update', providerId, '', '0', new Date().toISOString(), '');
        break;
      case 'threads':
        const threadsCreds = await fetchThreadsCredentials(providerId);
            if (!threadsCreds) {
              console.warn(`No Threads credentials found for providerId: ${providerId}`);
              break;
            }
            console.log("threadsCreds:", threadsCreds);
            // attempt to update the refresh token before posting
            const threadsRT = await getThreadsAccessToken({
              grant_type: "th_refresh_token",
              access_token: threadsCreds.accessToken,
            })
            if (threadsRT.error) {
              console.warn(`Error updating Threads access token for providerId: ${providerId}`);
              break;
            }
            await insertThreadsAccountIntoDb(
              "update",
              threadsCreds.subId,
              threadsRT.access_token,
              threadsRT.expires_in,
              new Date().toISOString(),
              threadsCreds.accountName
            )

        // await insertThreadsAccountIntoDb('update', providerId, '', '0', new Date().toISOString(), '');
        break;
      default:
        console.log(`Resync not supported for provider: ${provider}`);
    }
  }

  export const removeAccount = async (
    accountType: string,
    accountId: string,
    setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>
  ) => {
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    console.log('Removing account:', accountType.toLowerCase(), accountId);
    console.log('Removing account:', accountType.toLowerCase(), accountId);
    console.log('Removing account:', accountType.toLowerCase(), accountId);
    console.log('Removing account:', accountType.toLowerCase(), accountId);
    console.log('Removing account:', accountType.toLowerCase(), accountId);
    // Check if the account type is valid
    db.transaction(tx => {
      // Remove from provider-specific table
      if (accountType.toLowerCase() === 'linkedin') {
        tx.executeSql('DELETE FROM linkedin_accounts WHERE sub_id = ?', [accountId]);
      } else if (accountType.toLowerCase() === 'instagram') {
        console.log('Deleting Instagram account with ID:', accountId);
        tx.executeSql('DELETE FROM instagram_accounts WHERE sub_id = ?', [accountId]);
      } else if (accountType.toLowerCase() === 'youtube') {
        tx.executeSql('DELETE FROM youtube_accounts WHERE sub_id = ?', [accountId]);
      } else if (accountType.toLowerCase() === 'threads') {
        console.log('Deleting Threads account with ID:', accountId);
        tx.executeSql('DELETE FROM threads_accounts WHERE sub_id = ?', [accountId]);
      } else if (accountType.toLowerCase() === 'twitter') {
        tx.executeSql('DELETE FROM twitter_accounts WHERE sub_id = ?', [accountId]);
      }
      console.log("test test test test")  
  
      // Remove from user_providers table
      tx.executeSql(
        'DELETE FROM user_providers WHERE provider_user_id = ?',
        [accountId],
        () => {
          Alert.alert('Account Removed', 'The account has been removed successfully.');
          forceUpdateAccounts(setAccounts);
        },
        (error) => {
          console.log('Error removing account: ', error);
        }
      );
    });
  };
  


export const fetchProviderNamesByIds = async (providerIds: string[]): Promise<{ [id: string]: string }> => {
  const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });

  return new Promise((resolve, reject) => {
    const placeholders = providerIds.map(() => '?').join(',');
    const sql = `SELECT provider_user_id, provider_name FROM user_providers WHERE provider_user_id IN (${placeholders})`;

    db.transaction(tx => {
      tx.executeSql(
        sql,
        providerIds,
        (_, results) => {
          const map: { [id: string]: string } = {};
          for (let i = 0; i < results.rows.length; i++) {
            const row = results.rows.item(i);
            map[row.provider_user_id] = row.provider_name;
          }
          resolve(map);
        },
        (err) => {
          console.log('Error fetching provider names by IDs:', err);
          reject(err);
        }
      );
    });
  });
};

export const fetchTwitterCredentials = async (providerUserId: string): Promise<{
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
} | null> => {
  try {
    console.log('Fetching Twitter credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT twitter_consumer_key, twitter_consumer_secret, twitter_access_token, twitter_access_token_secret, account_name
           FROM twitter_accounts
           WHERE twitter_accounts.twitter_access_token LIKE ? || '-%'`,
          [providerUserId],
  
          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                consumerKey: row.twitter_consumer_key,
                consumerSecret: row.twitter_consumer_secret,
                accessToken: row.twitter_access_token,
                accessTokenSecret: row.twitter_access_token_secret,
              });
            } else {
              resolve(null);
            }
          },
          error => {
            console.error('Error fetching Twitter credentials:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('DB open error:', error);
    return null;
  }
};

export const fetchLinkedInCredentials = async (providerUserId: string): Promise<{
  appToken: string;
  appRefreshToken?: string;
  appTokenExpiresIn: string;
  appTokenRefreshExpiresIn?: string;
  accountName: string;
  timestamp: string;
} | null> => {
  try {
    console.log('Fetching LinkedIn credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT app_token, app_refresh_token, app_token_expires_in, app_token_refresh_expires_in, account_name, timestamp
           FROM linkedin_accounts
           WHERE linkedin_accounts.sub_id = ?`,
          [providerUserId],
  
          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                appToken: row.app_token,
                appRefreshToken: row.app_refresh_token,
                appTokenExpiresIn: row.app_token_expires_in,
                appTokenRefreshExpiresIn: row.app_token_refresh_expires_in,
                accountName: row.account_name,
                timestamp: row.timestamp,
              });
            } else {
              resolve(null);
            }
          },
          error => {
            console.error('Error fetching LinkedIn credentials:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('DB open error:', error);
    return null;
  }
}

export const fetchThreadsCredentials = async (providerUserId: string): Promise<{
  subId: string;
  accountName: string;
  accessToken: string;
  accessTokenExpiresIn: string;
  timestamp: string;
} | null> => {
  try {
    console.log('Fetching Threads credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT sub_id, account_name, access_token, access_token_expires_in, timestamp
           FROM threads_accounts
           WHERE threads_accounts.sub_id = ?`,
          [providerUserId],
  
          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                subId: row.sub_id,
                accountName: row.account_name,
                accessToken: row.access_token,
                accessTokenExpiresIn: row.access_token_expires_in,
                timestamp: row.timestamp,
              });
            } else {
              resolve(null);
            }
          },
          error => {
            console.error('Error fetching Threads credentials:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('DB open error:', error);
    return null;
  }
}

export const fetchInstagramCredentials = async (providerUserId: string): Promise<{
  subId: string;
  accountName: string;
  accessToken: string;
  accessTokenExpiresIn: string;
  timestamp: string;
} | null> => {
  try {
    console.log('Fetching Instagram credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT sub_id, account_name, access_token, access_token_expires_in, timestamp
           FROM instagram_accounts
           WHERE instagram_accounts.sub_id = ?`,
          [providerUserId],
  
          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                subId: row.sub_id,
                accountName: row.account_name,
                accessToken: row.access_token,
                accessTokenExpiresIn: row.access_token_expires_in,
                timestamp: row.timestamp,
              });
            } else {
              resolve(null);
            }
          },
          error => {
            console.error('Error fetching Instagram credentials:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('DB open error:', error);
    return null;
  }
}

export const fetchYoutubeCredentials = async (providerUserId: string): Promise<{
  subId: string;
  accountName: string;
  accessToken: string;
  accessTokenExpiresIn: string;
  timestamp: string;
} | null> => {
  try {
    console.log('Fetching Youtube credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT sub_id, account_name, access_token, access_token_expires_in, timestamp
           FROM youtube_accounts
           WHERE youtube_accounts.sub_id = ?`,
          [providerUserId],
  
          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                subId: row.sub_id,
                accountName: row.account_name,
                accessToken: row.access_token,
                accessTokenExpiresIn: row.access_token_expires_in,
                timestamp: row.timestamp,
              });
            } else {
              resolve(null);
            }
          },
          error => {
            console.error('Error fetching Youtube credentials:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('DB open error:', error);
    return null;
  }
}





export const linkedInAccessTokenExpirationChecker = async (): Promise<LinkedInExpiryInfo[]> => {
  const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });

  return new Promise<LinkedInExpiryInfo[]>((resolve, reject) => {
    db.transaction((tx: Transaction) => {
      tx.executeSql(
        `
          SELECT
            lp.provider_user_id          AS id,
            la.account_name              AS accountName,
            la.app_token_expires_in      AS expiresInSec,
            la.timestamp                 AS issuedIso
          FROM user_providers lp
          JOIN linkedin_accounts la
            ON la.sub_id = lp.provider_user_id
        `,
        [],
        (_: Transaction, res: ResultSet) => {
          const nowMs     = Date.now();
          const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

          const list: LinkedInExpiryInfo[] = [];

          for (let i = 0; i < res.rows.length; i++) {
            const row = res.rows.item(i);

            // `timestamp` is ISO-8601 the moment the token was acquired
            const issuedMs     = new Date(row.issuedIso).getTime();
            const expiresMs    = issuedMs + Number(row.expiresInSec) * 1000;

            list.push({
              id: row.id,
              accountName: row.accountName,
              expiresSoon: expiresMs <= nowMs + twoDaysMs,
            });
          }

          resolve(list);
        },
        err => {
          console.log('LinkedIn expiry check error:', err);
          reject(err);
        }
      );
    });
  });
};



