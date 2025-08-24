// mobile_version/lib/Apis/bluesky.ts
// Bluesky OAuth for React Native: PAR + PKCE + DPoP (ES256) + getSession + simple post
// No server required. Minimal deps and RN-friendly.
//
// Install once:
//   npm i @noble/curves @noble/hashes react-native-get-random-values
//
// Uses existing deps you already had: buffer, js-sha256

import 'react-native-get-random-values';
import { Linking } from 'react-native';
import { Buffer } from 'buffer';
import { sha256 as sha256Lib } from 'js-sha256';
import { p256 } from '@noble/curves/p256';
import { randomBytes } from '@noble/hashes/utils';

// ---------- CONFIG ----------
/** Bluesky issuer base (aka auth server base) */
const BSKY_AUTH_SERVER = 'https://bsky.social';

/** Your client_id MUST be a URL that returns OAuth Client Metadata JSON */
const BLUESKY_CLIENT_ID =
  'https://socialmediascheduler.pythonicit.com/client%E2%80%91metadata.json';

/** Must be listed in your client metadata JSON */
const BLUESKY_REDIRECT =
  'https://masterjx9.github.io/socialmediascheduler/redirect.html';

const BSKY_METADATA_URL = `${BSKY_AUTH_SERVER}/.well-known/oauth-authorization-server`;

// ---------- STATE ----------
let codeVerifier: string | undefined;

/** Ephemeral DPoP keypair (per app run; persist if you prefer) */
let dpopPrivKey: Uint8Array | null = null;
let dpopPubJwk: DPoPJwk | null = null;

/** Track separate nonces for auth-server and PDS */
let lastAuthzNonce: string | undefined;
let lastPdsNonce: string | undefined;

// ---------- TYPES ----------
type DPoPJwk = {
  kty: 'EC';
  crv: 'P-256';
  x: string; // base64url
  y: string; // base64url
  alg?: 'ES256';
  use?: 'sig';
  kid?: string;
};

export type BlueskyAuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string; // "DPoP"
  scope?: string;
};

// ---------- UTILS ----------
const enc = (s: string) => Uint8Array.from(Buffer.from(s, 'utf-8'));

const b64url = (u8: Uint8Array) =>
  Buffer.from(u8)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const sha256Bytes = (data: string | Uint8Array) => {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  return new Uint8Array(sha256Lib.arrayBuffer(buf));
};

function pkceChallenge(): string {
  codeVerifier = b64url(randomBytes(64));
  const digest = sha256Bytes(codeVerifier);
  return b64url(digest);
}

function jwkFromP256Public(uncompressed: Uint8Array): DPoPJwk {
  // uncompressed = 0x04 || X(32) || Y(32)
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) {
    throw new Error('Invalid uncompressed P-256 public key');
  }
  const x = uncompressed.slice(1, 33);
  const y = uncompressed.slice(33, 65);
  return {
    kty: 'EC',
    crv: 'P-256',
    x: b64url(x),
    y: b64url(y),
    alg: 'ES256',
    use: 'sig',
  };
}

// Convert ECDSA DER -> JOSE (raw r||s 64 bytes)
function derToJose(signatureDER: Uint8Array): Uint8Array {
  let i = 0;
  if (signatureDER[i++] !== 0x30) throw new Error('Bad DER: no sequence');
  /* const seqLen = */ signatureDER[i++];
  if (signatureDER[i++] !== 0x02) throw new Error('Bad DER: no r int');
  let rLen = signatureDER[i++]; let r = signatureDER.slice(i, i + rLen); i += rLen;
  if (signatureDER[i++] !== 0x02) throw new Error('Bad DER: no s int');
  let sLen = signatureDER[i++]; let s = signatureDER.slice(i, i + sLen);

  const pad32 = (v: Uint8Array) => {
    let idx = 0;
    while (idx < v.length - 1 && v[idx] === 0) idx++;
    const stripped = v.slice(idx);
    if (stripped.length > 32) throw new Error('Bad int length');
    if (stripped.length === 32) return stripped;
    const out = new Uint8Array(32);
    out.set(stripped, 32 - stripped.length);
    return out;
  };

  r = pad32(r);
  s = pad32(s);

  const out = new Uint8Array(64);
  out.set(r, 0);
  out.set(s, 32);
  return out;
}

async function ensureDpopKey() {
  if (dpopPrivKey && dpopPubJwk) return;
  dpopPrivKey = p256.utils.randomPrivateKey();
  const pubUncompressed = p256.getPublicKey(dpopPrivKey, false); // 65 bytes (04||X||Y)
  dpopPubJwk = jwkFromP256Public(pubUncompressed);
}

/** Build DPoP JWT for AUTHORIZATION SERVER requests (no ATH) */
async function makeDpopJwtAuthz(htm: string, htu: string, nonce?: string): Promise<string> {
  await ensureDpopKey();
  const header = { alg: 'ES256', typ: 'dpop+jwt', jwk: dpopPubJwk! };
  const payload: any = {
    iat: Math.floor(Date.now() / 1000),
    jti: b64url(randomBytes(16)),
    htm, htu,
  };
  if (nonce) payload.nonce = nonce;

  const encHeader = b64url(enc(JSON.stringify(header)));
  const encPayload = b64url(enc(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;

  const msgHash = sha256Bytes(signingInput);
  const sigDER = p256.sign(msgHash, dpopPrivKey!, { lowS: true }).toDERRawBytes();
  const encSig = b64url(derToJose(sigDER));
  return `${signingInput}.${encSig}`;
}

/** Build DPoP JWT for PDS requests (includes ATH = hash of access token) */
async function makeDpopJwtPds(htm: string, htu: string, accessToken: string, nonce?: string): Promise<string> {
  await ensureDpopKey();
  const header = { alg: 'ES256', typ: 'dpop+jwt', jwk: dpopPubJwk! };
  const payload: any = {
    iat: Math.floor(Date.now() / 1000),
    jti: b64url(randomBytes(16)),
    htm, htu,
    ath: b64url(sha256Bytes(accessToken)),
  };
  if (nonce) payload.nonce = nonce;

  const encHeader = b64url(enc(JSON.stringify(header)));
  const encPayload = b64url(enc(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;

  const msgHash = sha256Bytes(signingInput);
  const sigDER = p256.sign(msgHash, dpopPrivKey!, { lowS: true }).toDERRawBytes();
  const encSig = b64url(derToJose(sigDER));
  return `${signingInput}.${encSig}`;
}

/** fetch to AUTHORIZATION SERVER with DPoP + nonce retry */
async function fetchWithDpopAuthz(url: string, init: RequestInit & { method: string }) {
  const tryOnce = async (nonce?: string) => {
    const dpop = await makeDpopJwtAuthz((init.method || 'GET').toUpperCase(), url, nonce);
    const headers = new Headers(init.headers || {});
    headers.set('DPoP', dpop);
    return fetch(url, { ...init, headers });
  };

  let res = await tryOnce(lastAuthzNonce);
  if (res.status === 401) {
    const nonce = res.headers.get('DPoP-Nonce') || undefined;
    if (nonce) {
      lastAuthzNonce = nonce;
      res = await tryOnce(nonce);
    }
  }
  return res;
}

/** fetch to PDS with Authorization: DPoP <token> + DPoP (ath) + nonce retry */
async function fetchWithDpopPds(url: string, init: RequestInit & { method: string }, accessToken: string) {
  const tryOnce = async (nonce?: string) => {
    const dpop = await makeDpopJwtPds((init.method || 'GET').toUpperCase(), url, accessToken, nonce);
    const headers = new Headers(init.headers || {});
    headers.set('DPoP', dpop);
    headers.set('Authorization', `DPoP ${accessToken}`);
    return fetch(url, { ...init, headers });
  };

  let res = await tryOnce(lastPdsNonce);
  if (res.status === 401) {
    const nonce = res.headers.get('DPoP-Nonce') || undefined;
    if (nonce) {
      lastPdsNonce = nonce;
      res = await tryOnce(nonce);
    }
  }
  return res;
}

// ---------- PUBLIC API ----------

/** Launch the browser auth UI (PAR -> request_uri -> authorize) */
export async function openBlueskyLogin(scope = 'atproto') {
  const meta = (await (await fetch(BSKY_METADATA_URL)).json()) as {
    authorization_endpoint: string;
    pushed_authorization_request_endpoint: string;
  };

  const challenge = pkceChallenge();
  const state = b64url(randomBytes(12));

  const parBody = new URLSearchParams({
    client_id: BLUESKY_CLIENT_ID,
    redirect_uri: BLUESKY_REDIRECT,
    response_type: 'code',
    scope,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  const parRes = await fetch(meta.pushed_authorization_request_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: parBody.toString(),
  });
  console.log('PAR response:', parRes);

  const parJson = (await parRes.json()) as { request_uri?: string; error?: any };
  console.log('PAR response:', parJson);
  if (!parRes.ok || !parJson.request_uri) {
    throw new Error('Bluesky PAR failed: ' + JSON.stringify(parJson));
  }

  const authUrl =
    `${meta.authorization_endpoint}?client_id=${encodeURIComponent(BLUESKY_CLIENT_ID)}` +
    `&request_uri=${encodeURIComponent(parJson.request_uri)}`;
  console.log('Opening auth URL:', authUrl);
  Linking.openURL(authUrl);
}

/** Exchange code -> tokens OR refresh -> tokens. Returns non-optional fields. */
export async function getBlueskyAccessToken(opts: {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  refresh_token?: string;
}): Promise<BlueskyAuthTokens> {
  const meta = (await (await fetch(BSKY_METADATA_URL)).json()) as {
    token_endpoint: string;
  };

  const isAuthCode = opts.grant_type === 'authorization_code';
  if (isAuthCode && !opts.code) throw new Error('code is required for authorization_code grant');
  if (!isAuthCode && !opts.refresh_token) throw new Error('refresh_token is required for refresh_token grant');

  const body = isAuthCode
    ? new URLSearchParams({
        grant_type: 'authorization_code',
        code: opts.code!,
        redirect_uri: BLUESKY_REDIRECT,
        client_id: BLUESKY_CLIENT_ID,
        code_verifier: codeVerifier!,
      })
    : new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: opts.refresh_token!,
        client_id: BLUESKY_CLIENT_ID,
      });

  const res = await fetchWithDpopAuthz(meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json: any = await res.json();
  if (!res.ok) throw new Error('Token exchange failed: ' + JSON.stringify(json));

  // Enforce presence so downstream code (dbService.ts) can rely on them being there.
  if (!json || typeof json.access_token !== 'string') throw new Error('Missing access_token');
  if (typeof json.refresh_token !== 'string') throw new Error('Missing refresh_token');
  if (typeof json.expires_in !== 'number') throw new Error('Missing expires_in');
  if (typeof json.token_type !== 'string') json.token_type = 'DPoP';

  const out: BlueskyAuthTokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
    token_type: json.token_type,
    scope: json.scope,
  };
  return out;
}

/** Get user/session info from the PDS (DID, handle, emailVerified if scope granted, etc.) */
export async function getBlueskyUserInfo(
  accessToken: string,
  pdsBase: string = BSKY_AUTH_SERVER,
): Promise<any> {
  const url = `${pdsBase}/xrpc/com.atproto.server.getSession`;
  const res = await fetchWithDpopPds(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, accessToken);

  const json = await res.json();
  if (!res.ok) throw new Error('getSession failed: ' + JSON.stringify(json));
  return json;
}

/** Post simple text to the user’s repo via PDS (app.bsky.feed.post -> createRecord) */
export async function postTextToBluesky(
  accessToken: string,
  text: string,
  pdsBase: string = BSKY_AUTH_SERVER,
): Promise<any> {
  // 1) Get DID
  const session = await getBlueskyUserInfo(accessToken, pdsBase);
  const did = session?.did;
  if (!did) throw new Error('No DID in session response');

  // 2) Build record
  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    langs: ['en'],
  };

  // 3) Create record
  const url = `${pdsBase}/xrpc/com.atproto.repo.createRecord`;
  const body = { repo: did, collection: 'app.bsky.feed.post', record };

  const res = await fetchWithDpopPds(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }, accessToken);

  const json = await res.json();
  if (!res.ok) throw new Error('createRecord failed: ' + JSON.stringify(json));
  return json;
}
