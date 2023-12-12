/* eslint-disable no-catch-shadow */
/* eslint-disable @typescript-eslint/no-shadow */
import {API_URL} from 'react-native-dotenv';
import axios, {AxiosError} from 'axios';
import storage from './storage';
import {getToken} from './helper';
import {showAlert} from './ui-alert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';

const codeTokenIsExpired = 'jwt_auth_invalid_token';

export const privateAxios = axios.create({
  baseURL: API_URL,
});

privateAxios.interceptors.request.use(async config => {
  try {
    const token = await AsyncStorage.getItem('@token');
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
  } catch (error) {
    console.log('axios error: ' + error);
  } finally {
    return config;
  }
});

privateAxios.interceptors.response.use(
  async config => {
    return config;
  },
  async (error: AxiosError) => {
    try {
      const status = error.response?.status;
      const code = _.get(error.response?.data, 'code') || '';
      if (status === 403 && `${code}` === codeTokenIsExpired) {
        const token = await getToken();
        if (error.config?.headers && token) {
          error.config.headers.Authorization = 'Bearer ' + token;
          await storage.save({
            key: 'token',
            data: token,
          });
          return privateAxios.request(error.config);
        } else {
          showAlert('Reconnect token error', {
            close() {
              return;
            },
            closeText: 'Ok',
          });
        }
      }
    } catch (error: any) {
      showAlert(error?.message, {
        close() {
          return;
        },
        closeText: 'Ok',
      });
    } finally {
      return Promise.reject(error);
    }
  },
);
