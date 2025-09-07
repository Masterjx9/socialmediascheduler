import { openLinkedInLogin } from '../Apis/linkedin';
import { openThreadsLogin, openInstagramLogin } from '../Apis/meta';
import { openGoogleLogin } from '../Apis/youtube';


 
export const handleLogin = async (provider: string, 
    setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>) => {
    try {
      if (provider === 'LinkedIn') {
        openLinkedInLogin()
      }
      if (provider === 'Threads') {
        openThreadsLogin()
      }
      if (provider === 'YouTube') {
       openGoogleLogin()
      }
      if (provider === 'Instagram') {
       openInstagramLogin()
      }
      if (provider === 'TikTok') {
        // openTikTokLogin()
      }
  
      // Show the calendar
      setIsCalendarVisible(true);
    } catch (error) {
      console.error(error);
    }
  };
