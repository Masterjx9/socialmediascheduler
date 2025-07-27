import { BLUESKY_CLIENT_ID } from '@env';
import { Linking } from 'react-native';
import { Buffer } from 'buffer';
import { sha256 as sha256Lib } from 'js-sha256';

const BSKY_AUTH_SERVER = 'https://socialmediascheduler.pythonicit.com/oauth/client-metadata.json';

let codeVerifier: string | undefined;

const b64url = (u8: Uint8Array) =>
  Buffer.from(u8)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

function randBytes(n: number) {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
  return b;
}

function pkceChallenge() {
  codeVerifier = b64url(randBytes(64));
  const digest = new Uint8Array(sha256Lib.arrayBuffer(Buffer.from(codeVerifier)));
  return b64url(digest);
}

export async function openBlueskyLogin(scope = 'atproto') {
  const meta = await (
    await fetch(`${BSKY_AUTH_SERVER}/.well-known/oauth-authorization-server`)
  ).json();

  const url =
    `${meta.authorization_endpoint}?client_id=${encodeURIComponent(BLUESKY_CLIENT_ID)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(
      'https://masterjx9.github.io/socialmediascheduler/redirect.html',
    )}` +
    `&code_challenge=${pkceChallenge()}` +
    `&code_challenge_method=S256` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${b64url(randBytes(12))}`;

  Linking.openURL(url);
}

export async function getBlueskyAccessToken(opts: {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  refresh_token?: string;
}) {
  const meta = await (
    await fetch(`${BSKY_AUTH_SERVER}/.well-known/oauth-authorization-server`)
  ).json();

  const body =
    opts.grant_type === 'authorization_code'
      ? new URLSearchParams({
          grant_type: 'authorization_code',
          code: opts.code!,
          redirect_uri: 'https://masterjx9.github.io/socialmediascheduler/redirect.html',
          client_id: BLUESKY_CLIENT_ID,
          code_verifier: codeVerifier!,
        })
      : new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: opts.refresh_token!,
          client_id: BLUESKY_CLIENT_ID,
        });

  const res = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return res.json();
}

export async function getBlueskyUserInfo(accessToken: string) {
  const res = await fetch(
    `${BSKY_AUTH_SERVER}/xrpc/com.atproto.server.getSession`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  );
  return res.json();
}
