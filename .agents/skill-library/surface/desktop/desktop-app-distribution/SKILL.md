---
name: desktop-app-distribution
description: Desktop application packaging, code signing, auto-update mechanisms, and distribution channels for macOS, Windows, and Linux. Use when building or shipping desktop applications that need reliable installation and update flows.
version: 1.0.0
---

# Desktop App Distribution

Package, sign, and distribute desktop applications with reliable auto-update across macOS, Windows, and Linux.

## Code Signing

Unsigned applications trigger security warnings and may be blocked entirely. Code signing is mandatory for production distribution.

### macOS (Apple Notarization)

| Step | What Happens | Tool |
|------|-------------|------|
| 1. Sign with Developer ID | Embeds your identity in the binary | `codesign` |
| 2. Submit for notarization | Apple scans for malware | `notarytool` |
| 3. Staple ticket | Embeds notarization result in the app | `stapler` |

```bash
# Sign the app bundle
codesign --deep --force --options runtime \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --entitlements entitlements.plist \
  MyApp.app

# Submit for notarization
xcrun notarytool submit MyApp.dmg \
  --apple-id "dev@example.com" \
  --team-id "TEAM_ID" \
  --password "@keychain:AC_PASSWORD" \
  --wait

# Staple the notarization ticket
xcrun stapler staple MyApp.dmg
```

**Entitlements** required for notarization:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

**Rule**: Hardened runtime (`--options runtime`) is required for notarization. Test with hardened runtime early -- it can break JIT, unsigned dylibs, and memory-mapped files.

### Windows (Authenticode)

| Certificate Type | Trust Level | Cost |
|-----------------|-------------|------|
| Standard Code Signing | SmartScreen warning for new publishers | ~$70/year |
| EV Code Signing | Immediate SmartScreen trust | ~$300/year, requires hardware token |

```bash
# Sign with signtool (Windows SDK)
signtool sign /f certificate.pfx /p password \
  /tr http://timestamp.digicert.com /td sha256 \
  /fd sha256 MyApp.exe

# Sign with Azure Trusted Signing (no hardware token)
# Requires Azure subscription and Trusted Signing account
az trustedsigning sign \
  --account-name my-signing-account \
  --certificate-profile-name my-profile \
  --file MyApp.exe
```

**Rule**: Always include a timestamp (`/tr`). Without it, the signature becomes invalid when the certificate expires.
**Rule**: EV certificates are stored on hardware tokens (USB). CI/CD requires cloud-based signing services (Azure Trusted Signing, AWS Signer, or DigiCert KeyLocker).

### Linux

Linux does not have a centralized signing authority. Options:

| Method | Use Case |
|--------|----------|
| GPG signing | Sign packages and release artifacts for manual verification |
| AppImage signatures | `--sign` flag with GPG key |
| Snap store | Automatic signing when uploading to Snap Store |
| Flatpak | Signed with the repository's GPG key |

```bash
# GPG sign a release artifact
gpg --detach-sign --armor MyApp-1.0.0.AppImage
# Users verify with: gpg --verify MyApp-1.0.0.AppImage.asc
```

## Installer Creation

### macOS: DMG

```bash
# Create DMG with background image and Applications symlink
create-dmg \
  --volname "MyApp" \
  --volicon "icon.icns" \
  --background "dmg-background.png" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "MyApp.app" 150 190 \
  --app-drop-link 450 190 \
  --hide-extension "MyApp.app" \
  "MyApp-1.0.0.dmg" \
  "build/MyApp.app"
```

### Windows: MSI / MSIX

| Format | Tooling | Features |
|--------|---------|----------|
| MSI | WiX Toolset | Traditional installer, IT-friendly, Group Policy deployment |
| MSIX | MSIX Packaging Tool | Modern, sandboxed, auto-update via App Installer |
| NSIS | NSIS compiler | Highly customizable, traditional .exe installer |
| Squirrel.Windows | electron-winstaller | No UAC prompt, per-user install, delta updates |

```typescript
// electron-builder configuration for Windows
// electron-builder.yml
win:
  target:
    - target: nsis
      arch: [x64, arm64]
  sign: true
  signingHashAlgorithms: [sha256]
  certificateFile: ${env.WIN_CERT_FILE}
  certificatePassword: ${env.WIN_CERT_PASSWORD}

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
```

### Linux: AppImage, deb, rpm, snap, Flatpak

| Format | Distribution | Auto-update | Sandboxed |
|--------|-------------|-------------|-----------|
| AppImage | Direct download, no install | Via AppImageUpdate | No |
| .deb | Debian/Ubuntu repos, PPA | Via apt | No |
| .rpm | Fedora/RHEL repos, COPR | Via dnf/yum | No |
| Snap | Snap Store | Automatic | Yes |
| Flatpak | Flathub | Automatic | Yes |

```yaml
# electron-builder.yml - Linux targets
linux:
  target:
    - target: AppImage
      arch: [x64, arm64]
    - target: deb
      arch: [x64, arm64]
    - target: rpm
      arch: [x64]
    - target: snap
      arch: [x64]
  category: Utility
  icon: build/icons
  desktop:
    StartupWMClass: my-app
```

## Auto-Update Mechanisms

### Electron: electron-updater

```typescript
// Main process - auto-update setup
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

autoUpdater.logger = log;
autoUpdater.autoDownload = false; // Let user decide

autoUpdater.on('update-available', (info) => {
  // Notify renderer to show update UI
  mainWindow.webContents.send('update-available', {
    version: info.version,
    releaseNotes: info.releaseNotes,
    releaseDate: info.releaseDate,
  });
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('update-progress', {
    percent: progress.percent,
    bytesPerSecond: progress.bytesPerSecond,
    transferred: progress.transferred,
    total: progress.total,
  });
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

// Check for updates periodically
setInterval(() => {
  autoUpdater.checkForUpdates();
}, 4 * 60 * 60 * 1000); // Every 4 hours

// IPC handler for user-initiated install
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});
```

### Tauri: Built-in Updater

```rust
// tauri.conf.json
{
  "tauri": {
    "updater": {
      "active": true,
      "dialog": true,
      "endpoints": [
        "https://releases.example.com/{{target}}/{{arch}}/{{current_version}}"
      ],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ..."
    }
  }
}
```

```json
// Server response format for Tauri updater
{
  "version": "1.2.0",
  "notes": "Bug fixes and performance improvements",
  "pub_date": "2026-02-16T00:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "base64-signature",
      "url": "https://releases.example.com/MyApp-1.2.0-x86_64.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "base64-signature",
      "url": "https://releases.example.com/MyApp-1.2.0-aarch64.app.tar.gz"
    },
    "linux-x86_64": {
      "signature": "base64-signature",
      "url": "https://releases.example.com/MyApp-1.2.0-x86_64.AppImage.tar.gz"
    },
    "windows-x86_64": {
      "signature": "base64-signature",
      "url": "https://releases.example.com/MyApp-1.2.0-x64-setup.nsis.zip"
    }
  }
}
```

### macOS: Sparkle

```swift
// Sparkle integration for non-Electron macOS apps
import Sparkle

let updaterController = SPUStandardUpdaterController(
    startingUpdater: true,
    updaterDelegate: nil,
    userDriverDelegate: nil
)

// Appcast.xml hosted at a stable URL
// Sparkle checks this XML for new versions
```

## Delta Updates

Full downloads for every update waste bandwidth. Delta updates send only the changed bytes.

| Tool | Delta Support | Platform |
|------|--------------|----------|
| electron-updater | Yes (blockmap-based) | All |
| Tauri updater | No (full replacement) | All |
| Sparkle | Yes (binary diff) | macOS |
| MSIX | Yes (built-in) | Windows |
| Snap | Yes (built-in) | Linux |

```yaml
# electron-builder.yml - Enable delta updates
publish:
  provider: github
  releaseType: release

# electron-builder automatically generates .blockmap files
# for NSIS and DMG targets, enabling differential downloads
```

## Rollback Strategies

| Strategy | Implementation |
|----------|---------------|
| Keep previous version | Installer preserves previous version in backup directory |
| Version pinning | Users can pin to a specific version via settings |
| Server-side rollback | Update server returns previous version as "latest" |
| Staged rollout | Roll out to 5% first, expand if crash-free rate is stable |

```typescript
// Simple rollback: keep previous version
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(app.getPath('userData'), 'previous-version');

autoUpdater.on('before-quit-for-update', () => {
  // Save current version info for potential rollback
  const currentInfo = {
    version: app.getVersion(),
    path: app.getAppPath(),
    timestamp: Date.now(),
  };
  fs.writeFileSync(
    path.join(BACKUP_DIR, 'rollback-info.json'),
    JSON.stringify(currentInfo)
  );
});
```

## CI/CD for Desktop Builds

```yaml
# GitHub Actions - Cross-platform desktop build
name: Build Desktop App

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            platform: mac
          - os: windows-latest
            platform: win
          - os: ubuntu-latest
            platform: linux

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      # macOS: import signing certificate
      - name: Import macOS certs
        if: matrix.platform == 'mac'
        uses: apple-actions/import-codesign-certs@v2
        with:
          p12-file-base64: ${{ secrets.MAC_CERTS_P12 }}
          p12-password: ${{ secrets.MAC_CERTS_PASSWORD }}

      # Build and publish
      - name: Build
        run: npx electron-builder --${{ matrix.platform }} --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
```

## Distribution Channels

| Channel | Pros | Cons |
|---------|------|------|
| **Direct download** (website) | Full control, no revenue share | No auto-discovery, manual updates unless built-in |
| **GitHub Releases** | Free hosting, electron-updater integration | Requires GitHub account to star/watch |
| **Mac App Store** | Discovery, trusted, sandboxed | 30% cut, sandbox restrictions, review delays |
| **Microsoft Store** | Discovery, MSIX auto-update | 15% cut (reduced from 30%), limited API access |
| **Snap Store** | Ubuntu default, auto-update | Snap confinement can break some apps |
| **Flathub** | Cross-distro, sandboxed, auto-update | Flatpak runtime overhead |
| **Homebrew Cask** | Developer-friendly install | macOS only, requires formula maintenance |
| **winget** | Windows CLI install | Requires manifest in winget-pkgs repo |

## Output Checklist

- [ ] Code signed for all target platforms
- [ ] macOS app notarized and stapled
- [ ] Windows installer signed with timestamp
- [ ] Installers created for each platform (DMG, NSIS/MSIX, AppImage/deb)
- [ ] Auto-update mechanism configured and tested
- [ ] Delta updates enabled where supported
- [ ] Rollback strategy defined
- [ ] CI/CD pipeline builds all platforms on tag push
- [ ] Distribution channel selected and configured
- [ ] Update server or GitHub Releases configured for serving updates
- [ ] Crash monitoring active for post-update verification
