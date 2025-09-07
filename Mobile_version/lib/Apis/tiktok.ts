import { TIKTOK_CLIENT_ID, TIKTOK_CLIENT_SECRET } from "@env";
import { Linking } from "react-native";
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

const fs = require("fs").promises;

// This is TikTok's client ID for your app
// Replace with your actual client ID
// for now this is using the development client ID
export const tiktokClientId = TIKTOK_CLIENT_ID;

// This is the redirect URI you set in your TikTok's app settings
// Replace with your actual redirect URI
// for now this is using the development redirect URI
const tiktokRedirectUri = 'https://socialmediascheduler.pythonicit.com/redirect.html';

// This is the client secret for your TikTok app
// Replace with your actual client secret
// for now this is using the development client secret
export const tiktokClientSecret = TIKTOK_CLIENT_SECRET;

let codeVerifier: string | undefined;

const b64url = (u8: Uint8Array) =>
  Buffer.from(u8)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

function randBytes(n: number) {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
  return b;
}




export async function openTikTokLogin() {
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${tiktokClientId}&response_type=code&scope=user.info.basic,video.publish,video.upload&redirect_uri=${tiktokRedirectUri}&state=state`;
    console.log("TikTok Auth URL: ", authUrl);
    Linking.openURL(authUrl);
}

export async function getTikTokUserInfo(accessToken: string) {
    const response = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });
    return response.json();
}

export async function getTikTokAccessToken({
    grant_type,
    code,
    access_token,
    refresh_token,
}: {
    grant_type: 'authorization_code' | 'refresh_token';
    code?: string;
    access_token?: string;
    refresh_token?: string;
    }): Promise<any> {
        if (grant_type === 'authorization_code') {

            // Code verifier is used to generate code challenge in PKCE authorization flow.
            const codeVerifier = b64url(randBytes(64));

          console.log('grant_type', grant_type);
          console.log('code', code);
          console.log('access_token', access_token);
          const url = 'https://open.tiktokapis.com/v2/oauth/token/';
          const data = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code!,
            redirect_uri: tiktokRedirectUri,
            client_key: tiktokClientId,
            client_secret: tiktokClientSecret,
            code_verifier: codeVerifier,
          });
      
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: data.toString(),
          });
          const responseData = await response.json();
          console.log('response', responseData);
          return responseData;
        }
      
        if (grant_type === 'refresh_token' && refresh_token) {
          const refreshUrl = `https://open.tiktokapis.com/v2/oauth/token/`;
          const data = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refresh_token,
            client_key: tiktokClientId,
            client_secret: tiktokClientSecret,
          });
      
          const refreshRes = await fetch(refreshUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: data.toString(),
          });
      
          return refreshRes.json();
        }
      
        throw new Error('Invalid grant_type');
      }
      

export async function uploadTikTokVideo(accessToken: string, videoPath: string) {
    const fileContent = await RNFS.readFile(videoPath, 'base64');
    const fileBuffer = Buffer.from(fileContent, 'base64');

    const response = await fetch("https://open.tiktokapis.com/v2/video/upload/", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            video: fileBuffer.toString('base64')
        })
    });

    return response.json();
}



/* ─── TikTok Content Posting API helpers ─────────────────────────────────── */

/**
 * Query the creator’s latest account info.
 */
export async function queryTikTokCreatorInfo(
  accessToken: string,
): Promise<any> {
  const res = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: '{}',
    },
  );
  return res.json();
}

/**
 * Initialise a FILE_UPLOAD video post and obtain the upload URL + publish_id.
 */
export async function initTikTokVideoUpload(
  accessToken: string,
  videoPath: string,
  {
    title,
    privacy_level = 'PUBLIC_TO_EVERYONE',
    disable_duet = false,
    disable_comment = false,
    disable_stitch = false,
    video_cover_timestamp_ms = 1000,
  }: {
    title: string;
    privacy_level?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
    disable_duet?: boolean;
    disable_comment?: boolean;
    disable_stitch?: boolean;
    video_cover_timestamp_ms?: number;
  },
): Promise<{ publish_id: string; upload_url: string; video_size: number }> {
  privacy_level = 'SELF_ONLY'; // This is just for now to test an error called unaudited_client_can_only_post_to_private_accounts
  const MIN_CHUNK = 5 * 1024 * 1024;  // 5 MB
  const MAX_CHUNK = 64 * 1024 * 1024; // 64 MB
  const stats = await RNFS.stat(videoPath);
  const videoSize = Number(stats.size);
  let chunkSize: number;
  if (videoSize <= MIN_CHUNK) {
    chunkSize = videoSize;
  } else {
    chunkSize = Math.min(MAX_CHUNK, videoSize);
  }
  const totalChunkCount = Math.ceil(videoSize / chunkSize);

  console.log('Video size:', videoSize);
  console.log('Chunk size:', chunkSize);
  console.log('Total chunk count:', totalChunkCount);
  console.log('videoPath:', videoPath);

  const body = {
    post_info: {
      title,
      privacy_level,
      disable_duet,
      disable_comment,
      disable_stitch,
      video_cover_timestamp_ms,
    },
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: videoSize,
      chunk_size: chunkSize,
      total_chunk_count: totalChunkCount,
    },
  };

  const res = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  console.log('TikTok video upload init response:', data);
  return data.data;
  // return (await res.json()).data;
}

/**
 * Upload the entire video file to the presigned `upload_url`.
 */
export async function uploadTikTokVideoFile(
  upload_url: string,
  videoPath: string,
): Promise<void> {
  const stats = await RNFS.stat(videoPath);
  const size = Number(stats.size);
  const buffer = Buffer.from(await RNFS.readFile(videoPath, 'base64'), 'base64');

  const res = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Range': `bytes 0-${size - 1}/${size}`,
      'Content-Type': 'video/mp4',
    },
    body: buffer,
  });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Video upload failed → ${await res.text()}`);
  }
}

/**
 * Initialise a DIRECT_POST photo post (PULL_FROM_URL).
 */
export async function initTikTokPhotoPost(
  accessToken: string,
  {
    title,
    description = '',
    photo_urls,
    privacy_level = 'PUBLIC_TO_EVERYONE',
  }: {
    title: string;
    description?: string;
    photo_urls: string[];
    privacy_level?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  },
): Promise<{ publish_id: string }> {
  privacy_level = 'SELF_ONLY'; // This is just for now to test an error called unaudited_client_can_only_post_to_private_accounts
  const body = {
    post_info: {
      title,
      description,
      disable_comment: false,
      privacy_level,
      auto_add_music: true,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      photo_cover_index: 1,
      photo_images: photo_urls,
    },
    post_mode: 'DIRECT_POST',
    media_type: 'PHOTO',
  };

  const res = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/content/init/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  // return (await res.json()).data;
  const data = await res.json();
  console.log('TikTok photo post init response:', data);
  return data.data;
}

/**
 * Fetch processing/publication status for a given publish_id.
 */
export async function fetchTikTokPublishStatus(
  accessToken: string,
  publish_id: string,
): Promise<any> {
  const res = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id }),
    },
  );
  return res.json();
}

/**
 * High-level helper to post either a video (FILE_UPLOAD) or a photo set (PULL_FROM_URL).
 */
export async function postMediaToTikTok(
  accessToken: string,
  mediaType: 'video' | 'image',
  mediaPayload: {
    video_path?: string;
    photo_urls?: string[];
    title: string;
    description?: string;
    privacy_level?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  },
): Promise<void> {
  if (mediaType === 'video' && mediaPayload.video_path) {
    const { publish_id, upload_url } = await initTikTokVideoUpload(
      accessToken,
      mediaPayload.video_path,
      {
        title: mediaPayload.title,
        privacy_level: mediaPayload.privacy_level,
      },
    );
    await uploadTikTokVideoFile(upload_url, mediaPayload.video_path);
    await fetchTikTokPublishStatus(accessToken, publish_id);
    return;
  }

  if (mediaType === 'image' && mediaPayload.photo_urls?.length) {
    console.log('image mediaPayload:', mediaPayload);
    const { publish_id } = await initTikTokPhotoPost(accessToken, {
      title: mediaPayload.title,
      description: mediaPayload.description,
      photo_urls: mediaPayload.photo_urls,
      privacy_level: mediaPayload.privacy_level,
    });
    await fetchTikTokPublishStatus(accessToken, publish_id);
    return;
  }

  throw new Error('Invalid media parameters');
}
