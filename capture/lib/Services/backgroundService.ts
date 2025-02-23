// REFACTOR USING NOTIFEE

import BackgroundFetch from 'react-native-background-fetch';
import notifee from '@notifee/react-native';
import BackgroundTimer from "react-native-background-timer";
import { contentCheck } from './apiHandler';
import { AppState } from 'react-native';

export const setupBackgroundService = () => {
  // Start the timer
  BackgroundTimer.runBackgroundTimer(() => {
    console.log("Background service running...");

    // Placeholder for your SQLite check and API calls
  }, 10000); // Runs every 10 seconds
};

export const stopBackgroundService = () => {
  BackgroundTimer.stopBackgroundTimer();
};

// Register the background fetch task
export const registerBackgroundFetch = async () => {
  try {
   console.log("Registering background fetch task...");
   console.log("test");
   await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true
      // forceAlarmManager: true
    },

    async (taskId) => {
      console.log('Background fetch task:', taskId);
      console.log("test2");
      contentCheck();
      BackgroundFetch.finish(taskId);
    },
    async (taskId) => {
      console.log('Background fetch timeout task:', taskId);
      console.log("test3");
      contentCheck();
      BackgroundFetch.finish(taskId);
    },

  );
} catch (error) {
  console.error('Error setting up background fetch:', error);
}
}
// Initialize notifications
export const initializeNotifications = () => {
 
};


// Call these methods in your app entry point (e.g., App.tsx)
export const setupNotificationService = async () => {
  initializeNotifications();
  await registerBackgroundFetch();
};
