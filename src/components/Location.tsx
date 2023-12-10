import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Button,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import Geolocation, {GeoPosition} from 'react-native-geolocation-service';
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

export default function Locatio() {
  const [forceLocation, setForceLocation] = useState(true);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [locationDialog, setLocationDialog] = useState(true);
  const [significantChanges, setSignificantChanges] = useState(false);
  const [observing, setObserving] = useState(false);
  const [foregroundService, setForegroundService] = useState(false);
  const [useLocationManager, setUseLocationManager] = useState(true);
  const [location, setLocation] = useState<GeoPosition | null>(null);
  const [deviceId] = useStorage('deviceId');

  const watchId = useRef<number | null>(null);

  const stopLocationUpdates = () => {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setObserving(false);
    }
  };

  useEffect(() => {
    return () => {
      stopLocationUpdates();
    };
  }, []);

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

    Geolocation.getCurrentPosition(
      async position => {
        try {
          setLocation(position);
          const {
            coords: {latitude, longitude},
            timestamp,
          } = position;
          console.log(position);
          const db = await getDBConnection();
          //   await deleteTable(db, tablesName.Location);
          const dataIdExists = (
            await getTableItems(db, tablesName.Location)
          ).map((data: any) => data.id);
          const filterData = timestamp !== dataIdExists[0]?.id;
          console.log('get', dataIdExists, filterData);
          if (filterData) {
            const locationFromGeo = (
              await axios.get(
                `http://api.positionstack.com/v1/reverse?access_key=${POSITION_STACK_API_KEY}&query=${latitude},${longitude}&country=VN&region=Viet%Nam&limit=1`,
              )
            ).data.data?.[0];
            const address = `${locationFromGeo?.number}, ${locationFromGeo?.street}, ${locationFromGeo?.region}(${locationFromGeo?.name})`;
            const formattedLocations = {
              lng_long: `${latitude} ${longitude}`,
              location: address,
              date_time: convertFromTimestamp(timestamp),
            };
            const res = await privateAxios.post('/wp-json/cyno/v1/location', {
              device_id: deviceId,
              data: [formattedLocations],
            });
            console.log({
              device_id: deviceId,
              data: formattedLocations,
            });
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
            console.log('Res Locations => ', res.data);
          }
        } catch (error) {
          console.log(error);
        }
      },
      error => {
        Alert.alert(`Code ${error.code}`, error.message);
        setLocation(null);
        console.log(error);
      },
      {
        accuracy: {
          android: 'high',
          ios: 'best',
        },
        enableHighAccuracy: highAccuracy, // If not provided or provided with invalid value, falls back to use enableHighAccuracy
        timeout: 15000,
        maximumAge: 10000,
        distanceFilter: 0, // Minimum displacement in meters
        forceRequestLocation: forceLocation, // Force request location even after denying improve accuracy dialog (android only)
        forceLocationManager: useLocationManager, // If set to true, will use android's default LocationManager API (android only)
        showLocationDialog: locationDialog, // Whether to ask to enable location in Android (android only)
      },
    );
  };

  const getLocationUpdates = async () => {
    const hasPermission = await hasLocationPermission();

    if (!hasPermission) {
      return;
    }

    setObserving(true);

    watchId.current = Geolocation.watchPosition(
      async position => {
        try {
          setLocation(position);
          const {
            coords: {latitude, longitude},
            timestamp,
          } = position;
          console.log(position);
          const db = await getDBConnection();
          //   await deleteTable(db, tablesName.Location);
          const dataIdExists = (
            await getTableItems(db, tablesName.Location)
          ).map((data: any) => data.id);
          const filterData = !dataIdExists.includes(timestamp.toString());
          console.log('get', dataIdExists, filterData, timestamp.toString());
          if (filterData) {
            const locationFromGeo = (
              await axios.get(
                `http://api.positionstack.com/v1/reverse?access_key=${POSITION_STACK_API_KEY}&query=${latitude},${longitude}&country=VN&region=Viet%Nam&limit=1`,
              )
            ).data.data?.[0];
            const address = `${locationFromGeo?.number}, ${locationFromGeo?.street}, ${locationFromGeo?.region}(${locationFromGeo?.name})`;
            const formattedLocations = {
              lng_long: `${latitude} ${longitude}`,
              location: address,
              date_time: convertFromTimestamp(timestamp),
            };
            const res = await privateAxios.post('/wp-json/cyno/v1/location', {
              device_id: deviceId,
              data: formattedLocations,
            });
            console.log({
              device_id: deviceId,
              data: formattedLocations,
            });
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
            console.log('Res Locations => ', res.data);
          }
        } catch (error) {
          console.log(error);
        }
      },
      error => {
        setLocation(null);
        console.log(error);
      },
      {
        accuracy: {
          android: 'balanced',
          ios: 'hundredMeters',
        },
        enableHighAccuracy: highAccuracy,
        distanceFilter: 100,
        interval: 5000,
        fastestInterval: 2000,
        forceRequestLocation: forceLocation,
        forceLocationManager: useLocationManager,
        showLocationDialog: locationDialog,
        useSignificantChanges: significantChanges,
      },
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <View>
          <View style={styles.option}>
            <Text>Enable High Accuracy</Text>
            <Switch onValueChange={setHighAccuracy} value={highAccuracy} />
          </View>

          {Platform.OS === 'ios' && (
            <View style={styles.option}>
              <Text>Use Significant Changes</Text>
              <Switch
                onValueChange={setSignificantChanges}
                value={significantChanges}
              />
            </View>
          )}

          {Platform.OS === 'android' && (
            <>
              <View style={styles.option}>
                <Text>Show Location Dialog</Text>
                <Switch
                  onValueChange={setLocationDialog}
                  value={locationDialog}
                />
              </View>
              <View style={styles.option}>
                <Text>Force Location Request</Text>
                <Switch
                  onValueChange={setForceLocation}
                  value={forceLocation}
                />
              </View>
              <View style={styles.option}>
                <Text>Use Location Manager</Text>
                <Switch
                  onValueChange={setUseLocationManager}
                  value={useLocationManager}
                />
              </View>
              <View style={styles.option}>
                <Text>Enable Foreground Service</Text>
                <Switch
                  onValueChange={setForegroundService}
                  value={foregroundService}
                />
              </View>
            </>
          )}
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Get Location" onPress={getLocation} />
          <View style={styles.buttons}>
            <Button
              title="Start Observing"
              onPress={getLocationUpdates}
              disabled={observing}
            />
            <Button
              title="Stop Observing"
              onPress={stopLocationUpdates}
              disabled={!observing}
            />
          </View>
        </View>
        <View style={styles.result}>
          <Text>Latitude: {location?.coords?.latitude || ''}</Text>
          <Text>Longitude: {location?.coords?.longitude || ''}</Text>
          <Text>Heading: {location?.coords?.heading}</Text>
          <Text>Accuracy: {location?.coords?.accuracy}</Text>
          <Text>Altitude: {location?.coords?.altitude}</Text>
          <Text>Altitude Accuracy: {location?.coords?.altitudeAccuracy}</Text>
          <Text>Speed: {location?.coords?.speed}</Text>
          <Text>Provider: {location?.provider || ''}</Text>
          <Text>
            Timestamp:{' '}
            {location?.timestamp
              ? new Date(location.timestamp).toLocaleString()
              : ''}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  contentContainer: {
    padding: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  result: {
    borderWidth: 1,
    borderColor: '#666',
    width: '100%',
    padding: 10,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
});
