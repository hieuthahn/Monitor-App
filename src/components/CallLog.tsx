/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect} from 'react';
import {Linking, PermissionsAndroid, Text, View} from 'react-native';
// @ts-ignore
import CallLogs from 'react-native-call-log';
import {privateAxios} from '../lib/axios';
import {showAlert} from '../lib/ui-alert';
import {convertFromTimestamp} from '../lib/helper';
import {useStorage} from '../hook/use-storage';
import {
  deleteTable,
  getDBConnection,
  getTableItems,
  saveTableItems,
  tablesName,
} from '../lib/db';

const CallLog = () => {
  const [deviceId] = useStorage('deviceId');

  const getCallLog = async () => {
    const requestAccessCallLogPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        return false;
      }
    };
    const filter = {};
    const granted = await requestAccessCallLogPermission();

    if (granted) {
      try {
        const logs = await CallLogs.load(-1, filter);
        const db = await getDBConnection();
        // await deleteTable(db, tablesName.CallLog);
        const dataIdExists = (await getTableItems(db, tablesName.CallLog)).map(
          (data: any) => data.id,
        );
        const filterData = logs.filter(
          (call: any) => !dataIdExists?.includes(call?.timestamp?.toString()),
        );

        if (filterData?.length > 0) {
          const formattedCallLog = filterData.map((call: any) => ({
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
            const mapData = logs.map((data: any) => ({
              id: data.timestamp,
              content: JSON.stringify(data),
            }));
            await saveTableItems(db, tablesName.CallLog, mapData);
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
      const timeInterval = 1000 * 60 * 60 * 24; // 1 day
      setInterval(() => {
        console.count('getCallLog');
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
