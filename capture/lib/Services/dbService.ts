import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import RNFS from 'react-native-fs';


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


export const createTables = (tx: Transaction) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS user_providers (
      account_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        tags TEXT,
        published INTEGER NOT NULL DEFAULT (0),
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
        twitter_consumer_key TEXT,
        twitter_access_token TEXT,
        twitter_access_token_secret TEXT,
        twitter_consumer_secret TEXT
        account_name TEXT,
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
                    `SELECT * FROM content WHERE post_date < ? AND published = 0`,
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


export const insertProviderIdIntoDb = (providerName: string, providerUserId: string) => {
    return new Promise<void>((resolve, reject) => {
      const db = SQLite.openDatabase(
        { name: 'database_default.sqlite3', location: 'default' },
        () => {
          db.transaction((tx: Transaction) => {

                // Insert provider ID into the user_providers table
                tx.executeSql(
                  `INSERT OR REPLACE INTO user_providers (provider_name, provider_user_id) VALUES (?, ?, ?)`,
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

