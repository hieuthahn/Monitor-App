/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {
  DeviceEventEmitter,
  Linking,
  PermissionsAndroid,
  Text,
  View,
} from 'react-native';
// @ts-ignore
import SmsAndroid from 'react-native-get-sms-android';
import {useStorage} from '../hook/use-storage';
import {showAlert} from '../lib/ui-alert';
// @ts-ignore
import RNSmsListener from 'react-native-android-sms-listener';
import {convertFromTimestamp} from '../lib/helper';
import {privateAxios} from '../lib/axios';
import {
  deleteTable,
  getDBConnection,
  getTableItems,
  saveTableItems,
  tablesName,
} from '../lib/db';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';
import _ from 'lodash';

const filter = {indexFrom: 0, box: ''};

async function requestReadSmsPermission() {
  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );
    return granted;
  } catch (err) {
    return false;
  }
}

const requestListenNewSmsPermission = async () => {
  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    );
    return granted;
  } catch (err) {
    return false;
  }
};

const SmsListener = () => {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {getItem: getSmsStore, setItem: setSmsStore} = useAsyncStorage('@sms');
  getDeviceIdStore((_err, result) => setDeviceId(result));

  const readSMS = async () => {
    const granted = await requestReadSmsPermission();
    if (!granted) {
      showAlert('Open settings to change sms permission', {
        close: () => Linking.openSettings().then(),
        closeText: 'Ok',
      });
      return;
    }

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: any) => {
        console.log('ReadSMS error: ' + fail);
      },
      async (count: number, smsData: any) => {
        try {
          const smsList = await JSON.parse(smsData);
          const smsStore = await getSmsStore();
          const dataIdExists = _.isNull(smsStore)
            ? ['']
            : await JSON.parse(smsStore);
          const dataNotExists = smsList.filter(
            (data: any) =>
              !dataIdExists?.includes(data?._id) &&
              !dataIdExists?.includes(data?.date_sent),
          );

          if (dataNotExists?.length > 0) {
            const formattedMessage = dataNotExists.map((message: any) => ({
              phone_number: message?.address,
              name: message?.creator,
              type: message?.type,
              content: message?.body,
              date_time: convertFromTimestamp(
                message?.date_sent || message?.date,
              ),
            }));
            const res = await privateAxios.post('/wp-json/cyno/v1/message', {
              device_id: deviceId,
              data: formattedMessage,
            });
            if (res.data.number) {
              const mapIdData = dataNotExists.map((data: any) => data?._id);
              await setSmsStore(
                JSON.stringify(dataIdExists.concat(mapIdData)),
                console.log,
              );
            }
            console.log('Res Messages => ', res.data);
          }
        } catch (error: any) {
          console.log(
            'Error Messages => ',
            error.response?.data?.message || error?.message,
          );
        }
      },
    );
  };

  const listenNewSmsMessage = () => {
    DeviceEventEmitter.addListener('sms_onDelivery', msg => {
      console.log('sms_onDelivery', msg);
    });

    requestListenNewSmsPermission().then(granted => {
      if (granted) {
        RNSmsListener.addListener(async (message: any) => {
          try {
            console.log('New sms message:', message);
            const res = await privateAxios.post('/wp-json/cyno/v1/message', {
              device_id: deviceId,
              data: [
                {
                  phone_number: message?.originatingAddress,
                  name: message?.originatingAddress,
                  type: 1,
                  content: message?.body,
                  date_time: convertFromTimestamp(message?.timestamp),
                },
              ],
            });
            if (res.data.number) {
              const mapData = [
                {
                  id: message?.timestamp,
                  content: JSON.stringify(message),
                },
              ];
              const db = await getDBConnection();
              await saveTableItems(db, tablesName.SMS, mapData);
            }
            console.log('Res SMS Listen => ', res.data);
          } catch (error) {
            console.log('Error listen sms', error);
          }
        });
      } else {
        showAlert('Open settings to change sms permission', {
          close: () => Linking.openSettings().then(),
          closeText: 'Ok',
        });
      }
    });
  };

  useEffect(() => {
    if (deviceId) {
      const timeInterval = 1000 * 8;
      readSMS();
      console.log('readSMS');
      setInterval(() => {
        console.log('readSMS interval');
        readSMS();
      }, timeInterval);

      // listenNewSmsMessage();
    }
  }, [deviceId]);

  return (
    <View>
      <Text>SmsListener</Text>
    </View>
  );
};

export default SmsListener;
