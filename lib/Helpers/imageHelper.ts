  import { Image } from 'react-native';



export async function validateImageSize(contentDataPath: string, imageResizeNeeded: boolean, mode: string) { 
    try {
      const { width, height } = await new Promise<{ width: number; height: number }>((ok, err) =>
        Image.getSize(contentDataPath, (w, h) => ok({ width: w, height: h }), err)
      );
        console.log('Image dimensions:', width, height);
      if (mode === 'instagram_image') {
        console.log('Instagram image mode detected');
      const aspectRatio = width / height;
      if (aspectRatio < 0.8 || aspectRatio > 1.91) {
        imageResizeNeeded = true;
      } else {
        imageResizeNeeded = false;
      }
      console.log('Image resize needed:', imageResizeNeeded);
      return imageResizeNeeded;
    }
    return imageResizeNeeded;
    } catch (error) {
      console.error('Error validating image size:', error);
      imageResizeNeeded = false;
    return imageResizeNeeded;
    }
  }
  
