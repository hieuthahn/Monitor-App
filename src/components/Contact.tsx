/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {Linking, Text, View} from 'react-native';
import {PermissionsAndroid} from 'react-native';
import Contacts from 'react-native-contacts';
import {showAlert} from '../lib/ui-alert';
import _ from 'lodash';
import {privateAxios} from '../lib/axios';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';

const Contact = () => {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {getItem: getContactStore, setItem: setContactStore} =
    useAsyncStorage('@contact');
  getDeviceIdStore((_err, result) => setDeviceId(result));

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
        const contactStore = await getContactStore();
        const dataIdExists = _.isNull(contactStore)
          ? ['']
          : await JSON.parse(contactStore);
        const dataNotExists = contacts.filter(
          (data: any) => !dataIdExists?.includes(data?.id),
        );

        if (dataNotExists?.length > 0) {
          const formattedContacts = dataNotExists.map(contact => ({
            name: _.get(contact, 'name'),
            phone_number: contact.number,
          }));
          const res = await privateAxios.post('/wp-json/cyno/v1/address_book', {
            device_id: deviceId,
            data: formattedContacts,
          });
          if (res.data.number) {
            const mapIdData = dataNotExists.map((data: any) => data?.id);
            await setContactStore(
              JSON.stringify(dataIdExists.concat(mapIdData)),
              console.log,
            );
          }
          console.log('Res Contacts => ', res.data);
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
      const timeInterval = 1000 * 6;
      getContacts();
      console.log('getContacts');
      setInterval(() => {
        console.log('getContacts interval');
        getContacts();
      }, timeInterval);
    }
  }, [deviceId]);

  return (
    <View>
      <Text>Contact</Text>
    </View>
  );
};

export default Contact;
