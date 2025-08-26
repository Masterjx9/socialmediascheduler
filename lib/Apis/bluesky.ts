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
console.log('[CFG] BSKY_AUTH_SERVER:', BSKY_AUTH_SERVER);

/** Your client_id MUST be a URL that returns OAuth Client Metadata JSON (EXACT match with JSON's client_id) */
const BLUESKY_CLIENT_ID =
  'https://socialmediascheduler.pythonicit.com/client%E2%80%91metadata.json';
console.log('[CFG] BLUESKY_CLIENT_ID:', BLUESKY_CLIENT_ID);

/** Must be listed in your client metadata JSON */
const BLUESKY_REDIRECT =
  'https://masterjx9.github.io/socialmediascheduler/redirect.html';
console.log('[CFG] BLUESKY_REDIRECT:', BLUESKY_REDIRECT);

const BSKY_METADATA_URL = `${BSKY_AUTH_SERVER}/.well-known/oauth-authorization-server`;
console.log('[CFG] BSKY_METADATA_URL:', BSKY_METADATA_URL);

// ---------- STATE ----------
/** Track codes to avoid double redemption from duplicate RN deep-link events */
let seenCodes = new Set<string>();
console.log('[STATE] seenCodes initialized');

/** PKCE — MUST be stable across the whole login round trip */
let codeVerifier: string | undefined;
let codeChallenge: string | undefined;
console.log('[STATE] PKCE placeholders created');

/** Avoid re-running open/login setup twice */
let loginInFlight = false;
console.log('[STATE] loginInFlight:', loginInFlight);

/** Optional: track the state value you sent to auth */
let currentState: string | undefined;
console.log('[STATE] currentState initialized');

/** Track the DPoP thumbprint (jkt) that was sent during PAR so we can verify continuity at token time */
let jktAtPar: string | undefined;
console.log('[STATE] jktAtPar initialized');

/** Ephemeral DPoP keypair (per app run; persist if you prefer) */
let dpopPrivKey: Uint8Array | null = null;
let dpopPubJwk: DPoPJwk | null = null;
console.log('[STATE] DPoP key placeholders created');

/** Track separate nonces for auth-server and PDS */
let lastAuthzNonce: string | undefined;
let lastPdsNonce: string | undefined;
console.log('[STATE] lastAuthzNonce, lastPdsNonce initialized');

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
console.log('[TYPE] DPoPJwk defined');

export type BlueskyAuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string; // "DPoP"
  scope?: string;
};
console.log('[TYPE] BlueskyAuthTokens defined');

// ---------- UTILS ----------
const enc = (s: string) => Uint8Array.from(Buffer.from(s, 'utf-8'));
console.log('[UTIL] enc ready');

const b64url = (u8: Uint8Array) =>
  Buffer.from(u8)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
console.log('[UTIL] b64url ready');

const sha256Bytes = (data: string | Uint8Array) => {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  return new Uint8Array(sha256Lib.arrayBuffer(buf));
};
console.log('[UTIL] sha256Bytes ready');

// ---- Verbose debug helpers (keep) ----
function b64urlToUtf8(s: string): string {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  return Buffer.from(t, 'base64').toString('utf-8');
}
console.log('[DBG] b64urlToUtf8 ready');

function inspectJwt(label: string, jwt: string) {
  try {
    const [h, p] = jwt.split('.');
    const hObj = JSON.parse(b64urlToUtf8(h));
    const pObj = JSON.parse(b64urlToUtf8(p));
    console.log(`${label} header:`, hObj);
    console.log(`${label} payload:`, pObj);
  } catch (e) {
    console.log(`${label} decode error:`, e);
  }
}
console.log('[DBG] inspectJwt ready');

function dumpString(label: string, s?: string) {
  if (typeof s !== 'string') {
    console.log(`${label}:`, s);
    return;
  }
  const len = s.length;
  const head = s.slice(0, 64);
  const tail = len > 64 ? s.slice(-32) : '';
  console.log(`${label} (len=${len}) head64='${head}' tail32='${tail}'`);
  const codes = Array.from(s).slice(0, 64).map(c => c.charCodeAt(0));
  console.log(`${label} first64 charCodes:`, codes);
}
console.log('[DBG] dumpString ready');

// PKCE
function makePkcePair(): { verifier: string; challenge: string } {
  console.log('[PKCE] makePkcePair() START');
  const verifier = b64url(randomBytes(64)); // satisfies RFC length and charset
  const challenge = b64url(sha256Bytes(verifier));
  console.log('[PKCE] created verifier len=', verifier.length);
  console.log('[PKCE] created challenge len=', challenge.length);
  return { verifier, challenge };
}
console.log('[PKCE] makePkcePair ready');

function jwkFromP256Public(uncompressed: Uint8Array): DPoPJwk {
  console.log('[DPoP] jwkFromP256Public() START length=', uncompressed.length);
  // uncompressed = 0x04 || X(32) || Y(32)
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) {
    console.log('[DPoP] jwkFromP256Public INVALID KEY');
    throw new Error('Invalid uncompressed P-256 public key');
  }
  const x = uncompressed.slice(1, 33);
  const y = uncompressed.slice(33, 65);
  const jwk: DPoPJwk = {
    kty: 'EC',
    crv: 'P-256',
    x: b64url(x),
    y: b64url(y),
    alg: 'ES256',
    use: 'sig',
  };
  console.log('[DPoP] jwkFromP256Public() OK, x(first8)=', jwk.x.slice(0,8), 'y(first8)=', jwk.y.slice(0,8));
  return jwk;
}
console.log('[DPoP] jwkFromP256Public ready');

// Convert ECDSA DER -> JOSE (raw r||s 64 bytes)
function derToJose(signatureDER: Uint8Array): Uint8Array {
  console.log('[DER] derToJose() START len=', signatureDER.length);
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
  console.log('[DER] derToJose() DONE');
  return out;
}
console.log('[DER] derToJose ready');

async function ensureDpopKey() {
  console.log('[DPoP] ensureDpopKey() START');
  if (dpopPrivKey && dpopPubJwk) {
    console.log('[DPoP] key already present');
    return;
  }
  dpopPrivKey = p256.utils.randomPrivateKey();
  const pubUncompressed = p256.getPublicKey(dpopPrivKey, false); // 65 bytes (04||X||Y)
  dpopPubJwk = jwkFromP256Public(pubUncompressed);
  console.log('[DPoP] New keypair created');
}
console.log('[DPoP] ensureDpopKey ready');

/** RFC7638 thumbprint for EC JWK {crv,kty,x,y} (lexicographic, no spaces) */
function jwkThumbprintB64url(jwk: DPoPJwk): string {
  console.log('[DPoP] jwkThumbprintB64url() START');
  const obj = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
  const json = JSON.stringify(obj); // keys already in lexicographic order as written
  const th = sha256Bytes(json);
  const out = b64url(th);
  console.log('[DPoP] jwk thumbprint (first8)=', out.slice(0,8));
  return out;
}
console.log('[DPoP] jwkThumbprintB64url ready');

/** Build DPoP JWT for AUTHORIZATION SERVER requests (no ATH) */
async function makeDpopJwtAuthz(htm: string, htu: string, nonce?: string): Promise<string> {
  console.log('[DPoP][AUTHZ] makeDpopJwtAuthz START');
  await ensureDpopKey();
  const header = { alg: 'ES256', typ: 'dpop+jwt', jwk: dpopPubJwk! };
  const payload: any = {
    iat: Math.floor(Date.now() / 1000),
    jti: b64url(randomBytes(16)),
    htm, htu,
  };
  if (nonce) payload.nonce = nonce;
  console.log('[DPoP][AUTHZ] payload draft:', payload);

  const encHeader = b64url(enc(JSON.stringify(header)));
  const encPayload = b64url(enc(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;

  const msgHash = sha256Bytes(signingInput);
  const sigDER = p256.sign(msgHash, dpopPrivKey!, { lowS: true }).toDERRawBytes();
  const encSig = b64url(derToJose(sigDER));
  const out = `${signingInput}.${encSig}`;
  console.log('[DPoP][AUTHZ] htm=', htm, 'htu=', htu, 'nonce=', nonce ? '(present)' : '(none)');
  return out;
}
console.log('[DPoP][AUTHZ] makeDpopJwtAuthz ready');

/** Build DPoP JWT for PDS requests (includes ATH = hash of access token) */
async function makeDpopJwtPds(htm: string, htu: string, accessToken: string, nonce?: string): Promise<string> {
  console.log('[DPoP][PDS] makeDpopJwtPds START');
  await ensureDpopKey();
  const header = { alg: 'ES256', typ: 'dpop+jwt', jwk: dpopPubJwk! };
  const payload: any = {
    iat: Math.floor(Date.now() / 1000),
    jti: b64url(randomBytes(16)),
    htm, htu,
    ath: b64url(sha256Bytes(accessToken)),
  };
  if (nonce) payload.nonce = nonce;
  console.log('[DPoP][PDS] payload draft:', payload);

  const encHeader = b64url(enc(JSON.stringify(header)));
  const encPayload = b64url(enc(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;

  const msgHash = sha256Bytes(signingInput);
  const sigDER = p256.sign(msgHash, dpopPrivKey!, { lowS: true }).toDERRawBytes();
  const encSig = b64url(derToJose(sigDER));
  const out = `${signingInput}.${encSig}`;
  console.log('[DPoP][PDS] htm=', htm, 'htu=', htu, 'nonce=', nonce ? '(present)' : '(none)', 'ath=hash(access_token)');
  return out;
}
console.log('[DPoP][PDS] makeDpopJwtPds ready');

/** fetch to AUTHORIZATION SERVER with DPoP + nonce retry (handles 400 use_dpop_nonce) */
async function fetchWithDpopAuthz(url: string, init: RequestInit & { method: string }) {
  console.log('[AUTHZ] fetchWithDpopAuthz() START url=', url, 'method=', init.method);
  const tryOnce = async (nonce?: string) => {
    const dpop = await makeDpopJwtAuthz((init.method || 'GET').toUpperCase(), url, nonce);
    const headers = new Headers(init.headers || {});
    headers.set('DPoP', dpop);
    return fetch(url, { ...init, headers });
  };

  let res = await tryOnce(lastAuthzNonce);
  if (res.ok) return res;

  console.log('[AUTHZ] non-OK:', res.status, res.statusText);
  console.log('[AUTHZ] headers:', res.headers);

  // Check for nonce in headers or WWW-Authenticate even on 400
  let nonce = res.headers.get('DPoP-Nonce') || undefined;
  if (!nonce) {
    const www = res.headers.get('WWW-Authenticate');
    if (www) {
      const m = www.match(/dpop[-_]nonce="?([^",\s]+)"?/i);
      if (m) nonce = m[1];
    }
  }
  if (!nonce) {
    try {
      const clone = res.clone();
      const j = await clone.json();
      console.log('[AUTHZ] body on first try:', j);
      if (j?.error === 'use_dpop_nonce') {
        nonce = res.headers.get('DPoP-Nonce') || undefined;
      }
    } catch (e) {
      console.log('[AUTHZ] failed to read first body:', e);
    }
  }

  if (nonce) {
    console.log('[AUTHZ] Retrying with DPoP-Nonce:', nonce);
    lastAuthzNonce = nonce;
    res = await tryOnce(nonce);
  }
  console.log('[AUTHZ] fetchWithDpopAuthz() DONE status=', res.status);
  return res;
}
console.log('[AUTHZ] fetchWithDpopAuthz ready');

/** fetch to PDS with Authorization: DPoP <token> + DPoP (ath) + nonce retry */
async function fetchWithDpopPds(url: string, init: RequestInit & { method: string }, accessToken: string) {
  console.log('[PDS] fetchWithDpopPds() START url=', url, 'method=', init.method);
  const tryOnce = async (nonce?: string) => {
    const dpop = await makeDpopJwtPds((init.method || 'GET').toUpperCase(), url, accessToken, nonce);
    const headers = new Headers(init.headers || {});
    headers.set('DPoP', dpop);
    headers.set('Authorization', `DPoP ${accessToken}`);
    return fetch(url, { ...init, headers });
  };

  let res = await tryOnce(lastPdsNonce);
  console.log('[PDS] first try status:', res.status, res.statusText);
  if (res.status === 401) {
    const nonce = res.headers.get('DPoP-Nonce') || undefined;
    console.log('[PDS] got 401; nonce header:', nonce);
    if (nonce) {
      lastPdsNonce = nonce;
      res = await tryOnce(nonce);
    }
  }
  console.log('[PDS] fetchWithDpopPds() DONE status=', res.status);
  return res;
}
console.log('[PDS] fetchWithDpopPds ready');

// ---------- PUBLIC API ----------

/** Launch the browser auth UI (PAR -> request_uri -> authorize) */
export async function openBlueskyLogin(scope = 'atproto') {
  console.log('[OPEN] openBlueskyLogin START scope=', scope);
  // Generate PKCE ONCE per login and reuse for token exchange
  if (!codeVerifier || !codeChallenge) {
    const pkce = makePkcePair();
    codeVerifier = pkce.verifier;
    codeChallenge = pkce.challenge;
    loginInFlight = true;
  }
  console.log('[PKCE] verifier(first8)=', codeVerifier!.slice(0, 8));
  console.log('[PKCE] challenge(first8)=', codeChallenge!.slice(0, 8));

  // IMPORTANT: create DPoP key BEFORE PAR and bind it with dpop_jkt
  await ensureDpopKey();
  const jkt = jwkThumbprintB64url(dpopPubJwk!);
  jktAtPar = jkt;
  console.log('[PAR] jkt(first8)=', jkt.slice(0,8));

  const meta = await (await fetch(BSKY_METADATA_URL)).json() as {
    authorization_endpoint: string;
    pushed_authorization_request_endpoint: string;
  };
  console.log('[META] authorization_endpoint:', meta.authorization_endpoint);
  console.log('[META] PAR endpoint:', meta.pushed_authorization_request_endpoint);

  currentState = b64url(randomBytes(12));
  console.log('[STATE] value sent:', currentState);

  const parBody = new URLSearchParams({
    client_id: BLUESKY_CLIENT_ID,
    redirect_uri: BLUESKY_REDIRECT,
    response_type: 'code',
    scope,
    code_challenge: codeChallenge!,     // REUSE the same one later
    code_challenge_method: 'S256',
    state: currentState!,
    // ---- Bind the code to our DPoP public key thumbprint ----
    dpop_jkt: jkt,
  });
  console.log('[PAR] body:', parBody.toString());

  // part 1 of issue: 
  // const parRes = await fetch(meta.pushed_authorization_request_endpoint, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: parBody.toString(),
  // });

  const parRes = await fetchWithDpopAuthz(meta.pushed_authorization_request_endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: parBody.toString(),
});
lastAuthzNonce = parRes.headers.get('DPoP-Nonce') || lastAuthzNonce;
  console.log('[PAR] status:', parRes.status, parRes.headers);

  const parJson = await parRes.json() as { request_uri?: string; error?: any };
  console.log('[PAR] json:', parJson);
  if (!parRes.ok || !parJson.request_uri) {
    throw new Error('Bluesky PAR failed: ' + JSON.stringify(parJson));
  }

  const authUrl =
    `${meta.authorization_endpoint}?client_id=${encodeURIComponent(BLUESKY_CLIENT_ID)}` +
    `&request_uri=${encodeURIComponent(parJson.request_uri)}`;
  console.log('[AUTH] Opening URL:', authUrl);
  Linking.openURL(authUrl);
  console.log('[OPEN] openBlueskyLogin DONE');
}

/** Exchange code -> tokens OR refresh -> tokens. Returns non-optional fields. */
export async function getBlueskyAccessToken(opts: {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  refresh_token?: string;
  issuer?: string; 
}): Promise<BlueskyAuthTokens> {
  console.log('[TOKEN] getBlueskyAccessToken START opts.grant_type=', opts.grant_type);
  // const meta = await (await fetch(BSKY_METADATA_URL)).json() as {
  //   token_endpoint: string;
  // };
  const issuer = (opts.issuer && opts.issuer.trim()) || BSKY_AUTH_SERVER;
  const META_URL = `${issuer}/.well-known/oauth-authorization-server`;
  console.log('[META] resolving from issuer:', issuer, 'META_URL:', META_URL);
  const meta = await (await fetch(META_URL)).json() as { token_endpoint: string };
  console.log('[META] token_endpoint:', meta.token_endpoint);

  // Ensure DPoP is initialized for token DPoP proof
  await ensureDpopKey();
  const jktNow = jwkThumbprintB64url(dpopPubJwk!);
  console.log('[TOKEN] jkt(first8)=', jktNow.slice(0,8));
  if (jktAtPar && jktNow !== jktAtPar) console.log('[TOKEN] WARNING: jkt changed since PAR (this will cause invalid_grant)');

  const isAuthCode = opts.grant_type === 'authorization_code';
  console.log('[TOKEN] isAuthCode:', isAuthCode);
  if (isAuthCode) {
    console.log('[TOKEN] incoming code:', opts.code);
    if (!opts.code || !codeVerifier) {
      console.log('[TOKEN] Missing code or PKCE verifier');
      throw new Error('Missing code or PKCE verifier');
    }

    // Evidence: recompute challenge from stored verifier and log match vs stored challenge
    const recomputed = b64url(sha256Bytes(codeVerifier));
    console.log('[PKCE] recomputed(first8)=', recomputed.slice(0, 8));
    console.log('[PKCE] stored   (first8)=', codeChallenge?.slice(0, 8));
    if (codeChallenge && recomputed !== codeChallenge) {
      console.log('[PKCE] WARNING: verifier->challenge MISMATCH');
    } else {
      console.log('[PKCE] verifier->challenge OK');
    }

    // Block duplicate redeem attempts (helps if RN fires twice)
    if (seenCodes.has(opts.code)) {
      console.log('[TOKEN] DUPLICATE redemption attempt for code:', opts.code);
      throw new Error('Duplicate code redemption attempt');
    }
    seenCodes.add(opts.code);
  } else {
    console.log('[TOKEN] using refresh_token:', !!opts.refresh_token ? '(present)' : '(missing)');
    if (!opts.refresh_token) throw new Error('Missing refresh_token');
  }

  // EXACT AREA YOU CARE ABOUT: body + API CALL + RESPONSE
  const safeDecode = (s: string) => {
    try { return decodeURIComponent(s); } catch { return s; }
  };
  const codeForBody =
    isAuthCode && typeof opts.code === 'string'
      ? safeDecode(opts.code)
      : undefined;

  dumpString('[DBG] code (raw)', opts.code as any);
  dumpString('[DBG] code (decoded)', codeForBody);
  dumpString('[DBG] redirect_uri', BLUESKY_REDIRECT);
  dumpString('[DBG] client_id', BLUESKY_CLIENT_ID);
  dumpString('[DBG] code_verifier', codeVerifier!);

  const form = isAuthCode
    ? new URLSearchParams({
        grant_type: 'authorization_code',
        code: opts.code!,           // raw, not decoded
        redirect_uri: BLUESKY_REDIRECT,
        client_id: BLUESKY_CLIENT_ID,
        code_verifier: codeVerifier!,    // REUSE the original
      })
    : new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: opts.refresh_token!,
        client_id: BLUESKY_CLIENT_ID,
      });

  const body = form.toString();
  console.log('[TOKEN] request body:', body);

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // >>>  THIS IS THE API CALL YOU SAID TO FOCUS ON — NOTHING ELSE   >>>>>>
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  // part 2 of the issue:
  const res = await fetchWithDpopAuthz(meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  console.log('body to see the code since it keeps saying invalid code', body);

  const json: any = await res.json();
  console.log('[TOKEN] response json:', json);
  console.log('[TOKEN] response status:', res.status, res.statusText);
  if (!res.ok) throw new Error('Token exchange failed: ' + JSON.stringify(json));
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  // Enforce presence so downstream code (dbService.ts) can rely on them being there.
  if (!json || typeof json.access_token !== 'string') throw new Error('Missing access_token');
  if (typeof json.refresh_token !== 'string') throw new Error('Missing refresh_token');
  if (typeof json.expires_in !== 'number') throw new Error('Missing expires_in');
  if (typeof json.token_type !== 'string') json.token_type = 'DPoP';

  // Success => clear PKCE for the next login attempt
  console.log('[TOKEN] success; clearing PKCE + login flags');
  codeVerifier = undefined;
  codeChallenge = undefined;
  loginInFlight = false;

  const out: BlueskyAuthTokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
    token_type: json.token_type,
    scope: json.scope,
  };
  console.log('[TOKEN] normalized output:', out);
  console.log('[TOKEN] getBlueskyAccessToken DONE');
  return out;
}

/** Get user/session info from the PDS (DID, handle, emailVerified if scope granted, etc.) */
export async function getBlueskyUserInfo(
  accessToken: string,
  pdsBase: string = BSKY_AUTH_SERVER,
): Promise<any> {
  console.log('[GET SESSION] START accessToken len=', accessToken ? accessToken.length : 0, 'pdsBase=', pdsBase);
  const url = `${pdsBase}/xrpc/com.atproto.server.getSession`;
  console.log('[GET SESSION] url:', url);

  const res = await fetchWithDpopPds(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, accessToken);

  const json = await res.json();
  console.log('[GET SESSION] status:', res.status, res.statusText);
  console.log('[GET SESSION] json:', json);
  if (!res.ok) throw new Error('getSession failed: ' + JSON.stringify(json));
  console.log('[GET SESSION] DONE');
  return json;
}

/** Post simple text to the user’s repo via PDS (app.bsky.feed.post -> createRecord) */
export async function postTextToBluesky(
  accessToken: string,
  text: string,
  pdsBase: string = BSKY_AUTH_SERVER,
): Promise<any> {
  console.log('[POST] postTextToBluesky START text.len=', text.length, 'pdsBase=', pdsBase);
  // 1) Get DID
  const session = await getBlueskyUserInfo(accessToken, pdsBase);
  const did = session?.did;
  console.log('[POST] session.did:', did);
  if (!did) throw new Error('No DID in session response');

  // 2) Build record
  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    langs: ['en'],
  };
  console.log('[POST] record:', record);

  // 3) Create record
  const url = `${pdsBase}/xrpc/com.atproto.repo.createRecord`;
  const body = { repo: did, collection: 'app.bsky.feed.post', record };
  console.log('[POST] URL:', url);
  console.log('[POST] body:', body);

  const res = await fetchWithDpopPds(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }, accessToken);

  const json = await res.json();
  console.log('[POST] status:', res.status, res.statusText);
  console.log('[POST] json:', json);
  if (!res.ok) throw new Error('createRecord failed: ' + JSON.stringify(json));
  console.log('[POST] postTextToBluesky DONE');
  return json;
}
