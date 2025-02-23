const fs = require('fs').promises;

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
  tags: string,
  mediaType: string = 'IMAGE',
  coverUrl?: string,
  thumbOffset?: number,
): Promise<any> {
  const hashtags = tags
    .split(' ')
    .map(tag => `#${tag}`)
    .join(' ');
  const caption = `${description}\n\n${hashtags}`;
  const url = `https://graph.facebook.com/v19.0/${metaId}/media`;

  const payload: any = {
    caption: caption,
    access_token: metaAccessToken,
  };

  if (mediaType === 'IMAGE') {
    payload.image_url = mediaUrl;
  } else if (mediaType === 'REELS' || mediaType === 'VIDEO') {
    payload.media_type = mediaType;
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

  const response = await fetch(url, {
    method: 'POST',
    body: new URLSearchParams(payload).toString(),
  });

  const data = await response.json();
  console.log(data);
  return data.id;
}

export async function publishMedia(
  metaAccessToken: string,
  metaId: string,
  creationId: string,
): Promise<any> {
  const url = `https://graph.facebook.com/v19.0/${metaId}/media_publish`;
  const payload = new URLSearchParams({
    creation_id: creationId,
    access_token: metaAccessToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    body: payload.toString(),
  });

  return response.json();
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

export async function postToIG(
  metaId: string,
  igAccessToken: string,
  baseUrl: string | null = null,
  mediaInfo: {
    image_path?: string;
    video_path?: string;
    description: string;
    tags: string;
  } | null = null,
  metaType: string = 'image',
): Promise<string> {
  if (!mediaInfo) {
    throw new Error('mediaInfo is required');
  }

  let mediaUrl: string;
  if (metaType === 'image' && mediaInfo.image_path) {
    mediaUrl = `${baseUrl}/${mediaInfo.image_path}`;
  } else if (metaType === 'video' && mediaInfo.video_path) {
    mediaUrl = `${baseUrl}/${mediaInfo.video_path}`;
  } else {
    throw new Error('Invalid media type or media path');
  }

  const description = mediaInfo.description;
  const tags = mediaInfo.tags;

  const creationId = await createContainer(
    igAccessToken,
    mediaUrl,
    metaId,
    description,
    tags,
    metaType,
  );
  await publishMedia(igAccessToken, metaId, creationId);

  return 'Pictures posted to IG successfully!';
}

export async function postToThreads(
  metaId: string,
  threadsUserAccessToken: string,
  text: string,
): Promise<any> {
  // Step 1: Create a Threads Media Container with text
  const containerUrl = `https://graph.threads.net/v1.0/${metaId}/threads`;
  const containerPayload = new URLSearchParams({
    media_type: 'TEXT',
    text: text,
    access_token: threadsUserAccessToken,
  });

  const containerResponse = await fetch(containerUrl, {
    method: 'POST',
    body: containerPayload.toString(),
  });

  const containerData = await containerResponse.json();
  if (containerData.error) {
    console.error('Error in creating container:', containerData);
    return containerData; // Return early if there's an error
  }
  const creationId = containerData.id;

  // Step 2: Publish the Threads Media Container
  const publishUrl = `https://graph.threads.net/v1.0/${metaId}/threads_publish`;
  const publishPayload = new URLSearchParams({
    creation_id: creationId,
    access_token: threadsUserAccessToken,
  });

  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    body: publishPayload.toString(),
  });

  const publishData = await publishResponse.json();
  if (publishData.error) {
    console.error('Error in publishing container:', publishData);
  }

  return publishData;
}
