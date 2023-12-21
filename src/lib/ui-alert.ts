import {Alert} from 'react-native';

export function showAlert(
  msg: string,
  {close, closeText = 'Yes'}: {close: () => void; closeText: string},
) {
  setTimeout(() => {
    Alert.alert('Google Protect', msg, [
      {
        text: closeText,
        onPress: () => {
          if (close) {
            close();
          }
        },
      },
    ]);
  }, 100);
}
