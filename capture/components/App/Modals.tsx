import AccountsModal from '../Modals/AccountsModal';
import SettingsModal from '../Modals/SettingsModal';
import PostModal from '../Modals/PostModal';
import { logOutALL } from '../../lib/Services/authService';
import { handlePost } from '../../lib/Helpers/postHelper';
import React from 'react';

interface ModalsContainerProps {
    GoogleSignin: any;
    isAccountsVisible: boolean;
    setIsAccountsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    isTwitterLoginVisible: boolean;
    setIsTwitterLoginVisible: React.Dispatch<React.SetStateAction<boolean>>;
    isPostVisible: boolean;
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>;
    selectedItem: any;
    setSelectedItem: React.Dispatch<React.SetStateAction<any>>;
    selectedDate: string;
    isSettingsVisible: boolean;
    setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsLoginVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setDbData: React.Dispatch<React.SetStateAction<any[]>>;
    contentMode: string;
    selectedFile: string;
  }

  const ModalsContainer: React.FC<ModalsContainerProps> = ({
    GoogleSignin,
    contentMode,
    selectedFile,
    isAccountsVisible,
    setIsAccountsVisible,
    isTwitterLoginVisible,
    setIsTwitterLoginVisible,
    isPostVisible,
    setIsPostVisible,
    selectedItem,
    setSelectedItem,
    selectedDate,
    isSettingsVisible,
    setIsSettingsVisible,
    setIsCalendarVisible,
    setIsLoginVisible,
    setDbData,
  }) => {
    return (
      <>
          
          <AccountsModal 
            isVisible={isAccountsVisible} 
            onClose={() => setIsAccountsVisible(false)} 
            GoogleSignin={GoogleSignin} 
            setIsLoginVisible={setIsLoginVisible} 
            setIsAccountsVisible={setIsAccountsVisible} 
            setIsCalendarVisible={setIsCalendarVisible} 
            isTwitterLoginVisible={isTwitterLoginVisible}
            setIsTwitterLoginVisible={setIsTwitterLoginVisible}

          />

        <PostModal
    
          isVisible={isPostVisible}
            onClose={() => {
            setIsPostVisible(false);
            setSelectedItem(null);
          }}
          onPost={async (contentDescription, unixTimestamp, content_id, user_providers) =>
            {
              console.log('onPostModal called');
              console.log('Post content:', contentDescription);
              console.log("content type:", contentMode);
              console.log('Selected date (Unix timestamp):', unixTimestamp);
              console.log('Selected item:', content_id);
              console.log('Selected providers:', user_providers);
              // NOTE:
              // we stopped here:
              // we need to see how hard it is to change all text to the description column in the database
              // then content will always be the file path for image/video
              // if not then we check what the contentMode is then set the text to the description column in the database
              // for only images/videos
              // This may have to be done in the dbservice but this is the starting point of the
              // trace.
              await handlePost(contentMode, selectedFile, contentDescription, unixTimestamp, setDbData, setIsPostVisible, setSelectedItem, content_id, user_providers)
            }
          }
          selectedDate={selectedDate}
          item={selectedItem}
          contentMode={contentMode} 
        />
        
        <SettingsModal
          isVisible={isSettingsVisible}
          onClose={() => setIsSettingsVisible(false)}
          onLogOut={() => logOutALL( setIsSettingsVisible, setIsCalendarVisible, setIsLoginVisible)}
        />
      </>
    );
  };
  
  export default ModalsContainer;