/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {Alert, Button, Text, TextInput, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {privateAxios} from '../../lib/axios';
import {PASSWORD, USER_NAME} from 'react-native-dotenv';

const AuthenticationScreen = () => {
  const [auth, setAuth] = useState<{
    crime_id: string;
    device_man: string;
  }>({
    crime_id: '',
    device_man: '',
  });
  const [token, setToken] = useState('');
  const [deviceId, setDeviceId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSubmit = async () => {
    try {
      const body = {
        ...auth,
        device_name: await DeviceInfo.getDeviceName(),
        device_imei: await DeviceInfo.getDeviceId(),
      };
      console.log(body);
      // const res = await privateAxios.post('/wp-json/cyno/v1/add_device', body, {
      //   headers: {
      //     Authorization: 'Bearer ' + token,
      //   },
      // });
      // if (res?.data?.device_id) {
      //   SecureStore.setItemAsync(
      //     'device_id',
      //     JSON.stringify(res.data.device_id),
      //   );
      //   setDeviceId(res?.data?.device_id);
      // }
    } catch (error) {
      console.error(
        'Add device error: ',
        error.response?.data?.message || error?.message,
      );
      Alert.alert(
        'Add device error: ' + error.response?.data?.message || error?.message,
      );
    }
  };

  useEffect(() => {
    if (!token) {
      (async () => {
        const resAxios = await privateAxios.post('/wp-json/jwt-auth/v1/token', {
          username: USER_NAME,
          password: PASSWORD,
        });
        console.log(resAxios);
        if (resAxios.data.token) {
          privateAxios.defaults.headers.common.Authorization =
            'Bearer ' + resAxios.data.token;
          setToken(resAxios.data.token);
        }
      })();
    }
  }, [token]);

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
      <Button onPress={handleSubmit} title="Submit" />
    </View>
  );
};

export default AuthenticationScreen;
