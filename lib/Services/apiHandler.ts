import {fetchContentFromBeforeCurrentTime,
  insertThreadsAccountIntoDb,
  insertInstagramAccountIntoDb,
  insertYoutubeAccountIntoDb,
  insertLinkedInAccountIntoDb
} from './dbService';
import { uploadVideoToYouTube,
          getGoogleAccessToken,
 } from '../Apis/youtube';
import {postTextToTwitter, postImageToTwitter, postVideoToTwitter, getTwitterUserInfo} from '../Apis/twitter';
import {postMediaToLinkedIn} from '../Apis/linkedin';
import { postToThreads, 
          createContainer, 
          publishMedia,
          getInstagramUserInfo,
          uploadContentToTmpFiles,
          postImageOrVideoToThreads,
          getInstagramAccessToken,
          getThreadsAccessToken
        } from '../Apis/meta';
import {fetchProviderNamesByIds} from './dbService';
import { fetchTwitterCredentials,
        fetchLinkedInCredentials,
        fetchThreadsCredentials,
        fetchInstagramCredentials,
        fetchYoutubeCredentials
 } from './dbService';
import notifee from '@notifee/react-native';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';

let isContentCheckRunning = false;
export const contentCheck = async () => {
  console.log('contentCheck called');
  console.log('isContentCheckRunning:', isContentCheckRunning);
  if (isContentCheckRunning) {
    console.log('contentCheck is already running. Exiting.');
    return;
  }
  isContentCheckRunning = true;
  // fetch data from database
  let contentData = await fetchContentFromBeforeCurrentTime();
  console.log('contentData:', contentData);
  if (contentData.length === 0) {
    console.log('No content to post at this time.');
    isContentCheckRunning = false;
    return;
  }
  // example data:
  // [{"content_data": "test on the 17ttest", "content_id": 1, "content_type": "post", "description": null, "post_date": 1743964260, "published": {}, "tags": null, "user_providers": "[\"12345674897456163\"]"}]

  // forloop for contentData:
  // We user the conent.user_providers to know which social media account to post to. - Goal is to get the credentials for each account.
  // NOTE: We create a function in dbservice to fetch of provider_name based on content.user_providers.
  // NOTE: We then go through each account table that matches the provider_name and get the credentials for each account.
  // We then check if the credentials are valid. If not, we send a notification to the user to update their credentials.
  // If the credentials are valid, we post to the social media account using the content.content_data.

  for (const content of contentData) {

    const {
      content_type, 
      content_id,
      content_data, 
      description, 
      title, 
      privacy,
      tags,
      category,
      selfDeclaredMadeForKids,
      thumbnail
      } = content;
  
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
      
      notifee.displayNotification({
        title: 'Background Fetch',
        body: 'Posting content to social media accounts.',
        android: {
          channelId: 'default',
          
        },
      });
      for (const providerId of userProviders) {
        const providerName = providerNameMap[providerId];
        console.log('providerName:', providerName);
        switch (providerName) {
          case 'twitter':
            console.log('Posting to Twitter...');
            const twitterCreds = await fetchTwitterCredentials(providerId);
            if (!twitterCreds) {
              console.warn(`No Twitter credentials found for providerId: ${providerId}`);
              publishedStatus[providerId] = 'failed';
              break;
            }
            // test the information by getting the user info
            const userInfo = await getTwitterUserInfo(twitterCreds.consumerKey, twitterCreds.consumerSecret,
              twitterCreds.accessToken, twitterCreds.accessTokenSecret
            );
            console.log("userInfo:", userInfo);
            try {
              if (content_type === "post") {
              const postData = await postTextToTwitter(
                // content_data,
                description,
                twitterCreds.consumerKey,
                twitterCreds.consumerSecret,
                twitterCreds.accessToken,
                twitterCreds.accessTokenSecret
              );
              if (postData.error) {
                throw new Error(`Error posting to Twitter: ${postData.error}`);
              }
            } if (content_type === 'image' || content_type === 'video') {
              const fullPath = content_data;
              console.log("fullPath:", fullPath);
              const fileNameFromPath = fullPath.substring(fullPath.lastIndexOf('/') + 1);
              console.log("fileNameFromPath:", fileNameFromPath);
              const extension = fileNameFromPath.substring(fileNameFromPath.lastIndexOf('.') + 1).toLowerCase();
              console.log("extension:", extension);
              const baseName = fileNameFromPath.substring(0, fileNameFromPath.lastIndexOf('.'));
              console.log("baseName:", baseName);
              const shortBase = baseName.length >= 5 ? baseName.slice(-5) : baseName;
              console.log("shortBase:", shortBase);
              const shortName = shortBase + '.' + extension;
              console.log("shortName:", shortName);
              let twitterPayload;
              if (content_type === 'image') {
                twitterPayload = {
                  image_path: fullPath,
                  description: description,
                };
              }
              if (content_type === 'video') {
                twitterPayload = {
                  video_path: fullPath,
                  description: description,
                };
              }
              
              if (content_type === 'image') {
              await postImageToTwitter(
                twitterPayload,
                twitterCreds.consumerKey,
                twitterCreds.consumerSecret,
                twitterCreds.accessToken,
                twitterCreds.accessTokenSecret
              );
            }
              if (content_type === 'video') {
                await postVideoToTwitter(
                  twitterPayload,
                  twitterCreds.consumerKey,
                  twitterCreds.consumerSecret,
                  twitterCreds.accessToken,
                  twitterCreds.accessTokenSecret
                );
              }

            }
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
              if (content_type === "post") {
              await postMediaToLinkedIn(linkedInCreds.appToken, null,{"description": description}, null);
              }
              if (content_type === 'image' || content_type === 'video') {
                const fullPath = content_data;
                const fileNameFromPath = fullPath.substring(fullPath.lastIndexOf('/') + 1);
                const extension = fileNameFromPath.substring(fileNameFromPath.lastIndexOf('.') + 1).toLowerCase();

                const mediaType = extension === 'mp4' || extension === 'mov' ? 'video' : 'image';
                const thumbnailPath = thumbnail ? thumbnail : null;

                const mediaPayload = {
                  description,
                  [`${mediaType}_path`]: fullPath
                };

                if (thumbnailPath) {
                  mediaPayload['thumbnail_path'] = thumbnailPath;
                }
                
                await postMediaToLinkedIn(linkedInCreds.appToken, mediaType, mediaPayload, null);
              } else {
                await postMediaToLinkedIn(linkedInCreds.appToken, null, { description }, null);
              }

              
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

            // const threadsCreds = await fetchThreadsCredentials(providerId);
            // if (!threadsCreds) {
            //   console.warn(`No Threads credentials found for providerId: ${providerId}`);
            //   publishedStatus[providerId] = 'failed';
            //   break;
            // }
            // console.log("threadsCreds:", threadsCreds);
            // // attempt to update the refresh token before posting
            // const threadsRT = await getThreadsAccessToken({
            //   grant_type: "th_refresh_token",
            //   access_token: threadsCreds.accessToken,
            // })
            // if (threadsRT.error) {
            //   console.warn(`Error updating Threads access token for providerId: ${providerId}`);
            //   publishedStatus[providerId] = 'failed';
            //   break;
            // }

            // await insertThreadsAccountIntoDb(
            //   "update",
            //   threadsCreds.subId,
            //   threadsRT.access_token,
            //   threadsRT.expires_in,
            //   new Date().toISOString(),
            //   threadsCreds.accountName
            // )


            try {

              for (let i = 1; i <= 10; i++) {
                console.log(i);
                await new Promise(resolve => setTimeout(resolve, 1500)); // wait for 1.5 seconds
              }


            //   console.log("content_type:", content_type);
            //   if (content_type === "post") {
            //     console.log("we are now posting a text post to threads");
            //   const publishData = await postToThreads(threadsCreds.accessToken, description);
            //   console.log('Threads publish data:', publishData);
            //   if (publishData.error) {
            //     throw new Error(`Error publishing to Threads: ${publishData.error}`);
            //   }
            // }
            //  if (content_type === "image" || content_type === "video") {
            //   console.log("content_data:", content_data);
            //   const fullPath = content_data;
            //   console.log("fullPath:", fullPath);
            //   const fileNameFromPath = fullPath.substring(fullPath.lastIndexOf('/') + 1);
            //   console.log("fileNameFromPath:", fileNameFromPath);
            //   const extension = fileNameFromPath.substring(fileNameFromPath.lastIndexOf('.') + 1).toLowerCase();
            //   console.log("extension:", extension);
            //   const baseName = fileNameFromPath.substring(0, fileNameFromPath.lastIndexOf('.'));
            //   console.log("baseName:", baseName);
            //   const shortBase = baseName.length >= 5 ? baseName.slice(-5) : baseName;
            //   console.log("shortBase:", shortBase);
            //   const shortName = shortBase + '.' + extension;
            //   console.log("shortName:", shortName);
            //   const uploadResponse = await uploadContentToTmpFiles(fullPath, shortName);
            //   console.log("uploadResponse:", uploadResponse);
            //   const publishData = await postImageOrVideoToThreads(
            //     threadsCreds.accessToken,
            //     extension === 'mp4' || extension === 'mov' ? 'VIDEO' : 'IMAGE',
            //     uploadResponse.real_url,
            //     description
            //   );
            //   console.log('Threads publish data:', publishData);
            //   if (publishData.error) {
            //     throw new Error(`Error publishing to Threads: ${publishData.error}`);
            //   }
            //  }


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
              // attempt to update the refresh token before posting
              const instaRT = await getInstagramAccessToken({
                grant_type: "ig_refresh_token",
                access_token: instaCreds.accessToken,
              })
              if (instaRT.error) {
                console.warn(`Error updating Instagram access token for providerId: ${providerId}`);
                publishedStatus[providerId] = 'failed';
                break;
              }

              await insertInstagramAccountIntoDb(
                "update",
                instaCreds.subId,
                instaRT.access_token,
                instaRT.expires_in,
                new Date().toISOString(),
                instaCreds.accountName
              )
              try {
                // test to see if instagram endpoint works
                const info = await getInstagramUserInfo(instaCreds.accessToken)
                console.log("info:", info);
              // const uploadResponse = await uploadContentTo0x0(content_data, "test.jpeg");
              console.log("content_data:", content_data);
              const fullPath = content_data;
              console.log("fullPath:", fullPath);
              const fileNameFromPath = fullPath.substring(fullPath.lastIndexOf('/') + 1);
              console.log("fileNameFromPath:", fileNameFromPath);
              const extension = fileNameFromPath.substring(fileNameFromPath.lastIndexOf('.') + 1).toLowerCase();
              console.log("extension:", extension);

              const baseName = fileNameFromPath.substring(0, fileNameFromPath.lastIndexOf('.'));
              console.log("baseName:", baseName);
              const shortBase = baseName.length >= 5 ? baseName.slice(-5) : baseName;
              console.log("shortBase:", shortBase);

              const shortName = shortBase + '.' + extension;
              console.log("shortName:", shortName);

              console.log("shortName:", shortName);
              console.log("fullPath:", fullPath);
              const uploadResponse = await uploadContentToTmpFiles(fullPath, shortName);

              console.log("uploadResponse:", uploadResponse);
              console.log("content_type:", content_type);
              console.log("content_type:", content_type);
              console.log("content_type:", content_type);
              console.log("content_type:", content_type);
              if (content_type === "image") {
                const container = await createContainer(instaCreds.accessToken, uploadResponse.real_url, instaCreds.subId, description, "IMAGE")
                console.log("container:", container);
                if (container.error) {
                  throw new Error(`Error creating container on Instagram: ${container.error}`);
                } 
                const publishData = await publishMedia(instaCreds.accessToken, instaCreds.subId, container.id);
                console.log('Instagram publish data:', publishData);
              } else if ( content_type === "video") {
                let thumbnail_url = null;
                if (thumbnail) {
                  console.log("have to upload thumbnail to 0x0");
                  const thumbnailUploadResponse = await uploadContentToTmpFiles(thumbnail, "temp_thumbnail.jpeg");
                  console.log("thumbnailUploadResponse:", thumbnailUploadResponse);
                  thumbnail_url = thumbnailUploadResponse.real_url;
                }
                if (thumbnail_url === null) {
                    thumbnail_url = undefined;
                  }
                  const videoContainer = await createContainer(
                    instaCreds.accessToken, 
                    uploadResponse.real_url, 
                    instaCreds.subId, 
                    description,
                    "VIDEO",
                    tags,
                    thumbnail_url,
                  )
                  console.log("videoContainer:", videoContainer);
                  if (videoContainer.error) {
                    throw new Error(`Error creating video container on Instagram: ${videoContainer.error}`);
                  }
                const publishData = await publishMedia(instaCreds.accessToken, instaCreds.subId, videoContainer.id);
                console.log('Instagram publish data:', publishData);
                } else {
                  console.log("content_type:", content_type);
                  console.log("why is this not catching video");
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

            

            console.log('Posting to YouTube...');
            const youtubeCreds = await fetchYoutubeCredentials(providerId);
            if (!youtubeCreds) {
              console.warn(`No YouTube credentials found for providerId: ${providerId}`);
              publishedStatus[providerId] = 'failed';
              break;
            }  
            console.log("youtubeCreds:", youtubeCreds);
            // attempt to update the refresh token before posting
            const youtubeRT = await getGoogleAccessToken({
              grant_type: "refresh_token",
              access_token: youtubeCreds.accessToken,
            })
            if (youtubeRT.error) {
              console.warn(`Error updating YouTube access token for providerId: ${providerId}`);
              publishedStatus[providerId] = 'failed';
              break;
            }
            
            await insertYoutubeAccountIntoDb(
              "update",
              youtubeCreds.subId,
              youtubeRT.access_token,
              youtubeRT.expires_in,
              new Date().toISOString(),
              youtubeCreds.accountName
            )
            try {
              
              // Fetch from youtube_accounts, then post
              // throw new Error("Intentional failure for testing");
              if (content_type === "post" || content_type === "image") {
                console.log("This should never ever happen ever");
                // if anyone wants to make logic to safely failing this, please do
                // this should never happen because you can make a text post on youtube
                // maybe the community post but not sure if there is an API for that
                // and would be out of scope for this project
              }
              if (content_type === "video") {
                const fullPath = content_data;
                const fileNameFromPath = fullPath.substring(fullPath.lastIndexOf('/') + 1);
                const extension = fileNameFromPath.substring(fileNameFromPath.lastIndexOf('.') + 1).toLowerCase();

                console.log("fullPath:", fullPath);
                console.log("fileNameFromPath:", fileNameFromPath);
                console.log("extension:", extension);

             

                const videoResult = await uploadVideoToYouTube(
                  youtubeCreds.accessToken,
                  fullPath,
                  title || fileNameFromPath,   // title fallback
                  description || '',
                  category || '22', // default to 'People & Blogs'
                  privacy || 'private',
                  selfDeclaredMadeForKids || false,
                  thumbnail,
                  tags
                );
                console.log('YouTube upload result:', videoResult);

              //   for (let i = 1; i <= 10; i++) {
              //   console.log(i);
              //   await new Promise(resolve => setTimeout(resolve, 1500)); // wait for 1.5 seconds
              // }

                publishedStatus[providerId] = 'success';
              }

            }catch (error) {
              console.error(`Failed to post to YouTube for ${providerId}:`, error);
              publishedStatus[providerId] = 'failed';
            }
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
              isContentCheckRunning = false;
              resolve();
            },
            (err) => {
              console.error('Error updating published status:', err);
              isContentCheckRunning = false;
              reject(err);
            }
          );
        });
      });
              isContentCheckRunning = false;
              isContentCheckRunning = false;
              isContentCheckRunning = false;
              isContentCheckRunning = false;

    }
  }
  isContentCheckRunning = false;
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
