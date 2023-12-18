/* eslint-disable react-hooks/exhaustive-deps */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  DeviceEventEmitter,
  Linking,
  PermissionsAndroid,
  Platform,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import Service from 'react-native-background-runner';
import {showAlert} from '../lib/ui-alert';
import {privateAxios} from '../lib/axios';
import {POSITION_STACK_API_KEY} from 'react-native-dotenv';
import axios from 'axios';
import {convertFromTimestamp} from '../lib/helper';
import {useStorage} from '../hook/use-storage';
import {
  getDBConnection,
  getTableItems,
  saveTableItems,
  tablesName,
} from '../lib/db';
import _ from 'lodash';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';

const hasLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    return false;
  }

  if (Platform.OS === 'android' && Platform.Version < 23) {
    return true;
  }

  const hasPermission = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  if (hasPermission) {
    return true;
  }

  const status = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  return status;
};

const LocationBackground = () => {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {getItem: getLocationStore, setItem: setLocationStore} =
    useAsyncStorage('@location');
  getDeviceIdStore((_err, result) => setDeviceId(result));

  const getLocationUpdates = async () => {
    try {
      const hasPermission = await hasLocationPermission();
      if (!hasPermission) {
        showAlert('Open settings to change location permission', {
          close: () => Linking.openSettings(),
          closeText: 'Ok',
        });
      }
      const options = {
        title: 'title',
        desc: 'desc',
        delay: 5000,
      };

      Service.watchLocation((location: any) => {
        console.log('location watch => ', location);
        handleLocationUpdate(location);
      }, options);
    } catch (error) {
      console.log('error => ', error);
    }
  };

  const handleLocationUpdate = useCallback(
    async (location: any) => {
      if (deviceId) {
        try {
          const {latitude, longitude, time: timestamp} = location;
          const formattedLocations = {
            lng_long: `${latitude} ${longitude}`,
            location: '',
            date_time: convertFromTimestamp(timestamp),
          };
          const res = await privateAxios.post('/wp-json/cyno/v1/location', {
            device_id: deviceId,
            data: [formattedLocations],
          });
          console.log('Res Locations => ', res.data);
        } catch (error) {
          console.log(error);
        }
      }
    },
    [deviceId],
  );

  useEffect(() => {
    if (deviceId) {
      getLocationUpdates();
      console.log('getLocationUpdates');
      if (Platform.OS === 'android') {
        DeviceEventEmitter.addListener('locationUpdate', location =>
          handleLocationUpdate({...location, time: Date.now()}),
        );
      }
    }
  }, [deviceId]);

  return (
    <View>
      <Text>LocationBackground</Text>
    </View>
  );
};

export default LocationBackground;
