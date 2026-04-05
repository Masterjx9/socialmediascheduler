import { Platform } from "react-native";

type AnyFn = (...args: any[]) => any;

let RNFS: any = null;
try {
  // Keep dynamic require so app can boot even when native module is unavailable on Windows.
  RNFS = require("react-native-fs").default ?? require("react-native-fs");
} catch (_e) {
  RNFS = null;
}

const notImplemented: AnyFn = async () => {
  throw new Error("react-native-fs is not available on this platform/build.");
};

const windowsStub = {
  DocumentDirectoryPath: "",
  TemporaryDirectoryPath: "",
  CachesDirectoryPath: "",
  ExternalDirectoryPath: "",
  LibraryDirectoryPath: "",
  MainBundlePath: "",
  exists: async () => false,
  writeFile: async () => undefined,
  mkdir: async () => undefined,
  copyFile: notImplemented,
  readDir: async () => [],
  read: notImplemented,
  readFile: notImplemented,
  stat: notImplemented,
};

const hasFsFns =
  RNFS &&
  typeof RNFS.readFile === "function" &&
  typeof RNFS.writeFile === "function" &&
  typeof RNFS.exists === "function" &&
  typeof RNFS.mkdir === "function";

const candidatePaths =
  RNFS
    ? [
        RNFS.DocumentDirectoryPath,
        RNFS.TemporaryDirectoryPath,
        RNFS.CachesDirectoryPath,
        RNFS.ExternalDirectoryPath,
        RNFS.LibraryDirectoryPath,
        RNFS.MainBundlePath,
      ].filter((v: any) => typeof v === "string" && v.length > 0)
    : [];

const hasWorkingRNFS =
  hasFsFns && candidatePaths.length > 0;

const normalizedWindowsRNFS =
  hasWorkingRNFS
    ? {
        ...RNFS,
        DocumentDirectoryPath:
          RNFS.DocumentDirectoryPath || candidatePaths[0],
        TemporaryDirectoryPath:
          RNFS.TemporaryDirectoryPath ||
          RNFS.CachesDirectoryPath ||
          candidatePaths[0],
      }
    : windowsStub;

if (Platform.OS === "windows") {
  console.log(
    `[RNFS Compat] hasFsFns=${Boolean(hasFsFns)} candidatePaths=${candidatePaths.length} usingStub=${!hasWorkingRNFS}`
  );
}

const safeRNFS =
  Platform.OS === "windows"
    ? normalizedWindowsRNFS
    : (RNFS ?? windowsStub);

export default safeRNFS;
