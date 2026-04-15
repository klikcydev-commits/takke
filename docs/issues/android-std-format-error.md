# Issue: `std::format` build error on Android

## Symptoms

The build fails during the native compilation phase (specifically `appmodules` or `expo-modules-core`) with an error like:

```text
error: no member named 'format' in namespace 'std'; did you mean 'folly::format'?
      return std::format("{}%", dimension.value);
             ^~~~~~~~~~~
             folly::format
```

This typically happens in **React Native 0.81.x** (and Expo 54+) when targeting Android.

## Cause

React Native recently added `std::format` (a C++20 feature) to its core rendering headers (specifically `graphicsConversions.h`). However, the Android NDK's standard library (`libc++`) does not fully support `std::format` for all Android target versions or NDK configurations yet, even if `-std=c++20` is enabled.

When using **Prefabs** (pre-compiled headers bundled in the `react-android` AAR), Gradle extracts these headers into its internal cache. A simple patch to `node_modules` often won't fix the build because project dependencies like `expo-modules-core` continue to include the unpatched headers from the Gradle transform cache.

## Resolution

### 1. Persistent Patch
Apply a fix to the source code to replace the unsupported `std::format` with `std::to_string`.

**File**: `node_modules/react-native/ReactCommon/react/renderer/core/graphicsConversions.h`

**Change**: 
```cpp
// From:
return std::format("{}%", dimension.value);
// To:
return std::to_string(dimension.value) + "%";
```

Use `patch-package` to make it stick:
```bash
npx patch-package react-native
```

### 2. Clinical Cache Clean (Critical)
Gradle's transform cache must be purged to force it to re-extract headers from the (patched) node_modules package.

1.  **Stop Gradle Daemons**:
    ```bash
    cd android && ./gradlew --stop
    ```
2.  **Delete Local Build Artifacts**:
    ```bash
    rm -rf android/app/.cxx android/app/build android/build
    ```
3.  **Delete Gradle Transform Cache**:
    *(On Windows)*:
    ```bash
    rm -rf "$USERPROFILE/.gradle/caches/8.14.3/transforms"
    ```
    *(Adjust the version number `8.14.3` if your Gradle version is different)*.

### 3. Verification
Re-run the build:
```bash
npx expo run:android
```

---
> [!TIP]
> If the error persists, it means there's another copy of `graphicsConversions.h` in your cache. You can use a script (like `patch_rn.js` in this project) to find and replace all instances in the `.gradle` folder if the clinical clean isn't an option.
