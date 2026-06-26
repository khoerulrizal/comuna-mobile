// Metro config: enable importing .svg files as React components via react-native-svg-transformer.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer/expo",
);
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg",
);
config.resolver.sourceExts.push("svg");

// Model TFLite (pencocokan wajah on-device) di-bundle sebagai aset biner.
config.resolver.assetExts.push("tflite");

module.exports = config;
