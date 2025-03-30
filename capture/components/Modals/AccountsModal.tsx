import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGoogle, faMicrosoft, faLinkedin, faTwitter, faFacebook } from '@fortawesome/free-brands-svg-icons';
import { LoginManager, AccessToken, Settings } from 'react-native-fbsdk-next';
import { loginWithTwitter } from '../../lib/Helpers/twitterHelper'
import { insertProviderIdIntoDb } from '../../lib/Services/dbService';
import TwitterLogin from './logins/TwitterLogin';
import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from '@env';
// const [isTwitterLoginVisible, setIsTwitterLoginVisible] = useState(false);


interface AccountsModalProps {
    isVisible: boolean;
    onClose: () => void;
    GoogleSignin: any;  
    setIsLoginVisible: (visible: boolean) => void;
    setIsAccountsVisible: (visible: boolean) => void;
    setIsCalendarVisible: (visible: boolean) => void;
    // setIsTwitterLoginVisible: (visible: boolean) => void;
    isTwitterLoginVisible: boolean;
    setIsTwitterLoginVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

interface HandleNewSignUpParams {
    provider: string;
    GoogleSignin?: any; // Use the correct type for GoogleSignin if you know it
}

interface SocialMediaAccount {
    account_id: number;  // Updated to match the actual column name
    provider_name: string;
}

const AccountsModal: React.FC<AccountsModalProps> = ({ isVisible, 
                                                        onClose, 
                                                        GoogleSignin, 
                                                        setIsLoginVisible,
                                                        setIsAccountsVisible,
                                                        setIsCalendarVisible,
                                                        isTwitterLoginVisible,
                                                        setIsTwitterLoginVisible
                                        
                                                    
                                                    }) => {
    const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
    const [isNewAccountVisible, setIsNewAccountVisible] = useState(false);

    useEffect(() => {
        if (isVisible) {
            fetchSocialMediaAccounts();
        }
    }, [isVisible]);

    const fetchSocialMediaAccounts = async () => {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        db.transaction(tx => {
            tx.executeSql(
                'SELECT account_id, provider_name FROM user_providers',
                [],
                (_: any, results: any) => {

                    const rows = results.rows;
                    let accountsList: SocialMediaAccount[] = [];
                    for (let i = 0; i < rows.length; i++) {
                        accountsList.push(rows.item(i));
                    }
                    console.log('Accounts: ', accountsList);
                    setAccounts(accountsList);
                },
                (error) => {
                    console.log('Error fetching accounts: ', error);
                }
            );
        });
    };

    const removeAccount = async (accountId: number) => {
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        db.transaction(tx => {
            tx.executeSql(
                'DELETE FROM user_providers WHERE account_id = ?',
                [accountId],
                () => {
                    Alert.alert('Account Removed', 'The account has been removed successfully.');
                    fetchSocialMediaAccounts(); // Refresh the account list
                },
                (error) => {
                    console.log('Error removing account: ', error);
                }
            );
        });
    };

    const renderAccountItem = ({ item }: { item: SocialMediaAccount }) => (
        <View style={styles.accountItem}>
            <Text style={styles.accountText}>{item.provider_name}</Text>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeAccount(item.account_id)}
            >
                <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

    const handleNewSignUp = async ({ provider, GoogleSignin }: HandleNewSignUpParams) => {
        try {
          if (provider === 'Google' && GoogleSignin) {
            console.log('Google SignUp');
           
            const user = await GoogleSignin.getCurrentUser();
            const isSignedIn = user !== null;
            
            if (isSignedIn) {
                const proceed = await new Promise((resolve) => {
                  Alert.alert(
                    'Warning',
                    'You are already signed into a Google account. In order to add another Google account we must sign you out of the current account. We will add your new account to the list of accounts after you sign in. IF YOU CANCEL THIS OPERATION YOU WILL BE BROUGHT BACK TO THE MAIN LOGIN SCREEN.',
                    [
                      { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                      { text: 'OK', onPress: () => resolve(true) },
                    ],
                    { cancelable: false }
                  );
                });
        
                if (!proceed) {
                  console.log('User canceled the sign-in process');
                  return;
                }
              }

              try {
            await GoogleSignin.revokeAccess();
            await GoogleSignin.signOut();            

            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            console.log(userInfo);
            const providerUserId = userInfo.user.id;
              
            // Check if the user is already linked to this provider
            const existingProviderId = await fetchProviderIdFromDb (providerUserId);
            console.log('Existing Provider ID: ', existingProviderId);
            if (existingProviderId) {
                Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
                return;
            }

            console.log("New Provider User ID: ", providerUserId);

            // Insert the new provider ID into the database
            await insertProviderIdIntoDb(provider, providerUserId);
            // userInfo.user.name

            // Refresh the account list
            fetchSocialMediaAccounts();
        } catch (error) {
            setIsAccountsVisible(false);
            setIsCalendarVisible(false);
            setIsLoginVisible(true);
            return null;

            }
          }
          if (provider === 'Facebook') {
            console.log('Facebook SignUp');
            const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

            // console.log(LoginManager.logInWithPermissions);
            // console.log(Settings);

            if (result.isCancelled) {
              console.log('User canceled the signup process');
              return;
            }

            const data = await AccessToken.getCurrentAccessToken();
            if (!data) {
              console.log('No access token found');
              Alert.alert('Error', 'No access token found');
              return;
            }

            console.log('Access token:', data.accessToken.toString());
            const providerUserId = data.userID;

            // Check if the user is already linked to this provider
            const existingProviderId = await fetchProviderIdFromDb(providerUserId);
            console.log('Existing Provider ID: ', existingProviderId);
            if (existingProviderId) {
              Alert.alert('Account Already Linked', 'This account is already linked to this user or another user on this device.');
              return;
            }

            console.log('New Provider User ID:', providerUserId);

            // Insert the new provider ID into the database

            await insertProviderIdIntoDb(provider, providerUserId);
            //, 'Facebook User'
            // Refresh the account list
            fetchSocialMediaAccounts();




          }
          if (provider === 'Microsoft') {
            console.log('Microsoft SignUp');
          }
            if (provider === 'LinkedIn') {
                console.log('LinkedIn SignUp');
            }
          // Show the calendar
          setIsNewAccountVisible(false);
        } catch (error) {
         console.log('Error signing in: ', error);
        }
      };

      const fetchProviderIdFromDb  = async (providerUserId: string): Promise<boolean> => {
        try {
            console.log('Fetching provider_user_id from database:', providerUserId);
            const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
            return new Promise<boolean>((resolve, reject) => {
                db.transaction(tx => {
                    tx.executeSql(
                        'SELECT COUNT(*) as count FROM user_providers WHERE provider_user_id = ?',
                        [providerUserId],
                        (_, results) => {
                            if (results.rows.item(0).count > 0) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        },
                        (error) => {
                            console.log('Error fetching provider_user_id from database:', error);
                            resolve(false);  // Resolve as false instead of rejecting
                        }
                    );
                });
            });
        } catch (error) {
            console.error('Database operation failed:', error);
            return false;
        }
    };
    


    return (
        <Modal
            presentationStyle="fullScreen"
            visible={isVisible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <Text style={styles.title}>Linked Social Media Accounts</Text>
                <FlatList
                    data={accounts}
                    renderItem={renderAccountItem}
                    keyExtractor={(item) => item.account_id.toString()}
                />
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsNewAccountVisible(true)}
                >
                    <Text style={styles.addButtonText}>Add Another Account (Easy Method)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.addButton}
                    // onPress={() => setIsNewAccountVisible(true)}
                >
                    <Text style={styles.addButtonText}>Add Another Account (Manual Method)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                >
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>


            <Modal
            presentationStyle="fullScreen"
            visible={isNewAccountVisible}
            animationType="slide"
            onRequestClose={() => setIsNewAccountVisible(false)}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.title}>Add an Account</Text>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp({ provider: 'Google', GoogleSignin: GoogleSignin })}>
                <FontAwesomeIcon icon={faGoogle} size={24} /><Text style={styles.loginText}>Login with Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp({ provider: 'Facebook' })}>
                <FontAwesomeIcon icon={faFacebook} size={24} /><Text style={styles.loginText}>Login with Facebook</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp({ provider: 'Microsoft' })}>
                <FontAwesomeIcon icon={faMicrosoft} size={24} /><Text style={styles.loginText}>Login with Microsoft</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp({ provider: 'LinkedIn' })}>
                <FontAwesomeIcon icon={faLinkedin} size={24} /><Text style={styles.loginText}>Login with LinkedIn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loginButton} onPress={() => setIsTwitterLoginVisible(true)}>
                <FontAwesomeIcon icon={faTwitter} size={24} /><Text style={styles.loginText}>Login with Twitter</Text>
                </TouchableOpacity>

            </View>
          </Modal>
        
        <TwitterLogin
            isVisible={isTwitterLoginVisible}
            onClose={() => setIsTwitterLoginVisible(false)}
            />

        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    accountItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: 10,
        backgroundColor: '#f0f0f0',
        marginBottom: 10,
    },
    accountText: {
        fontSize: 18,
    },
    removeButton: {
        backgroundColor: 'red',
        padding: 5,
        borderRadius: 5,
    },
    removeButtonText: {
        color: 'white',
    },
    addButton: {
        backgroundColor: 'blue',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: 'red',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        margin: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
      },
  loginText: {
    marginLeft: 10,
    fontSize: 18,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default AccountsModal;
