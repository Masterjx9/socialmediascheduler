import { Linking } from 'react-native';
import { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } from '@env';
import RNFS from '../Compat/RNFS';
import { Buffer } from 'buffer';  
// This is linkedIn's client ID for your app
// Replace with your actual client ID
// for now this is using the development client ID
// from meetup. Any use of this client ID will be rate limited
export const clientId = LINKEDIN_CLIENT_ID;

// This is the redirect URI you set in your LinkedIn app settings
// Replace with your actual redirect URI
// for now this is using the development redirect URI
// from meetup. Any use of this redirect URI will be rate limited 
const redirectUri = 'https://socialmediascheduler.pythonicit.com/redirect.html';

// This is the client secret for your LinkedIn app
// Replace with your actual client secret
// for now this is using the development client secret
// from meetup. Any use of this client secret will be rate limited
export const clientSecret = LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REST_VERSION = '202504';

export type LinkedInActorType = 'person' | 'organization';

export interface LinkedInActorOption {
  id: string;
  urn: string;
  name: string;
  type: LinkedInActorType;
}

export const normalizeLinkedInActorUrn = (
  subIdOrUrn: string | undefined | null,
  defaultType: LinkedInActorType = 'person',
): string | null => {
  const value = String(subIdOrUrn ?? '').trim();
  if (!value) {
    return null;
  }
  if (value.startsWith('urn:li:')) {
    return value;
  }
  return `urn:li:${defaultType}:${value}`;
};

export const linkedInActorIdFromUrn = (urnOrId: string): string => {
  const value = String(urnOrId ?? '').trim();
  if (!value) {
    return '';
  }
  if (!value.startsWith('urn:li:')) {
    return value;
  }
  const parts = value.split(':');
  return parts[parts.length - 1] ?? value;
};

export function openLinkedInLogin(state?: string) {
  const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20r_organization_admin%20w_organization_social${stateParam}`;
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

export async function getLinkedInOrganizationActors(
  accessToken: string,
): Promise<LinkedInActorOption[]> {
  const resolveOrganizationName = (organizationData: any, fallback: string): string => {
    const localizedName = String(organizationData?.localizedName ?? '').trim();
    if (localizedName) {
      return localizedName;
    }

    const preferredLocale = organizationData?.name?.preferredLocale;
    const localizedMap = organizationData?.name?.localized;
    if (preferredLocale?.language && preferredLocale?.country && localizedMap) {
      const localeKey = `${preferredLocale.language}_${preferredLocale.country}`;
      const byPreferred = String(localizedMap?.[localeKey] ?? '').trim();
      if (byPreferred) {
        return byPreferred;
      }
    }

    if (localizedMap && typeof localizedMap === 'object') {
      const firstLocalized = Object.values(localizedMap)
        .map((value) => String(value ?? '').trim())
        .find((value) => value.length > 0);
      if (firstLocalized) {
        return firstLocalized;
      }
    }

    const vanityName = String(organizationData?.vanityName ?? '').trim();
    if (vanityName) {
      return vanityName;
    }

    return fallback;
  };

  const fetchOrganizationDetails = async (organizationId: string): Promise<any | null> => {
    const lookupUrl = `https://api.linkedin.com/rest/organizations/${encodeURIComponent(
      organizationId,
    )}`;
    const response = await fetch(lookupUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_REST_VERSION,
      },
    });

    const payload = await response.json();
    if (!response.ok) {
      console.log(`LinkedIn organization lookup failed for ${organizationId}:`, payload);
      return null;
    }
    return payload;
  };

  const params = new URLSearchParams({
    q: 'roleAssignee',
    role: 'ADMINISTRATOR',
    state: 'APPROVED',
  });
  const url = `https://api.linkedin.com/rest/organizationAcls?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_REST_VERSION,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    console.log('LinkedIn organizationAcls request failed:', payload);
    return [];
  }

  const elements = Array.isArray(payload?.elements) ? payload.elements : [];
  const uniqueUrns = Array.from(
    new Set(
      elements
        .map((element: any) => String(element?.organization ?? '').trim())
        .filter((urn) => urn.length > 0),
    ),
  );

  const options = await Promise.all(
    uniqueUrns.map(async (organizationUrn) => {
      const normalizedUrn =
        normalizeLinkedInActorUrn(linkedInActorIdFromUrn(organizationUrn), 'organization') ??
        organizationUrn;
      const organizationId = linkedInActorIdFromUrn(normalizedUrn);
      if (!organizationId) {
        return null;
      }

      const organizationData = await fetchOrganizationDetails(organizationId);
      const name = resolveOrganizationName(organizationData, normalizedUrn);

      return {
        id: organizationId,
        urn: normalizedUrn,
        name,
        type: 'organization' as const,
      };
    }),
  );

  return options.filter((option): option is LinkedInActorOption => option !== null);
}

export async function getLinkedInActorOptions(
  accessToken: string,
): Promise<{ options: LinkedInActorOption[]; userInfo: any }> {
  const userInfo = await getLinkedInUserInfo(accessToken);
  const options: LinkedInActorOption[] = [];

  const personId = String(userInfo?.sub ?? '').trim();
  if (personId) {
    const personUrn = normalizeLinkedInActorUrn(personId, 'person') as string;
    options.push({
      id: personId,
      urn: personUrn,
      name: String(userInfo?.name ?? userInfo?.localizedFirstName ?? 'My LinkedIn Profile'),
      type: 'person',
    });
  }

  const organizationOptions = await getLinkedInOrganizationActors(accessToken);
  organizationOptions.forEach((option) => {
    if (!options.some((existing) => existing.urn === option.urn)) {
      options.push(option);
    }
  });

  return { options, userInfo };
}

async function initializeUpload(
  accessToken: string,
  mediaType: string,
  ownerUrn: string,
  fileSize?: number,
  wantThumbnail: boolean = false,
): Promise<any> {
  const url = `https://api.linkedin.com/rest/${mediaType}s?action=initializeUpload`;
  const postHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': LINKEDIN_REST_VERSION,
    'Content-Type': 'application/json',
  };
  const postBody: any = {
    initializeUploadRequest: {
      owner: ownerUrn,
    },
  };
  if (mediaType === 'video') {
    postBody.initializeUploadRequest.fileSizeBytes = fileSize;
    postBody.initializeUploadRequest.uploadCaptions = false;
    postBody.initializeUploadRequest.uploadThumbnail = wantThumbnail;
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
  console.log('Uploading video parts...');
  console.log('filePath', filePath);
  console.log('chunkSize', chunkSize);
  try {
    console.log('uploadInstructions', uploadInstructions);
    for (const instruction of uploadInstructions) {
      console.log('instruction', instruction);
      const uploadUrl = instruction.uploadUrl;
      const firstByte = instruction.firstByte;
      const lastByte = instruction.lastByte;
      const length = lastByte - firstByte + 1;
      console.log('length', length);
      console.log('firstByte', firstByte);
      console.log('lastByte', lastByte);
      
      const base64Chunk = await RNFS.read(filePath, length, firstByte, 'base64');
      const buffer      = Buffer.from(base64Chunk, 'base64');

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      });
      console.log('response', response);
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to upload chunk: ${await response.text()}`);
      }
      console.log('response headers', response.headers);
      console.log('response status', response.status);
      uploadedPartIds.push(response.headers.get('etag') || '');
      console.log(`Uploaded bytes ${firstByte}-${lastByte}`);
    }
  } catch (error) {
    console.error('Error uploading video parts:', error);
    throw error;
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
    'LinkedIn-Version': '202504',
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
  authorIdOrUrn?: string,
) {
  let authorUrn = normalizeLinkedInActorUrn(authorIdOrUrn, 'person');
  if (!authorUrn) {
    const userInfo = await getLinkedInUserInfo(accessToken);
    authorUrn = normalizeLinkedInActorUrn(userInfo?.sub, 'person');
  }
  if (!authorUrn) {
    throw new Error('LinkedIn author urn is missing.');
  }

  let mediaUrn: string = '';
  let mediaTitle: string = '';
  let postBody: any;
  if (mediaType === 'video') {
    const fileStats = await RNFS.stat(mediaUrl[`${mediaType}_path`]);
    const fileSize = Number(fileStats.size);


    const videoData = await initializeUpload(
      accessToken,
      mediaType,
      authorUrn,
      fileSize,
      mediaUrl.thumbnail_path ? true : false,
    );
    const uploadInstructions = videoData.uploadInstructions;
    const videoUrn = videoData[mediaType];

    console.log('videoData', videoData);
    console.log('mediaUrl', mediaUrl);
    if (videoData.thumbnailUploadUrl && mediaUrl.thumbnail_path) {
  const thumbnailData = await RNFS.readFile(mediaUrl.thumbnail_path, 'base64');
  const thumbnailBuffer = Buffer.from(thumbnailData, 'base64');

  const thumbnailUploadRes = await fetch(videoData.thumbnailUploadUrl, {
      method: 'PUT',
      headers: {
        'media-type-family': 'STILLIMAGE',
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(thumbnailBuffer.length),
      },
      body: thumbnailBuffer,
    });

    if (thumbnailUploadRes.status !== 201) {
      throw new Error(`Thumbnail upload failed → ${await thumbnailUploadRes.text()}`);
    }

    console.log('✅ Thumbnail uploaded successfully');
  }

    const uploadedPartIds = await uploadVideoParts(
      uploadInstructions,
      mediaUrl.video_path,
    );
    await finalizeVideoUpload(accessToken, videoUrn, uploadedPartIds);

    mediaUrn = videoUrn;
    mediaTitle = 'Video Post';
  }
  if (mediaType === 'image') {
    const imageData = await initializeUpload(accessToken, mediaType, authorUrn);
    console.log(imageData);
    const uploadUrl = imageData.uploadUrl;
    mediaUrn = imageData.image;

    const putHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };
    console.log("attempting to read the file");
    console.log(mediaUrl[`${mediaType}_path`]);
    const base64Data   = await RNFS.readFile(mediaUrl[`${mediaType}_path`], 'base64');
    const binaryBuffer = Buffer.from(base64Data, 'base64'); 

    console.log("file read");
    console.log("binaryBuffer",binaryBuffer);

    console.log("attempting to upload the file");
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,         
        'Content-Type':  'application/octet-stream',
        'Content-Length': String(binaryBuffer.length)
      },
      body: binaryBuffer                               
    });
    console.log("file uploaded");
    if (uploadResponse.status !== 200 && uploadResponse.status !== 201) {
      throw new Error(`Image upload failed: ${await uploadResponse.text()}`);
    }
    mediaTitle = 'Image Post';
  }

  const postHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': LINKEDIN_REST_VERSION,
    'Content-Type': 'application/json',
  };
  postBody = {
    author: authorUrn,
    commentary: mediaUrl['description'],
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
  };
  console.log("mediaUrn",mediaUrn);
  if (mediaType === 'video' || mediaType === 'image') {
    if (mediaTitle) {
      postBody['content'] = {
        media: {
          title: mediaTitle,
          id: mediaUrn,
        },
      };
    }
  }

  console.log("postbody",postBody);
  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: postHeaders,
    body: JSON.stringify(postBody),
  });
  console.log(response.statusText);
  console.log(response.status);
  console.log("response headers",response.headers);
  console.log(await response.text());
}



