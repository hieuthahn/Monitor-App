/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {Button, Text, View} from 'react-native';
import CallLog from '../../components/CallLog';
import {useStorage} from '../../hook/use-storage';
import {useNavigation} from '@react-navigation/native';
import Contact from '../../components/Contact';
import SmsListener from '../../components/SmsListener';
import Location from '../../components/Location';

const Permission = () => {
  const [deviceId, setDeviceId] = useStorage('deviceId');
  const [, setToken] = useStorage('token');
  const navigation = useNavigation();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
      }}>
      <Text>DeviceID: {deviceId}</Text>
      <Button
        title="Logout"
        onPress={() => {
          setDeviceId(null);
          setToken(null);
          navigation.navigate('Authentication' as never);
        }}
      />
      <CallLog />
      <Contact />
      <SmsListener />
      <Location />
    </View>
  );
};

export default Permission;
