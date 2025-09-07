// None of this works and I gave up trying to figure out ATProto or handrolling this annoying there annoying OAuth with PDC or whatever 
// they call it as its clearly not normal OAuth or else this would have been easy.

// import 'react-native-get-random-values';
// import { Linking } from 'react-native';
// import { Buffer } from 'buffer';
// import { sha256 as sha256Lib } from 'js-sha256';
// import { p256 } from '@noble/curves/p256';
// import { randomBytes } from '@noble/hashes/utils';
// import { Agent } from '@atproto/api'
// import { BrowserOAuthClient } from '@atproto/oauth-client-browser'

// // ---------- CONFIG ----------
// /** Bluesky issuer base (aka auth server base) */
// const BSKY_AUTH_SERVER = 'https://bsky.social';
// console.log('[CFG] BSKY_AUTH_SERVER:', BSKY_AUTH_SERVER);

// /** Your client_id MUST be a URL that returns OAuth Client Metadata JSON (EXACT match with JSON's client_id) */
// const BLUESKY_CLIENT_ID =
//   'https://socialmediascheduler.pythonicit.com/client%E2%80%91metadata.json';
// console.log('[CFG] BLUESKY_CLIENT_ID:', BLUESKY_CLIENT_ID);

// /** Must be listed in your client metadata JSON */
// const BLUESKY_REDIRECT =
//   'https://masterjx9.github.io/socialmediascheduler/redirect.html';
// console.log('[CFG] BLUESKY_REDIRECT:', BLUESKY_REDIRECT);

// const BSKY_METADATA_URL = `${BSKY_AUTH_SERVER}/.well-known/oauth-authorization-server`;
// console.log('[CFG] BSKY_METADATA_URL:', BSKY_METADATA_URL);


// export const getBlueskyUserInfo = async () => {
//     const profile = await agent.getProfile({ actor: agent.did })
//     return profile.data
//   }
