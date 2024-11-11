import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { DateData } from 'react-native-calendars';

export const getUnixTimestampsForDay = (dateString: string) => {
    // Parse the date string
    const date = new Date(dateString);
  
    // Set the time to the beginning of the day (00:00:00)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
  
    // Set the time to the end of the day (23:59:59.999)
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
  
    // Convert to Unix timestamps (in seconds)
    const startOfDayUnix = Math.floor(startOfDay.getTime() / 1000);
    const endOfDayUnix = Math.floor(endOfDay.getTime() / 1000);
  
    return { startOfDayUnix, endOfDayUnix };
  };

export const onDayPress = async (day: DateData,
    setSelectedDate: React.Dispatch<React.SetStateAction<string>>,
    setDbData: React.Dispatch<React.SetStateAction<any[]>>,
  ) => {
    setSelectedDate(day.dateString);
    console.log('Selected date: ', day.dateString);

    const { startOfDayUnix, endOfDayUnix } = getUnixTimestampsForDay(day.dateString);

    console.log('Start of day (Unix):', startOfDayUnix);
    console.log('End of day (Unix):', endOfDayUnix);
    try {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      db.transaction((tx: Transaction) => {
      tx.executeSql(
        `SELECT * FROM content WHERE post_date BETWEEN ? AND ?`,
        [startOfDayUnix, endOfDayUnix],
        (_, results) => {
        const rows = results.rows;
        let data: any[] = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        console.log('Fetched content for selected date:', data);
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
  };