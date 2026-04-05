import SQLite, { SQLiteDatabase, Transaction, ResultSet } from '../Compat/SQLite';
import type { SocialMediaAccount, HandleNewSignUpParams, LinkedInExpiryInfo } from '../../types/SociaMedia';
import RNFS from '../Compat/RNFS';
import { Alert, Platform } from 'react-native';
import { getLinkedInAccessToken, openLinkedInLogin, getLinkedInUserInfo } from '../Apis/linkedin';
import { getThreadsAccessToken, openThreadsLogin, getThreadsUserInfo,
  getInstagramUserInfo, getInstagramAccessToken, openInstagramLogin,
  openFacebookLogin, getFacebookPageAccounts } from '../Apis/meta';
import { getGoogleAccessToken, openGoogleLogin, getYoutubeUserInfo } from '../Apis/youtube';
import { getTikTokAccessToken, openTikTokLogin, getTikTokUserInfo } from '../Apis/tiktok';
// import { getBlueskyAccessToken, openBlueskyLogin, getBlueskyUserInfo } from '../Apis/bluesky';

import { Linking } from 'react-native';
import { getUnixTimestampsForDay } from '../Helpers/dateHelper';
import { scheduleOptions } from '../../types/SociaMedia';

const extractOAuthCode = (url: string): string | null => {
  const match = url.match(/[?&]code=([^&#]+)/);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]).replace(/#_$/, '');
};

const extractOAuthState = (url: string): string | null => {
  const match = url.match(/[?&]state=([^&#]+)/);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]).replace(/#_$/, '');
};

const extractOAuthAccessToken = (url: string): string | null => {
  const match = url.match(/[?&#]access_token=([^&#]+)/);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]).replace(/#_$/, '');
};

const extractOAuthExpiresIn = (url: string): string | null => {
  const match = url.match(/[?&#]expires_in=([^&#]+)/);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]).replace(/#_$/, '');
};

const buildOAuthState = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const showAuthAlert = (title: string, message: string) => {
  const safeMessage = String(message || 'Unknown error');
  console.log(`[${title}] ${safeMessage}`);
  if (Platform.OS !== 'windows') {
    Alert.alert(title, safeMessage);
  }
};

let instagramOAuthSubscription: { remove: () => void } | null = null;
let lastInstagramOAuthCode: string | null = null;
let linkedInOAuthSubscription: { remove: () => void } | null = null;
let lastLinkedInOAuthCode: string | null = null;
let threadsOAuthSubscription: { remove: () => void } | null = null;
let lastThreadsOAuthCode: string | null = null;
let facebookOAuthSubscription: { remove: () => void } | null = null;
let lastFacebookOAuthAccessToken: string | null = null;

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
        refresh_token TEXT,
        access_token_expires_in TEXT,
        refresh_token_expires_in TEXT,
        account_name TEXT,
        timestamp DATETIME
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS bluesky_accounts (
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
      CREATE TABLE IF NOT EXISTS facebook_accounts (
        sub_id TEXT,
        access_token TEXT,
        user_access_token TEXT,
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
            } else if (provider === 'Twitter' || provider === 'twitter') {
              const creds = await fetchTwitterCredentials(id);
              accountName = creds?.accountName ?? '';
            } else if (provider === 'TikTok') {
              const creds = await fetchTikTokCredentials(id);
              accountName = creds?.accountName ?? '';
            } else if (provider === 'BlueSky') {
              const creds = await fetchBlueSkyCredentials(id);
              accountName = creds?.accountName ?? '';
            } else if (provider === 'Facebook' || provider === 'facebook') {
              const creds = await fetchFacebookCredentials(id);
              accountName = creds?.accountName ?? '';
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
      (error: any) => {
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

      // tx.executeSql(`SELECT * FROM content WHERE (published NOT LIKE '%"final":"success"%')`, [], (tx: Transaction, results: ResultSet) => {
      //   const rows = results.rows;
      //   let data: any[] = [];
      //   for (let i = 0; i < rows.length; i++) {
      //     data.push(rows.item(i));
      //   }
      //   console.log('Fetched data:', data);
      //   setDbData(data);
      // });


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
          (error: any) => {
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
                    (error: any) => {
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
                    (error: any) => {
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
                    (error: any) => {
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
                    (error: any) => {
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
                    (error: any) => {
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
          (err: any) => {
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
    // if (provider === 'BlueSky') {
    //   console.log('Bluesky SignUp');
    //  // We will do the same flow as LinkedIn for now
    //   // Inside handleDeepLink:
    //   let redeemedOnce = false;
    //   const handleDeepLink = async (event: { url: string }) => {
    //     // const match = event.url.match(/code=([^&]+)/);
    //     // const code = match?.[1];
    //     const event_url = event.url;
    //     const m = event.url.match(/[?&]code=([^&]+)/);
    //     const raw = m?.[1];
    //     const code = raw ? decodeURIComponent(raw).trim() : undefined;
    //     console.log('redeemedOnce:', redeemedOnce);
    //     console.log('event_url', event_url);
    //     console.log('m', m);
    //     console.log('raw', raw);
    //     console.log('code', code);

    //     if (code) {
    //       console.log('Got Bluesky Code:', code);
    //       if (redeemedOnce) {
    //         console.log('Got Bluesky Code again, ignoring duplicate event');
    //         return;
    //       }
    //       redeemedOnce = true;
    //       console.log("reemedOnce", redeemedOnce);

    //       subscription.remove();
    //       const blueskyAC = await getBlueskyAccessToken({
    //         grant_type: 'authorization_code',
    //         code: code,
    //       });
    //       console.log('Bluesky Access Token:', blueskyAC);
    //       // do whatever with `code`
    //       const accountInfo = await getBlueskyUserInfo(blueskyAC.access_token);
    //       console.log('Bluesky Account Info:', accountInfo);
    //       console.log('Channel name:', accountInfo.items[0].snippet.title);
          
    //       const providerId = accountInfo.did || accountInfo.id;
    //       // const existingProviderId = await fetchProviderIdFromDb(accountInfo.id);
    //       const existingProviderId = await fetchProviderIdFromDb(providerId);

    //       console.log('Existing Provider ID: ', existingProviderId);
    //       if (existingProviderId && mode === 'insert') {
    //         Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
    //         return;
    //       }
    //       // now we will immediately get a refresh token as the getBlueskyAccessToken accepts refresh_token as a param for grant_type
    //       // const googleRT = await getGoogleAccessToken({
    //       //   grant_type: 'refresh_token',
    //       //   access_token: googleAC.refresh_token
    //       // });

    //       // console.log('Bluesky Refresh Token:', blueskyRT);
    //       if (mode === 'insert'){
    //       // await insertProviderIdIntoDb(provider, accountInfo.items[0].id);
    //       await insertProviderIdIntoDb(provider, providerId);
    //       }
    //       await insertBlueskyAccountIntoDb(
    //         mode,
    //         // accountInfo.items[0].id,
    //         providerId,
    //         blueskyAC.refresh_token,
    //         blueskyAC.expires_in.toString(),
    //         new Date().toISOString(),
    //         // accountInfo.items[0].snippet.title
    //         accountInfo.handle
    //       );
    //       forceUpdateAccounts(setAccounts);
    //       if (isCalendarVisible){
    //       setIsCalendarVisible(true);
    //       } else {
    //       setIsCalendarVisible(false);
    //       return "test";
    //       }

    //     }
    //   };
    //   const subscription = Linking.addEventListener('url', handleDeepLink);
    //   openBlueskyLogin();
    // }


    if (provider === 'TikTok') {
      console.log('TikTok SignUp');
      // We will do the same flow as LinkedIn for now
      // Inside handleDeepLink:
      const handleDeepLink = async (event: { url: string }) => {
        console.log('TikTok callback URL:', event.url);
        const code = extractOAuthCode(event.url);
        if (code) {
          console.log('Got TikTok Code:', code);
          subscription.remove();
          const tiktokAC = await getTikTokAccessToken({
            grant_type: 'authorization_code',
            code: code,
          });
          console.log('TikTok Access Token:', tiktokAC);
          // do whatever with `code`
          const accountInfo = await getTikTokUserInfo(tiktokAC.access_token);
          console.log('TikTok Account Info:', accountInfo);
          console.log('Display name:', accountInfo.data.user.display_name);
          const existingProviderId = await fetchProviderIdFromDb(accountInfo.data.user.open_id);
          console.log('Existing Provider ID: ', existingProviderId);
          if (existingProviderId && mode === 'insert') {
            Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          // now we will immediately get a refresh token as the getTikTokAccessToken accepts refresh_token as a param for grant_type
          
          if (mode === 'insert'){
          await insertProviderIdIntoDb(provider, accountInfo.data.user.open_id);
          }
          await insertTikTokAccountIntoDb(
            mode,
            accountInfo.data.user.open_id,
            tiktokAC.access_token,
            tiktokAC.refresh_token,
            tiktokAC.expires_in.toString(),
            tiktokAC.refresh_expires_in.toString(),
            new Date().toISOString(),
            accountInfo.data.user.display_name
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
      openTikTokLogin();
    }

    if (provider === 'YouTube') {
      console.log('Youtube SignUp');
     // We will do the same flow as LinkedIn for now
      // Inside handleDeepLink:
      const handleDeepLink = async (event: { url: string }) => {
        console.log('YouTube callback URL:', event.url);
        const code = extractOAuthCode(event.url);
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
      const expectedState = buildOAuthState();
      let handled = false;

      // We will do the same flow as LinkedIn for now
      // Inside handleDeepLink:
      const handleDeepLink = async (event: { url: string }) => {
        console.log('Instagram callback URL:', event.url);
        const code = extractOAuthCode(event.url);
        const state = extractOAuthState(event.url);
        if (code) {
          try {
            if (handled) {
              console.log('Ignoring duplicate Instagram callback event.');
              return;
            }
            if (code === lastInstagramOAuthCode) {
              console.log('Ignoring replayed Instagram callback code.');
              return;
            }
            if (state && state !== expectedState) {
              console.log('Ignoring Instagram callback with mismatched OAuth state.');
              return;
            }
            if (!state) {
              console.log('Instagram callback missing OAuth state; continuing without state validation.');
            }
            handled = true;
            lastInstagramOAuthCode = code;
            console.log('Got Instagram Code:', code);
            subscription.remove();
            instagramOAuthSubscription = null;
            const instagramAC = await getInstagramAccessToken({
              grant_type: 'authorization_code',
              code: code,
            });
            console.log('Instagram Access Token:', instagramAC);
            if (!instagramAC?.access_token) {
              const message =
                instagramAC?.error_message ??
                instagramAC?.error?.message ??
                'Failed to exchange Instagram authorization code.';
              showAuthAlert(
                'Instagram login failed',
                message.includes('authorization code has been used')
                  ? 'That Instagram code was already used. Please start Instagram login again from the app.'
                  : message,
              );
              return;
            }
            // do whatever with `code`
            const accountInfo = await getInstagramUserInfo(instagramAC.access_token);
            console.log('Instagram Account Info:', accountInfo);
            if (!accountInfo?.id || accountInfo?.error) {
              const message =
                accountInfo?.error?.message ?? 'Failed to fetch Instagram account information.';
              showAuthAlert('Instagram login failed', message);
              return;
            }
            const existingProviderId = await fetchProviderIdFromDb(accountInfo.id);
            console.log('Existing Provider ID: ', existingProviderId);
            if (existingProviderId && mode === 'insert') {
              showAuthAlert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
              return;
            }
            // now we will immediately get a refresh token as the getInstagramAccessToken accepts refresh_token as a param for grant_type
            const instagramXT = await getInstagramAccessToken({
              grant_type: 'ig_exchange_token',
              access_token: instagramAC.access_token
            });
            console.log('Instagram Refresh Token:', instagramXT);
            if (!instagramXT?.access_token) {
              const message =
                instagramXT?.error_message ??
                instagramXT?.error?.message ??
                'Failed to exchange Instagram access token.';
              showAuthAlert('Instagram login failed', message);
              return;
            }

            const instagramRT = await getInstagramAccessToken({
              grant_type: 'ig_refresh_token',
              access_token: instagramXT.access_token
            });

            console.log('Instagram Refresh Token:', instagramRT);
            if (!instagramRT?.access_token || instagramRT?.expires_in == null) {
              const message =
                instagramRT?.error_message ??
                instagramRT?.error?.message ??
                'Failed to refresh Instagram token.';
              showAuthAlert('Instagram login failed', message);
              return;
            }
            if (mode === 'insert'){
            await insertProviderIdIntoDb(provider, accountInfo.id);
            console.log('Instagram provider row inserted:', accountInfo.id);
            }
            await insertInstagramAccountIntoDb(
              mode,
              accountInfo.id,
              instagramRT.access_token,
              String(instagramRT.expires_in),
              new Date().toISOString(),
              accountInfo.username ?? accountInfo.name ?? ''
            );
            console.log('Instagram account row inserted/updated:', accountInfo.id);
            forceUpdateAccounts(setAccounts);
            console.log('Switching to calendar mode after Instagram login');
            setIsCalendarVisible(true);
          } catch (error: any) {
            console.log('Instagram OAuth callback error:', error);
            showAuthAlert('Instagram login failed', error?.message ?? 'Unexpected Instagram OAuth callback error.');
          }

        }
      };

      if (instagramOAuthSubscription) {
        instagramOAuthSubscription.remove();
        instagramOAuthSubscription = null;
      }
      const subscription = Linking.addEventListener('url', handleDeepLink);
      instagramOAuthSubscription = subscription;
      openInstagramLogin(expectedState);

    }

    if (provider === 'Facebook') {
      console.log('Facebook SignUp');
      const expectedState = buildOAuthState();
      let handled = false;

      const handleDeepLink = async (event: { url: string }) => {
        console.log('Facebook callback URL:', event.url);
        const accessToken = extractOAuthAccessToken(event.url);
        const expiresIn = extractOAuthExpiresIn(event.url);
        const state = extractOAuthState(event.url);
        if (!accessToken) {
          return;
        }

        try {
          if (handled) {
            console.log('Ignoring duplicate Facebook callback event.');
            return;
          }
          if (accessToken === lastFacebookOAuthAccessToken) {
            console.log('Ignoring replayed Facebook callback token.');
            return;
          }
          if (state && state !== expectedState) {
            console.log('Ignoring Facebook callback with mismatched OAuth state.');
            return;
          }
          if (!state) {
            console.log('Facebook callback missing OAuth state; continuing without state validation.');
          }

          handled = true;
          lastFacebookOAuthAccessToken = accessToken;
          subscription.remove();
          facebookOAuthSubscription = null;

          const pageAccounts = await getFacebookPageAccounts(accessToken);
          console.log('Facebook managed pages response:', pageAccounts);

          const pages = Array.isArray(pageAccounts?.data) ? pageAccounts.data : [];
          const selectedPage = pages.find(
            (page: any) => String(page?.id ?? '').trim() && String(page?.access_token ?? '').trim(),
          );

          if (!selectedPage) {
            const message =
              pageAccounts?.error?.message ??
              'No Facebook pages were returned for this account. Make sure this account manages at least one page.';
            showAuthAlert('Facebook login failed', message);
            return;
          }

          const pageId = String(selectedPage.id);
          const pageAccessToken = String(selectedPage.access_token);
          const pageName = String(selectedPage.name ?? 'Facebook Page');

          const existingProviderId = await fetchProviderIdFromDb(pageId);
          console.log('Existing Provider ID: ', existingProviderId);
          if (existingProviderId && mode === 'insert') {
            showAuthAlert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }

          if (mode === 'insert') {
            await insertProviderIdIntoDb(provider, pageId);
          }

          await insertFacebookAccountIntoDb(
            mode,
            pageId,
            pageAccessToken,
            String(expiresIn ?? '0'),
            new Date().toISOString(),
            pageName,
            accessToken,
          );

          forceUpdateAccounts(setAccounts);
          setIsCalendarVisible(true);
        } catch (error: any) {
          console.log('Facebook OAuth callback error:', error);
          showAuthAlert('Facebook login failed', error?.message ?? 'Unexpected Facebook OAuth callback error.');
        }
      };

      if (facebookOAuthSubscription) {
        facebookOAuthSubscription.remove();
        facebookOAuthSubscription = null;
      }
      const subscription = Linking.addEventListener('url', handleDeepLink);
      facebookOAuthSubscription = subscription;
      openFacebookLogin(expectedState);
    }
    
    if (provider === 'LinkedIn') {
      console.log('LinkedIn SignUp');
      const expectedState = buildOAuthState();
      let handled = false;

      const handleDeepLink = async (event: { url: string }) => {
        console.log('LinkedIn callback URL:', event.url);
        const code = extractOAuthCode(event.url);
        const state = extractOAuthState(event.url);
        if (!code) {
          return;
        }

        try {
          if (handled) {
            console.log('Ignoring duplicate LinkedIn callback event.');
            return;
          }
          if (code === lastLinkedInOAuthCode) {
            console.log('Ignoring replayed LinkedIn callback code.');
            return;
          }
          if (state && state !== expectedState) {
            console.log('Ignoring LinkedIn callback with mismatched OAuth state.');
            return;
          }
          if (!state) {
            console.log('LinkedIn callback missing OAuth state; continuing without state validation.');
          }

          handled = true;
          lastLinkedInOAuthCode = code;
          console.log('Got LinkedIn Code:', code);
          subscription.remove();
          linkedInOAuthSubscription = null;

          const linkedAC = await getLinkedInAccessToken({
            grant_type: 'authorization_code',
            code,
          });
          console.log('LinkedIn Access Token:', linkedAC);
          if (!linkedAC?.access_token) {
            const message =
              linkedAC?.error_description ??
              linkedAC?.error ??
              'Failed to exchange LinkedIn authorization code.';
            showAuthAlert('LinkedIn login failed', message);
            return;
          }

          const accountInfo = await getLinkedInUserInfo(linkedAC.access_token);
          console.log('LinkedIn Account Info:', accountInfo);
          if (!accountInfo?.sub || accountInfo?.code || accountInfo?.status) {
            const message =
              accountInfo?.message ?? accountInfo?.error_description ?? 'Failed to fetch LinkedIn profile.';
            showAuthAlert('LinkedIn login failed', message);
            return;
          }

          const existingProviderId = await fetchProviderIdFromDb(accountInfo.sub);
          console.log('Existing Provider ID: ', existingProviderId);
          if (existingProviderId && mode === 'insert') {
            showAuthAlert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }

          if (mode === 'insert') {
            await insertProviderIdIntoDb(provider, accountInfo.sub);
          }
          await insertLinkedInAccountIntoDb(
            mode,
            linkedAC.access_token,
            accountInfo.name ?? '',
            new Date().toISOString(),
            accountInfo.sub,
            Number(linkedAC.expires_in ?? 0),
          );
          forceUpdateAccounts(setAccounts);
          setIsCalendarVisible(true);
        } catch (error: any) {
          console.log('LinkedIn OAuth callback error:', error);
          showAuthAlert('LinkedIn login failed', error?.message ?? 'Unexpected LinkedIn OAuth callback error.');
        }
      };

      if (linkedInOAuthSubscription) {
        linkedInOAuthSubscription.remove();
        linkedInOAuthSubscription = null;
      }
      const subscription = Linking.addEventListener('url', handleDeepLink);
      linkedInOAuthSubscription = subscription;
      openLinkedInLogin(expectedState);
    }

    if (provider === 'Threads') {
      console.log('Threads SignUp');
      const expectedState = buildOAuthState();
      let handled = false;

      const handleDeepLink = async (event: { url: string }) => {
        console.log('Threads callback URL:', event.url);
        const code = extractOAuthCode(event.url);
        const state = extractOAuthState(event.url);
        if (!code) {
          return;
        }

        try {
          if (handled) {
            console.log('Ignoring duplicate Threads callback event.');
            return;
          }
          if (code === lastThreadsOAuthCode) {
            console.log('Ignoring replayed Threads callback code.');
            return;
          }
          if (state && state !== expectedState) {
            console.log('Ignoring Threads callback with mismatched OAuth state.');
            return;
          }
          if (!state) {
            console.log('Threads callback missing OAuth state; continuing without state validation.');
          }

          handled = true;
          lastThreadsOAuthCode = code;
          console.log('Got Threads Code:', code);
          subscription.remove();
          threadsOAuthSubscription = null;

          const threadsAC = await getThreadsAccessToken({
            grant_type: 'authorization_code',
            code,
          });
          console.log('Threads Access Token:', threadsAC);
          if (!threadsAC?.access_token) {
            const rawMessage =
              threadsAC?.error?.message ??
              threadsAC?.error_message ??
              'Failed to exchange Threads authorization code.';
            const message = rawMessage.includes('Invalid client_secret')
              ? `${rawMessage}. Update THREADS_CLIENT_SECRET in Mobile_version/.env to match your Threads app.`
              : rawMessage;
            showAuthAlert('Threads login failed', message);
            return;
          }

          const accountInfo = await getThreadsUserInfo(threadsAC.access_token);
          console.log('Threads Account Info:', accountInfo);
          if (!accountInfo?.id || accountInfo?.error) {
            const message =
              accountInfo?.error?.message ?? 'Failed to fetch Threads profile.';
            showAuthAlert('Threads login failed', message);
            return;
          }

          const existingProviderId = await fetchProviderIdFromDb(accountInfo.id);
          console.log('Existing Provider ID: ', existingProviderId);
          if (existingProviderId && mode === 'insert') {
            showAuthAlert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
            return;
          }
          if (mode === 'insert') {
            await insertProviderIdIntoDb(provider, accountInfo.id);
          }
          await insertThreadsAccountIntoDb(
            mode,
            accountInfo.id,
            threadsAC.access_token,
            String(threadsAC.expires_in ?? '0'),
            new Date().toISOString(),
            accountInfo.username ?? accountInfo.name ?? '',
          );
          forceUpdateAccounts(setAccounts);
          setIsCalendarVisible(true);
        } catch (error: any) {
          console.log('Threads OAuth callback error:', error);
          showAuthAlert('Threads login failed', error?.message ?? 'Unexpected Threads OAuth callback error.');
        }
      };

      if (threadsOAuthSubscription) {
        threadsOAuthSubscription.remove();
        threadsOAuthSubscription = null;
      }
      const subscription = Linking.addEventListener('url', handleDeepLink);
      threadsOAuthSubscription = subscription;
      openThreadsLogin(expectedState);
    }

    setIsNewAccountVisible(false);
  } catch (error) {
    console.log('Error signing in: ', error);
  }
};


export const fetchProviderIdFromDb  = async (providerUserId: string): Promise<boolean> => {
        try {
            if (!providerUserId) {
                return false;
            }
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
                        (error: any) => {
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
      if (!providerUserId) {
        reject(new Error(`Missing provider user id for ${providerName}`));
        return;
      }
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
                  (error: any) => {
                    console.log(`Error storing ${providerName} ID in the database:`, error);
                    reject(error);
                  }
                );

          });
        },
        (error: any) => {
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
                  (error: any) => {
                    console.log('Error storing Twitter account in the database:', error);
                    reject(error);
                  }
                );

          });
        },
        (error: any) => {
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
              (error: any) => {
                console.log('Error storing LinkedIn account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              (error: any) => {
                console.log('Error updating LinkedIn account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              (error: any) => {
                console.log('Error storing Threads account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              (error: any) => {
                console.log('Error updating Threads account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
          console.log('Error opening database:', error);
          reject(error);
        }
      );
    });
	  }};


export const insertFacebookAccountIntoDb = (
    mode: string,
    subId: string,
    accessToken: string,
    accessTokenExpiresIn: string,
    timestamp: string,
    accountName: string,
    userAccessToken?: string
  ) => {
    if (mode === 'insert') {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {
            tx.executeSql(
              `INSERT INTO facebook_accounts 
                (sub_id, access_token, user_access_token, access_token_expires_in, timestamp, account_name)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                subId,
                accessToken,
                userAccessToken ?? null,
                accessTokenExpiresIn,
                timestamp,
                accountName,
              ],
              () => {
                console.log('Facebook account stored in the database');
                resolve();
              },
              (error: any) => {
                console.log('Error storing Facebook account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              `UPDATE facebook_accounts 
                SET access_token = ?, user_access_token = ?, access_token_expires_in = ?, timestamp = ?, account_name = ?
               WHERE sub_id = ?`,
              [
                accessToken,
                userAccessToken ?? null,
                accessTokenExpiresIn,
                timestamp,
                accountName,
                subId,
              ],
              () => {
                console.log('Facebook account updated in the database');
                resolve();
              },
              (error: any) => {
                console.log('Error updating Facebook account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              (error: any) => {
                console.log('Error storing Youtube account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              (error: any) => {
                console.log('Error updating Youtube account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
          console.log('Error opening database:', error);
          reject(error);
        }
      );
    });
  }};



export const insertTikTokAccountIntoDb = (
    mode: string,
    subId: string,
    accessToken: string,
    refreshToken: string,
    accessTokenExpiresIn: string,
    refreshTokenExpiresIn: string,
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
              `INSERT INTO tiktok_accounts
                (sub_id, access_token, access_token_expires_in, refresh_token, refresh_token_expires_in, timestamp, account_name)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                subId,
                accessToken,
                accessTokenExpiresIn,
                refreshToken,
                refreshTokenExpiresIn,
                timestamp,
                accountName,
              ],
              () => {
                console.log('TikTok account stored in the database');
                resolve();
              },
              (error: any) => {
                console.log('Error storing TikTok account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              `UPDATE tiktok_accounts
                SET access_token = ?, access_token_expires_in = ?, refresh_token = ?, refresh_token_expires_in = ?, timestamp = ?, account_name = ?
               WHERE sub_id = ?`,
              [
                accessToken,
                accessTokenExpiresIn,
                refreshToken,
                refreshTokenExpiresIn,
                timestamp,
                accountName,
                subId,
              ],
              () => {
                console.log('TikTok account updated in the database');
                resolve();
              },
              (error: any) => {
                console.log('Error updating TikTok account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
          console.log('Error opening database:', error);
          reject(error);
        }
      );
    });
  }};


export const insertBlueskyAccountIntoDb = (
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
              `INSERT INTO bluesky_accounts 
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
                console.log('Bluesky account stored in the database');
                resolve();
              },
              (error: any) => {
                console.log('Error storing Bluesky account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              `UPDATE bluesky_accounts
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
                console.log('Bluesky account updated in the database');
                resolve();
              },
              (error: any) => {
                console.log('Error updating Bluesky account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              (error: any) => {
                console.log('Error storing Instagram account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
              (error: any) => {
                console.log('Error updating Instagram account in the database:', error);
                reject(error);
              }
            );
          });
        },
        (error: any) => {
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
      } else if (accountType.toLowerCase() === 'facebook') {
        console.log('Deleting Facebook account with ID:', accountId);
        tx.executeSql('DELETE FROM facebook_accounts WHERE sub_id = ?', [accountId]);
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
        (error: any) => {
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
        (err: any) => {
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
  accountName: string;
} | null> => {
  try {
    console.log('Fetching Twitter credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT twitter_consumer_key, twitter_consumer_secret, twitter_access_token, twitter_access_token_secret, account_name
           FROM twitter_accounts
           WHERE twitter_accounts.sub_id = ?`,
          [providerUserId],
  
          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                consumerKey: row.twitter_consumer_key,
                consumerSecret: row.twitter_consumer_secret,
                accessToken: row.twitter_access_token,
                accessTokenSecret: row.twitter_access_token_secret,
                accountName: row.account_name ?? '',
              });
            } else {
              resolve(null);
            }
          },
          (error: any) => {
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
  subId: string;
} | null> => {
  try {
    console.log('Fetching LinkedIn credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT app_token, app_refresh_token, app_token_expires_in, app_token_refresh_expires_in, account_name, timestamp, sub_id
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
                subId: row.sub_id,
              });
            } else {
              resolve(null);
            }
          },
          (error: any) => {
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
          (error: any) => {
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

export const fetchFacebookCredentials = async (providerUserId: string): Promise<{
  subId: string;
  accountName: string;
  accessToken: string;
  userAccessToken: string;
  accessTokenExpiresIn: string;
  timestamp: string;
} | null> => {
  try {
    console.log('Fetching Facebook credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT sub_id, account_name, access_token, user_access_token, access_token_expires_in, timestamp
           FROM facebook_accounts
           WHERE facebook_accounts.sub_id = ?`,
          [providerUserId],

          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                subId: row.sub_id,
                accountName: row.account_name,
                accessToken: row.access_token,
                userAccessToken: row.user_access_token,
                accessTokenExpiresIn: row.access_token_expires_in,
                timestamp: row.timestamp,
              });
            } else {
              resolve(null);
            }
          },
          (error: any) => {
            console.error('Error fetching Facebook credentials:', error);
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
          (error: any) => {
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
          (error: any) => {
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


export const fetchTikTokCredentials = async (providerUserId: string): Promise<{
  subId: string;
  accountName: string;
  refreshToken: string;
  refreshTokenExpiresIn: string;
  accessToken: string;
  accessTokenExpiresIn: string;
  timestamp: string;
} | null> => {
  try {
    console.log('Fetching TikTok credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT *
           FROM tiktok_accounts
           WHERE tiktok_accounts.sub_id = ?`,
          [providerUserId],

          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                subId: row.sub_id,
                accountName: row.account_name,
                accessToken: row.access_token,
                refreshToken: row.refresh_token,
                accessTokenExpiresIn: row.access_token_expires_in,
                refreshTokenExpiresIn: row.refresh_token_expires_in,
                timestamp: row.timestamp,
              });
            } else {
              resolve(null);
            }
          },
          (error: any) => {
            console.error('Error fetching TikTok credentials:', error);
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

export const fetchBlueSkyCredentials = async (providerUserId: string): Promise<{
  subId: string;
  accountName: string;
  accessToken: string;
  accessTokenExpiresIn: string;
  timestamp: string;
} | null> => {
  try {
    console.log('Fetching BlueSky credentials for provider_user_id:', providerUserId);
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT sub_id, account_name, access_token, access_token_expires_in, timestamp
           FROM bluesky_accounts
           WHERE bluesky_accounts.sub_id = ?`,
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
          (error: any) => {
            console.error('Error fetching BlueSky credentials:', error);
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
        (err: any) => {
          console.log('LinkedIn expiry check error:', err);
          reject(err);
        }
      );
    });
  });
};








