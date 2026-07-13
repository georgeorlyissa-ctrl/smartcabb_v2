import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartcabb.app',
  appName: 'SmartCabb',
  webDir: 'dist',
  server: {
    url: 'https://www.smartcabb.com/app/passenger?platform=apk',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: null,
      keystorePassword: null,
      keystoreAlias: null,
      keystoreAliasPassword: null,
    },
  },
};

export default config;
