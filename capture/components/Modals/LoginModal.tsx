import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { faThreads, faLinkedin, faTwitter, faInstagram, faYoutube, faTiktok } from '@fortawesome/free-brands-svg-icons';
import styles from '../../styles/AppStyles';
import { handleLogin} from '../../lib/Services/authService';
import TwitterLogin from './logins/TwitterLogin';

 const signUP = (setIsLoginVisible: React.Dispatch<React.SetStateAction<boolean>>) => {
    setIsLoginVisible(true);
  }
  

interface LoginModalProps {
    isLoginVisible: boolean;
    setIsLoginVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>;
    isTwitterLoginVisible: boolean;
    setIsTwitterLoginVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
    isLoginVisible, 
    setIsLoginVisible, 
    setIsCalendarVisible,
    isTwitterLoginVisible,
    setIsTwitterLoginVisible

   }) => (

<View>
<Text style={styles.title}>Social media scheduler</Text>
  
  <View style={styles.captureContainer}>
    <TouchableOpacity onPress={() => signUP(setIsLoginVisible)} style={styles.capture}>
      <Text style={styles.captureText}>Sign Up</Text>
    </TouchableOpacity>
  </View>

        
<Modal
    presentationStyle="fullScreen"
    visible={isLoginVisible}
    animationType="slide"
    onRequestClose={() => setIsLoginVisible(false)}
    >
    <View style={styles.modalContainer}>
        <Text style={styles.title}>Login</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('YouTube', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faYoutube} size={24} />
        <Text style={styles.loginText}>Login with YouTube</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Instagram', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faInstagram} size={24} />
        <Text style={styles.loginText}>Login with Instagram</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Threads', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faThreads} size={24} />
        <Text style={styles.loginText}>Login with Threads</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('LinkedIn', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faLinkedin} size={24} />
        <Text style={styles.loginText}>Login with LinkedIn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => setIsTwitterLoginVisible(true)}>
        <FontAwesomeIcon icon={faTwitter} size={24} />
        <Text style={styles.loginText}>Login with Twitter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('TikTok', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faTiktok} size={24} />
        <Text style={styles.loginText}>Login with TikTok</Text>
        </TouchableOpacity>
    </View>

    <TwitterLogin
      isVisible={isTwitterLoginVisible}
      onClose={() => setIsTwitterLoginVisible(false)}
      setIsCalendarVisible={setIsCalendarVisible}
      />

</Modal>
</View>
);

export default LoginModal;