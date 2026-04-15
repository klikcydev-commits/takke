# Development Build Guide

> **Why can't I use Expo Go?**
>
> Expo Go does **not** register custom URL schemes (like `marketplace://`). This means OAuth redirects (Google, Apple) and Magic Link deep links will fail — the browser has nowhere to redirect back to.
>
> A **development build** compiles a real native app with your custom scheme registered in the OS, so redirects work correctly.

---

## Prerequisites

Make sure you've run prebuild to generate native project files:

```bash
npx expo prebuild --clean
```

---

## Option 1: Android — Physical Device (Recommended)

The fastest way to test on Windows.

### Step 1: Enable Developer Mode on your phone

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times until you see "You are now a developer"
3. Go back to **Settings → Developer Options**
4. Enable **USB Debugging**

### Step 2: Connect your phone

1. Connect your Android phone to your PC via USB cable
2. When prompted on the phone, tap **Allow USB Debugging**
3. Verify the connection:

```bash
adb devices
```

You should see your device listed (e.g. `XXXXXXXX device`).

> **Note:** If `adb` is not found, you need to install [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools) and add it to your PATH.

### Step 3: Build and run

```bash
npx expo run:android
```

This will:
- Compile the native Android project
- Install the app on your connected device
- Start Metro bundler automatically

The first build takes 5–10 minutes. Subsequent builds are much faster.

### Step 4: Development workflow

After the initial build, you can use:

```bash
npx expo start --dev-client
```

This starts Metro without rebuilding. The app on your phone will connect automatically. You only need to rebuild (`npx expo run:android`) when you change native code or add new native dependencies.

---

## Option 2: Android — Emulator

If you don't have a physical Android device.

### Step 1: Install Android Studio

1. Download [Android Studio](https://developer.android.com/studio)
2. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform Tools
   - Android Virtual Device (AVD)

### Step 2: Set up environment variables

Add these to your system environment variables:

```
ANDROID_HOME = C:\Users\<YOUR_USERNAME>\AppData\Local\Android\Sdk
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\emulator
```

### Step 3: Create a virtual device

1. Open Android Studio
2. Go to **Tools → Device Manager** (or **Virtual Device Manager**)
3. Click **Create Device**
4. Choose a device (e.g. **Pixel 7**)
5. Select a system image (e.g. **API 34 — Android 14**)
6. Click **Finish**

### Step 4: Start the emulator and run

1. Start the emulator from Android Studio's Device Manager
2. Run:

```bash
npx expo run:android
```

---

## Option 3: iOS — EAS Build (Cloud)

Since you're on **Windows**, you cannot build iOS apps locally (requires macOS + Xcode). Use **EAS Build** to build in the cloud.

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Log in to Expo

```bash
eas login
```

Create an account at [expo.dev](https://expo.dev) if you don't have one.

### Step 3: Configure EAS

```bash
eas build:configure
```

This creates an `eas.json` file. Make sure it has a development profile:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### Step 4: Register your iOS device

```bash
eas device:create
```

This generates a URL — open it on your **iPhone** to install a provisioning profile. This registers your device for development builds.

> **Important:** You need an [Apple Developer Account](https://developer.apple.com/) ($99/year) to install on a physical iOS device.

### Step 5: Build

```bash
eas build --platform ios --profile development
```

The build runs in the cloud (takes ~10–15 minutes). When done, you'll get a QR code or URL to install the app on your registered iPhone.

### Step 6: Run

After installing the development build on your iPhone:

```bash
npx expo start --dev-client
```

Scan the QR code from your iPhone's camera to connect to Metro.

---

## Option 4: iOS — Simulator (macOS only)

If you have access to a Mac:

```bash
npx expo run:ios
```

This launches the iOS Simulator and installs the development build automatically.

---

## Troubleshooting

### `adb devices` shows no devices
- Make sure USB Debugging is enabled on your phone
- Try a different USB cable (some cables are charge-only)
- Install [Android USB drivers](https://developer.android.com/studio/run/oem-usb) for your phone manufacturer

### `ANDROID_HOME` not set
```bash
# Check if it's set:
echo $ANDROID_HOME

# Set it (add to ~/.bashrc or ~/.zshrc):
export ANDROID_HOME=$HOME/AppData/Local/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Build fails with Gradle errors
```bash
# Clean and retry:
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Metro bundler port conflict
```bash
# Kill the process on port 8081:
npx kill-port 8081

# Or use a different port:
npx expo start --port 8082
```

### OAuth redirect still not working
1. Verify `marketplace://` is in your `app.json` under `"scheme"`
2. Verify redirect URLs are added in [Supabase Dashboard → Auth → URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration):
   - `marketplace://google-auth`
   - `marketplace://apple-auth`
   - `marketplace://email-auth`
   - `marketplace://**`
3. Make sure you're using the **development build**, not Expo Go
4. Check Metro logs for errors after the redirect

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npx expo prebuild --clean` | Generate/regenerate native projects |
| `npx expo run:android` | Build & install on Android device/emulator |
| `npx expo run:ios` | Build & install on iOS simulator (macOS only) |
| `npx expo start --dev-client` | Start Metro for an existing dev build |
| `eas build --platform ios --profile development` | Cloud build for iOS |
| `eas build --platform android --profile development` | Cloud build for Android |

# Android `std::format` Build Fix

**Claude's solution is spot-on** - the root cause is React Native 0.81.5's `graphicsConversions.h` using C++20 `std::format` which the Android NDK (targeting older APIs) can't handle.

## 1. Permanent Fix (patch-package)

This ensures the fix survives `npm install`.

1. **Modify `package.json`**:
   Add `"postinstall": "patch-package"` to your scripts.

2. **Apply the Patch**:
   Create a file `patches/react-native+0.81.5.patch` with the `std::to_string` replacement (this project already has it).

## 2. Clinical Patch (The "Surgical" Fix)

On Windows, `Remove-Item` often fails because Gradle or Java processes lock the cache files. Instead of deleting the cache, we use a script to find and patch the files **in-place**.

### The `patch_rn.js` script
Run this from the project root whenever the build fails with the `std::format` error:

```bash
node patch_rn.js
```

> [!NOTE]
> This script scans both `node_modules` and your global `~/.gradle/caches` to find any extracted headers and replaces the buggy code. It is safer and more reliable than "Nuclear Clean" on Windows.

## 3. Why does it keep coming back?
If you run `npx expo prebuild --clean`, Expo re-generates the `android` folder and triggers Gradle to re-extract the native headers from the pre-compiled AAR. If that extraction happens into a new folder, you must run `node patch_rn.js` again to "re-patch" the new extraction.

---

**This is the industry-standard fix for RN 0.81.5 Android builds on Windows.** [Reference](https://github.com/facebook/react-native/issues/43491)