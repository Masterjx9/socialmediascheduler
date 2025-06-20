// REFACTOR USING NOTIFEE
// NOTE: Make a daily refresh token check for all social media accounts
import BackgroundFetch from 'react-native-background-fetch';
import BackgroundTimer from "react-native-background-timer";
import { contentCheck } from './apiHandler';
import { AppState } from 'react-native';
import { linkedInAccessTokenExpirationChecker } from './dbService';
import notifee, { AndroidImportance, AndroidColor, EventType } from '@notifee/react-native';
import { insertLinkedInAccountIntoDb } from './dbService';
import { openLinkedInLogin, getLinkedInAccessToken, getLinkedInUserInfo } from '../Apis/linkedin';
import { Linking } from 'react-native';


const beginLinkedInRenewal = () => {
  // 1. listen once for the OAuth redirect
  const sub = Linking.addEventListener('url', async ({ url }) => {
    const code = url.match(/code=([^&]+)/)?.[1];
    if (!code) return;

    sub.remove();                                    //  stop listening

    try {
      /* 2. exchange `code` → access-token */
      const linkedAC = await getLinkedInAccessToken({
        grant_type: 'authorization_code',
        code,
      });

      /* 3. fetch profile for name + sub_id                    */
      const info = await getLinkedInUserInfo(linkedAC.access_token);

      /* 4.  UPDATE existing row (mode = 'update')             */
      await insertLinkedInAccountIntoDb(
        'update',
        linkedAC.access_token,          // appToken
        info.name,                      // accountName
        new Date().toISOString(),       // timestamp
        info.sub,                       // subId  (PK)
        linkedAC.expires_in,            // appTokenExpiresIn
        // linkedAC.refresh_token,      // optional
        // linkedAC.refresh_token_expires_in
      );

      /* 5. optional success toast */
      await notifee.displayNotification({
        title : 'LinkedIn Token Renewed',
        body  : `Credentials for ${info.name} updated.`,
        android: { channelId: 'default' },
      });
    } catch (err) {
      console.log('LinkedIn renewal failed:', err);
    }
  });

  // 6. kick off OAuth flow
  openLinkedInLogin();
};

notifee.onForegroundEvent(({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'renew-linkedin') {
    beginLinkedInRenewal();
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'renew-linkedin') {
    beginLinkedInRenewal();
  }
});

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
    const linkedInExpirationCheck = await linkedInAccessTokenExpirationChecker();
    console.log("LinkedIn Expiration Check:", linkedInExpirationCheck);
    // Example  LinkedIn Expiration Check: [{"accountName": "Jaton Justice", "expiresSoon": false, "id": "zmokocK1pd"}]

  for (const account of linkedInExpirationCheck) {
    if (account.expiresSoon) {
      await notifee.displayNotification({
        title: 'LinkedIn Account Expiring',
        body : `Account ${account.accountName} will expire soon.`,
        android: {
          channelId: 'default',
          color    : AndroidColor.RED,
          actions  : [
            {
              title      : 'Renew now',
              pressAction: { id: 'renew-linkedin' },
            },
          ],
        },
      });
    }
  }

  await contentCheck();
}, 10000);
}

// Initialize notifications
export const initializeNotifications = async () => {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });
};



