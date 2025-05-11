// import { OAuth } from 'oauth';
import { faS } from '@fortawesome/free-solid-svg-icons';
import OAuth from 'oauth-1.0a';
import '../../shim.js';
import crypto from 'react-native-crypto'
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';  

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
  
export async function  getTwitterUserInfo(
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
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        }
    });

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
        // console.log("Failed to fetch user info:", await response.text());
        return await response.json();
    }
        // return JSON.stringify(jsonResponse, null, 4);
    // } else {
    //     console.error("Failed to fetch user info:", await response.text());
    //     return response        
    // }

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
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
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

fetch(request_data.url, {
    method: request_data.method,
    headers: {
        ...authHeader,
        'Content-Type': 'application/json',
    },
  body: JSON.stringify({ text: twitterPayload }),
}).then(response => response.json())
  .then(data => {
      console.log("Tweet successful:", data);
  })
  .catch(error => {
      console.error("Failed to tweet:", error);
  })
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
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
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
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
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

    if (!response.ok) {
        console.error("Failed to initialize video upload:", await response.text());
        return;
    }

    const mediaId = (await response.json()).media_id_string;

    // Step 2: APPEND command
    const data = await RNFS.readFile(twitterPayload["video_path"], 'base64');

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
    const tweetRequest = {
        url: "https://api.twitter.com/2/tweets",
        method: "POST",
        data: tweetData,
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

    if (response.ok) {
        console.log("Tweet successful!");
        const jsonResponse = await response.json();
        console.log(JSON.stringify(jsonResponse, null, 4));
    } else {
        console.error("Failed to tweet:", await response.text());
        return await response.json();
    }
}

