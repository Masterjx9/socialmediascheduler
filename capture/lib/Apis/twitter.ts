import { OAuth } from 'oauth';
const fs = require('fs').promises;

export async function getTwitterAccessToken(
    code: string,
    clientId: string,
    clientSecret: string
  ): Promise<any> {
    const url = 'https://api.twitter.com/2/oauth2/token';
    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'http://localhost:8080/callback',
      client_id: clientId,
      client_secret: clientSecret,
    });
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`, // Base64 encode clientId:clientSecret
      },
      body: data.toString(),
    });
  
    return response.json();
  }
  

export async function postTextToTwitter(
    twitterPayload: string,
    twitterConsumerKey: string,
    twitterConsumerSecret: string,
    twitterAccessToken: string,
    twitterAccessTokenSecret: string
): Promise<any> {
    const oauth = new OAuth(
        'https://api.twitter.com/oauth/request_token',
        'https://api.twitter.com/oauth/access_token',
        twitterConsumerKey,
        twitterConsumerSecret,
        '1.0A',
        null,
        'HMAC-SHA1'
    );

    return new Promise((resolve, reject) => {
        oauth.post(
            'https://api.twitter.com/2/tweets',
            twitterAccessToken,
            twitterAccessTokenSecret,
            JSON.stringify({ text: twitterPayload }),
            'application/json',
            (error, data, response) => {
                if (error) {
                    reject(error);
                } else {
                    const jsonResponse = data ? JSON.parse(data.toString()) : {};
                    if (response && response.headers['x-access-level']) {
                        console.log(`Access level: ${response.headers['x-access-level']}`);
                    } else {
                        console.log('Could not determine access level.');
                    }
                    if (response && response.statusCode === 201) {
                        console.log('Tweet successful!');
                        console.log(JSON.stringify(jsonResponse, null, 4));
                    } else {
                        console.log(`Failed to tweet: ${data}`);
                    }
                    resolve(jsonResponse);
                }
            }
        );
    });
}

