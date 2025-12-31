const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add support for .cjs files (required for Firebase v10+)
config.resolver.sourceExts.push("cjs");

// Disable Metro's unstable_enablePackageExports to avoid Firebase module resolution issues
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
