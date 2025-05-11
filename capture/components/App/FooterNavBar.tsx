import React, { useState, useEffect } from 'react';
import { TextInput, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import styles from '../../styles/AppStyles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faPen, faUserGroup, faFileImport, faGear } from '@fortawesome/free-solid-svg-icons';
import { takePicture } from '../../lib/Helpers/cameraHelper';
import { handleFileImport } from '../../lib/Helpers/fileHelper';
import { copyToScheduledContent } from '../../lib/Helpers/fileHelper';
import { validateImageSize } from '../../lib/Helpers/imageHelper';
import type { SocialMediaAccount } from '../../types/SociaMedia';

import { fetchSocialMediaAccounts } from '../../lib/Services/dbService';
import SQLite, { SQLiteDatabase, Transaction, ResultSet } from 'react-native-sqlite-storage';

interface FooterNavBarProps {
    setIsAccountsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setContentMode: React.Dispatch<React.SetStateAction<string>>;
    setSelectedFile: React.Dispatch<React.SetStateAction<string>>;
    setImageResizeNeeded: React.Dispatch<React.SetStateAction<boolean>>;
  }

const FooterNavBar: React.FC<FooterNavBarProps> = ({ 
  setIsAccountsVisible, 
  setIsPostVisible, 
  setIsSettingsVisible,
  setContentMode,
  setSelectedFile,
  setImageResizeNeeded
}) => {
    const [accounts, setAccounts]   = useState<SocialMediaAccount[]>([]);
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
      
      if (filesSelected) {
        const originalUri = filesSelected[0];
        // Check if the file is an image and needs resizing
        const imageResizeResult = await validateImageSize(originalUri, false, 'instagram_image');
        console.log('Image resize needed:', imageResizeResult);
        setImageResizeNeeded(imageResizeResult);

        const importedFileUri = await copyToScheduledContent(originalUri);
      
        console.log('Copied file path:', importedFileUri);


        setSelectedFile(importedFileUri);
        setContentMode('image');
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