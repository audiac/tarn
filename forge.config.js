const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const entitlementsPath = path.join(__dirname, 'build/entitlements.mac.plist');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.join(__dirname, 'build/icons/icon'),
    // @electron/osx-sign's per-binary deep-signing leaves the nested
    // "Electron Framework" with its original (non-ad-hoc) signature in this
    // toolchain version, which dyld then refuses to load next to our
    // ad-hoc-signed main executable ("different Team IDs"). A single plain
    // `codesign --deep` pass after packaging signs every nested binary
    // consistently and reliably launches.
    osxSign: false,
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'Markdown Document',
          CFBundleTypeRole: 'Editor',
          LSHandlerRank: 'Alternate',
          LSItemContentTypes: ['net.daringfireball.markdown'],
          CFBundleTypeExtensions: ['md', 'markdown'],
        },
      ],
      UTExportedTypeDeclarations: [
        {
          UTTypeIdentifier: 'net.daringfireball.markdown',
          UTTypeDescription: 'Markdown Document',
          UTTypeConformsTo: ['public.plain-text'],
          UTTypeTagSpecification: { 'public.filename-extension': ['md', 'markdown'] },
        },
      ],
    },
    afterComplete: [
      (buildPath, electronVersion, platform, arch, callback) => {
        if (platform !== 'darwin') {
          callback();
          return;
        }
        const appName = fs.readdirSync(buildPath).find((f) => f.endsWith('.app'));
        if (!appName) {
          callback();
          return;
        }
        const appPath = path.join(buildPath, appName);
        execFile(
          'codesign',
          ['--deep', '--force', '--sign', '-', '--entitlements', entitlementsPath, appPath],
          (err) => callback(err),
        );
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
