import React, { useState } from "react";
import { Modal, View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { getTwitterUserInfo } from "../../../lib/Apis/twitter";
import { insertTwitterAccountIntoDb } from "../../../lib/Services/dbService";
import { insertProviderIdIntoDb } from "../../../lib/Services/dbService";
import { fetchSocialMediaAccounts } from "../../../lib/Services/dbService";
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';

interface TwitterLoginProps {
    isVisible: boolean;
    onClose: () => void;
    setAccounts?: React.Dispatch<React.SetStateAction<any[]>>
    setIsCalendarVisible?: React.Dispatch<React.SetStateAction<boolean>>;
}

const TwitterLogin: React.FC<TwitterLoginProps> = ({ isVisible, onClose, setAccounts, setIsCalendarVisible }) => {
    const [consumerApiKey, setConsumerApiKey] = useState("");
    const [consumerApiSecret, setConsumerApiSecret] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [accessTokenSecret, setAccessTokenSecret] = useState("");

    const handleValidate = async () => {
        console.log("Twitter Login Info:", {
            consumerApiKey,
            consumerApiSecret,
            accessToken,
            accessTokenSecret,
        });

        // Lets check each field is filled
        if (!consumerApiKey || !consumerApiSecret || !accessToken || !accessTokenSecret) {
            Alert.alert("Missing Fields","Please fill in all the fields.");
            return;
        }
        // Call the API to validate the Twitter credentials
        let results = await getTwitterUserInfo(consumerApiKey, consumerApiSecret, accessToken, accessTokenSecret);

        console.log(typeof results);
        console.log("Twitter User Info:", results);

        
        if (!results.data) {
            Alert.alert("Error", "Failed to validate Twitter credentials. Please check your details and try again.");
            return;
        }
        
        // now insert into the database, accountName is results.data.name
         await insertTwitterAccountIntoDb(
            consumerApiKey,
            consumerApiSecret,
            accessToken,
            accessTokenSecret,
            results.data.name,
            results.data.id,
        );
        await insertProviderIdIntoDb('twitter', results.data.id); // Store the Twitter user ID in the user_providers table
        
        const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
        if (setAccounts) {
        fetchSocialMediaAccounts(db,setAccounts)
        }
        if (setIsCalendarVisible) {
            setIsCalendarVisible(true);
        }
        Alert.alert("Success", "Twitter credentials validated successfully.");
        onClose();
    };

    return (
        <Modal visible={isVisible} 
        transparent={true} animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>Twitter Login</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Consumer API Key"
                        value={consumerApiKey}
                        onChangeText={setConsumerApiKey}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Consumer API Secret"
                        value={consumerApiSecret}
                        onChangeText={setConsumerApiSecret}
                        secureTextEntry
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Access Token"
                        value={accessToken}
                        onChangeText={setAccessToken}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Access Token Secret"
                        value={accessTokenSecret}
                        onChangeText={setAccessTokenSecret}
                        secureTextEntry
                    />
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={onClose}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={handleValidate}>
                            <Text style={styles.buttonText}>Validate</Text>
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
        width: '80%',
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
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginVertical: 8,
        borderRadius: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 15,
    },
    button: {
        backgroundColor: '#1DA1F2',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    buttonText: {
        color: 'white',
    },
});

export default TwitterLogin;
