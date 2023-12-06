import {format} from 'date-fns';

export const convertFromTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return format(date, 'yyyy-MM-dd HH:mm:ss');
};
