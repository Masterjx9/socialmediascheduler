import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { fetchDbData } from '../Services/dbService';
import { refreshDbDataForDate } from '../Services/dbService';
export const handlePost = async (
  content_type: string,
  content_data: string,
  contentDescription: string, 
    unixTimestamp: number, 
    setDbData: React.Dispatch<React.SetStateAction<any[]>>,  
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>, 
    setSelectedItem: React.Dispatch<React.SetStateAction<any>>,
    content_id?: number,
    user_providers?: string[],
    youtubeTitle?: string,
    youtubePrivacy?: string,
) => {
    console.log('Content type:', content_type);
    console.log('Content data:', content_data);
    console.log('Post description:', contentDescription);
    
    // Use the Unix timestamp directly
    console.log('Selected date (Unix timestamp):', unixTimestamp);
    console.log('Selected item:', content_id);
    console.log('Selected providers:', user_providers);
    
    try {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      db.transaction((tx: Transaction) => {
        if (content_id) {
        tx.executeSql(
          `UPDATE content SET content_data = ?, description = ?, post_date = ?, user_providers = ? WHERE content_id = ?`,
          [content_data, contentDescription, unixTimestamp, JSON.stringify(user_providers), content_id],
          (_, result) => {
            console.log('Post updated in the database');
            console.log('Post ID:', result);
            fetchDbData(db, setDbData); // Refresh data
          },
          (error) => {
            console.log('Error updating post in the database:', error);
          }
        );
      } else {
          tx.executeSql(
            `INSERT INTO content (content_type, content_data, description, user_providers, post_date, title, privacy, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [content_type, content_data, contentDescription, JSON.stringify(user_providers), unixTimestamp, youtubeTitle, youtubePrivacy, {}],
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
    const selectedDateStr = new Date(unixTimestamp * 1000).toISOString().split('T')[0];
    refreshDbDataForDate(selectedDateStr, setDbData);
  };