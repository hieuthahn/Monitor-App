/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {Linking, PermissionsAndroid, Text, View} from 'react-native';
// @ts-ignore
import CallLogs from 'react-native-call-log';
import {privateAxios} from '../lib/axios';
import {showAlert} from '../lib/ui-alert';
import {convertFromTimestamp} from '../lib/helper';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';
import _ from 'lodash';

const CallLog = () => {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {getItem: getCallLogStore, setItem: setCallLogStore} =
    useAsyncStorage('@callLog');
  getDeviceIdStore((_err, result) => setDeviceId(result));

  const getCallLog = async () => {
    const requestAccessCallLogPermission = async () => {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        );
        return granted;
      } catch (error) {
        return false;
      }
    };
    const filter = {};
    const granted = await requestAccessCallLogPermission();

    if (granted) {
      try {
        const callLogs = await CallLogs.load(-1, filter);
        const callLogStore = await getCallLogStore();
        const dataIdExists = _.isNull(callLogStore)
          ? ['']
          : await JSON.parse(callLogStore);
        const dataNotExists = callLogs.filter(
          (call: any) => !dataIdExists?.includes(call?.timestamp),
        );

        if (dataNotExists?.length > 0) {
          const formattedCallLog = dataNotExists.map((call: any) => ({
            phone_number: call?.phoneNumber,
            name: call?.name,
            duration: call?.duration,
            date_time: convertFromTimestamp(call?.timestamp),
            type: call?.type,
          }));

          const res = await privateAxios.post('/wp-json/cyno/v1/call_history', {
            device_id: deviceId,
            data: formattedCallLog,
          });
          if (res.data.number) {
            const mapIdData = dataNotExists.map((data: any) => data.timestamp);
            await setCallLogStore(
              JSON.stringify(dataIdExists.concat(mapIdData)),
              console.log,
            );
          }

          console.log('Res CallLog => ', res.data);
        }
      } catch (error: any) {
        console.log(
          'Error CallLog => ',
          error.response?.data?.message || error?.message,
        );
      }
    } else {
      showAlert('Open settings to change permission', {
        close: () => Linking.openSettings().then(),
        closeText: 'Open',
      });
    }
  };

  useEffect(() => {
    if (deviceId) {
      const timeInterval = 1000 * 5;
      getCallLog();
      console.log('getCallLog');
      setInterval(() => {
        console.log('getCallLog interval');
        getCallLog();
      }, timeInterval);
    }
  }, [deviceId]);

  return (
    <View>
      <Text>CallLog</Text>
    </View>
  );
};

export default CallLog;
