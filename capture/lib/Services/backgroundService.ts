// REFACTOR USING NOTIFEE
// NOTE: Make a daily refresh token check for all social media accounts
import BackgroundFetch from 'react-native-background-fetch';
import BackgroundTimer from "react-native-background-timer";
import { contentCheck } from './apiHandler';
import { AppState } from 'react-native';
import notifee, { AndroidImportance, AndroidColor } from '@notifee/react-native';


export const startForegroundService = async () => {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title: 'Content Scheduling Active',
    body: 'Monitoring for scheduled content...',
    android: {
      channelId: 'default',
      color: AndroidColor.RED,
    },
  });

  // Now run your background loop here
  BackgroundTimer.runBackgroundTimer(async () => {
    console.log("Foreground Service running");
    await contentCheck();
  }, 10000); 
};


// Register the background fetch task
// export const registerBackgroundFetch = async () => {
//   try {
//    console.log("Registering background fetch task...");
//    console.log("test");
//    await BackgroundFetch.configure(
//     {
//       minimumFetchInterval: 15,
//       stopOnTerminate: false,
//       startOnBoot: true,
//       enableHeadless: true
//     },

//     async (taskId) => {
//       notifee.displayNotification({
//         title: 'Background Fetch',
//         body: 'Content check initiated.',
//         android: {
//           channelId: 'default',
          
//         },
//       });
//       console.log('Background fetch task:', taskId);
//       console.log("test2");
//       contentCheck();
//       BackgroundFetch.finish(taskId);
//     },
//     async (taskId) => {
//       console.log('Background fetch timeout task:', taskId);
//       console.log("test3");
//       contentCheck();
//       BackgroundFetch.finish(taskId);
//     },

//   );
// } catch (error) {
//   console.error('Error setting up background fetch:', error);
// }
// }
// Initialize notifications
export const initializeNotifications = async () => {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });
};



// Call these methods in your app entry point (e.g., App.tsx)
// export const setupNotificationService = async () => {
//   initializeNotifications();
//   await registerBackgroundFetch();
// };
