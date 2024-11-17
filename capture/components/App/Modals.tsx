import AccountsModal from '../Modals/AccountsModal';
import SettingsModal from '../Modals/SettingsModal';
import PostModal from '../Modals/PostModal';
import { logOutALL } from '../../lib/Services/authService';
import { handlePost } from '../../lib/Helpers/postHelper';
import React from 'react';

interface ModalsContainerProps {
    GoogleSignin: any;
    currentUserId: number | null;
    isAccountsVisible: boolean;
    setIsAccountsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    isPostVisible: boolean;
    setIsPostVisible: React.Dispatch<React.SetStateAction<boolean>>;
    selectedItem: any;
    setSelectedItem: React.Dispatch<React.SetStateAction<any>>;
    selectedDate: string;
    isSettingsVisible: boolean;
    setIsSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentUserId: React.Dispatch<React.SetStateAction<number | null>>;
    setIsCalendarVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsLoginVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setDbData: React.Dispatch<React.SetStateAction<any[]>>;
  }

  const ModalsContainer: React.FC<ModalsContainerProps> = ({
    GoogleSignin,
    currentUserId,
    isAccountsVisible,
    setIsAccountsVisible,
    isPostVisible,
    setIsPostVisible,
    selectedItem,
    setSelectedItem,
    selectedDate,
    isSettingsVisible,
    setIsSettingsVisible,
    setCurrentUserId,
    setIsCalendarVisible,
    setIsLoginVisible,
    setDbData,
  }) => {
    return (
      <>
          {currentUserId !== null && <AccountsModal isVisible={isAccountsVisible} onClose={() => setIsAccountsVisible(false)} currentUserId={currentUserId} GoogleSignin={GoogleSignin} setIsLoginVisible={setIsLoginVisible} setIsAccountsVisible={setIsAccountsVisible} setIsCalendarVisible={setIsCalendarVisible} />}

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
          onLogOut={() => logOutALL(setCurrentUserId, setIsSettingsVisible, setIsCalendarVisible, setIsLoginVisible)}
        />
      </>
    );
  };
  
  export default ModalsContainer;