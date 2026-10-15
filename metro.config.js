// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ml/ holds training data, Python envs and llama.cpp — not app code. Keeping Metro out of it
// avoids watching hundreds of MB of photos.
config.resolver.blockList = [new RegExp(`^${path.resolve(__dirname, 'ml').replace(/[/\\]/g, '[/\\\\]')}[/\\\\].*`)];

module.exports = config;
