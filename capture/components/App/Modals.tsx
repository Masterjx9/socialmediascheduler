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
  }

  const ModalsContainer: React.FC<ModalsContainerProps> = ({
    GoogleSignin,
    
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
          onPost={async (content, unixTimestamp, content_id) =>
            await handlePost(content, unixTimestamp, setDbData, setIsPostVisible, setSelectedItem, content_id)
          }
          selectedDate={selectedDate}
          item={selectedItem}
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