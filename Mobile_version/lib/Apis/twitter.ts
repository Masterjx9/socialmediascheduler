// import { OAuth } from 'oauth';
import OAuth from 'oauth-1.0a';
import '../../shim.js';
import RNFS from '../Compat/RNFS';
import { Linking } from 'react-native';
import { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, TWITTER_REDIRECT_URI } from '@env';
import { hmac } from '@noble/hashes/hmac';
import { sha1 } from '@noble/hashes/sha1';
import { sha256 } from 'js-sha256';
import { Buffer } from 'buffer';  
 
const signSha1Base64 = (baseString: string, key: string): string => {
  const signature = hmac(sha1, Buffer.from(key, 'utf8'), Buffer.from(baseString, 'utf8'));
  return Buffer.from(signature).toString('base64');
};

const toBase64Url = (value: ArrayBuffer | Uint8Array | Buffer): string => {
  const buffer = Buffer.isBuffer(value)
    ? value
    : value instanceof Uint8Array
    ? Buffer.from(value)
    : Buffer.from(new Uint8Array(value));
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const resolveEnv = (key: string, primary?: string, fallback = ''): string => {
  const fromPrimary = typeof primary === 'string' ? primary.trim() : '';
  const fromProcess = ((globalThis as any)?.process?.env?.[key] as string | undefined)?.trim() ?? '';
  const value = fromPrimary || fromProcess || fallback;

  if (!value || value.toLowerCase() === 'undefined' || value.toLowerCase() === 'null') {
    throw new Error(
      `[ENV] Missing ${key}. Check Mobile_version/.env and restart Metro with --reset-cache.`,
    );
  }

  return value;
};

export const twitterClientId = resolveEnv('TWITTER_CLIENT_ID', TWITTER_CLIENT_ID);
export const twitterClientSecret = resolveEnv('TWITTER_CLIENT_SECRET', TWITTER_CLIENT_SECRET);
export const twitterRedirectUri = resolveEnv(
  'TWITTER_REDIRECT_URI',
  TWITTER_REDIRECT_URI,
  'https://socialmediascheduler.pythonicit.com/redirect.html',
);
export const twitterOAuthScopes =
  ((globalThis as any)?.process?.env?.TWITTER_OAUTH_SCOPES as string | undefined)?.trim() ||
  'tweet.read users.read offline.access';

export const createTwitterCodeVerifier = (): string => {
  const bytes = new Uint8Array(48);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return toBase64Url(bytes);
};

export const createTwitterCodeChallenge = (codeVerifier: string): string => {
  const digest = sha256.arrayBuffer(codeVerifier);
  return toBase64Url(digest);
};

export async function openTwitterLogin(state: string, codeChallenge: string) {
  const scope = encodeURIComponent(twitterOAuthScopes);
  const authUrl =
    `https://x.com/i/oauth2/authorize?response_type=code` +
    `&client_id=${encodeURIComponent(twitterClientId)}` +
    `&redirect_uri=${encodeURIComponent(twitterRedirectUri)}` +
    `&scope=${scope}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;
  console.log('Twitter OAuth scopes:', twitterOAuthScopes);
  console.log('Twitter OAuth URL:', authUrl);
  await Linking.openURL(authUrl);
}

export async function getTwitterOAuth2AccessToken({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}): Promise<any> {
  const url = 'https://api.twitter.com/2/oauth2/token';
  const data = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: twitterRedirectUri,
    client_id: twitterClientId,
    code_verifier: codeVerifier,
  });

  const basic = Buffer.from(`${twitterClientId}:${twitterClientSecret}`, 'utf8').toString('base64');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: data.toString(),
  });

  return response.json();
}

export async function getTwitterOAuth2UserInfo(accessToken: string): Promise<any> {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.json();
}

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
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`,
      },
      body: data.toString(),
    });
  
    return response.json();
  }
  
export async function  getTwitterUserInfo(
    twitterConsumerKey: string,
    twitterConsumerSecret: string,
    twitterAccessToken: string,
    twitterAccessTokenSecret: string
): Promise<any> {
    if (!twitterConsumerKey || !twitterConsumerSecret || !twitterAccessTokenSecret) {
        return getTwitterOAuth2UserInfo(twitterAccessToken);
    }

    try {
    const oauth = new OAuth({
        consumer: {
            key: twitterConsumerKey,
            secret: twitterConsumerSecret,
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return signSha1Base64(base_string, key);
        }
    });
    console.log("twitterConsumerKey", twitterConsumerKey);
    console.log("twitterConsumerSecret", twitterConsumerSecret);
    console.log("twitterAccessToken", twitterAccessToken);
    console.log("twitterAccessTokenSecret", twitterAccessTokenSecret);
    const request_data = {
        url: "https://api.twitter.com/2/users/me",
        method: "GET"
    };
    console.log("request_data", request_data);
    const authHeader = oauth.toHeader(oauth.authorize(request_data, {
        key: twitterAccessToken,
        secret: twitterAccessTokenSecret,
    }));
    console.log("authHeader", authHeader);

    const response = await fetch(request_data.url, {
        method: request_data.method,
        headers: {
            ...authHeader,
            'Content-Type': 'application/json',
        },
    });
    // return response
    if (response.ok) {
        const jsonResponse = await response.json();
        console.log(JSON.stringify(jsonResponse, null, 4));
        return jsonResponse;
    } else {
        const errorJson = await response.json();
        if (twitterAccessToken) {
          console.log('Twitter OAuth1 profile fetch failed; retrying with OAuth2 bearer token.');
          const oauth2Info = await getTwitterOAuth2UserInfo(twitterAccessToken);
          if (oauth2Info?.data?.id) {
            return oauth2Info;
          }
        }
        return errorJson;
    }
    } catch (error) {
      if (twitterAccessToken) {
        console.log('Twitter OAuth1 profile fetch threw error; retrying with OAuth2 bearer token.');
        return getTwitterOAuth2UserInfo(twitterAccessToken);
      }
      throw error;
    }

}


export async function  postTextToTwitter(
    twitterPayload: string,
    twitterConsumerKey: string,
    twitterConsumerSecret: string,
    twitterAccessToken: string,
    twitterAccessTokenSecret: string
): Promise<any> {
    
const oauth = new OAuth({
    consumer: {
        key: twitterConsumerKey,
        secret: twitterConsumerSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return signSha1Base64(base_string, key);
    }
});

const request_data = {
    url: "https://api.twitter.com/2/tweets",
    method: "POST"
};
console.log("request_data", request_data);
const authHeader = oauth.toHeader(oauth.authorize(request_data, {
    key: twitterAccessToken,
    secret: twitterAccessTokenSecret,
}));
console.log("authHeader", authHeader);

const res = await fetch(request_data.url, {
    method: request_data.method,
    headers: {
        ...authHeader,
        'Content-Type': 'application/json',
    },
  body: JSON.stringify({ text: twitterPayload }),
})
if (res.ok) {
    console.log("Tweet successful!");
    const jsonResponse = await res.json();
    console.log(JSON.stringify(jsonResponse, null, 4));
}
return res;
}


export async function postImageToTwitter(
    twitterPayload: any,
    twitterConsumerKey: string,
    twitterConsumerSecret: string,
    twitterAccessToken: string,
    twitterAccessTokenSecret: string
): Promise<any> {
    const oauth = new OAuth({
        consumer: {
            key: twitterConsumerKey,
            secret: twitterConsumerSecret,
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return signSha1Base64(base_string, key);
        }
    });

console.log('reading image file');
const base64Data = await RNFS.readFile(twitterPayload.image_path, 'base64');  

const files = { media_data: base64Data };     
// console.log("files", files);

const uploadRequest = {
  url:   'https://upload.twitter.com/1.1/media/upload.json',
  method:'POST',
  data:  files                                  
};

const uploadAuthHeader = oauth.toHeader(
  oauth.authorize(uploadRequest, {
    key:    twitterAccessToken,
    secret: twitterAccessTokenSecret
  })
);

// keep let so you can reuse the variable later


let response = await fetch(uploadRequest.url, {
  method: uploadRequest.method,
  headers: {
    ...uploadAuthHeader,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams(files).toString()    // form-encode the base64 data
});

if (!response.ok) {
  console.error('Failed to upload media:', await response.text());
  return;
}

const mediaId = (await response.json()).media_id_string;

console.log('mediaId', mediaId);
    // Step 2: Post a tweet with the uploaded media ID
    const tweetData = {
        text: twitterPayload["description"],
        media: {
            media_ids: [mediaId],
        },
    };

    const tweetRequest = {
        url: "https://api.twitter.com/2/tweets",
        method: "POST"
    };

    const tweetAuthHeader = oauth.toHeader(oauth.authorize(tweetRequest, {
        key: twitterAccessToken,
        secret: twitterAccessTokenSecret,
    }));

    response = await fetch(tweetRequest.url, {
        method: tweetRequest.method,
        headers: {
            ...tweetAuthHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetData),
    });
    console.log("response", response);
    if (response.ok) {
        console.log("Tweet successful!");
        const jsonResponse = await response.json();
        console.log(JSON.stringify(jsonResponse, null, 4));
    }
    else {
        console.error("Failed to tweet:", await response.text());
        return await response.json();
    }
}


export async function postVideoToTwitter(
    twitterPayload: any,
    twitterConsumerKey: string,
    twitterConsumerSecret: string,
    twitterAccessToken: string,
    twitterAccessTokenSecret: string
): Promise<any> {
    const oauth = new OAuth({
        consumer: {
            key: twitterConsumerKey,
            secret: twitterConsumerSecret,
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return signSha1Base64(base_string, key);
        }
    });

    // Step 1: INIT command
    const fileSize = (await RNFS.stat(twitterPayload["video_path"])).size;
    const initData = {
        command: 'INIT',
        media_type: 'video/mp4',
        total_bytes: fileSize.toString(),
    };

    const initRequest = {
        url: "https://upload.twitter.com/1.1/media/upload.json",
        method: "POST",
        data: initData,
    };

    const initAuthHeader = oauth.toHeader(oauth.authorize(initRequest, {
        key: twitterAccessToken,
        secret: twitterAccessTokenSecret,
    }));

    let response = await fetch(initRequest.url, {
        method: initRequest.method,
        headers: {
            ...initAuthHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(initData).toString(),
    });
    console.log("response for init", response);
    if (!response.ok) {
        console.error("Failed to initialize video upload:", await response.text());
        return;
    }

    const mediaId = (await response.json()).media_id_string;
    console.log("mediaId", mediaId);
    // Step 2: APPEND command
    const data = await RNFS.readFile(twitterPayload["video_path"], 'base64');
    // console.log("data", data);
    const appendData = {
        command: 'APPEND',
        media_id: mediaId,
        segment_index: '0',
        media: data
    };

    const appendRequest = {
        url: "https://upload.twitter.com/1.1/media/upload.json",
        method: "POST",
        data: appendData,
    };

    const appendAuthHeader = oauth.toHeader(oauth.authorize(appendRequest, {
        key: twitterAccessToken,
        secret: twitterAccessTokenSecret,
    }));

    response = await fetch(appendRequest.url, {
        method: appendRequest.method,
        headers: {
            ...appendAuthHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(appendData).toString(),
    });
    console.log("response for append", response);
    if (!response.ok) {
        console.error("Failed to upload video:", await response.text());
        return;
    }

    // Step 3: FINALIZE command
    const finalizeData = {
        command: 'FINALIZE',
        media_id: mediaId,
    };

    const finalizeRequest = {
        url: "https://upload.twitter.com/1.1/media/upload.json",
        method: "POST",
        data: finalizeData,
    };

    const finalizeAuthHeader = oauth.toHeader(oauth.authorize(finalizeRequest, {
        key: twitterAccessToken,
        secret: twitterAccessTokenSecret,
    }));

    response = await fetch(finalizeRequest.url, {
        method: finalizeRequest.method,
        headers: {
            ...finalizeAuthHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(finalizeData).toString(),
    });
    console.log("response for finalize", response);
    if (!response.ok) {
        console.error("Failed to finalize video upload:", await response.text());
        return;
    }

    // Optional Step 3.5: STATUS command to check processing status
    let processingInfo: any = (await response.json()).processing_info;
    if (processingInfo) {
        console.log(processingInfo);
        // replace the loop block with this
while (processingInfo && processingInfo.state !== 'succeeded') {
  if (processingInfo.state === 'failed') {
    console.error('Video processing failed.');
    return;
  }

  console.log('Waiting for video processing...');
  await new Promise(res => setTimeout(res, processingInfo.check_after_secs * 1000));

  const statusRequest = {
    url: `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
    method: 'GET',
  };

  const statusAuthHeader = oauth.toHeader(
    oauth.authorize(statusRequest, {
      key: twitterAccessToken,
      secret: twitterAccessTokenSecret,
    }),
  );

 response = await fetch(statusRequest.url, {
  method: statusRequest.method,
  headers: { ...statusAuthHeader },   
});


  processingInfo = (await response.json()).processing_info;
  console.log(processingInfo);
}

    }
    console.log("Video processing succeeded.");
    // Step 4: Post a tweet
    
    const tweetData = {
        text: twitterPayload["description"],
        media: {
            media_ids: [mediaId],
        },
    };
    console.log("tweetData", tweetData);
    const request_data = {
        url: "https://api.twitter.com/2/tweets",
        method: "POST",
    };

    const tweetAuthHeader = oauth.toHeader(oauth.authorize(request_data, {
        key: twitterAccessToken,
        secret: twitterAccessTokenSecret,
    }));

    response = await fetch(request_data.url, {
        method: request_data.method,
        headers: {
            ...tweetAuthHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetData),
    });
    console.log("response for tweet", response);
    if (response.ok) {
        console.log("Tweet successful!");
        const jsonResponse = await response.json();
        console.log(JSON.stringify(jsonResponse, null, 4));
    } else {
        console.error("Failed to tweet:", await response.text());
        return await response.json();
    }
}



