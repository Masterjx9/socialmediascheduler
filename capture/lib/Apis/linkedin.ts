import { Linking } from 'react-native';
import { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } from '@env';
const fs = require('fs').promises;

// This is linkedIn's client ID for your app
// Replace with your actual client ID
// for now this is using the development client ID
// from meetup. Any use of this client ID will be rate limited
export const clientId = LINKEDIN_CLIENT_ID;

// This is the redirect URI you set in your LinkedIn app settings
// Replace with your actual redirect URI
// for now this is using the development redirect URI
// from meetup. Any use of this redirect URI will be rate limited 
const redirectUri = 'https://masterjx9.github.io/socialmediascheduler/linkedin-redirect/index.html';

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
): Promise<any> {
  const personUrn = (await getLinkedInUserInfo(accessToken)).sub;
  const url = `https://api.linkedin.com/rest/${mediaType}s?action=initializeUpload`;
  const postHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202304',
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
    postBody.initializeUploadRequest.uploadThumbnail = false;
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

  const fileHandle = await fs.open(filePath, 'r');
  try {
    for (const instruction of uploadInstructions) {
      const uploadUrl = instruction.uploadUrl;
      const firstByte = instruction.firstByte;
      const lastByte = instruction.lastByte;
      const buffer = Buffer.alloc(lastByte - firstByte + 1);
      await fileHandle.read(buffer, 0, buffer.length, firstByte);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to upload chunk: ${await response.text()}`);
      }

      uploadedPartIds.push(response.headers.get('etag') || '');
      console.log(`Uploaded bytes ${firstByte}-${lastByte}`);
    }
  } finally {
    await fileHandle.close();
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
    'LinkedIn-Version': '202411',
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
  let mediaUrn: string;
  let mediaTitle: string = '';
  let postBody: any;
  if (mediaType === 'video') {
    const fileSize = fs.statSync(mediaUrl[`${mediaType}_path`]).size;

    const videoData = await initializeUpload(accessToken, mediaType, fileSize);
    const uploadInstructions = videoData.uploadInstructions;
    const videoUrn = videoData[mediaType];

    const uploadedPartIds = await uploadVideoParts(
      uploadInstructions,
      mediaUrl,
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

    const mediaFile = await fs.readFile(mediaUrl[`${mediaType}_path`]);
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: putHeaders,
      body: mediaFile,
    });

    if (uploadResponse.status !== 200 && uploadResponse.status !== 201) {
      throw new Error(`Image upload failed: ${await uploadResponse.text()}`);
    }
    mediaTitle = 'Image Post';
  }

  const postHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202411',
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
  if (mediaType === 'video' || mediaType === 'image') {
    if (mediaTitle) {
      postBody['content'] = {
        media: {
          title: mediaTitle,
          id: mediaUrl,
        },
      };
    }
  }

  console.log(postBody);
  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: postHeaders,
    body: JSON.stringify(postBody),
  });
  console.log(response.statusText);
  console.log(response.status);
  console.log(await response.text());
}
