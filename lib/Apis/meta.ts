import RNFS from 'react-native-fs';
import { THREADS_CLIENT_ID, THREADS_CLIENT_SECRET,
  INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET } from '@env';
import { Linking } from 'react-native';
import { NativeModules } from 'react-native';


// This is Instagram's client ID for your app
// Replace with your actual client ID
// for now this is using the development client ID
// from meetup. Any use of this client ID will be rate limited
export const instagramClientId = INSTAGRAM_CLIENT_ID;

// This is the redirect URI you set in your Instagrams app settings
// Replace with your actual redirect URI
// for now this is using the development redirect URI
// from meetup. Any use of this redirect URI will be rate limited 
const instagramRedirectUri = 'https://masterjx9.github.io/socialmediascheduler/redirect.html';


// This is the client secret for your Instagrams app
// Replace with your actual client secret
// for now this is using the development client secret
// from meetup. Any use of this client secret will be rate limited
export const instagramClientSecret = INSTAGRAM_CLIENT_SECRET;




// This is Thread's client ID for your app
// Replace with your actual client ID
// for now this is using the development client ID
// from meetup. Any use of this client ID will be rate limited
export const threadsClientId = THREADS_CLIENT_ID;

// This is the redirect URI you set in your Threads app settings
// Replace with your actual redirect URI
// for now this is using the development redirect URI
// from meetup. Any use of this redirect URI will be rate limited 
const threadsRedirectUri = 'https://masterjx9.github.io/socialmediascheduler/redirect.html';


// This is the client secret for your Threads app
// Replace with your actual client secret
// for now this is using the development client secret
// from meetup. Any use of this client secret will be rate limited
export const threadsClientSecret = THREADS_CLIENT_SECRET;

export async function openInstagramLogin() {
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${instagramClientId}&redirect_uri=${encodeURIComponent(instagramRedirectUri)}&scope=instagram_business_basic,instagram_business_content_publish&response_type=code`;
  console.log('authUrl', authUrl);
  Linking.openURL(authUrl);
}

export async function getInstagramUserInfo(accessToken: string): Promise<any> {
  const url = `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.json();
}

export async function getInstagramAccessToken({
  grant_type,
  code,
  access_token,
}: {
  grant_type: 'authorization_code' | 'ig_refresh_token' | 'ig_exchange_token';
  code?: string;
  access_token?: string;
}): Promise<any> {
  if (grant_type === 'authorization_code') {
    console.log('grant_type', grant_type);
    console.log('code', code);
    console.log('access_token', access_token);
    const url = 'https://api.instagram.com/oauth/access_token';
    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: instagramRedirectUri,
      client_id: instagramClientId,
      client_secret: instagramClientSecret,
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

  if (grant_type === 'ig_refresh_token') {
    const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${access_token}`;
    const refreshRes = await fetch(refreshUrl);
    return refreshRes.json();
  }
  if (grant_type === 'ig_exchange_token') {
    const exchangeUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramClientSecret}&access_token=${access_token}`;
    const exchangeRes = await fetch(exchangeUrl);
    return exchangeRes.json();
  }

  throw new Error('Invalid grant_type');
}

export async function openThreadsLogin() {
  const authUrl = `https://threads.net/oauth/authorize?client_id=${threadsClientId}&redirect_uri=${encodeURIComponent(threadsRedirectUri)}&scope=threads_basic,threads_content_publish&response_type=code`;
  console.log('authUrl', authUrl);
  Linking.openURL(authUrl);
}

export async function getThreadsUserInfo(accessToken: string): Promise<any> {
  const url = `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.json();
}


export async function getThreadsAccessToken({
  grant_type,
  code,
  access_token,
}: {
  grant_type: 'authorization_code' | 'th_refresh_token';
  code?: string;
  access_token?: string;
}): Promise<any> {
  if (grant_type === 'authorization_code') {
    const url = 'https://graph.threads.net/oauth/access_token';
    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: threadsRedirectUri,
      client_id: threadsClientId,
      client_secret: threadsClientSecret,
    });

    const shortTokenRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });

    const shortTokenJson = await shortTokenRes.json();
    const shortAccessToken = shortTokenJson.access_token;

    if (!shortAccessToken) {
      return shortTokenJson;
    }

    // Exchange short-lived for long-lived
    const longTokenRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${threadsClientSecret}&access_token=${shortAccessToken}`
    );

    return longTokenRes.json();
  }

  if (grant_type === 'th_refresh_token') {
    const refreshUrl = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${access_token}`;
    const refreshRes = await fetch(refreshUrl);
    return refreshRes.json();
  }

  throw new Error('Invalid grant_type');
}




export async function getAccessToken(
  code: string,
  appId: string,
  appSecret: string,
): Promise<any> {
  const url = 'https://graph.facebook.com/v19.0/oauth/access_token"';
  const data = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'http://localhost:8080/callback',
    client_id: appId,
    client_secret: appSecret,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: data.toString(),
  });

  return response.json();
}

export async function createContainer(
  metaAccessToken: string,
  mediaUrl: string,
  metaId: string,
  description: string,
  mediaType: string = 'IMAGE',
  tags?: string,
  coverUrl?: string,
  thumbOffset?: number,
): Promise<any> {
  console.log('metaAccessToken', metaAccessToken);
  console.log('mediaUrl', mediaUrl);
  console.log('metaId', metaId);
  console.log('description', description);
  console.log('mediaType', mediaType);
  let hashtags = '';
  let caption = '';
  if (tags) {
  hashtags = tags
    .split(' ')
    .map(tag => `#${tag}`)
    .join(' ');
    caption = `${description}\n\n${hashtags}`;
  } else {
    caption = description;
  }
  const url = `https://graph.instagram.com/v19.0/${metaId}/media`;

  const payload: any = {
    caption: caption,
    // access_token: metaAccessToken,
  };

  if (mediaType === 'IMAGE') {
    payload.image_url = mediaUrl;
  } else if (mediaType === 'REELS' || mediaType === 'VIDEO') {
    payload.media_type = 'REELS';
    payload.video_url = mediaUrl;
    if (coverUrl) {
      payload.cover_url = coverUrl;
    }
    if (thumbOffset) {
      payload.thumb_offset = thumbOffset;
    }
  } else if (mediaType === 'STORIES') {
    payload.media_type = 'STORIES';
    if (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.mov')) {
      payload.video_url = mediaUrl;
    } else if (
      mediaUrl.endsWith('.jpg') ||
      mediaUrl.endsWith('.jpeg') ||
      mediaUrl.endsWith('.png')
    ) {
      payload.image_url = mediaUrl;
    }
  }
  console.log('payload', payload);
  const response = await fetch(url, {
    method: 'POST',
    headers:{
      Authorization: `Bearer ${metaAccessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(payload).toString(),
  });

  const data = await response.json();
  console.log(data);
  // return data.id;
  return data
}

export async function publishMedia(
  metaAccessToken: string,
  metaId: string,
  creationId: string,
): Promise<any> {
  console.log("metaAccessToken", metaAccessToken);
  console.log("metaId", metaId);
  console.log("creationId", creationId);
  let status = 'IN_PROGRESS';
while (status === 'IN_PROGRESS') {
  const statusRes = await fetch(
    `https://graph.instagram.com/v19.0/${creationId}?fields=status_code&access_token=${metaAccessToken}`
  );
  const statusJson = await statusRes.json();
  console.log('statusJson', statusJson);
  status = statusJson.status_code;
  console.log('status', status);
  if (status === 'FINISHED') break;
  if (status === 'ERROR' || status === 'EXPIRED') {
    console.error('Container processing failed:', status);
    return statusJson;
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));
}
  const url = `https://graph.instagram.com/v19.0/${metaId}/media_publish?creation_id=${creationId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${metaAccessToken}`,
    },
  });

  return response.json();
}


export async function postToThreads(
  threadsUserAccessToken: string,
  text: string
): Promise<any> {
  const containerUrl = `https://graph.threads.net/v1.0/me/threads?media_type=TEXT&text=${encodeURIComponent(
    text
  )}&access_token=${threadsUserAccessToken}`;

  const containerResponse = await fetch(containerUrl, { method: 'POST' });
  const containerData = await containerResponse.json();

  if (containerData.error) {
    console.error('Error in creating container:', containerData);
    return containerData;
  }

  const creationId = containerData.id;

  let status = 'IN_PROGRESS';
  for (let i = 0; i < 6; i++) {
    const statusRes = await fetch(
      `https://graph.threads.net/v1.0/${creationId}?fields=status_code&access_token=${threadsUserAccessToken}`
    );
    const statusJson = await statusRes.json();
    status = statusJson.status_code;

    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') {
      console.error('Container processing failed:', status);
      return statusJson;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000)); 
  }

  const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?creation_id=${creationId}&access_token=${threadsUserAccessToken}`;
  const publishResponse = await fetch(publishUrl, { method: 'POST' });
  const publishData = await publishResponse.json();

  if (publishData.error) {
    console.error('Error in publishing container:', publishData);
  }

  return publishData;
}

export async function postImageOrVideoToThreads(
  threadsUserAccessToken: string,
  mediaType: 'IMAGE' | 'VIDEO',
  mediaUrl: string,
  text: string = ''
): Promise<any> {
  const encodedUrlParam = mediaType === 'IMAGE' 
    ? `image_url=${encodeURIComponent(mediaUrl)}`
    : `video_url=${encodeURIComponent(mediaUrl)}`;

  const containerUrl = `https://graph.threads.net/v1.0/me/threads?media_type=${mediaType}&${encodedUrlParam}&text=${encodeURIComponent(text)}&access_token=${threadsUserAccessToken}`;

  const containerResponse = await fetch(containerUrl, { method: 'POST' });
  const containerData = await containerResponse.json();
  console.log('containerData', containerData);
  if (containerData.error) {
    console.error('Error in creating media container:', containerData);
    return containerData;
  }

  const creationId = containerData.id;
  let status = 'IN_PROGRESS';

  for (let i = 0; i < 6; i++) {
    const statusRes = await fetch(
      `https://graph.threads.net/v1.0/${creationId}?fields=id,status,error_message&access_token=${threadsUserAccessToken}`
    );
    const statusJson = await statusRes.json();
    console.log('statusJson', statusJson);
    status = statusJson.status;
    console.log('status', status);
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') {
      console.error('Container processing failed:', status);
      return statusJson;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.log('Meta has finished processing the media:', status);

  const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish?creation_id=${creationId}&access_token=${threadsUserAccessToken}`;
  console.log('publishUrl', publishUrl);
  const publishResponse = await fetch(publishUrl, { method: 'POST' });
  const publishData = await publishResponse.json();

  if (publishData.error) {
    console.error('Error in publishing media to Threads:', publishData);
  }

  return publishData;
}


export async function publishThreadsMedia(
  metaAccessToken: string,
  metaId: string,
  creationId: string,
): Promise<any> {
  const url = `https://graph.facebook.com/v19.0/${metaId}/threads_publish`;
  const payload = new URLSearchParams({
    creation_id: creationId,
    access_token: metaAccessToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    body: payload.toString(),
  });

  const data = await response.json();
  console.log(data);
  return data;
}

// export async function postToIG(
//   metaId: string,
//   igAccessToken: string,
//   baseUrl: string | null = null,
//   mediaInfo: {
//     image_path?: string;
//     video_path?: string;
//     description: string;
//     tags: string;
//   } | null = null,
//   metaType: string = 'image',
// ): Promise<string> {
//   if (!mediaInfo) {
//     throw new Error('mediaInfo is required');
//   }

//   let mediaUrl: string;
//   if (metaType === 'image' && mediaInfo.image_path) {
//     mediaUrl = `${baseUrl}/${mediaInfo.image_path}`;
//   } else if (metaType === 'video' && mediaInfo.video_path) {
//     mediaUrl = `${baseUrl}/${mediaInfo.video_path}`;
//   } else {
//     throw new Error('Invalid media type or media path');
//   }

//   const description = mediaInfo.description;
//   const tags = mediaInfo.tags;

//   const creationId = await createContainer(
//     igAccessToken,
//     mediaUrl,
//     metaId,
//     description,
//     tags,
//     metaType,
//   );
//   await publishMedia(igAccessToken, metaId, creationId);

//   return 'Pictures posted to IG successfully!';
// }




// export async function uploadContentTo0x0(
//   filePath: string,
//   fileName: string
// ): Promise<{ url: string, token: string }> {
//   try {
//   const url = 'https://0x0.st/';
//   console.log('Uploading to 0x0:', filePath, fileName);
//   console.log('url:', url);

//   // Read the file content properly
//   let uploadUri = filePath;
  
//   // If it's a content:// URI, copy it to a temp path
//   if (filePath.startsWith('content://')) {
//     const tempPath = `${RNFS.TemporaryDirectoryPath}/${fileName}`;
//     console.log('Copying content URI to temp file:', tempPath);
//     await RNFS.copyFile(filePath, tempPath);
//     uploadUri = 'file://' + tempPath; // IMPORTANT: fetch FormData needs file://
//   }

//   const formData = new FormData();
//   formData.append('file', {
//     uri: uploadUri,
//     name: fileName,
//     type: 'application/octet-stream',
//   } as any);
//   formData.append('secret', '');

//   console.log('formData ready');

//     const response = await fetch(url, {
//       method: 'POST',
//       body: formData,
//       headers: {
//         'Content-Type': 'multipart/form-data',
//         'User-Agent': 'curl/7.79.1',
//       },
//     });

//     console.log('fetch completed');

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Fetch failed with HTTP error:', response.status, errorText);
//       throw new Error(`HTTP ${response.status}: ${errorText}`);
//     }

//     console.log('response:', response);

//     const urlText = await response.text();
//     console.log('urlText:', urlText);

//     const token = response.headers.get('X-Token') || '';
//     console.log('token:', token);

//     return { url: urlText.trim(), token };
//   } catch (error) {
//     console.error('Error during uploadContentTo0x0:', error);
//     throw error;
//   }
// }


// export async function deleteContentFrom0x0(uploadResponse: { url: string, token: string }): Promise<any> {
//   try {
//     console.log('Deleting content from 0x0:', uploadResponse.url);

//     const formData = new FormData();
//     formData.append('token', uploadResponse.token);
//     formData.append('delete', '');

//     const response = await fetch(uploadResponse.url, {
//       method: 'POST',
//       body: formData,
//       headers: {
//         'User-Agent': 'curl/7.79.1', // Same trick to avoid 403
//       },
//     });

//     console.log('Delete fetch completed');

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Delete failed with HTTP error:', response.status, errorText);
//       throw new Error(`HTTP ${response.status}: ${errorText}`);
//     }

//     const resultText = await response.text();
//     console.log('Delete result text:', resultText);

//     return { success: true, result: resultText.trim() };
//   } catch (error) {
//     console.error('Error during deleteContentFrom0x0:', error);
//     return { success: false, error: error };
//   }
// }

export async function uploadContentToTmpFiles(
  filePath: string,
  fileName: string
): Promise<{ url: string, real_url: string }> {
  try {
    console.log('Uploading to tmpfiles.org:', filePath, fileName);

    let uploadUri = filePath;

    if (filePath.startsWith('content://')) {
      const tempPath = `${RNFS.TemporaryDirectoryPath}/${fileName}`;
      console.log('Copying content URI to temp file:', tempPath);
      await RNFS.copyFile(filePath, tempPath);
      uploadUri = 'file://' + tempPath;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: uploadUri,
      name: fileName,
      type: 'application/octet-stream',
    } as any);

    console.log('formData ready');

    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('fetch completed');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fetch failed with HTTP error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('upload response:', data);

    const realUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

    return { url: data.data.url, real_url: realUrl };
  } catch (error) {
    console.error('Error during uploadContentToTmpFiles:', error);
    throw error;
  }
}
