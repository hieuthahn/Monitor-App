/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  Text,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {privateAxios} from '../lib/axios';
import {convertFromTimestamp} from '../lib/helper';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';
import _ from 'lodash';

export default function Location() {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {
    getItem: getLocationStore,
    setItem: setLocationStore,
    removeItem,
  } = useAsyncStorage('@location');
  getDeviceIdStore((_err, result) => setDeviceId(result));

  const hasPermissionIOS = async () => {
    const openSetting = () => {
      Linking.openSettings().catch(() => {
        Alert.alert('Unable to open settings');
      });
    };
    const status = await Geolocation.requestAuthorization('whenInUse');

    if (status === 'granted') {
      return true;
    }

    if (status === 'denied') {
      Alert.alert('Location permission denied');
    }

    if (status === 'disabled') {
      Alert.alert(
        `Turn on Location Services to allow to determine your location.`,
        '',
        [
          {text: 'Go to Settings', onPress: openSetting},
          {text: "Don't Use Location", onPress: () => {}},
        ],
      );
    }

    return false;
  };

  const hasLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const hasPermission = await hasPermissionIOS();
      return hasPermission;
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

  const getLocationUpdates = async () => {
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      return;
    }

    Geolocation.watchPosition(
      async position => {
        const {
          coords: {latitude, longitude},
          timestamp,
        } = position;
        const formattedLocation = {
          lng_long: `${latitude} ${longitude}`,
          location: '',
          date_time: convertFromTimestamp(timestamp),
        };
        try {
          const res = await privateAxios.post('/wp-json/cyno/v1/location', {
            device_id: deviceId,
            data: [formattedLocation],
          });
          console.log('Res Location Updates => ', res.data);
        } catch (error: any) {
          console.log(
            'Error Location =>',
            error?.response?.data?.message || error?.message,
          );
          const store = await getLocationStore();
          let locationStore = _.isNull(store) ? [] : await JSON.parse(store);
          const threeDayBeforeTimestamp = Date.now() - 1000 * 60 * 60 * 24 + 2;
          locationStore = locationStore.filter(
            (item: any) => Number(item?.timestamp) >= threeDayBeforeTimestamp,
          );
          locationStore.push({formattedLocation, timestamp});
          await setLocationStore(JSON.stringify(locationStore), console.log);
        }
      },
      error => {
        console.log(error);
      },
      {
        accuracy: {
          android: 'high',
          ios: 'best',
        },
        enableHighAccuracy: true,
        distanceFilter: 30,
        interval: 10000,
        fastestInterval: 5000,
        forceRequestLocation: true,
        forceLocationManager: false,
        showLocationDialog: true,
        showsBackgroundLocationIndicator: false,
      },
    );
  };

  const sendLocationMissed = async () => {
    try {
      const store = await getLocationStore();
      let locationStore = _.isNull(store) ? [] : await JSON.parse(store);
      const formattedLocations = locationStore?.map(
        (item: any) => item?.formattedLocation,
      );
      const res = await privateAxios.post('/wp-json/cyno/v1/location', {
        device_id: deviceId,
        data: formattedLocations,
      });
      if (res.data?.number) {
        await removeItem();
      }
    } catch (error: any) {
      console.log(
        'Error sendLocationMissed =>',
        error?.response?.data?.message || error?.message,
      );
    }
  };

  useEffect(() => {
    if (deviceId) {
      const interval = 1000 * 60 * 2;
      getLocationUpdates();
      sendLocationMissed();
      setInterval(() => {
        sendLocationMissed();
      }, interval);
    }
  }, [deviceId]);

  return (
    <View>
      <Text>Location</Text>
    </View>
  );
}
