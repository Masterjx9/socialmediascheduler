import { Platform } from "react-native";

type ResizeResult = { uri: string };

let NativeImageResizer: any = null;
try {
  NativeImageResizer =
    require("@bam.tech/react-native-image-resizer").default ??
    require("@bam.tech/react-native-image-resizer");
} catch (_e) {
  NativeImageResizer = null;
}

const ImageResizer = {
  async createResizedImage(
    uri: string,
    width: number,
    height: number,
    format: string,
    quality: number,
    rotation: number,
    outputPath?: string,
    keepMeta?: boolean,
    options?: any
  ): Promise<ResizeResult> {
    if (Platform.OS === "windows") {
      return { uri };
    }

    if (NativeImageResizer?.createResizedImage) {
      return NativeImageResizer.createResizedImage(
        uri,
        width,
        height,
        format,
        quality,
        rotation,
        outputPath,
        keepMeta,
        options
      );
    }

    // Fallback for platforms/builds where native module is not linked.
    return { uri };
  },
};

export default ImageResizer;
