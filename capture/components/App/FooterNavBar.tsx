import { TextInput, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import styles from '../../styles/AppStyles';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faPen, faUserGroup, faFileImport, faGear } from '@fortawesome/free-solid-svg-icons';
import { takePicture } from '../../lib/Helpers/photoHelper';
import { handleFileImport } from '../../lib/Helpers/fileHelper';


interface FooterNavBarProps {
    setIsAccountsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  }

const FooterNavBar: React.FC<FooterNavBarProps> = ({ 
  setIsAccountsVisible, 
  setIsPostVisible, 
  setIsSettingsVisible 
}) => (
<View style={styles.footerNavBar}>
    <TouchableOpacity
    style={styles.navButton}
    onPress={() => setIsAccountsVisible(true)}
    >
    <FontAwesomeIcon icon={faUserGroup} size={24} />
    <Text>Accounts</Text>
    </TouchableOpacity>

    <TouchableOpacity
    style={[styles.navButton]}
    onPress={handleFileImport}
    >
    <FontAwesomeIcon icon={faFileImport} size={24} />
    <Text>Import</Text>
    </TouchableOpacity>

    <TouchableOpacity
    style={[styles.navButton]}
    onPress={() => setIsPostVisible(true)}
    >
    <FontAwesomeIcon icon={faPen} size={24} />
    <Text>Post/Tweet</Text>
    </TouchableOpacity>

    <TouchableOpacity
    style={[styles.navButton]}
    onPress={takePicture}
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
);

export default FooterNavBar;