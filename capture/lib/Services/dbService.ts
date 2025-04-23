import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import type { SocialMediaAccount, HandleNewSignUpParams } from '../../types/SociaMedia';
import { LoginManager, AccessToken, Settings } from 'react-native-fbsdk-next';
import RNFS from 'react-native-fs';
import { Alert } from 'react-native';
import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from '@env';
import { getLinkedInAccessToken, openLinkedInLogin, getLinkedInUserInfo } from '../Apis/linkedin';
import { getThreadsAccessToken, openThreadsLogin, getThreadsUserInfo,
  getInstagramUserInfo, getInstagramAccessToken, openInstagramLogin  } from '../Apis/meta';
import { getGoogleAccessToken, openGoogleLogin, getYoutubeUserInfo } from '../Apis/youtube';
import { Linking } from 'react-native';

export const listDirectoryContents = async (path: string) => {
    try {
      const files = await RNFS.readDir(path);
      console.log('Directory contents:', files);
    } catch (error) {
      console.error('Error reading directory:', error);
    }
  };

export const insertFakeData = (db: SQLiteDatabase) => {
    db.transaction((tx: Transaction) => {
      const unixTime = Math.floor(Date.now() / 1000);
      tx.executeSql(
        `INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)`,
        [1, 'post', 'testphone', unixTime, {}],
        () => {
          console.log('Fake data inserted successfully');
        },
        (error) => {
          console.log('Error inserting fake data:', error);
        }
      );
    });
  };


export const createTables = (tx: Transaction) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS user_providers (
      provider_name TEXT NOT NULL, -- e.g., 'google', 'meta', 'twitter', etc.
      provider_user_id TEXT NOT NULL, -- e.g., Google sub, Meta ID, etc.
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
        published TEXT NOT NULL DEFAULT '{}',
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
        twitter_consumer_key TEXT,
        twitter_access_token TEXT,
        twitter_access_token_secret TEXT,
        twitter_consumer_secret TEXT
        account_name TEXT,
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS linkedin_accounts (
        app_token TEXT,
        app_refresh_token TEXT,
        app_token_expires_in INTEGER,
        app_token_refresh_expires_in INTEGER,
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
        (tx: Transaction, results: ResultSet) => {
          const rows = results.rows;
          console.log(rows)
          for (let i = 0; i < rows.length; i++) {
            console.log('Row:', rows.item(i));
          }
          let accountsList: SocialMediaAccount[] = []; 
          for (let i = 0; i < rows.length; i++) {
            accountsList.push(rows.item(i));
          }
          console.log('Accounts: ', accountsList);
          setAccounts(accountsList); 
        },
        (error) => {
          console.log('Error fetching accounts: ', error);
        }
      );
    });
  }


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
    try {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        return new Promise<any[]>((resolve, reject) => {
            db.transaction(tx => {
                const currentTime = Math.floor(Date.now() / 1000);
                tx.executeSql(
                  `SELECT * FROM content WHERE post_date < ? AND (published NOT LIKE '%"final":"success"%')`,                
                    [currentTime],
                    (_, results) => {
                        const rows = results.rows;
                        let data: any[] = [];
                        for (let i = 0; i < rows.length; i++) {
                            data.push(rows.item(i));
                        }
                        if (data.length > 0) {
                            console.log('Fetched content:', data);
                            resolve(data);
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


export const handleNewSignUp = async ({ 
  provider, 
  GoogleSignin,
  setIsAccountsVisible,
  setIsNewAccountVisible,
  setIsCalendarVisible,
  setIsLoginVisible,
  setAccounts
 }: HandleNewSignUpParams) => {
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
          if (existingProviderId) {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          await insertProviderIdIntoDb(provider, accountInfo.items[0].id);
          await insertYoutubeAccountIntoDb(
            accountInfo.items[0].id,
            googleAC.access_token,
            googleAC.expires_in,
            new Date().toISOString(),
            accountInfo.items[0].snippet.title
          );
          forceUpdateAccounts(setAccounts);
          setIsCalendarVisible(true);

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
          if (existingProviderId) {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          await insertProviderIdIntoDb(provider, accountInfo.id);
          await insertInstagramAccountIntoDb(
            accountInfo.id,
            instagramAC.access_token,
            "864000",
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
          if (existingProviderId) {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          await insertProviderIdIntoDb(provider, accountInfo.sub);
          await insertLinkedInAccountIntoDb(
            linkedAC.access_token,
            accountInfo.name,
            new Date().toISOString(),
            accountInfo.sub,
            linkedAC.expires_in,
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
          if (existingProviderId) {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          await insertProviderIdIntoDb(provider, accountInfo.id);
          await insertThreadsAccountIntoDb(
            accountInfo.id,
            threadsAC.access_token,
            threadsAC.expires_in,
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
    accountName: string) => {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {

                // Insert Twitter account into the twitter_accounts table
                tx.executeSql(
                  `INSERT INTO twitter_accounts (twitter_consumer_key, twitter_consumer_secret, twitter_access_token, twitter_access_token_secret, account_name) VALUES (?, ?, ?, ?, ?)`,
                  [consumerKey, consumerSecret, accessToken, accessTokenSecret, accountName],
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
    appToken: string,
    accountName: string,
    timestamp: string,
    subId: string,
    appTokenExpiresIn: number,
    appRefreshToken?: string,
    appTokenRefreshExpiresIn?: number
  ) => {
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
  };

  export const insertThreadsAccountIntoDb = (
    subId: string,
    accessToken: string,
    accessTokenExpiresIn: string,
    timestamp: string,
    accountName: string
  ) => {
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
  };


export const insertYoutubeAccountIntoDb = (
    subId: string,
    accessToken: string,
    accessTokenExpiresIn: string,
    timestamp: string,
    accountName: string
  ) => {
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
  }

export const insertInstagramAccountIntoDb = (
    subId: string,
    accessToken: string,
    accessTokenExpiresIn: string,
    timestamp: string,
    accountName: string
  ) => {
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
  };

  export const removeAccount = async (
    accountType: string,
    accountId: number,
    setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>
  ) => {
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    console.log('Removing account:', accountType, accountId);
    // Check if the account type is valid
    db.transaction(tx => {
      // Remove from provider-specific table
      if (accountType === 'Linkedin') {
        tx.executeSql('DELETE FROM linkedin_accounts WHERE sub_id = ?', [accountId]);
      } else if (accountType === 'instagram') {
        tx.executeSql('DELETE FROM instagram_accounts WHERE sub_id = ?', [accountId]);
      } else if (accountType === 'youtube') {
        tx.executeSql('DELETE FROM youtube_accounts WHERE sub_id = ?', [accountId]);
      } else if (accountType === 'Threads') {
        console.log('Deleting Threads account with ID:', accountId);
        tx.executeSql('DELETE FROM threads_accounts WHERE sub_id = ?', [accountId]);
      } else if (accountType === 'twitter') {
        tx.executeSql('DELETE FROM twitter_accounts WHERE ID = ?', [accountId]);
      }
  
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
          `SELECT twitter_consumer_key, twitter_consumer_secret, twitter_access_token, twitter_access_token_secret
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
  appTokenExpiresIn: number;
  appTokenRefreshExpiresIn?: number;
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
