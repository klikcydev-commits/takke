import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";
import "react-native-get-random-values";

class LargeSecureStore {
  private async _encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1)
    );
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(encryptionKey)
    );
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }
  private async _decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) {
      return encryptionKeyHex;
    }
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }
  async getItem(key: string) {
    if (Platform.OS === "web" && typeof window === "undefined") {
      return null;
    }
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) {
      return encrypted;
    }
    return await this._decrypt(key, encrypted);
  }
  async removeItem(key: string) {
    if (Platform.OS === "web" && typeof window === "undefined") {
      return;
    }
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
  async setItem(key: string, value: string) {
    if (Platform.OS === "web" && typeof window === "undefined") {
      return;
    }
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

const expoUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const expoKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ??
  "";

if (!expoUrl || !expoKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_KEY).",
  );
}

export const supabase = createClient(expoUrl, expoKey, {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
