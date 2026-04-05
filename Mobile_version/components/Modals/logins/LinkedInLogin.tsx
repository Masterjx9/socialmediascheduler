import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import Modal from '../../../lib/Compat/Modal';
import {
  openLinkedInLogin,
  getLinkedInAccessToken,
  getLinkedInActorOptions,
  type LinkedInActorOption,
} from '../../../lib/Apis/linkedin';
import {
  fetchProviderIdFromDb,
  insertProviderIdIntoDb,
  insertLinkedInAccountIntoDb,
  fetchSocialMediaAccounts,
} from '../../../lib/Services/dbService';
import SQLite from '../../../lib/Compat/SQLite';

interface LinkedInLoginProps {
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

const showLinkedInAlert = (title: string, message: string) => {
  const safeMessage = String(message || 'Unknown error');
  console.log(`[${title}] ${safeMessage}`);
  if (Platform.OS !== 'windows') {
    Alert.alert(title, safeMessage);
  }
};

const LinkedInLogin: React.FC<LinkedInLoginProps> = ({
  isVisible,
  onClose,
  setAccounts,
  setIsCalendarVisible,
}) => {
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const expectedStateRef = useRef<string>('');
  const handledRef = useRef<boolean>(false);
  const lastCodeRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [actorOptions, setActorOptions] = useState<LinkedInActorOption[]>([]);
  const [pendingToken, setPendingToken] = useState<{ accessToken: string; expiresIn: number } | null>(
    null,
  );

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
    setStatusText('');
    setIsLoading(false);
    setActorOptions([]);
    setPendingToken(null);
    onClose();
  };

  const finalizeLinkedInSelection = async (selectedActor: LinkedInActorOption) => {
    if (!pendingToken?.accessToken) {
      showLinkedInAlert('LinkedIn login failed', 'LinkedIn token was not available for account linking.');
      return;
    }

    try {
      setIsLoading(true);
      setStatusText(`Linking ${selectedActor.name}...`);

      const providerUserId = selectedActor.urn;
      const duplicateByUrn = await fetchProviderIdFromDb(providerUserId);
      const duplicateByLegacyPersonId =
        selectedActor.type === 'person' ? await fetchProviderIdFromDb(selectedActor.id) : false;
      if (duplicateByUrn || duplicateByLegacyPersonId) {
        showLinkedInAlert(
          'Account Already Linked',
          'This LinkedIn profile/page is already linked on this device.',
        );
        setIsLoading(false);
        return;
      }

      await insertProviderIdIntoDb('LinkedIn', providerUserId);
      await insertLinkedInAccountIntoDb(
        'insert',
        pendingToken.accessToken,
        selectedActor.name,
        new Date().toISOString(),
        providerUserId,
        pendingToken.expiresIn,
      );

      if (setAccounts) {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        fetchSocialMediaAccounts(db, setAccounts);
      }
      if (setIsCalendarVisible) {
        setIsCalendarVisible(true);
      }

      setStatusText('LinkedIn connected.');
      showLinkedInAlert('Success', `LinkedIn connected as ${selectedActor.name}.`);
      closeModal();
    } catch (error: any) {
      console.log('LinkedIn account selection error:', error);
      showLinkedInAlert(
        'LinkedIn login failed',
        error?.message ?? 'Unexpected error while linking selected LinkedIn account.',
      );
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setStatusText('Opening LinkedIn login in browser...');
      setActorOptions([]);
      setPendingToken(null);
      handledRef.current = false;

      const expectedState = buildOAuthState();
      expectedStateRef.current = expectedState;

      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      const handleDeepLink = async (event: { url: string }) => {
        console.log('LinkedIn callback URL:', event.url);
        const code = extractOAuthCode(event.url);
        const state = extractOAuthState(event.url);
        if (!code) {
          return;
        }

        try {
          if (handledRef.current) {
            console.log('Ignoring duplicate LinkedIn callback event.');
            return;
          }
          if (code === lastCodeRef.current) {
            console.log('Ignoring replayed LinkedIn callback code.');
            return;
          }
          if (state && state !== expectedStateRef.current) {
            console.log('Ignoring LinkedIn callback with mismatched OAuth state.');
            return;
          }
          if (!state) {
            console.log('LinkedIn callback missing OAuth state; continuing without state validation.');
          }

          handledRef.current = true;
          lastCodeRef.current = code;
          subscriptionRef.current?.remove();
          subscriptionRef.current = null;
          setStatusText('Exchanging OAuth code...');

          const linkedInToken = await getLinkedInAccessToken({
            grant_type: 'authorization_code',
            code,
          });
          console.log('LinkedIn access token response:', linkedInToken);

          if (!linkedInToken?.access_token) {
            const message =
              linkedInToken?.error_description ??
              linkedInToken?.error ??
              'Failed to exchange LinkedIn authorization code.';
            showLinkedInAlert('LinkedIn login failed', message);
            setStatusText('Login failed.');
            setIsLoading(false);
            return;
          }

          setStatusText('Loading LinkedIn accounts...');
          const actorPayload = await getLinkedInActorOptions(linkedInToken.access_token);
          const options = Array.isArray(actorPayload?.options) ? actorPayload.options : [];
          if (!options.length) {
            showLinkedInAlert(
              'LinkedIn login failed',
              'No LinkedIn profiles/pages were returned for this login.',
            );
            setStatusText('No account options found.');
            setIsLoading(false);
            return;
          }

          setPendingToken({
            accessToken: linkedInToken.access_token,
            expiresIn: Number(linkedInToken.expires_in ?? 0),
          });
          setActorOptions(options);
          setStatusText('Choose a LinkedIn profile/page to connect.');
          setIsLoading(false);
        } catch (error: any) {
          console.log('LinkedIn OAuth callback error:', error);
          showLinkedInAlert(
            'LinkedIn login failed',
            error?.message ?? 'Unexpected LinkedIn OAuth callback error.',
          );
          setStatusText('Login failed.');
          setIsLoading(false);
        }
      };

      subscriptionRef.current = Linking.addEventListener('url', handleDeepLink);
      openLinkedInLogin(expectedState);
      setStatusText('Waiting for LinkedIn callback...');
    } catch (error: any) {
      console.log('LinkedIn OAuth start failed:', error);
      showLinkedInAlert(
        'LinkedIn login failed',
        error?.message ?? 'Unable to start LinkedIn OAuth login.',
      );
      setStatusText('Login failed.');
      setIsLoading(false);
    }
  };

  const showingAccountPicker = actorOptions.length > 0 && !!pendingToken;

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>LinkedIn Login</Text>
          {!showingAccountPicker ? (
            <>
              <Text style={styles.description}>
                Connect LinkedIn, then choose whether to use your profile or a company page.
              </Text>
              <Text style={styles.status}>{statusText || 'Press Connect to start login.'}</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={closeModal} disabled={isLoading}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleConnect}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>{isLoading ? 'Working...' : 'Connect'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.description}>Select the LinkedIn account to link:</Text>
              <ScrollView style={styles.optionsList}>
                {actorOptions.map((option) => (
                  <TouchableOpacity
                    key={option.urn}
                    style={[styles.optionButton, isLoading && styles.buttonDisabled]}
                    onPress={() => finalizeLinkedInSelection(option)}
                    disabled={isLoading}
                  >
                    <Text style={styles.optionName}>{option.name}</Text>
                    <Text style={styles.optionMeta}>
                      {option.type === 'person' ? 'Personal Profile' : 'Company Page'}
                    </Text>
                    <Text style={styles.optionUrn}>{option.urn}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={closeModal} disabled={isLoading}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    width: '88%',
    maxHeight: '82%',
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
    marginBottom: 10,
  },
  status: {
    width: '100%',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 14,
  },
  optionsList: {
    width: '100%',
    marginBottom: 12,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  optionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  optionMeta: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
  optionUrn: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  button: {
    backgroundColor: '#0a66c2',
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
    fontWeight: '600',
  },
});

export default LinkedInLogin;
