/* eslint-disable react-native/no-inline-styles */
import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Authentication from './src/screens/Authentication/Authentication';
import Permission from './src/screens/Permission/Permission';
import {useStorage} from './src/hook/use-storage';

const Stack = createNativeStackNavigator();

function App(): JSX.Element {
  const [deviceId] = useStorage('deviceId');

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
