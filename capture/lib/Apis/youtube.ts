import { GOOGLE_WEB_CLIENT_ID, GOOGLE_WEB_CLIENT_SECRET } from "@env";
import { Linking } from "react-native";
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

const fs = require("fs").promises;

// This is Google's client ID for your app
// Replace with your actual client ID
// for now this is using the development client ID
// from meetup. Any use of this client ID will be rate limited
export const googleClientId = GOOGLE_WEB_CLIENT_ID;

// This is the redirect URI you set in your google's app settings
// Replace with your actual redirect URI
// for now this is using the development redirect URI
// from meetup. Any use of this redirect URI will be rate limited 
const googleRedirectUri = 'https://masterjx9.github.io/socialmediascheduler/linkedin-redirect/index.html';

// This is the client secret for your Google app
// Replace with your actual client secret
// for now this is using the development client secret
// from meetup. Any use of this client secret will be rate limited
export const googleClientSecret = GOOGLE_WEB_CLIENT_SECRET;

export async function openGoogleLogin() {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${googleRedirectUri}&response_type=code&access_type=offline&prompt=consent&scope=https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly
 https://www.googleapis.com/auth/youtube`;
    console.log("Google Auth URL: ", authUrl);
    Linking.openURL(authUrl);
}

export async function getYoutubeUserInfo(accessToken: string) {
    const response = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
        },
    });
    return response.json();
}

export async function getGoogleAccessToken({
    grant_type,
    code,
    access_token,
  }: {
    grant_type: 'authorization_code' | 'refresh_token';
    code?: string;
    access_token?: string;
  }): Promise<any> {
    if (grant_type === 'authorization_code') {
      console.log('grant_type', grant_type);
      console.log('code', code);
      console.log('access_token', access_token);
      const url = 'https://oauth2.googleapis.com/token';
      const data = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: googleRedirectUri,
        client_id: googleClientId,
        client_secret: googleClientSecret,
      });
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data.toString(),
      });
  
      console.log('response', response);
      return response.json();
    }
  
    if (grant_type === 'refresh_token') {
      const refreshUrl = `https://oauth2.googleapis.com/token`;
      const data = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: access_token!,
        client_id: googleClientId,
        client_secret: googleClientSecret,
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
  

  export async function uploadVideoToYouTube(
  accessToken: string,
  videoPath: string,
  title: string,
  description: string,
  categoryId = '22',          
  privacyStatus: 'private' | 'public' | 'unlisted' = 'private',
) {
  /* STEP 1 – start a resumable-upload session */
  console.log("accessToken", accessToken);
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({
        // snippet: { title, description, categoryId },
        snippet: { title, description },
        status:  { privacyStatus },
      }),
    },
  );

  if (!initRes.ok) {
    throw new Error(`YouTube init failed → ${await initRes.text()}`);
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('YouTube init failed → no upload URL returned');
  }

  /* STEP 2 – PUT the raw video bytes to the upload URL */
  const b64 = await RNFS.readFile(videoPath, 'base64');
  const binary = Buffer.from(b64, 'base64');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': `${binary.length}`,
    },
    body: binary,
  });

  if (!uploadRes.ok) {
    throw new Error(`YouTube upload failed → ${await uploadRes.text()}`);
  }

  return uploadRes.json();       
}
