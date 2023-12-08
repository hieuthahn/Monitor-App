import React, {useEffect} from 'react';
import {Linking, Text, View} from 'react-native';
import {PermissionsAndroid} from 'react-native';
import Contacts from 'react-native-contacts';
import {useStorage} from '../hook/use-storage';
import {showAlert} from '../lib/ui-alert';
import {
  getDBConnection,
  getTableItems,
  saveTableItems,
  tablesName,
} from '../lib/db';
import _ from 'lodash';
import {privateAxios} from '../lib/axios';

const Contact = () => {
  const [deviceId] = useStorage('deviceId');

  const getContacts = async () => {
    const requestAccessContactsPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        return false;
      }
    };

    const filter = {};
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
        const db = await getDBConnection();
        // await deleteTable(db, tablesName.Contact);
        const dataIdExists = (await getTableItems(db, tablesName.Contact)).map(
          (data: any) => data.id,
        );
        const filterData = contacts.filter(
          (data: any) => !dataIdExists?.includes(data?.id?.toString()),
        );

        if (filterData?.length > 0) {
          const formattedContacts = contacts.map(contact => ({
            name: _.get(contact, 'name'),
            phone_number: contact.number,
          }));
          const res = await privateAxios.post('/wp-json/cyno/v1/address_book', {
            device_id: deviceId,
            data: formattedContacts,
          });
          if (res.data.number) {
            const mapData = contacts.map((data: any) => ({
              id: data.id,
              content: JSON.stringify(data),
            }));
            await saveTableItems(db, tablesName.Contact, mapData);
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
      getContacts();
    }
  }, [deviceId]);

  return (
    <View>
      <Text>Contact</Text>
    </View>
  );
};

export default Contact;
