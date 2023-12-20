/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import {
  View,
  Text,
  Platform,
  PermissionsAndroid,
  Linking,
  ActivityIndicator,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {
  CameraRoll,
  PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';
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
    useAsyncStorage('@media');
  getDeviceIdStore((_err, result) => setDeviceId(result));
  const pageSize = 10000;
  const [isUploading, setIsUploading] = useState(false);
  const [counter, setCounter] = useState(0);
  const [total, setTotal] = useState(0);
  const intervalRef = useRef<any>(0);

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

      let promises: Promise<any>[] = [];
      if (!_.isEmpty(photos.edges)) {
        photos.edges.forEach((photo: PhotoIdentifier) => {
          promises.push(sendPhotoToServer(photo.node));
        });
        setTotal(photos.edges.length);
      }
      setIsUploading(true);
      await Promise.all(promises);
      setIsUploading(false);
    } catch (error) {
      setIsUploading(false);
      console.log('getPhotos => ', error);
    }
  };

  const sendPhotoToServer = async (photo: any) => {
    try {
      let photoStore = await getPhotoStore();
      let dataIdExists = _.isNull(photoStore)
        ? []
        : await JSON.parse(photoStore);
      const photoNotUploaded = !dataIdExists?.includes(photo?.id) ? photo : [];
      setCounter(dataIdExists.length);

      if (!_.isEmpty(photoNotUploaded)) {
        const formData = new FormData();
        formData.append('device_id', deviceId);
        formData.append('images[]', {
          uri: photoNotUploaded?.image?.uri,
          name: photoNotUploaded?.image?.filename,
          type: photoNotUploaded?.type,
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
          photoStore = await getPhotoStore();
          dataIdExists = _.isNull(photoStore)
            ? []
            : await JSON.parse(photoStore);
          dataIdExists.push(photoNotUploaded?.id);
          setCounter(dataIdExists.length);
          await setPhotoStore(
            JSON.stringify(_.uniq(dataIdExists)),
            console.log,
          );
        }

        console.log('Media Uploaded++');
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
      const timeInterval = 1000 * 30;
      getMedia();
      intervalRef.current = setInterval(() => {
        if (!isUploading) {
          getMedia();
        }
      }, timeInterval);
    } else {
      clearInterval(intervalRef.current);
    }
  }, [deviceId]);

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <Text>Media</Text>
      <Text>{`${counter}/${total}`}</Text>
      <ActivityIndicator size={13} animating={isUploading} />
    </View>
  );
};

export default Media;
