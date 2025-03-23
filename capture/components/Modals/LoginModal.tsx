import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { faGoogle, faFacebook, faMicrosoft, faLinkedin, faTwitter } from '@fortawesome/free-brands-svg-icons';
import styles from '../../styles/AppStyles';
import { handleLogin

 } from '../../lib/Services/authService';

 const signUP = (setIsLoginVisible: React.Dispatch<React.SetStateAction<boolean>>) => {
    setIsLoginVisible(true);
  }
  

interface LoginModalProps {
    isLoginVisible: boolean;
    setIsLoginVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
    isLoginVisible, 
    setIsLoginVisible, 
    setIsCalendarVisible }) => (

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
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Google', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faGoogle} size={24} />
        <Text style={styles.loginText}>Login with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Facebook', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faFacebook} size={24} />
        <Text style={styles.loginText}>Login with Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Microsoft', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faMicrosoft} size={24} />
        <Text style={styles.loginText}>Login with Microsoft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('LinkedIn', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faLinkedin} size={24} />
        <Text style={styles.loginText}>Login with LinkedIn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin('Twitter', setIsCalendarVisible)}>
        <FontAwesomeIcon icon={faTwitter} size={24} />
        <Text style={styles.loginText}>Login with Twitter</Text>
        </TouchableOpacity>
    </View>
</Modal>
</View>
);

export default LoginModal;