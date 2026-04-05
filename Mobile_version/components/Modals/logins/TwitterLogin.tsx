import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import Modal from '../../../lib/Compat/Modal';
import {
  openTwitterLogin,
  createTwitterCodeVerifier,
  createTwitterCodeChallenge,
  getTwitterOAuth2AccessToken,
  getTwitterOAuth2UserInfo,
  twitterClientId,
  twitterClientSecret,
} from '../../../lib/Apis/twitter';
import { insertProviderIdIntoDb, insertTwitterAccountIntoDb, fetchSocialMediaAccounts } from '../../../lib/Services/dbService';
import SQLite from '../../../lib/Compat/SQLite';

interface TwitterLoginProps {
  isVisible: boolean;
  onClose: () => void;
  setAccounts?: React.Dispatch<React.SetStateAction<any[]>>;
  setIsCalendarVisible?: React.Dispatch<React.SetStateAction<boolean>>;
}

const extractOAuthCode = (url: string): string | null => {
  const match = url.match(/[?&]code=([^&#]+)/);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]).replace(/#_$/, '');
};

const extractOAuthState = (url: string): string | null => {
  const match = url.match(/[?&]state=([^&#]+)/);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]).replace(/#_$/, '');
};

const buildOAuthState = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const showLoginAlert = (title: string, message: string) => {
  const safeMessage = String(message || 'Unknown error');
  console.log(`[${title}] ${safeMessage}`);
  if (Platform.OS !== 'windows') {
    Alert.alert(title, safeMessage);
  }
};

const TwitterLogin: React.FC<TwitterLoginProps> = ({
  isVisible,
  onClose,
  setAccounts,
  setIsCalendarVisible,
}) => {
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const expectedStateRef = useRef<string>('');
  const codeVerifierRef = useRef<string>('');
  const handledRef = useRef<boolean>(false);
  const lastCodeRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const closeModal = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsLoading(false);
    setStatusText('');
    onClose();
  };

  const handleValidate = async () => {
    try {
      setIsLoading(true);
      setStatusText('Opening X login in browser...');
      handledRef.current = false;

      const expectedState = buildOAuthState();
      const codeVerifier = createTwitterCodeVerifier();
      const codeChallenge = createTwitterCodeChallenge(codeVerifier);
      expectedStateRef.current = expectedState;
      codeVerifierRef.current = codeVerifier;

      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      const handleDeepLink = async (event: { url: string }) => {
        console.log('Twitter callback URL:', event.url);
        const code = extractOAuthCode(event.url);
        const state = extractOAuthState(event.url);
        if (!code) {
          return;
        }

        try {
          if (handledRef.current) {
            console.log('Ignoring duplicate Twitter callback event.');
            return;
          }
          if (code === lastCodeRef.current) {
            console.log('Ignoring replayed Twitter callback code.');
            return;
          }
          if (state && state !== expectedStateRef.current) {
            console.log('Ignoring Twitter callback with mismatched OAuth state.');
            return;
          }
          if (!state) {
            console.log('Twitter callback missing OAuth state; continuing without state validation.');
          }

          handledRef.current = true;
          lastCodeRef.current = code;
          subscriptionRef.current?.remove();
          subscriptionRef.current = null;
          setStatusText('Exchanging OAuth code...');

          const tokenResponse = await getTwitterOAuth2AccessToken({
            code,
            codeVerifier: codeVerifierRef.current,
          });
          console.log('Twitter OAuth2 token response:', tokenResponse);
          if (!tokenResponse?.access_token) {
            const message =
              tokenResponse?.error_description ??
              tokenResponse?.detail ??
              tokenResponse?.error ??
              'Failed to exchange Twitter OAuth2 code.';
            showLoginAlert('Twitter login failed', message);
            setStatusText('Login failed.');
            setIsLoading(false);
            return;
          }

          setStatusText('Fetching Twitter profile...');
          const userInfo = await getTwitterOAuth2UserInfo(tokenResponse.access_token);
          console.log('Twitter user info:', userInfo);
          const twitterId = userInfo?.data?.id;
          const accountName = userInfo?.data?.username ?? userInfo?.data?.name ?? '';
          if (!twitterId) {
            const message =
              userInfo?.detail ??
              userInfo?.title ??
              userInfo?.error_description ??
              'Failed to fetch Twitter profile.';
            showLoginAlert('Twitter login failed', message);
            setStatusText('Login failed.');
            setIsLoading(false);
            return;
          }

          await insertTwitterAccountIntoDb(
            twitterClientId,
            twitterClientSecret,
            tokenResponse.access_token,
            tokenResponse.refresh_token ?? '',
            accountName,
            twitterId,
          );
          await insertProviderIdIntoDb('Twitter', twitterId);

          const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
          if (setAccounts) {
            fetchSocialMediaAccounts(db, setAccounts);
          }
          if (setIsCalendarVisible) {
            setIsCalendarVisible(true);
          }

          setStatusText('Twitter connected.');
          showLoginAlert('Success', 'Twitter OAuth2 login succeeded.');
          closeModal();
        } catch (error: any) {
          console.log('Twitter OAuth callback error:', error);
          showLoginAlert('Twitter login failed', error?.message ?? 'Unexpected Twitter OAuth callback error.');
          setStatusText('Login failed.');
          setIsLoading(false);
        }
      };

      subscriptionRef.current = Linking.addEventListener('url', handleDeepLink);
      await openTwitterLogin(expectedState, codeChallenge);
      setStatusText('Waiting for Twitter callback...');
    } catch (error: any) {
      console.log('Twitter OAuth start failed:', error);
      showLoginAlert('Twitter login failed', error?.message ?? 'Unable to start Twitter OAuth2 login.');
      setStatusText('Login failed.');
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>X/Twitter OAuth 2.0</Text>
          <Text style={styles.description}>
            Uses `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` from `.env`.
          </Text>
          <Text style={styles.status}>{statusText || 'Press Connect to start login.'}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={closeModal} disabled={isLoading}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleValidate}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>{isLoading ? 'Working...' : 'Connect'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '82%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    textAlign: 'center',
    color: '#4b5563',
    marginBottom: 8,
  },
  status: {
    width: '100%',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#1DA1F2',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
  },
});

export default TwitterLogin;
