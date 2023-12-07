/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {Alert, Button, Text, TextInput, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {privateAxios} from '../../lib/axios';
import {PASSWORD, USER_NAME} from 'react-native-dotenv';
import {initDatabase} from '../../lib/db';
import {useNavigation} from '@react-navigation/native';
import {useStorage} from '../../hook/use-storage';

const Authentication = () => {
  const [auth, setAuth] = useState<{
    crime_id: string;
    device_man: string;
  }>({
    crime_id: '106',
    device_man: 'sadmin' || 'client_test',
  });
  const [token, setToken] = useStorage('token');
  const [deviceId, setDeviceId] = useStorage('deviceId');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const initSQLite = async () => {
    try {
      await initDatabase();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    initSQLite();
  }, []);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const body = {
        ...auth,
        device_name: await DeviceInfo.getDeviceName(),
        device_imei: await DeviceInfo.getUniqueId(),
      };
      const res = await privateAxios.post('/wp-json/cyno/v1/add_device', body);
      if (res?.data?.device_id) {
        setDeviceId(res?.data?.device_id);
        navigation.navigate('Permission' as never);
      }
    } catch (error: any) {
      console.log(
        'Add device error: ',
        error.response?.data?.message || error?.message || error,
      );
      Alert.alert('Error: ' + error.response?.data?.message || error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      (async () => {
        const resAxios = await privateAxios.post('/wp-json/jwt-auth/v1/token', {
          username: USER_NAME,
          password: PASSWORD,
        });
        if (resAxios.data.token) {
          privateAxios.defaults.headers.common.Authorization =
            'Bearer ' + resAxios.data.token;
          setToken(resAxios.data.token);
        }
      })();
    }
  }, [setToken, token]);

  useEffect(() => {
    if (deviceId) {
      navigation.navigate('Permission' as never);
    }
  }, [deviceId]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 16,
        gap: 16,
      }}>
      <Text style={{textAlign: 'center', fontWeight: '400'}}>
        Authentication
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          padding: 8,
          borderColor: 'black',
          borderRadius: 12,
        }}
        value={auth.crime_id}
        onChangeText={value => setAuth(prev => ({...prev, crime_id: value}))}
        keyboardType="numeric"
        placeholder="ID"
      />
      <TextInput
        style={{
          borderWidth: 1,
          padding: 8,
          borderColor: 'black',
          borderRadius: 12,
        }}
        value={auth.device_man}
        onChangeText={value => setAuth(prev => ({...prev, device_man: value}))}
        autoCapitalize="none"
        placeholder="Device man"
      />
      <Button disabled={isLoading} onPress={handleSubmit} title="Submit" />
    </View>
  );
};

export default Authentication;
