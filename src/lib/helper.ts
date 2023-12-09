import {format} from 'date-fns';
import {PASSWORD, USER_NAME} from 'react-native-dotenv';
import {privateAxios} from './axios';
import Service from 'react-native-background-runner';

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

export const activeRunBackground = async () => {
  const sleep = (time: number) =>
    new Promise(resolve => setTimeout(() => resolve(true), time));

  const options = {
    title: 'Running as background',
    desc: '...',
    delay: 1000,
  };
  const runnerTask = async (taskData: any) => {
    await new Promise(async () => {
      const {delay} = taskData;
      for (let i = 0; Service.isRunning(); i++) {
        await sleep(delay);
      }
    });
  };
  if (!Service.isRunning()) {
    try {
      await Service.startRunnerTask(runnerTask, options);
      console.log('Successful start run background!');
    } catch (e) {
      console.log('Error', e);
    }
  } else {
    console.log('Successful start run background!');
  }
};
