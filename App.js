import { StyleSheet, Text, View } from "react-native";
// import { AppRegistry } from "react-native";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";

import { ScanProvider } from "./hooks/ScanContext";

// import { StatusBar } from "expo-status-bar";

import HomeScreen from "./screens/HomeScreen";
import ScanningDocs from "./screens/ScanningDocs";
import Enhancments from "./screens/Enhancments";
import Finish from "./screens/Finish";
import Review from "./screens/Review";
import OrderSizingCrop from "./screens/OrderSizingCrop";
import Settings from "./screens/Settings";

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    "Anton-Regular": require("./assets/fonts/Anton-Regular.ttf"),
  });
  return (
    <PaperProvider>
      <ScanProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="ScanningDocs" component={ScanningDocs} />
            <Stack.Screen name="Enhancments" component={Enhancments} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Review" component={Review} />
            <Stack.Screen name="Finish" component={Finish} />
          </Stack.Navigator>
        </NavigationContainer>
      </ScanProvider>
    </PaperProvider>
  );
}

// AppRegistry.registerComponent("APP", () => App);
