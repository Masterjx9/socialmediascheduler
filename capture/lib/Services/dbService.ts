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

// export const fetchContentFromBeforeCurrentTime = (db: SQLiteDatabase) => {
//     db.transaction((tx: Transaction) => {
//       const currentTime = Math.floor(Date.now() / 1000);
//       tx.executeSql(
//         `SELECT * FROM content WHERE post_date < ?`,
//         [currentTime],
//         (_, results) => {
//           const rows = results.rows;
//           let data: any[] = [];
//           for (let i = 0; i < rows.length; i++) {
//             data.push(rows.item(i));
//           }
//           if (data.length > 0) {
//             console.log('Fetched content:', data);
//             return data;
//           }
//         },
//         (error) => {
//           console.log('Error fetching content:', error);
//         }
//       );
//     });
//   };

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


export const insertProviderIdIntoDb = (providerName: string, providerUserId: string, userName: string) => {
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

