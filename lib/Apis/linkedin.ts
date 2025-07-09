import { Linking } from 'react-native';
import { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } from '@env';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';  
// This is linkedIn's client ID for your app
// Replace with your actual client ID
// for now this is using the development client ID
// from meetup. Any use of this client ID will be rate limited
export const clientId = LINKEDIN_CLIENT_ID;

// This is the redirect URI you set in your LinkedIn app settings
// Replace with your actual redirect URI
// for now this is using the development redirect URI
// from meetup. Any use of this redirect URI will be rate limited 
const redirectUri = 'https://masterjx9.github.io/socialmediascheduler/redirect.html';

// This is the client secret for your LinkedIn app
// Replace with your actual client secret
// for now this is using the development client secret
// from meetup. Any use of this client secret will be rate limited
export const clientSecret = LINKEDIN_CLIENT_SECRET;
export function openLinkedInLogin() {
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20w_member_social`;
  Linking.openURL(authUrl);
  }

export async function getLinkedInAccessToken({
  grant_type,
  code,
  refresh_token,
  }: {
  grant_type: 'authorization_code' | 'refresh_token',
  code?: string,
  refresh_token?: string,
}): Promise<any> {

  const url = 'https://www.linkedin.com/oauth/v2/accessToken';
  let data: any;
  if (grant_type === 'authorization_code' && code) {
    data = new URLSearchParams({
      grant_type: grant_type,
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
  }
  if (grant_type === 'refresh_token' && refresh_token) {
    data = new URLSearchParams({
      grant_type: grant_type,
      refresh_token: refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: data.toString(),
  });

  return response.json();
}


export async function getLinkedInUserInfo(accessToken: string): Promise<any> {
  const url = 'https://api.linkedin.com/v2/userinfo';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.json();
}

async function initializeUpload(
  accessToken: string,
  mediaType: string,
  fileSize?: number,
  wantThumbnail: boolean = false,
): Promise<any> {
  const personUrn = (await getLinkedInUserInfo(accessToken)).sub;
  const url = `https://api.linkedin.com/rest/${mediaType}s?action=initializeUpload`;
  const postHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202504',
    'Content-Type': 'application/json',
  };
  const postBody: any = {
    initializeUploadRequest: {
      owner: `urn:li:person:${personUrn}`,
    },
  };
  if (mediaType === 'video') {
    postBody.initializeUploadRequest.fileSizeBytes = fileSize;
    postBody.initializeUploadRequest.uploadCaptions = false;
    postBody.initializeUploadRequest.uploadThumbnail = wantThumbnail;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: postHeaders,
    body: JSON.stringify(postBody),
  });
  console.log(response.statusText);
  console.log(response.status);
  // console.log(await response.text());
  // console.log((await response.json()).value.uploadUrl);
  return (await response.json()).value;
}

async function uploadVideoParts(
  uploadInstructions: any[],
  filePath: string,
): Promise<string[]> {
  const chunkSize = 4 * 1024 * 1024; // 4 MB
  const uploadedPartIds: string[] = [];
  console.log('Uploading video parts...');
  console.log('filePath', filePath);
  console.log('chunkSize', chunkSize);
  try {
    console.log('uploadInstructions', uploadInstructions);
    for (const instruction of uploadInstructions) {
      console.log('instruction', instruction);
      const uploadUrl = instruction.uploadUrl;
      const firstByte = instruction.firstByte;
      const lastByte = instruction.lastByte;
      const length = lastByte - firstByte + 1;
      console.log('length', length);
      console.log('firstByte', firstByte);
      console.log('lastByte', lastByte);
      
      const base64Chunk = await RNFS.read(filePath, length, firstByte, 'base64');
      const buffer      = Buffer.from(base64Chunk, 'base64');

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      });
      console.log('response', response);
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to upload chunk: ${await response.text()}`);
      }
      console.log('response headers', response.headers);
      console.log('response status', response.status);
      uploadedPartIds.push(response.headers.get('etag') || '');
      console.log(`Uploaded bytes ${firstByte}-${lastByte}`);
    }
  } catch (error) {
    console.error('Error uploading video parts:', error);
    throw error;
  }

  return uploadedPartIds;
}

async function finalizeVideoUpload(
  accessToken: string,
  videoUrn: string,
  uploadedPartIds: string[],
): Promise<void> {
  const url = 'https://api.linkedin.com/rest/videos?action=finalizeUpload';
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202504',
    'Content-Type': 'application/json',
  };
  const postBody = {
    finalizeUploadRequest: {
      video: videoUrn,
      uploadToken: '',
      uploadedPartIds: uploadedPartIds,
    },
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(postBody),
  });
  if (response.status !== 200) {
    throw new Error(`Failed to finalize upload: ${await response.text()}`);
  }
  console.log('Video upload finalized');
}

export async function postMediaToLinkedIn(
  accessToken: string,
  mediaType: 'image' | 'video' | null,
  mediaUrl: any,
  tags: Array<string> | null = null,
) {
  const personUrn = (await getLinkedInUserInfo(accessToken)).sub;
  let mediaUrn: string = '';
  let mediaTitle: string = '';
  let postBody: any;
  if (mediaType === 'video') {
    const fileStats = await RNFS.stat(mediaUrl[`${mediaType}_path`]);
    const fileSize = Number(fileStats.size);


    const videoData = await initializeUpload(accessToken, mediaType, fileSize, mediaUrl.thumbnail_path ? true : false);
    const uploadInstructions = videoData.uploadInstructions;
    const videoUrn = videoData[mediaType];

    console.log('videoData', videoData);
    console.log('mediaUrl', mediaUrl);
    if (videoData.thumbnailUploadUrl && mediaUrl.thumbnail_path) {
  const thumbnailData = await RNFS.readFile(mediaUrl.thumbnail_path, 'base64');
  const thumbnailBuffer = Buffer.from(thumbnailData, 'base64');

  const thumbnailUploadRes = await fetch(videoData.thumbnailUploadUrl, {
      method: 'PUT',
      headers: {
        'media-type-family': 'STILLIMAGE',
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(thumbnailBuffer.length),
      },
      body: thumbnailBuffer,
    });

    if (thumbnailUploadRes.status !== 201) {
      throw new Error(`Thumbnail upload failed → ${await thumbnailUploadRes.text()}`);
    }

    console.log('✅ Thumbnail uploaded successfully');
  }

    const uploadedPartIds = await uploadVideoParts(
      uploadInstructions,
      mediaUrl.video_path,
    );
    await finalizeVideoUpload(accessToken, videoUrn, uploadedPartIds);

    mediaUrn = videoUrn;
    mediaTitle = 'Video Post';
  }
  if (mediaType === 'image') {
    const imageData = await initializeUpload(accessToken, mediaType);
    console.log(imageData);
    const uploadUrl = imageData.uploadUrl;
    mediaUrn = imageData.image;

    const putHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };
    console.log("attempting to read the file");
    console.log(mediaUrl[`${mediaType}_path`]);
    const base64Data   = await RNFS.readFile(mediaUrl[`${mediaType}_path`], 'base64');
    const binaryBuffer = Buffer.from(base64Data, 'base64'); 

    console.log("file read");
    console.log("binaryBuffer",binaryBuffer);

    console.log("attempting to upload the file");
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,         
        'Content-Type':  'application/octet-stream',
        'Content-Length': String(binaryBuffer.length)
      },
      body: binaryBuffer                               
    });
    console.log("file uploaded");
    if (uploadResponse.status !== 200 && uploadResponse.status !== 201) {
      throw new Error(`Image upload failed: ${await uploadResponse.text()}`);
    }
    mediaTitle = 'Image Post';
  }

  const postHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202504',
    'Content-Type': 'application/json',
  };
  postBody = {
    author: `urn:li:person:${personUrn}`,
    commentary: mediaUrl['description'],
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
  };
  console.log("mediaUrn",mediaUrn);
  if (mediaType === 'video' || mediaType === 'image') {
    if (mediaTitle) {
      postBody['content'] = {
        media: {
          title: mediaTitle,
          id: mediaUrn,
        },
      };
    }
  }

  console.log("postbody",postBody);
  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: postHeaders,
    body: JSON.stringify(postBody),
  });
  console.log(response.statusText);
  console.log(response.status);
  console.log("response headers",response.headers);
  console.log(await response.text());
}

