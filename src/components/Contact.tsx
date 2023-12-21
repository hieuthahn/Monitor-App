/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useRef, useState} from 'react';
import {Linking, Text, View} from 'react-native';
import {PermissionsAndroid} from 'react-native';
import Contacts from 'react-native-contacts';
import {showAlert} from '../lib/ui-alert';
import _ from 'lodash';
import {privateAxios} from '../lib/axios';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';
import AntDIcon from 'react-native-vector-icons/AntDesign';

const Contact = () => {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {getItem: getContactStore, setItem: setContactStore} =
    useAsyncStorage('@contact');
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const [counter, setCounter] = useState(0);
  const [total, setTotal] = useState(0);
  const intervalRef = useRef<any>(0);

  const getContacts = async () => {
    const requestAccessContactsPermission = async () => {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        );
        return granted;
      } catch (error) {
        return false;
      }
    };

    const granted = await requestAccessContactsPermission();
    if (granted) {
      try {
        const contacts = _.flatMap(
          (await Contacts.getAllWithoutPhotos()).map(data => {
            data.phoneNumbers = data.phoneNumbers.map(phone => ({
              ...phone,
              name: data.displayName,
            }));
            return data.phoneNumbers;
          }),
        );
        let contactStore = await getContactStore();
        let dataIdExists = _.isNull(contactStore)
          ? []
          : await JSON.parse(contactStore);

        const dataNotExists = contacts.filter(
          (data: any) => !dataIdExists?.includes(data?.id),
        );
        setTotal(contacts.length);
        setCounter(dataIdExists.length);
        if (dataNotExists?.length > 0) {
          const formattedContacts = dataNotExists.map(contact => ({
            name: _.get(contact, 'name'),
            phone_number: contact.number,
          }));
          const res = await privateAxios.post('/wp-json/cyno/v1/address_book', {
            device_id: deviceId,
            data: formattedContacts,
          });
          console.log('Res Contacts => ', res.data);
          if (res.data.number) {
            const mapIdData = dataNotExists.map((data: any) => data?.id);
            contactStore = await getContactStore();
            dataIdExists = _.isNull(contactStore)
              ? []
              : await JSON.parse(contactStore);
            setCounter(dataIdExists.length);
            await setContactStore(
              JSON.stringify(_.uniq(dataIdExists.concat(mapIdData))),
              console.log,
            );
          }
        }
      } catch (error: any) {
        console.log(
          'Error Contact => ',
          error.response?.data?.message || error?.message,
        );
      }
    } else {
      showAlert('Open settings to change contact permission', {
        close: () => Linking.openSettings().then(),
        closeText: 'Open',
      });
    }
  };

  useEffect(() => {
    if (deviceId) {
      const timeInterval = 1000 * 10;
      getContacts();
      console.log('getContacts');
      intervalRef.current = setInterval(() => {
        getContacts();
      }, timeInterval);
    } else {
      clearInterval(intervalRef.current);
    }
  }, [deviceId]);

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
      <AntDIcon name="contacts" color="#999" />
      <Text style={{fontSize: 12}}>{`${counter}/${total}`}</Text>
    </View>
  );
};

export default Contact;
