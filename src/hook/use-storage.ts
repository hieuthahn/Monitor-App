/* eslint-disable react-hooks/exhaustive-deps */
import {useState, useEffect} from 'react';
import storage from '../lib/storage';

export const useStorage = (
  key: string,
): [any, (value: any) => void, () => void] => {
  const [storageItem, setStorageItem] = useState(null);

  const getData = async () => {
    try {
      const value = await storage.load({key: key});
      setStorageItem(value);
      return value;
    } catch (error: any) {
      // error reading value
      console.log('getData Error: ', error?.message);
    }
  };

  const saveStorageItem = async (value: any) => {
    try {
      await storage.save({
        key: key,
        data: value,
        expires: null,
      });
      setStorageItem(value);
    } catch (error: any) {
      console.log('saveStorageItem Error: ', error?.message);
    }
  };

  const clearStorage = async () => {
    try {
      await storage.remove({key: key});
      setStorageItem(null);
    } catch (error: any) {
      console.log('clearStorage Error: ', error?.message);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return [storageItem, saveStorageItem, clearStorage];
};
