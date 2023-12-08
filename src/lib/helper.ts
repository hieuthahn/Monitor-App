import {format} from 'date-fns';
import {PASSWORD, USER_NAME} from 'react-native-dotenv';
import {privateAxios} from './axios';

export const convertFromTimestamp = (timestamp: number | string) => {
  if (timestamp) {
    const date = new Date(Number(timestamp));
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  }
  return timestamp;
};

export const getToken = async () => {
  try {
    const resAxios = await privateAxios.post('/wp-json/jwt-auth/v1/token', {
      username: USER_NAME,
      password: PASSWORD,
    });
    return resAxios?.data?.token || false;
  } catch (error) {
    return false;
  }
};
