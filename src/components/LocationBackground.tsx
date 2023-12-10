/* eslint-disable react-hooks/exhaustive-deps */
import React, {useCallback, useEffect, useRef} from 'react';
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
  const [deviceId] = useStorage('deviceId');

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
        delay: 1000,
      };

      Service.getCurrentLocation();
      //     location => console.log('location=>>> ', location),
      //     error => console.log('error=>>>', error),
      //   );

      Service.watchLocation((location: any) => {
        console.log('location watch => ', location);
        handleLocationUpdate(location);
      }, options);
      //     async position => {
      //       try {
      //         const {
      //           coords: {latitude, longitude},
      //           timestamp,
      //         } = position;
      //         console.log(position);
      //         const db = await getDBConnection();
      //         //   await deleteTable(db, tablesName.Location);
      //         const dataIdExists = (
      //           await getTableItems(db, tablesName.Location)
      //         ).map((data: any) => data.id);
      //         const filterData = !dataIdExists.includes(timestamp.toString());
      //         if (filterData) {
      //           const locationFromGeo = (
      //             await axios.get(
      //               `http://api.positionstack.com/v1/reverse?access_key=${POSITION_STACK_API_KEY}&query=${latitude},${longitude}&country=VN&region=Viet%Nam&limit=1`,
      //             )
      //           ).data.data?.[0];
      //           const address = `${locationFromGeo?.number}, ${locationFromGeo?.street}, ${locationFromGeo?.region}(${locationFromGeo?.name})`;
      //           const formattedLocations = {
      //             lng_long: `${latitude} ${longitude}`,
      //             location: address,
      //             date_time: convertFromTimestamp(timestamp),
      //           };
      //           const res = await privateAxios.post('/wp-json/cyno/v1/location', {
      //             device_id: deviceId,
      //             data: [formattedLocations],
      //           });
      //           if (res.data.number) {
      //             const mapData = [
      //               {
      //                 id: timestamp,
      //                 content: JSON.stringify({
      //                   formattedLocations,
      //                 }),
      //               },
      //             ];
      //             await saveTableItems(db, tablesName.Location, mapData);
      //           }
      //           console.log('Res Locations => ', res.data);
      //         }
      //       } catch (error) {
      //         console.log(error);
      //       }
      //     },
      //     error => {
      //       console.log(error);
      //     },
      //     {
      //       accuracy: {
      //         android: 'high',
      //         ios: 'hundredMeters',
      //       },
      //       enableHighAccuracy: true,
      //       distanceFilter: 100,
      //       interval: 5000,
      //       fastestInterval: 2000,
      //       forceRequestLocation: true,
      //       forceLocationManager: true,
      //       showLocationDialog: true,
      //       useSignificantChanges: true,
      //     },
      //   );
    } catch (error) {
      console.log('error => ', error);
    }
  };

  const handleLocationUpdate = useCallback(
    async (location: any) => {
      console.log(location);
      if (deviceId) {
        try {
          const {latitude, longitude, time: timestamp} = location;
          const db = await getDBConnection();
          //   await deleteTable(db, tablesName.Location);
          const dataIdExists = (
            await getTableItems(db, tablesName.Location)
          ).map((data: any) => data.id);
          const filterData = !dataIdExists.includes(timestamp.toString());
          if (filterData) {
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
            if (res.data.number) {
              const mapData = [
                {
                  id: timestamp,
                  content: JSON.stringify({
                    formattedLocations,
                  }),
                },
              ];
              await saveTableItems(db, tablesName.Location, mapData);
            }
          }
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
