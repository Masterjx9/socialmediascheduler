import DocumentPicker, { types } from 'react-native-document-picker';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { NativeModules } from 'react-native';
const { MediaMetadataRetrieverModule } = NativeModules;
import RNFS from 'react-native-fs';


export const detectAudioCodec = async (uri: string) => {
  const codec = await MediaMetadataRetrieverModule.getAudioCodec(
    uri.replace('file://', '')
  );
  console.log('Audio codec:', codec);   // ==> "audio/mp4a-latm", "audio/opus", etc.
  return codec;
};
export const handleFileImport = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [types.images, types.video],
      });

      if (res && res.length > 0) {
        res.forEach((file) => {
          console.log('Selected file:', file);

        });
        // return all the files selected
        return res.map((file) => ({ uri: file.uri, type: file.type, name: file.name }));

      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User canceled the picker');
      } else {
        console.error('Unknown error:', err);
      }
    }
  };

  export const handleThumbnailImport = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [types.images],
      });

      if (res && res.length > 0) {
        res.forEach((file) => {
          console.log('Selected file:', file);

        });
        // return all the files selected
        return res.map((file) => ({ uri: file.uri, type: file.type, name: file.name }));

      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User canceled the picker');
      } else {
        console.error('Unknown error:', err);
      }
    }
  };

  export async function copyToScheduledContent(contentUri: string, fileName: string): Promise<string> {
    const scheduledContentDir = `${RNFS.DocumentDirectoryPath}/scheduledContent`;
  
    // Make sure the folder exists
    const exists = await RNFS.exists(scheduledContentDir);
    if (!exists) {
      await RNFS.mkdir(scheduledContentDir);
    }
  
    // Generate a random filename or use the original name if you can extract it
    // const filename = `content_${Date.now()}.jpg`; // or .png depending on your picker
    const filename = `content_${Date.now()}_${fileName}`;
    const destPath = `${scheduledContentDir}/${filename}`;
  
    await RNFS.copyFile(contentUri, destPath);
    console.log('File copied to scheduled content folder:', destPath);
  
    return 'file://' + destPath;
  }