# LG webOS and Samsung Tizen builds

The application UI and business logic are shared. `NEXT_PUBLIC_TV_PLATFORM`
selects only the native adapter, remote registration, manifest, and packaging
behavior.

## Build

```bash
npm run build:webos:dev
npm run build:webos:stage
npm run build:webos:prod

npm run build:tizen:dev
npm run build:tizen:stage
npm run build:tizen:prod
```

Build output is staged separately:

- `dist/webos` contains `appinfo.json` and `webOSTV.js`.
- `dist/tizen` contains `config.xml` and excludes LG-only files.

The existing `build:dev`, `build:stage`, and `build:prod` commands remain webOS
aliases for backward compatibility.

## Package

```bash
npm run package:webos
TIZEN_CERT_PROFILE="your-tizen-studio-profile" npm run package:tizen
```

The Tizen certificate profile must already exist in Tizen Studio. Certificates,
passwords, and signing material must not be committed.

## Samsung values to replace

Before Seller Office submission, update `platforms/tizen/config.xml` with the
assigned values:

- Widget ID (`widget id`)
- Ten-character Tizen package ID (`tizen:application package`)
- Full Tizen application ID (`tizen:application id`)
- Minimum supported Tizen version, if different from `4.0`
- Final Samsung application/store ID in `NEXT_PUBLIC_SAMSUNG_APP_ID`
- Production icon and Seller Office metadata

## Hardware validation

Test on each minimum supported TV generation:

- D-pad, Enter, Back, long/repeated key presses
- Play, Pause, Play/Pause, Stop, Fast Forward, and Rewind
- Channel, color, and Info keys where present on the remote
- Back ownership for player controls, menus, modals, search, and asset detail
- Root-screen exit confirmation and native exit/deactivation
- Suspend/resume, network recovery, DRM playback, subtitles, and ads
- App-store update deep link
- Cold-start performance and memory behavior
