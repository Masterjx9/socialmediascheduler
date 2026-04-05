module.exports = {
  dependencies: {
    // DocumentPicker's Windows project targets an older UAP SDK and breaks RNW 0.74 builds.
    "react-native-document-picker": {
      platforms: {
        windows: null,
      },
    },
    // DateTimePicker requires Windows SDK 10.0.18362.0 in this setup.
    "@react-native-community/datetimepicker": {
      platforms: {
        windows: null,
      },
    },
    "react-native-sqlite-storage": {
      platforms: {
        windows: null,
      },
    },
    "react-native-permissions": {
      platforms: {
        windows: null,
      },
    },
  },
};
