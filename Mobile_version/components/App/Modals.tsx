import AccountsModal from '../Modals/AccountsModal';
import SettingsModal from '../Modals/SettingsModal';
import PostModal from '../Modals/PostModal';
import { handlePost } from '../../lib/Helpers/postHelper';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import React from 'react';
import type { SocialMediaAccount } from '../../types/SociaMedia';
import { onDayPress } from '../../lib/Helpers/dateHelper';

interface ModalsContainerProps {
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
    imageResizeNeeded: boolean;
    setImageResizeNeeded: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedFile: React.Dispatch<React.SetStateAction<string>>;
    imageResizeOptions: "portrait" | "landscape" | "square";
    setImageResizeOptions: React.Dispatch<React.SetStateAction<"portrait" | "landscape" | "square">>;
    unsupportedAudioCodec: boolean;
    setUnsupportedAudioCodec: React.Dispatch<React.SetStateAction<boolean>>;
    youtubeTitle: string;
    setYoutubeTitle: React.Dispatch<React.SetStateAction<string>>;
    contentPrivacy: 'public' | 'private' | 'unlisted';
    isMadeForKids: boolean;
    setIsMadeForKids: React.Dispatch<React.SetStateAction<boolean>>;
    setContentPrivacy: React.Dispatch<React.SetStateAction<'public' | 'private' | 'unlisted'>>;
    accounts: SocialMediaAccount[];
    setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>;
    youtubeCategory?: string | number;
    setYoutubeCategory?: React.Dispatch<React.SetStateAction<number>>
    selectedThumbnail: { uri: string; type: string; name: string } | null;
    setSelectedThumbnail: React.Dispatch<React.SetStateAction<{ uri: string; type: string; name: string } | null>>;
    youtubeTags: string;
    setYoutubeTags: React.Dispatch<React.SetStateAction<string>>;
    calendarMode: 'day' | 'month';
    setCalendarMode: React.Dispatch<React.SetStateAction<'day' | 'month'>>;
    lastDayPressed: any;
    setLastDayPressed: React.Dispatch<React.SetStateAction<any>>;
    setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  }

  const ModalsContainer: React.FC<ModalsContainerProps> = ({
    contentMode,
    imageResizeNeeded,
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
    setImageResizeNeeded,
    setSelectedFile,
    imageResizeOptions,
    setImageResizeOptions,
    unsupportedAudioCodec,
    setUnsupportedAudioCodec,
    youtubeTitle,
    setYoutubeTitle,
    contentPrivacy,
    setContentPrivacy,
    isMadeForKids,
    setIsMadeForKids,
    accounts,
    setAccounts,
    youtubeCategory,
    selectedThumbnail,
    setSelectedThumbnail,
    setYoutubeCategory,
    youtubeTags,
    setYoutubeTags,
    calendarMode,
    setCalendarMode,
    lastDayPressed,
    setLastDayPressed,
    setSelectedDate
  }) => {
    return (
      <>
          
          <AccountsModal 
            isVisible={isAccountsVisible} 
            onClose={() => setIsAccountsVisible(false)} 
            setIsLoginVisible={setIsLoginVisible} 
            setIsAccountsVisible={setIsAccountsVisible} 
            setIsCalendarVisible={setIsCalendarVisible} 
            isTwitterLoginVisible={isTwitterLoginVisible}
            setIsTwitterLoginVisible={setIsTwitterLoginVisible}
            accounts={accounts}
            setAccounts={setAccounts}
          />

        <PostModal
        isMadeForKids={isMadeForKids}
          setIsMadeForKids={setIsMadeForKids}
          selectedThumbnail={selectedThumbnail}
          setSelectedThumbnail={setSelectedThumbnail}
          youtubeCategory={youtubeCategory}
          setYoutubeCategory={setYoutubeCategory}
          youtubeTags={youtubeTags}
          setYoutubeTags={setYoutubeTags}
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
              let finalFile = selectedFile;
              if (contentMode === "image") {
              if (imageResizeNeeded === true) {
                console.log('Image resize needed:', imageResizeNeeded);
                console.log('Image resize options:', imageResizeOptions);
                let resizeWidth: number;
                let resizeHeight: number;
                if (imageResizeOptions === "portrait") {
                  console.log('Portrait mode selected');
                  resizeWidth = 1080;
                  resizeHeight = 1350;
                }
                else if (imageResizeOptions === "landscape") {
                  console.log('Landscape mode selected');
                  resizeWidth = 1350;
                  resizeHeight = 1080;
                } else if (imageResizeOptions === "square") {
                  console.log('Square mode selected');
                  resizeWidth = 1080;
                  resizeHeight = 1080;
                } else {
                  console.log('Invalid image resize option selected');
                  return;
                }
                const result = await ImageResizer.createResizedImage(selectedFile,
                  resizeWidth, resizeHeight, 'JPEG', 100, 0, undefined, false, { mode: 'stretch' });
                console.log('Original image URI:', selectedFile);
                finalFile = result.uri;
                await setSelectedFile(result.uri);
                console.log('Resized image URI:', finalFile);
                }
              }
              console.log('Final file to be posted:', finalFile);
              await handlePost(
                contentMode, 
                finalFile, 
                contentDescription, 
                unixTimestamp, 
                setDbData, 
                setIsPostVisible, 
                setSelectedItem, 
                content_id, 
                user_providers, 
                youtubeTitle, 
                contentPrivacy,
                isMadeForKids,
                selectedThumbnail?.uri,
                youtubeCategory,
                youtubeTags
              );
              onDayPress(lastDayPressed, setSelectedDate, setDbData, calendarMode);
              
            }
          }
          selectedDate={selectedDate}
          item={selectedItem}
          contentMode={contentMode} 
          imageResizeNeeded={imageResizeNeeded}
          imageResizeOptions={imageResizeOptions}
          setImageResizeOptions={setImageResizeOptions}
          unsupportedAudioCodec={unsupportedAudioCodec}
          setUnsupportedAudioCodec={setUnsupportedAudioCodec}
          youtubeTitle={youtubeTitle}
          setYoutubeTitle={setYoutubeTitle}
          contentPrivacy={contentPrivacy}
          setContentPrivacy={setContentPrivacy}
          accounts={accounts}
          setAccounts={setAccounts}
        />
        
        <SettingsModal
          isVisible={isSettingsVisible}
          onClose={() => setIsSettingsVisible(false)}
        />
      </>
    );
  };
  
  export default ModalsContainer;