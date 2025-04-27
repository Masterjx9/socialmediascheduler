import DocumentPicker, { types } from 'react-native-document-picker';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

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
        return res.map((file) => file.uri);
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User canceled the picker');
      } else {
        console.error('Unknown error:', err);
      }
    }
  };