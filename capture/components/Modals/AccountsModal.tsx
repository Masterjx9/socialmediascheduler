import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGoogle, faMicrosoft, faLinkedin, faTwitter, faFacebook } from '@fortawesome/free-brands-svg-icons';
import TwitterLogin from './logins/TwitterLogin';
import type { SocialMediaAccount } from '../../types/SociaMedia';
import { handleNewSignUp, forceUpdateAccounts, removeAccount } from '../../lib/Services/dbService';


interface AccountsModalProps {
    isVisible: boolean;
    onClose: () => void;
    GoogleSignin: any;  
    setIsLoginVisible: (visible: boolean) => void;
    setIsAccountsVisible: (visible: boolean) => void;
    setIsCalendarVisible: (visible: boolean) => void;
    isTwitterLoginVisible: boolean;
    setIsTwitterLoginVisible: React.Dispatch<React.SetStateAction<boolean>>;
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
        forceUpdateAccounts(setAccounts)
        }
    }, [isVisible]);
    
    

    const renderAccountItem = ({ item }: { item: SocialMediaAccount }) => (
        <View style={styles.accountItem}>
            <Text style={styles.accountText}>{item.provider_name}</Text>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeAccount(item.provider_name,item.provider_user_id, setAccounts)}
            >
                <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

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
                    keyExtractor={(item) => item.provider_user_id.toString()}
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
              <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp({ provider: 'Google', 
                                                                                            GoogleSignin: GoogleSignin,
                                                                                            setIsAccountsVisible: setIsAccountsVisible,
                                                                                            setIsNewAccountVisible: setIsNewAccountVisible,
                                                                                            setIsCalendarVisible: setIsCalendarVisible,
                                                                                            setIsLoginVisible: setIsLoginVisible,
                                                                                            setAccounts: setAccounts })}>
                <FontAwesomeIcon icon={faGoogle} size={24} /><Text style={styles.loginText}>Login with Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp({ provider: 'Facebook', 
                                                                                            GoogleSignin: GoogleSignin,
                                                                                            setIsAccountsVisible: setIsAccountsVisible,
                                                                                            setIsNewAccountVisible: setIsNewAccountVisible,
                                                                                            setIsCalendarVisible: setIsCalendarVisible,
                                                                                            setIsLoginVisible: setIsLoginVisible,
                                                                                            setAccounts: setAccounts })}>
                <FontAwesomeIcon icon={faFacebook} size={24} /><Text style={styles.loginText}>Login with Facebook</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.loginButton} onPress={() => handleNewSignUp({ provider: 'LinkedIn', 
                                                                                            GoogleSignin: GoogleSignin,
                                                                                            setIsAccountsVisible: setIsAccountsVisible,
                                                                                            setIsNewAccountVisible: setIsNewAccountVisible,
                                                                                            setIsCalendarVisible: setIsCalendarVisible,
                                                                                            setIsLoginVisible: setIsLoginVisible,
                                                                                            setAccounts: setAccounts })}>
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
            setAccounts={setAccounts} 
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
