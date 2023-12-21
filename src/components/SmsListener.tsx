/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useRef, useState} from 'react';
import {Linking, PermissionsAndroid, Text, View} from 'react-native';
// @ts-ignore
import SmsAndroid from 'react-native-get-sms-android';
import {showAlert} from '../lib/ui-alert';
// @ts-ignore
import {convertFromTimestamp} from '../lib/helper';
import {privateAxios} from '../lib/axios';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import AntDIcon from 'react-native-vector-icons/AntDesign';

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

const SmsListener = () => {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {getItem: getSmsStore, setItem: setSmsStore} = useAsyncStorage('@sms');
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const [counter, setCounter] = useState(0);
  const [total, setTotal] = useState(0);
  const intervalRef = useRef<any>(0);

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
          let smsStore = await getSmsStore();
          let dataIdExists = _.isNull(smsStore)
            ? []
            : await JSON.parse(smsStore);
          const dataNotExists = smsList.filter(
            (data: any) =>
              !dataIdExists?.includes(data?._id) &&
              !dataIdExists?.includes(data?.date_sent),
          );
          setTotal(smsList.length);
          setCounter(dataIdExists.length);
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
              smsStore = await getSmsStore();
              dataIdExists = _.isNull(smsStore)
                ? []
                : await JSON.parse(smsStore);
              setCounter(dataIdExists.length);
              await setSmsStore(
                JSON.stringify(_.uniq(dataIdExists.concat(mapIdData))),
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

  useEffect(() => {
    if (deviceId) {
      const timeInterval = 1000 * 10;
      readSMS();
      console.log('getSMS');
      intervalRef.current = setInterval(() => {
        readSMS();
      }, timeInterval);
    } else {
      clearInterval(intervalRef.current);
    }
  }, [deviceId]);

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
      <AntDIcon name="message1" color="#999" />
      <Text style={{fontSize: 12}}>{`${counter}/${total}`}</Text>
    </View>
  );
};

export default SmsListener;
