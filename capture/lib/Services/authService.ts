import { fetchUserIdFromDb, insertProviderIdIntoDb } from './dbService';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken, Settings } from 'react-native-fbsdk-next';
import { loginWithTwitter } from '../Helpers/twitterHelper';
import { openLinkedInLogin, getLinkedInAccessToken } from '../Apis/linkedin';
import { useEffect } from 'react';


export const logOutALL = async (
    setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>, 
    setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>, 
    setIsLoginVisible: React.Dispatch<React.SetStateAction<boolean>>) => {
    try {
      // Google sign out
      const user = await GoogleSignin.getCurrentUser();
      const isSignedIn = user !== null;
      if (isSignedIn) {
        console.log('User is signed in:', user);
        console.log('User ID found in database, logging out...');
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        setIsSettingsVisible(false);
        setIsCalendarVisible(false);
        setIsLoginVisible(false);
      }
      
      // Facebook sign out
      const currentAccessToken = await AccessToken.getCurrentAccessToken();
      const isSignedInFB = currentAccessToken !== null;
      if (isSignedInFB) {
        console.log('User is signed in with Facebook');
        console.log('User ID found in database, logging out...');
        await LoginManager.logOut();
        setIsSettingsVisible(false);
        setIsCalendarVisible(false);
        setIsLoginVisible(false);
      }

    } catch (error) {
      console.error(error);
    }
  };
  
export const handleLogin = async (provider: string, 
    setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>) => {
    try {
      if (provider === 'LinkedIn') {
        openLinkedInLogin()
      }
      if (provider === 'Google') {
        console.log('Google login');
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        console.log(userInfo);

        let userId = await fetchUserIdFromDb(userInfo.user.id);

        if (userId) {
            console.log('User already exists, signing in...');
        } else {
            console.log('New user, inserting into database...');
            await insertProviderIdIntoDb('google', userInfo.user.id);
            //  userInfo.user.email will be used later for inserting into google table

            userId = await fetchUserIdFromDb(userInfo.user.id);
        }


        
      }
      if (provider === 'Facebook') {
        console.log('Facebook login');
        // Start Facebook login process
        console.log(LoginManager)
        const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
  
        if (result.isCancelled) {
          console.log('Facebook login cancelled');
          return;
        }
  
        // Get the access token
        const data = await AccessToken.getCurrentAccessToken();
  
        if (!data) {
          throw new Error('Something went wrong obtaining access token');
        }
  
        console.log('Facebook Access Token:', data.accessToken.toString());
  
        // Use the access token to get the user's Facebook profile info
        const response = await fetch(`https://graph.facebook.com/me?access_token=${data.accessToken}&fields=id,name,email`);
        const userInfo = await response.json();
        console.log(userInfo);
  
        let userId = await fetchUserIdFromDb(userInfo.id);
  
        if (userId) {
          console.log('User already exists, signing in...');
        } else {
          console.log('New user, inserting into database...');
          await insertProviderIdIntoDb('facebook', userInfo.id);
          // userInfo.email || userInfo.name will be used later for inserting into meta table

          userId = await fetchUserIdFromDb(userInfo.id);
        }
  
      }
  
      // Show the calendar
      setIsCalendarVisible(true);
    } catch (error) {
      handleLoginError(error);
    }
  };
  
  
  
export const handleLoginError = (error: any) => {
    if (error instanceof Error && 'code' in error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login process');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Login is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play Services not available or outdated');
      } else {
        console.log('Some other error occurred', error);
      }
    } else {
      console.log('An unknown error occurred', error);
    }
  };

// This will be refactored to check if the user is already signed in and fetch their user ID
// and get a refresh token if needed.
export const googleRefreshFlow = async (
  setCurrentUserId: React.Dispatch<React.SetStateAction<any>>,
  setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>,
  setIsLoginVisible: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const user = await GoogleSignin.getCurrentUser();
  const isSignedIn = user !== null;
  
  if (isSignedIn) {
    console.log('User is signed in:', user);
    const userId = await fetchUserIdFromDb(user.user.id);
    if (userId) {
      setCurrentUserId(userId);
      setIsCalendarVisible(true);
  } else {
      console.log('User ID not found in database, please sign in again.');
      setIsLoginVisible(true);
  }
  } else {
    console.log('User is not signed in');
    // setIsLoginVisible(true);
  }
};
