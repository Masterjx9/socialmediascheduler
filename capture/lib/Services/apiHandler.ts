import {fetchContentFromBeforeCurrentTime} from './dbService';
import {postTextToTwitter} from '../Apis/twitter';
import {postMediaToLinkedIn} from '../Apis/linkedin';
import {fetchProviderNamesByIds} from './dbService';
import { fetchTwitterCredentials,
        fetchLinkedInCredentials
 } from './dbService';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';

export const contentCheck = async () => {
  console.log('contentCheck called');
  // fetch data from database
  let contentData = await fetchContentFromBeforeCurrentTime();
  // example data:
  // [{"content_data": "test on the 17ttest", "content_id": 1, "content_type": "post", "description": null, "post_date": 1743964260, "published": {}, "tags": null, "user_providers": "[\"12345674897456163\"]"}]

  // forloop for contentData:
  // We user the conent.user_providers to know which social media account to post to. - Goal is to get the credentials for each account.
  // NOTE: We create a function in dbservice to fetch of provider_name based on content.user_providers.
  // NOTE: We then go through each account table that matches the provider_name and get the credentials for each account.
  // We then check if the credentials are valid. If not, we send a notification to the user to update their credentials.
  // If the credentials are valid, we post to the social media account using the content.content_data.

  for (const content of contentData) {
    const {user_id, content_id, content_data} = content;
  
    const userProviders = JSON.parse(
      content.user_providers || '[]',
    ) as string[];
    const providerNameMap = await fetchProviderNamesByIds(userProviders);
  
    console.log('userProviders:', userProviders);
    console.log('providerNameMap:', providerNameMap);
    // Now loop through each provider
  
    let publishedStatus: Record<string, string> = {};
    try {
      try {
        publishedStatus = content.published ? JSON.parse(content.published) : {};
      } catch {
        publishedStatus = {};
      }
  
      for (const providerId of userProviders) {
        const providerName = providerNameMap[providerId];
  
        switch (providerName) {
          case 'twitter':
            console.log('Posting to Twitter...');
            const twitterCreds = await fetchTwitterCredentials(providerId);
            if (!twitterCreds) {
              console.warn(`No Twitter credentials found for providerId: ${providerId}`);
              publishedStatus[providerId] = 'failed';
              break;
            }
  
            try {
              await postTextToTwitter(
                content_data,
                twitterCreds.consumerKey,
                twitterCreds.consumerSecret,
                twitterCreds.accessToken,
                twitterCreds.accessTokenSecret
              );
              publishedStatus[providerId] = 'success';
            } catch (error) {
              console.error(`Failed to post to Twitter for ${providerId}:`, error);
              publishedStatus[providerId] = 'failed';
            }
  
            break;
  
          case 'LinkedIn':
            // Fetch from linkedin_accounts, then post
            console.log('Posting to LinkedIn...');
            const linkedInCreds = await fetchLinkedInCredentials(providerId);
            if (!linkedInCreds) {
              console.warn(`No LinkedIn credentials found for providerId: ${providerId}`);
              publishedStatus[providerId] = 'failed';
              break;
            }
            try {
              await postMediaToLinkedIn(linkedInCreds.appToken, null,{"description": content_data}, null);
              publishedStatus[providerId] = 'success';
            }
            catch (error) {
              console.error(`Failed to post to LinkedIn for ${providerId}:`, error);
              publishedStatus[providerId] = 'failed';
            }
            break;
          case 'facebook':
            // Fetch from meta_accounts, then post
            console.log('Posting to Facebook...');
            break;
          case 'google':
            // Fetch from google_accounts, then post
            console.log('Posting to Google...');
            break;
  
          default:
            console.warn(`Unknown provider for ID ${providerId}`);
        }
  
        console.log('TEST TEST TEST');
        console.log(contentData);
      }
  
      const allSucceeded = userProviders.every(id => publishedStatus[id] === 'success');
      if (allSucceeded) {
        publishedStatus['final'] = 'success';
      }
  
    } finally {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      await new Promise<void>((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            `UPDATE content SET published = ? WHERE content_id = ?`,
            [JSON.stringify(publishedStatus), content_id],
            () => {
              console.log(`Updated published status for content_id ${content_id}`);
              resolve();
            },
            (err) => {
              console.error('Error updating published status:', err);
              reject(err);
            }
          );
        });
      });
    }
  }
  
};
// Fetch user credentials from dbService
// const userCreds = await fetchUserCredentials(user_id);

// Check if user credentials are valid
// if (!userCreds || userCreds.status === 'unauthorized') {
//     // Send notification via notifee
//     await sendNotification(user_id, 'Unauthorized access. Please update your credentials.');
//     continue;
// }

// Post to Twitter
// await postTextToTwitter(userCreds.twitter, content_data);
    // await postTextToTwitter(content_data,
    //     "consumer_api_key",
    //     "consumer_api_secret",
    //     "access_token",
    //     "access_token_secret"
    // )

// // Post to LinkedIn
// await postMediaToLinkedIn(userCreds.linkedin, content_data);

// // Update the status to published
// await updateContentStatus(content_id, { published: 1, published_at: new Date() });

// // Send notification to the user that the content has been posted
// await sendNotification(user_id, 'Your content has been posted successfully.');
