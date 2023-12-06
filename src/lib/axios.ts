import {API_URL} from 'react-native-dotenv';
import axios from 'axios';

export const privateAxios = axios.create({
  baseURL: API_URL,
});
