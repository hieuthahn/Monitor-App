/* eslint-disable react-native/no-inline-styles */
import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AuthenticationScreen from './src/screens/Authentication/Authentication';
import PermissionScreen from './src/screens/Permission/Permission';

const Stack = createNativeStackNavigator();

function App(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
          name="Home"
          component={AuthenticationScreen}
        />
        <Stack.Screen
          options={{
            headerShown: false,
          }}
          name="Permission"
          component={PermissionScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
