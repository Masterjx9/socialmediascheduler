// this is just for importting twitter stuff we wont use for now
import { Linking } from 'react-native';

import React, { useState, useEffect } from 'react';


const twitterClientId = 'YOUR_TWITTER_CLIENT_ID';
const twitterRedirectUri = 'YOUR_TWITTER_REDIRECT_URI'; 
export const loginWithTwitter = async () => {
  const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${twitterClientId}&redirect_uri=${encodeURIComponent(twitterRedirectUri)}&scope=tweet.read users.read&state=${Math.random().toString(36).substring(7)}&code_challenge=challenge&code_challenge_method=plain`;
  
  await Linking.openURL(twitterAuthUrl);
};


export const useTwitterOAuthListener = (onSuccess: (code: string) => void) => {
  useEffect(() => {
      const handleOpenURL = (event: { url: string }) => {
          const url = new URL(event.url);
          const code = url.searchParams.get('code');
          if (code) {
              onSuccess(code);
          }
      };

      const subscription = Linking.addEventListener('url', handleOpenURL);

        // Unsubscribe properly
        return () => subscription.remove();

  }, [onSuccess]);
};

export const getTwitterAccessToken = async (code: string) => {
  const twitterClientId = 'replace_with_your_client_id';
  const twitterClientSecret = 'replace_with_your_client_secret';
  const twitterRedirectUri = 'http://localhost:8080/callback';

  const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
  const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: twitterRedirectUri,
      client_id: twitterClientId,
      code_verifier: 'challenge'
  });

  const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${twitterClientId}:${twitterClientSecret}`).toString('base64')}`
      },
      body: tokenData.toString(),
  });

  const jsonResponse = await response.json();
  console.log('Twitter Access Token:', jsonResponse);
};


export const getTwitterUserInfo = async (accessToken: string) => {
  const response = await fetch('https://api.twitter.com/2/users/me', {
      method: 'GET',
      headers: {
          'Authorization': `Bearer ${accessToken}`
      }
  });

  const userInfo = await response.json();
  console.log('Twitter User Info:', userInfo);
};
