import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { fetchDbData } from '../services/dbService';

export const handlePost = async (content: string, 
    unixTimestamp: number, 
    setDbData: React.Dispatch<React.SetStateAction<any[]>>,  
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>, 
    setSelectedItem: React.Dispatch<React.SetStateAction<any>>,
    content_id?: number
) => {
    console.log('Post content:', content);
    
    // Use the Unix timestamp directly
    console.log('Selected date (Unix timestamp):', unixTimestamp);
    
    try {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      db.transaction((tx: Transaction) => {
        if (content_id) {
        tx.executeSql(
          `UPDATE content SET content_data = ?, post_date = ? WHERE content_id = ?`,
          [content, unixTimestamp, content_id],
          (_, result) => {
            console.log('Post updated in the database');
            console.log('Post ID:', result.insertId);
            fetchDbData(db, setDbData); // Refresh data
          },
          (error) => {
            console.log('Error updating post in the database:', error);
          }
        );
      } else {
          tx.executeSql(
            `INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)`,
            [1, 'post', content, unixTimestamp, 0],
            (_, result) => {
              console.log('Post saved to the database');
              console.log('Post ID:', result.insertId);
              fetchDbData(db, setDbData); // Refresh data
            },
            (error) => {
              console.log('Error saving post to the database:', error);
            }
          );
        }
      });
    } catch (error) {
      console.log('Error opening database:', error);
    }
    
    setIsPostVisible(false); 
    setSelectedItem(null);
  };