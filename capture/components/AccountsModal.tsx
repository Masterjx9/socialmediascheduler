import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGoogle, faMicrosoft, faLinkedin, faTwitter } from '@fortawesome/free-brands-svg-icons';


interface PostModalProps {
    isVisible: boolean;
    onClose: () => void;
    currentUserId: number;  // Added currentUserId prop
}

interface SocialMediaAccount {
    account_id: number;  // Updated to match the actual column name
    provider_name: string;
}

const PostModal: React.FC<PostModalProps> = ({ isVisible, onClose, currentUserId }) => {
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
                'SELECT account_id, provider_name FROM user_providers WHERE user_id = ?',
                [currentUserId],
                (_, results) => {
                    const rows = results.rows;
                    let accountsList: SocialMediaAccount[] = [];
                    for (let i = 0; i < rows.length; i++) {
                        accountsList.push(rows.item(i));
                    }
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

    const handleNewSignUp = async (provider: string) => {
        try {
          if (provider === 'Google') {
            console.log('Google login');
          }
          if (provider === 'Microsoft') {
            console.log('Microsoft login');
          }
            if (provider === 'LinkedIn') {
                console.log('LinkedIn login');
            }
            if (provider === 'Twitter') {
                console.log('Twitter login');
            }
          // Show the calendar
          setIsNewAccountVisible(false);
        } catch (error) {
         console.log('Error signing in: ', error);
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
                    <Text style={styles.addButtonText}>Add Another Account</Text>
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
              <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp('Google')}>
                <FontAwesomeIcon icon={faGoogle} size={24} />
                <Text style={styles.loginText}>Login with Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp('Microsoft')}>
                <FontAwesomeIcon icon={faMicrosoft} size={24} />
                <Text style={styles.loginText}>Login with Microsoft</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp('LinkedIn')}>
                <FontAwesomeIcon icon={faLinkedin} size={24} />
                <Text style={styles.loginText}>Login with LinkedIn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp('Twitter')}>
                <FontAwesomeIcon icon={faTwitter} size={24} />
                <Text style={styles.loginText}>Login with Twitter</Text>
              </TouchableOpacity>
            </View>
          </Modal>

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

export default PostModal;
