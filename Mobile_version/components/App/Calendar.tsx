import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Platform, StyleSheet } from 'react-native';
import Modal from '../../lib/Compat/Modal';
import SQLite, { Transaction } from '../../lib/Compat/SQLite';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { fetchDbData } from '../../lib/Services/dbService';
import FooterNavBar from './FooterNavBar';
import { faLinkedin, faTwitter, faThreads, faInstagram, faYoutube, faTiktok, faFacebook } from '@fortawesome/free-brands-svg-icons';
import styles from '../../styles/AppStyles';
import type { SocialMediaAccount } from '../../types/SociaMedia';
import { onDayPress } from '../../lib/Helpers/dateHelper';
import { fetchProviderNamesByIds } from '../../lib/Services/dbService';

const CalendarComponent: any =
  Platform.OS === 'windows' ? null : require('react-native-calendars').Calendar;


interface CalendarModalProps {
  isCalendarVisible: boolean;
  setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  setDbData: React.Dispatch<React.SetStateAction<any[]>>;
  dbData: any[];
  setIsAccountsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedItem: React.Dispatch<React.SetStateAction<any>>;
  setContentMode: React.Dispatch<React.SetStateAction<"post" | "image" | "video">>;
  setSelectedFile: React.Dispatch<React.SetStateAction<string>>;
  setImageResizeNeeded: React.Dispatch<React.SetStateAction<boolean>>;
  contentMode: string;
  unsupportedAudioCodec: boolean;
  setUnsupportedAudioCodec: React.Dispatch<React.SetStateAction<boolean>>;
  accounts: SocialMediaAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>;
  calendarMode: 'day' | 'month';
  setCalendarMode: React.Dispatch<React.SetStateAction<'day' | 'month'>>;
  lastDayPressed: any;
  setLastDayPressed: React.Dispatch<React.SetStateAction<any>>;
}

const parseProviderIds = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.map((id) => String(id));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
    } catch {
      return [];
    }
  }

  return [];
};

const isDateString = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseDateString = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const WINDOWS_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WINDOWS_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getMonthStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, count: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + count, 1);

const buildMonthCells = (monthDate: Date): Array<Date | null> => {
  const monthStart = getMonthStart(monthDate);
  const leadingEmptyCells = monthStart.getDay();
  const totalDays = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < leadingEmptyCells; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  while (cells.length < 42) {
    cells.push(null);
  }

  return cells;
};

const renderItem = ({ item, providerNames }: { item: any; providerNames: { [id: string]: string } },
    setDbData: React.Dispatch<React.SetStateAction<any[]>>,
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>,
    setSelectedItem: React.Dispatch<React.SetStateAction<any>>,
    setContentMode: React.Dispatch<React.SetStateAction<"post" | "image" | "video">>,
    setImageResizeNeeded: React.Dispatch<React.SetStateAction<boolean>>,
    calendarMode: 'day' | 'month',
  setCalendarMode: React.Dispatch<React.SetStateAction<'day' | 'month'>>,
  lastDayPressed: any,
  setLastDayPressed: React.Dispatch<React.SetStateAction<any>>,
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>,
) =>  (
  <View>

  <View style={styles.listItemContainer}>
    <Text style={styles.listItemText}>
      Post Date: {new Date(item.post_date * 1000).toLocaleString()}
    </Text>
    <Text style={styles.listItemText}>{item.content_type}</Text>
    <View style={styles.iconContainer}>



 {!item.published?.includes('"final":"success"') && (
    <TouchableOpacity style={styles.listItem}
    onPress={() => {
      console.log('Edit button pressed for item:', item);
      setSelectedItem(item);
      setIsPostVisible(true);
    }}
    >
      <FontAwesomeIcon icon={faEdit} size={24} style={styles.icon} />
    </TouchableOpacity>
)}

 {!item.published?.includes('"final":"success"') && (
    <TouchableOpacity style={styles.listItem}
    onPress={async () => {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      db.transaction((tx: Transaction) => {
        tx.executeSql(
          `DELETE FROM content WHERE content_id = ?`,
          [item.content_id],
          (_, results) => {
            console.log('Post deleted from the database');
            fetchDbData(db, setDbData); 
            onDayPress(lastDayPressed, setSelectedDate, setDbData, calendarMode);
          },
          (error) => {
            console.log('Error deleting post from the database:', error);
          }
        );
      });
    }}    
    >
      <FontAwesomeIcon icon={faTrash} size={24} style={styles.icon} />
    </TouchableOpacity>
)}

{item.published?.includes('"final":"success"') && (
    <Text style={styles.postedItem}>Posted</Text>
)}

{item.published !== '{}' && !item.published?.includes('"final":"success"') && (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
  <Text style={styles.errorItem}>Error</Text>
  </View>
)}
    </View>
  </View>
    <View style={{ flexDirection: 'row', marginTop: 4 }}>
      {parseProviderIds(item.user_providers).map((id: string) => {
        const name = (providerNames[id] || '').toLowerCase();
        const icon =
          name === 'linkedin'
            ? faLinkedin
            : name === 'twitter'
            ? faTwitter
            : name === 'threads'
            ? faThreads
            : name === 'instagram'
            ? faInstagram
            : name === 'youtube'
            ? faYoutube
            : name === 'tiktok'
            ? faTiktok
            : name === 'facebook'
            ? faFacebook
            : null;
        return icon ? (
          <FontAwesomeIcon key={id} icon={icon} size={20} style={{ marginRight: 6 }} />
        ) : null;
      })}
    </View>
  </View>
  );


const CalendarModal: React.FC<CalendarModalProps> = ({
  isCalendarVisible,
  setIsCalendarVisible,
  selectedDate,
  setSelectedDate,
  setDbData,
  dbData,
  setIsAccountsVisible,
  setIsPostVisible,
  setIsSettingsVisible,
    setSelectedItem,
    setContentMode,
  setSelectedFile,
  setImageResizeNeeded,
  contentMode,
  unsupportedAudioCodec,
  setUnsupportedAudioCodec,
  accounts,
  setAccounts,
  calendarMode,
  setCalendarMode,
  lastDayPressed,
  setLastDayPressed,
}) => {
  const isWindows = Platform.OS === 'windows';
  const [providerNames, setProviderNames] = useState<{ [id: string]: string }>({});
  const safeSelectedDate = isDateString(selectedDate)
    ? selectedDate
    : new Date().toISOString().split('T')[0];
  const selectedDateObj = parseDateString(safeSelectedDate);
  const [windowsVisibleMonth, setWindowsVisibleMonth] = useState<Date>(() =>
    getMonthStart(selectedDateObj),
  );
  const todayDateKey = formatDateLocal(new Date());
  const windowsCalendarCells = useMemo(
    () => buildMonthCells(windowsVisibleMonth),
    [windowsVisibleMonth],
  );
  const windowsItemsByDate = useMemo(() => {
    const map: { [dateString: string]: number } = {};
    dbData.forEach((item: any) => {
      const unix = Number(item?.post_date);
      if (!Number.isFinite(unix)) return;
      const key = formatDateLocal(new Date(unix * 1000));
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [dbData]);
  const windowsMonthLabel = `${WINDOWS_MONTH_LABELS[windowsVisibleMonth.getMonth()]} ${windowsVisibleMonth.getFullYear()}`;



useEffect(() => {
  if (lastDayPressed) {
    console.log('Calendar mode changed:', calendarMode);
    onDayPress(lastDayPressed, setSelectedDate, setDbData, calendarMode);
  }
}, [calendarMode]);

useEffect(() => {
  const ids = [
    ...new Set(
      dbData.flatMap((it: any) => {
        return parseProviderIds(it?.user_providers);
      }),
    ),
  ];
  if (ids.length) fetchProviderNamesByIds(ids).then(setProviderNames).catch(console.log);
}, [dbData]);

useEffect(() => {
  if (!isWindows || !isCalendarVisible || lastDayPressed) {
    return;
  }

  const day = { dateString: safeSelectedDate } as any;
  setLastDayPressed(day);
  onDayPress(day, setSelectedDate, setDbData, calendarMode).catch(console.log);
}, [isWindows, isCalendarVisible, lastDayPressed, safeSelectedDate, setLastDayPressed, setSelectedDate, setDbData, calendarMode]);

useEffect(() => {
  if (!isWindows) {
    return;
  }
  const nextMonth = getMonthStart(selectedDateObj);
  setWindowsVisibleMonth((currentMonth) => {
    if (
      currentMonth.getFullYear() === nextMonth.getFullYear() &&
      currentMonth.getMonth() === nextMonth.getMonth()
    ) {
      return currentMonth;
    }
    return nextMonth;
  });
}, [isWindows, selectedDateObj]);

  if (isWindows) {
    return (
      <View style={windowsCalendarStyles.root}>
        <View style={windowsCalendarStyles.header}>
          <View style={windowsCalendarStyles.headerTopRow}>
            <Text style={windowsCalendarStyles.title}>Calendar</Text>
            <TouchableOpacity
              onPress={async () => {
                const today = new Date();
                const day = { dateString: formatDateLocal(today) } as any;
                setWindowsVisibleMonth(getMonthStart(today));
                setLastDayPressed(day);
                await onDayPress(day, setSelectedDate, setDbData, calendarMode);
              }}
              style={windowsCalendarStyles.jumpTodayButton}
            >
              <Text style={windowsCalendarStyles.jumpTodayText}>Jump To Today</Text>
            </TouchableOpacity>
          </View>
          <Text style={windowsCalendarStyles.selectedDateLabel}>Selected Date: {safeSelectedDate}</Text>
          <View style={windowsCalendarStyles.modeToggleRow}>
            <TouchableOpacity
              onPress={() => setCalendarMode('day')}
              style={[
                windowsCalendarStyles.modeButton,
                calendarMode === 'day' && windowsCalendarStyles.modeButtonActive,
              ]}
            >
              <Text
                style={[
                  windowsCalendarStyles.modeButtonText,
                  calendarMode === 'day' && windowsCalendarStyles.modeButtonTextActive,
                ]}
              >
                Day
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCalendarMode('month')}
              style={[
                windowsCalendarStyles.modeButton,
                calendarMode === 'month' && windowsCalendarStyles.modeButtonActive,
              ]}
            >
              <Text
                style={[
                  windowsCalendarStyles.modeButtonText,
                  calendarMode === 'month' && windowsCalendarStyles.modeButtonTextActive,
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
          </View>
          <View style={windowsCalendarStyles.monthHeaderRow}>
            <TouchableOpacity
              onPress={() => setWindowsVisibleMonth((month) => addMonths(month, -1))}
              style={windowsCalendarStyles.monthNavButton}
            >
              <Text style={windowsCalendarStyles.monthNavText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={windowsCalendarStyles.monthHeaderText}>{windowsMonthLabel}</Text>
            <TouchableOpacity
              onPress={() => setWindowsVisibleMonth((month) => addMonths(month, 1))}
              style={windowsCalendarStyles.monthNavButton}
            >
              <Text style={windowsCalendarStyles.monthNavText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={windowsCalendarStyles.weekdayRow}>
            {WINDOWS_WEEKDAY_LABELS.map((weekday) => (
              <Text key={weekday} style={windowsCalendarStyles.weekdayCell}>
                {weekday}
              </Text>
            ))}
          </View>
          <View style={windowsCalendarStyles.grid}>
            {windowsCalendarCells.map((dateCell, index) => {
              if (!dateCell) {
                return <View key={`blank-${index}`} style={windowsCalendarStyles.emptyCell} />;
              }

              const dateKey = formatDateLocal(dateCell);
              const isSelected = safeSelectedDate === dateKey;
              const isToday = dateKey === todayDateKey;
              const itemCount = windowsItemsByDate[dateKey] || 0;

              return (
                <TouchableOpacity
                  key={dateKey}
                  onPress={async () => {
                    const day = { dateString: dateKey } as any;
                    setLastDayPressed(day);
                    await onDayPress(day, setSelectedDate, setDbData, calendarMode);
                  }}
                  style={[
                    windowsCalendarStyles.dayCell,
                    isToday && windowsCalendarStyles.todayCell,
                    isSelected && windowsCalendarStyles.selectedCell,
                  ]}
                >
                  <Text
                    style={[
                      windowsCalendarStyles.dayCellText,
                      isSelected && windowsCalendarStyles.selectedCellText,
                    ]}
                  >
                    {dateCell.getDate()}
                  </Text>
                  {itemCount > 0 && (
                    <View
                      style={[
                        windowsCalendarStyles.itemCountBadge,
                        isSelected && windowsCalendarStyles.itemCountBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          windowsCalendarStyles.itemCountText,
                          isSelected && windowsCalendarStyles.itemCountTextSelected,
                        ]}
                      >
                        {itemCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <FlatList
          data={Array.isArray(dbData) ? dbData : []}
          keyExtractor={(item, index) => String(item?.content_id ?? `row-${index}`)}
          renderItem={({ item }) =>
            renderItem(
              { item, providerNames },
              setDbData,
              setIsPostVisible,
              setSelectedItem,
              setContentMode,
              setImageResizeNeeded,
              calendarMode,
              setCalendarMode,
              lastDayPressed,
              setLastDayPressed,
              setSelectedDate,
            )
          }
          style={windowsCalendarStyles.list}
          contentContainerStyle={windowsCalendarStyles.listContent}
          ListHeaderComponent={
            <Text style={windowsCalendarStyles.listHeading}>
              Scheduled Items ({Array.isArray(dbData) ? dbData.length : 0})
            </Text>
          }
          ListEmptyComponent={
            <Text style={windowsCalendarStyles.emptyListText}>
              No scheduled items for this range.
            </Text>
          }
        />
        <FooterNavBar
          setSelectedFile={setSelectedFile}
          setIsAccountsVisible={setIsAccountsVisible}
          setIsPostVisible={setIsPostVisible}
          setIsSettingsVisible={setIsSettingsVisible}
          setContentMode={setContentMode}
          setImageResizeNeeded={setImageResizeNeeded}
          contentMode={contentMode}
          unsupportedAudioCodec={unsupportedAudioCodec}
          setUnsupportedAudioCodec={setUnsupportedAudioCodec}
          accounts={accounts}
          setAccounts={setAccounts}
        />
      </View>
    );
  }

  return (
    <Modal
      presentationStyle="fullScreen"
      visible={isCalendarVisible}
      animationType="slide"
      onRequestClose={() => setIsCalendarVisible(false)}
    >
      <CalendarComponent
        onDayPress={async (day:any) => {
          setLastDayPressed(day)
          await onDayPress(day, setSelectedDate, setDbData, calendarMode);
          console.log('datadbData:', dbData);
        }}
        markedDates={{
          [safeSelectedDate]: { selected: true, marked: true, selectedColor: 'blue' },
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
    
    
    {!isWindows && (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10 }}>
  <TouchableOpacity
    onPress={() => setCalendarMode('day')}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 10,
    }}
  >
    <View
      style={{
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
      }}
    >
      {calendarMode === 'day' && (
        <View
          style={{
            height: 10,
            width: 10,
            borderRadius: 5,
            backgroundColor: '#007AFF',
          }}
        />
      )}
    </View>
    <Text>Day</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => setCalendarMode('month')}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 10,
    }}
  >
    <View
      style={{
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
      }}
    >
      {calendarMode === 'month' && (
        <View
          style={{
            height: 10,
            width: 10,
            borderRadius: 5,
            backgroundColor: '#007AFF',
          }}
        />
      )}
    </View>
    <Text>Month</Text>
  </TouchableOpacity>
</View>
)}


      {!isWindows && (
      <FlatList
        data={Array.isArray(dbData) ? dbData : []} // Use the data fetched from the database
        keyExtractor={(item, index) => String(item?.content_id ?? `row-${index}`)} // Use a unique key (e.g., content_id)
        
        renderItem={({ item }) => renderItem({ item, providerNames }, 
                                                    setDbData, 
                                                    setIsPostVisible, 
                                                    setSelectedItem, 
                                                    setContentMode, 
                                                    setImageResizeNeeded,
                                                    calendarMode,
                                                    setCalendarMode,
                                                    lastDayPressed,
                                                    setLastDayPressed,
                                                    setSelectedDate
                                                  )} 
        style={styles.listContainer}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      )}
      
      {!isWindows && (
      <FooterNavBar
        setSelectedFile={setSelectedFile}
        setIsAccountsVisible={setIsAccountsVisible}
        setIsPostVisible={setIsPostVisible}
        setIsSettingsVisible={setIsSettingsVisible}
        setContentMode={setContentMode} 
        setImageResizeNeeded={setImageResizeNeeded}
        contentMode={contentMode}
        unsupportedAudioCodec={unsupportedAudioCodec}
        setUnsupportedAudioCodec={setUnsupportedAudioCodec}
        accounts={accounts}
        setAccounts={setAccounts}
      />
      )}
    </Modal>
  );
};

const windowsCalendarStyles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  selectedDateLabel: {
    color: '#374151',
    marginBottom: 10,
  },
  jumpTodayButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  jumpTodayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
    backgroundColor: '#f8fafc',
  },
  modeButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  modeButtonText: {
    color: '#1f2937',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#1e3a8a',
    fontWeight: '700',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  monthNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  monthNavText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    textAlign: 'center',
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 12,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.2857%',
    height: 46,
    padding: 3,
  },
  dayCell: {
    width: '14.2857%',
    height: 46,
    padding: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  todayCell: {
    borderColor: '#60a5fa',
    backgroundColor: '#eff6ff',
  },
  selectedCell: {
    borderColor: '#1d4ed8',
    backgroundColor: '#1d4ed8',
  },
  dayCellText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCellText: {
    color: '#ffffff',
  },
  itemCountBadge: {
    marginTop: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  itemCountBadgeSelected: {
    backgroundColor: '#ffffff',
  },
  itemCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  itemCountTextSelected: {
    color: '#1e3a8a',
  },
  list: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 84,
  },
  listHeading: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  emptyListText: {
    color: '#6b7280',
    marginTop: 10,
  },
});

export default CalendarModal;



