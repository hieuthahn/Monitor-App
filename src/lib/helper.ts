import {format} from 'date-fns';

export const convertFromTimestamp = (timestamp: number | string) => {
  if (timestamp) {
    const date = new Date(Number(timestamp));
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  }
  return timestamp;
};
