/* eslint-disable react-native/no-inline-styles */
import {NavigationContainer} from '@react-navigation/native';
import React, {useState} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Authentication from './src/screens/Authentication/Authentication';
import Permission from './src/screens/Permission/Permission';
import {useAsyncStorage} from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();

function App(): JSX.Element {
  const [deviceId, setDeviceId] = useState<string | null | undefined>(null);
  const {getItem: getDeviceIdStore} = useAsyncStorage('@deviceId');
  getDeviceIdStore((_err, result) => setDeviceId(result));

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={deviceId ? 'Permission' : 'Authentication'}>
        <Stack.Screen
          options={{
            headerShown: false,
            animationTypeForReplace: !deviceId ? 'pop' : 'push',
          }}
          name="Authentication"
          component={Authentication}
        />
        <Stack.Screen
          options={{
            headerShown: false,
          }}
          name="Permission"
          component={Permission}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
