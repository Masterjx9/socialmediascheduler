import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { DateData } from 'react-native-calendars';

export const getUnixTimestampsForDay = (dateString: string) => {
  // Parse the date string as local time (YYYY-MM-DD is treated as local by Date constructor)
  const date = new Date(dateString + 'T00:00:00');

  // Set the time to the beginning of the day (00:00:00 local time)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  // Set the time to the end of the day (23:59:59.999 local time)
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Convert to Unix timestamps (in seconds)
  const startOfDayUnix = Math.floor(startOfDay.getTime() / 1000);
  const endOfDayUnix = Math.floor(endOfDay.getTime() / 1000);

  return { startOfDayUnix, endOfDayUnix };
};

export const onDayPress = async (
  day: DateData,
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>,
  setDbData: React.Dispatch<React.SetStateAction<any[]>>,
  mode: 'day' | 'month' = 'day',                // ← 1) add mode param
) => {
  setSelectedDate(day.dateString);
  console.log('Selected date: ', day.dateString);

  const { startOfDayUnix, endOfDayUnix } = getUnixTimestampsForDay(day.dateString);

  // -------- choose range based on mode --------
  let rangeStart = startOfDayUnix;
  let rangeEnd   = endOfDayUnix;

  if (mode === 'month') {
    // ── first day of this month (as YYYY-MM-01) ──
    const d = new Date(day.dateString + 'T00:00:00');      // local
    const firstDayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

    // ── last day of this month (YYYY-MM-DD) ──
    const lastDayDate  = new Date(d.getFullYear(), d.getMonth() + 1, 0); // 0 → last day
    const lastDayStr   = lastDayDate.toISOString().slice(0, 10);         // keep YYYY-MM-DD

    // use the *same* helper for both
    rangeStart = getUnixTimestampsForDay(firstDayStr).startOfDayUnix;
    rangeEnd   = getUnixTimestampsForDay(lastDayStr).endOfDayUnix;

    console.log('Month range (Unix):', rangeStart, '→', rangeEnd);
  }


  console.log('Query range (Unix):', rangeStart, '→', rangeEnd);

  try {
    const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
    db.transaction((tx: Transaction) => {
      tx.executeSql(
        `SELECT * FROM content WHERE post_date BETWEEN ? AND ?`,   // ← 2) no published filter
        [rangeStart, rangeEnd],
        (_, results) => {
          const data: any[] = [];
          for (let i = 0; i < results.rows.length; i++) {
            data.push(results.rows.item(i));
          }
          console.log(`Fetched ${data.length} items from the database`);
          console.log('Fetched content:', data);
          data.sort((a, b) => a.post_date - b.post_date);
          // Sort so that published posts appear at the bottom
          data.sort((a, b) =>
            (a.published?.includes('"final":"success"') ? 1 : 0) -
          (b.published?.includes('"final":"success"') ? 1 : 0)
        );
        // sort again so that earlier posts appear first
        setDbData(data);

        },
        (error) => console.log('Error fetching content from the database:', error)
      );
    });
  } catch (error) {
    console.log('Error opening database:', error);
  }
};
