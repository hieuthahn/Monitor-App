/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useRef, useState} from 'react';
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
  const {getItem: getLocationStore, setItem: setLocationStore} =
    useAsyncStorage('@location');
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const [forceLocation] = useState(true);
  const [highAccuracy] = useState(true);
  const [locationDialog] = useState(true);
  const [significantChanges] = useState(false);
  const [useLocationManager] = useState(true);
  const watchId = useRef<number | null>(null);

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

  const getLocation = async () => {
    const hasPermission = await hasLocationPermission();

    if (!hasPermission) {
      return;
    }

    console.log('get Location--------');
    Geolocation.getCurrentPosition(
      position => {
        console.log(position);
        console.log('get Location', position);
      },
      error => {
        console.log(error);
      },
      {
        accuracy: {
          android: 'high',
          ios: 'best',
        },
        enableHighAccuracy: highAccuracy,
        timeout: 15000,
        maximumAge: 10000,
        distanceFilter: 0,
        forceRequestLocation: forceLocation,
        forceLocationManager: useLocationManager,
        showLocationDialog: locationDialog,
      },
    );
  };

  const getLocationUpdates = async () => {
    const hasPermission = await hasLocationPermission();

    if (!hasPermission) {
      return;
    }

    watchId.current = Geolocation.watchPosition(
      async position => {
        try {
          const {
            coords: {latitude, longitude},
            timestamp,
          } = position;
          console.log('get Location Update', position);
          const locationStore = await getLocationStore();
          const dataIdExists = _.isNull(locationStore)
            ? ['']
            : await JSON.parse(locationStore);
          const dataNotExists = !dataIdExists.includes(timestamp);
          if (dataNotExists) {
            const formattedLocations = {
              lng_long: `${latitude} ${longitude}`,
              location: '',
              date_time: convertFromTimestamp(timestamp),
            };
            const res = await privateAxios.post('/wp-json/cyno/v1/location', {
              device_id: deviceId,
              data: [formattedLocations],
            });
            if (res.data.number) {
              await setLocationStore(
                JSON.stringify([...dataIdExists, timestamp]),
                console.log,
              );
            }
            console.log('Res Locations => ', res.data);
          }
        } catch (error) {
          console.log(error);
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
        enableHighAccuracy: highAccuracy,
        distanceFilter: 20,
        interval: 5000,
        fastestInterval: 2000,
        forceRequestLocation: forceLocation,
        forceLocationManager: useLocationManager,
        showLocationDialog: locationDialog,
        useSignificantChanges: significantChanges,
      },
    );
  };

  useEffect(() => {
    if (deviceId) {
      getLocation();
      getLocationUpdates();
    }
  }, [deviceId]);

  return (
    <View>
      <Text>Location</Text>
    </View>
  );
}
