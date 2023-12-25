/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {privateAxios} from '../lib/axios';
import {convertFromTimestamp} from '../lib/helper';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import IonIcon from 'react-native-vector-icons/Ionicons';

export default function Location({
  connectionStatus,
}: {
  connectionStatus: boolean;
}) {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {
    getItem: getLocationStore,
    setItem: setLocationStore,
    removeItem,
  } = useAsyncStorage('@location');
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const intervalRef = useRef<any>(0);
  const [isLoading, setIsLoading] = useState(false);

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
          setIsLoading(true);
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
          const twoDayBeforeTimestamp = Date.now() - 1000 * 60 * 60 * 24 + 2;
          locationStore = locationStore.filter(
            (item: any) => Number(item?.timestamp) >= twoDayBeforeTimestamp,
          );
          locationStore.push({formattedLocation, timestamp});
          locationStore = _.uniqBy(locationStore, 'timestamp');
          await setLocationStore(JSON.stringify(locationStore), console.log);
        } finally {
          setIsLoading(false);
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
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      const interval = 1000 * 30;
      getLocationUpdates();
      sendLocationMissed();
      intervalRef.current = setInterval(() => {
        sendLocationMissed();
      }, interval);
    } else {
      clearInterval(intervalRef.current);
    }
  }, [deviceId, connectionStatus]);

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
      <IonIcon name="location-outline" size={14} color="#999" />
      {isLoading && (
        <ActivityIndicator color={'#999'} size={13} animating={isLoading} />
      )}
    </View>
  );
}
