import React, { useState, useEffect } from 'react';
import { TextInput, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import styles from '../../styles/AppStyles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faPen, faUserGroup, faFileImport, faGear } from '@fortawesome/free-solid-svg-icons';
import { takePicture } from '../../lib/Helpers/cameraHelper';
import { handleFileImport,detectAudioCodec } from '../../lib/Helpers/fileHelper';
// import { handleFileImport } from '../../lib/Helpers/fileHelper';
import { copyToScheduledContent } from '../../lib/Helpers/fileHelper';
import { validateImageSize } from '../../lib/Helpers/imageHelper';
import type { SocialMediaAccount } from '../../types/SociaMedia';
import { Alert } from 'react-native';

import { fetchSocialMediaAccounts } from '../../lib/Services/dbService';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';



export const showBlockingAlert = (
  title: string,
  message: string,
  buttonText: string = 'OK'
): Promise<void> => {
  return new Promise(resolve => {
    Alert.alert(title, message, [{ text: buttonText, onPress: () => resolve() }], {
      cancelable: false,
    });
  });
};


interface FooterNavBarProps {
    setIsAccountsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setContentMode: React.Dispatch<React.SetStateAction<"post" | "image" | "video">>;
    setSelectedFile: React.Dispatch<React.SetStateAction<string>>;
    setImageResizeNeeded: React.Dispatch<React.SetStateAction<boolean>>;
    contentMode: string;
    unsupportedAudioCodec: boolean;
    setUnsupportedAudioCodec: React.Dispatch<React.SetStateAction<boolean>>;
    accounts: SocialMediaAccount[];
    setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>;
  }



const FooterNavBar: React.FC<FooterNavBarProps> = ({ 
  setIsAccountsVisible, 
  setIsPostVisible, 
  setIsSettingsVisible,
  setContentMode,
  setSelectedFile,
  setImageResizeNeeded,
  contentMode,
  setUnsupportedAudioCodec,
  accounts,
  setAccounts
}) => {
    // const [accounts, setAccounts]   = useState<SocialMediaAccount[]>([]);
  const [isPostEnabled, setIsPostEnabled] = useState(false);

  /* fetch accounts ONCE, exactly as you wrote it */
  useEffect(() => {
    const useEffectAsync = async () => {
      const db = await SQLite.openDatabase({ name: 'database_default.sqlite3', location: 'default' });
      fetchSocialMediaAccounts(db, setAccounts);               // ← untouched
      console.log('FOOTER!!!! Social Media Accounts:', accounts);
    };
    useEffectAsync();
  }, []);                                                      // ← no loop

  /* whenever accounts state changes, update the button state */
  useEffect(() => {
    const required = ['threads', 'twitter', 'linkedin'];
    setIsPostEnabled(
      accounts.some(a => required.includes(a.provider_name?.toLowerCase()))
    );
  }, [accounts]);

  return (
<View style={styles.footerNavBar}>
    <TouchableOpacity
    style={styles.navButton}
    onPress={() => {setIsAccountsVisible(true)
      console.log('Accounts button pressed');
      
    }}
    >
    <FontAwesomeIcon icon={faUserGroup} size={24} />
    <Text>Accounts</Text>
    </TouchableOpacity>

    <TouchableOpacity
    style={[styles.navButton]}
    onPress={async () => { 
      const filesSelected = await handleFileImport();
      console.log('Files selected:', filesSelected);
      
      if (filesSelected && filesSelected.length > 0) {
        const originalUri = filesSelected[0].uri;
        const fileName = filesSelected[0].name;

        if (filesSelected[0].type === 'video/mp4') {
        setContentMode('video');
        const importedFileUri = await copyToScheduledContent(originalUri, fileName!);
        // Check the audio codec of the video
        console.log('imported file URI:', importedFileUri);
        const audioCodec = await detectAudioCodec(importedFileUri);
        console.log('Audio Codec:', audioCodec);
        // We will make logic for if the audio is not supported by twitter or another platform.
        // Then we will alert the user to the platform and to recommend a different codec
        if (audioCodec && audioCodec.toLowerCase().includes('3gpp')) {
          const onlyUnsupported = accounts.every(acc => {
            const name = acc.provider_name.toLowerCase();
            return name === 'twitter' || name === 'instagram' || name === 'threads';
          });

          if (onlyUnsupported) {
            await showBlockingAlert(
              'Unsupported Audio Codec',
              'All connected platforms (Twitter, Instagram, Threads) do not support the 3GPP audio codec. Please use AAC audio or connect different platforms.'
            );
            return;
          }

          setUnsupportedAudioCodec(true);
          await showBlockingAlert(
            'Unsupported Audio Codec',
            'The selected video uses the 3GPP audio codec, which is not supported by some platforms (e.g., Twitter). Please use a video with AAC audio.'
          );
        }


        
        console.log('Copied file path:', importedFileUri);
        setSelectedFile(importedFileUri);
        }

        if (filesSelected[0].type === 'image/jpeg' || filesSelected[0].type === 'image/png') {
          // Accounts example [{"provider_name": "YouTube", "provider_user_id": "UC-8P44nYjW_YorREgugs_cg"}]
          // check if the ONLY account is youtube, if so then alert and return as youtube does not support image posting
          if (accounts.length === 1 && accounts[0].provider_name.toLowerCase() === 'youtube') {
            Alert.alert(
              'YouTube does not support image posting',
              'Please Add a different account to post images\nOr use the import option to import videos',
              [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
              { cancelable: false }
            );

            return;
          } else {
            console.log("TEST accounts:", accounts);
          }
        // Check if the file is an image and needs resizing for instagram requirements
        console.log('Original file URI:', originalUri);
        const imageResizeResult = await validateImageSize(originalUri, false, 'instagram_image');
        console.log('Image resize needed:', imageResizeResult);
        setImageResizeNeeded(imageResizeResult);

        const importedFileUri = await copyToScheduledContent(originalUri,fileName!);
      
        console.log('Copied file path:', importedFileUri);

        setSelectedFile(importedFileUri);
        setContentMode('image');
        }

        setIsPostVisible(true)
      }
      
        }}
    >
    <FontAwesomeIcon icon={faFileImport} size={24} />
    <Text>Import</Text>
    </TouchableOpacity>


    <TouchableOpacity
    style={[styles.navButton, !isPostEnabled && { opacity: 0.4 }]}
    disabled={!isPostEnabled}
    onPress={async () => {
      setImageResizeNeeded(false);
      console.log("content mode:", contentMode);
      setContentMode('post');
      setIsPostVisible(true);
    }}
  >
    <FontAwesomeIcon icon={faPen} size={24} />
    <Text>Post/Tweet</Text>
  </TouchableOpacity>



    <TouchableOpacity
    style={[styles.navButton]}
    onPress={async () => {
      setContentMode('image');
      takePicture()
    }}
    
    >
    <FontAwesomeIcon icon={faCamera} size={24} />
    <Text>Camera</Text>
    </TouchableOpacity>

    <TouchableOpacity
    style={styles.navButton}
    onPress={() => setIsSettingsVisible(true)}
    >
    <FontAwesomeIcon icon={faGear} size={24} />
    <Text>Settings</Text>
    </TouchableOpacity>
</View>
  )
}

export default FooterNavBar;