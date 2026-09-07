import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KVStore } from './kv';

export const asyncStorageKv: KVStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
