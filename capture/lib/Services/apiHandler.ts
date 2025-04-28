import {fetchContentFromBeforeCurrentTime} from './dbService';
import {postTextToTwitter} from '../Apis/twitter';
import {postMediaToLinkedIn} from '../Apis/linkedin';
import { postToThreads, 
          createContainer, 
          uploadContentTo0x0, 
          publishMedia,
          deleteContentFrom0x0,
          getInstagramUserInfo,
          uploadContentToTmpFiles,
        } from '../Apis/meta';
import {fetchProviderNamesByIds} from './dbService';
import { fetchTwitterCredentials,
        fetchLinkedInCredentials,
        fetchThreadsCredentials,
        fetchInstagramCredentials,
        fetchYoutubeCredentials
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
    const {content_type, content_id, content_data, description} = content;
  
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
                // content_data,
                description,
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
              await postMediaToLinkedIn(linkedInCreds.appToken, null,{"description": description}, null);
              // await postMediaToLinkedIn(linkedInCreds.appToken, null,{"description": content_data}, null);
              publishedStatus[providerId] = 'success';
            }
            catch (error) {
              console.error(`Failed to post to LinkedIn for ${providerId}:`, error);
              publishedStatus[providerId] = 'failed';
            }
            break;
          case 'Threads':
            // Fetch from threads_accounts, then post
            console.log('Posting to Threads...');
            const threadsCreds = await fetchThreadsCredentials(providerId);
            if (!threadsCreds) {
              console.warn(`No Threads credentials found for providerId: ${providerId}`);
              publishedStatus[providerId] = 'failed';
              break;
            }
            try {
              // const publishData = await postToThreads(threadsCreds.accessToken, content_data);
              const publishData = await postToThreads(threadsCreds.accessToken, description);
              console.log('Threads publish data:', publishData);
              if (publishData.error) {
                throw new Error(`Error publishing to Threads: ${publishData.error}`);
              }
              publishedStatus[providerId] = 'success';
            }
            catch (error) {
              console.error(`Failed to post to Threads for ${providerId}:`, error);
              publishedStatus[providerId] = 'failed';
            }
            break;
          case 'Instagram':
              // Fetch from instagram_accounts, then post
              console.log('Posting to Instagram...');
              console.log("content_type:", content_type);
              // upload to 0x0
              const instaCreds = await fetchInstagramCredentials(providerId);
              if (!instaCreds) {
                console.warn(`No Instagram credentials found for providerId: ${providerId}`);
                publishedStatus[providerId] = 'failed';
                break;
              }
              console.log("instaCreds:", instaCreds);
              try {
                // test to see if instagram endpoint works
                const info = await getInstagramUserInfo(instaCreds.accessToken)
                console.log("info:", info);
              // const uploadResponse = await uploadContentTo0x0(content_data, "test.jpeg");
              const uploadResponse = await uploadContentToTmpFiles(content_data, "test.jpeg")
              
              console.log("uploadResponse:", uploadResponse);
              if (content_type === "image") {
                const container = await createContainer(instaCreds.accessToken, uploadResponse.real_url, instaCreds.subId, description, "IMAGE")
                console.log("container:", container);
                if (container.error) {
                  throw new Error(`Error creating container on Instagram: ${container.error}`);
                }
                const publishData = await publishMedia(instaCreds.accessToken, instaCreds.subId, container.id);
                console.log('Instagram publish data:', publishData);
              }
              publishedStatus[providerId] = 'success';
              // const conentCleanUpResponse = await deleteContentFrom0x0(uploadResponse);
              // console.log("conentCleanUpResponse:", conentCleanUpResponse);
            }
            catch (error) {
              console.error(`Failed to post to Instagram for ${providerId}:`, error);
              publishedStatus[providerId] = 'failed';
            }
              break;
          case 'YouTube':
            // Fetch from youtube_accounts, then post
            console.log('Posting to YouTube...');
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
