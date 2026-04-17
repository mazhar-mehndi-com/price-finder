const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env if available
dotenv.config();

const config = {
  chromeExecutablePath: process.env.CHROME_EXECUTABLE_PATH,
  userDataDir: process.env.USER_DATA_DIR,
  profileName: process.env.CHROME_PROFILE_NAME || 'Default',
  outputFormat: process.env.OUTPUT_FORMAT || 'json',
  activeListingsUrl: 'https://www.ebay.com/sh/lst/active',
};

function validateConfig() {
  const missing = [];
  if (!config.chromeExecutablePath) missing.push('CHROME_EXECUTABLE_PATH');
  if (!config.userDataDir) missing.push('USER_DATA_DIR');
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration in .env: ${missing.join(', ')}`);
  }
  return config;
}

module.exports = {
  config,
  validateConfig
};
