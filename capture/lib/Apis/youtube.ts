import { GOOGLE_WEB_CLIENT_ID, GOOGLE_WEB_CLIENT_SECRET } from "@env";
import { Linking } from "react-native";

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
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${googleRedirectUri}&response_type=code&scope=https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly
 https://www.googleapis.com/auth/youtube&access_type=offline`;
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
  