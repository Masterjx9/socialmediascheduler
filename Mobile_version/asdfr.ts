import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { RNCamera, RNCameraProps } from 'react-native-camera';

interface CameraProps extends RNCameraProps {
  camera: RNCamera;
  status: string;
  recordAudioPermissionStatus: string;
}

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [cameraType, setCameraType] = useState(RNCamera.Constants.Type.back);
  const [flashMode, setFlashMode] = useState(RNCamera.Constants.FlashMode.off);

  const takePicture = async (camera: RNCamera) => {
    if (camera) {
      const options = { quality: 0.5, base64: true };
      const data = await camera.takePictureAsync(options);
      console.log(data.uri);
      // Here you can save the picture to your social media scheduler
    }
  };

  const recordVideo = async (camera: RNCamera) => {
    if (camera) {
      if (isRecording) {
        camera.stopRecording();
      } else {
        setIsRecording(true);
        const options = { quality: RNCamera.Constants.VideoQuality['480p'] };
        const data = await camera.recordAsync(options);
        setIsRecording(false);
        console.log(data.uri);
        // Here you can save the video to your social media scheduler
      }
    }
  };

  const renderCamera = ({ camera, status }: CameraProps) => {
    if (status !== 'READY') return <View />;
    return (
      <View style={styles.controlContainer}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={() => takePicture(camera)}
        >
          <Text style={styles.buttonText}> SNAP </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={() => recordVideo(camera)}
        >
          <Text style={styles.buttonText}>
            {isRecording ? 'STOP' : 'REC'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <RNCamera
        style={styles.preview}
        type={cameraType}
        flashMode={flashMode}
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use your camera',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
        androidRecordAudioPermissionOptions={{
          title: 'Permission to use audio recording',
          message: 'We need your permission to use your audio',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
      >
        {(props: CameraProps) => renderCamera(props)}
      </RNCamera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  controlContainer: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  captureButton: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
  buttonText: {
    fontSize: 14,
  },
});

export default App;
