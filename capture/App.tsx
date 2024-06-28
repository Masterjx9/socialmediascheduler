import React, { useState } from 'react';
import { TextInput, View, Text, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const App = () => {
  const [inputText, setInputText] = useState('');

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);
        if (
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('You can use the camera and access storage');
        } else {
          console.log('Permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      // iOS Permissions
      const cameraPermission = await request(PERMISSIONS.IOS.CAMERA);
      const storagePermission = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      if (cameraPermission !== RESULTS.GRANTED || storagePermission !== RESULTS.GRANTED) {
        console.log('Permission denied');
      }
    }
  };

  const takePicture = async () => {
    const options: CameraOptions = {
      durationLimit: 10,
      saveToPhotos: true,
      cameraType: 'back',
      mediaType: 'photo',
    };
    const result = await launchCamera(options);
    if (result.didCancel) {
      console.log('User cancelled image picker');
    } else if (result.errorCode) {
      console.log('ImagePicker Error: ', result.errorMessage);
    } else if (result.assets && result.assets.length > 0) {
      const data = result.assets[0];
      console.log(data.uri);

      const destinationPath = `${RNFS.ExternalStorageDirectoryPath}/DCIM/capturedImage.jpg`;
      if (await RNFS.exists(destinationPath)) {
        await RNFS.unlink(destinationPath);
      }
      console.log('Image saved to:', destinationPath);
    }
  };

  const capturePost = async () => {
    try {
      const filePath = `${RNFS.ExternalStorageDirectoryPath}/capturedText.txt`;
      await RNFS.writeFile(filePath, inputText, 'utf8');
      console.log('Text saved to:', filePath);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social media scheduler</Text>
      <View style={styles.captureContainer}>
        <TouchableOpacity onPress={takePicture} style={styles.capture}>
          <Text style={styles.captureText}>SNAP</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.captureContainer}>
        <TouchableOpacity onPress={capturePost} style={styles.capture}>
          <Text style={styles.captureText}>POST</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.textInput}
        placeholder="Enter text to save"
        value={inputText}
        onChangeText={setInputText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  title: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
  captureContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  capture: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
  captureText: {
    fontSize: 14,
  },
  textInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    margin: 20,
    padding: 10,
    color: 'white',
  },
});

export default App;