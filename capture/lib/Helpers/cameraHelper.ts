import { launchCamera, CameraOptions, ImagePickerResponse } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { requestPermissions } from '../Services/permissionService';

/* ─── helpers ─────────────────────────────────────────────────────────── */

const saveToGallery = async (res: ImagePickerResponse) => {
  if (!res.assets?.length) return;

  const asset     = res.assets[0];
  const extension = asset.type?.includes('video') ? '.mp4' : '.jpg';
  const destPath  = `${RNFS.ExternalStorageDirectoryPath}/DCIM/captured_${Date.now()}${extension}`;

  await RNFS.copyFile(asset.uri!, destPath);
  console.log('Saved to', destPath);
};

/* ─── unified PHOTO / VIDEO capture ───────────────────────────────────── */

export async function captureMedia(kind: 'photo' | 'video') {
  await requestPermissions();               // camera + (for video) microphone

  const options: CameraOptions = {
    mediaType      : kind === 'video' ? 'video' : 'photo',
    saveToPhotos   : true,                  // let system gallery manage it
    videoQuality   : 'high',                // 720p/1080p (Android & iOS)
    cameraType     : 'back',
    durationLimit : kind === 'video' ? 5 : undefined, // max 60s for video
  };

  const res = await launchCamera(options);

  // if (res.didCancel)          return console.log('User cancelled');
  if (res.errorCode)          return console.log('Error:', res.errorMessage);

  console.log('Captured', kind, 'with URI:', res);
  await saveToGallery(res);
}

/* ─── quick wrappers, if you prefer ───────────────────────────────────── */

export const takePicture = () => captureMedia('photo');
export const recordVideo = () => captureMedia('video');
