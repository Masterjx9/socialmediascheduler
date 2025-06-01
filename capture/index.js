/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, { AndroidImportance, AndroidColor } from '@notifee/react-native';
import { contentCheck } from './lib/Services/apiHandler';

import BackgroundFetch from 'react-native-background-fetch';

const HeadlessFetchTask = async event => {
    console.log('[HeadlessFetch]: ', event.taskId);

  // safe to call notifee here
  await notifee.createChannel({
    id: 'default',
    name: 'Default',
    importance: AndroidImportance.HIGH,
});


  await notifee.displayNotification({
    title: 'Scheduler running',
    body: 'Background content check',
    android: { channelId: 'default' },
  });

  await contentCheck();          
  BackgroundFetch.finish(event.taskId);
};

BackgroundFetch.registerHeadlessTask(HeadlessFetchTask);
AppRegistry.registerComponent(appName, () => App);