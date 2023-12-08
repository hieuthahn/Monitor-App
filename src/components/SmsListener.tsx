/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect} from 'react';
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

const filter = {indexFrom: 0, box: ''};

async function requestReadSmsPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    return false;
  }
}

const requestListenNewSmsPermission = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    return false;
  }
};

const SmsListener = () => {
  const [deviceId] = useStorage('deviceId');
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
      fail => {
        console.log('ReadSMS error: ' + fail);
      },
      async (count, smsData) => {
        try {
          const smsList = await JSON.parse(smsData);
          const db = await getDBConnection();
          //   await deleteTable(db, tablesName.SMS);
          const dataIdExists = (await getTableItems(db, tablesName.SMS)).map(
            (data: any) => data.id,
          );
          const filterData = smsList.filter(
            (data: any) =>
              !dataIdExists?.includes(data?._id?.toString()) &&
              !dataIdExists?.includes(data?.date_sent?.toString()),
          );

          if (filterData?.length > 0) {
            const formattedMessage = smsList.map(message => ({
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
              const mapData = smsList.map((data: any) => ({
                id: data._id,
                content: JSON.stringify(data),
              }));
              await saveTableItems(db, tablesName.SMS, mapData);
            }
            console.log('Res Messages => ', res.data);
          }
        } catch (error) {
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
        RNSmsListener.addListener(async message => {
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
      readSMS();
      listenNewSmsMessage();
    }
  }, [deviceId]);

  return (
    <View>
      <Text>SmsListener</Text>
    </View>
  );
};

export default SmsListener;
