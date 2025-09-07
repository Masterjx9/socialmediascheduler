const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const config = {
  resolver: {
    extraNodeModules: {
      stream: path.resolve(__dirname, 'node_modules/stream-browserify'),
      events: path.resolve(__dirname, 'node_modules/events'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
