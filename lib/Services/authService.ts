import { fetchUserIdFromDb, insertProviderIdIntoDb } from './dbService';
import { loginWithTwitter } from '../Helpers/twitterHelper';
import { openLinkedInLogin, getLinkedInAccessToken } from '../Apis/linkedin';
import { openThreadsLogin, getThreadsAccessToken, openInstagramLogin } from '../Apis/meta';
import { openGoogleLogin, getGoogleAccessToken } from '../Apis/youtube';
import { useEffect } from 'react';


 
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
