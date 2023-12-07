import {API_URL} from 'react-native-dotenv';
import axios from 'axios';
import storage from './storage';

export const privateAxios = axios.create({
  baseURL: API_URL,
});

privateAxios.interceptors.request.use(async config => {
  const token = await storage.load({key: 'token'});

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});
