// import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DocumentScanner from "react-native-document-scanner-plugin";
import { Button } from "react-native-paper";
import { useCameraPermissions } from "expo-camera";
import { PermissionsAndroid } from "react-native";

import ScanningDocs from "./ScanningDocs";
import HomeAppBar from "../components/HomeAppBar";
import { useNavigation } from "@react-navigation/native";

import { copyToStorage } from "../utils/copyToStorage";
import { useScan } from "../hooks/ScanContext";

function HomeScreen() {
  const { addPages } = useScan();
  const navigation = useNavigation();
  const onScan = async () => {
    // 1. ask for camera permission (Android)
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );

    // 2. denied -> alert
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      // TODO: if result === 'never_ask_again', the system dialog won't show
      // again. Offer a button that calls Linking.openSettings()
      Alert.alert("Camera needed", "Allow camera access to scan documents.");
      return;
    }

    // 3. granted -> open scanner
    const { scannedImages, status } = await DocumentScanner.scanDocument();
    if (status !== "success" || !scannedImages?.length) return;

    try {
      const pages = await copyToStorage(scannedImages);
      addPages(pages);
      navigation.navigate("Review");
      console.log(scannedImages);
      console.log(pages);
    } catch (error) {
      console.warn(error);
      Alert.alert("Couldn't save scan", "Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <HomeAppBar />
      <Text style={styles.text}>Scan your documents into PDFs.</Text>

      <Button
        icon="camera"
        mode="contained"
        textColor="black"
        labelStyle={{ fontFamily: "Anton-Regular", fontSize: 20 }}
        style={styles.buttons}
        onPress={onScan}
      >
        Open camera
      </Button>

      {/* <Button
        icon="image"
        mode="contained"
        textColor="black"
        labelStyle={{ fontFamily: "Anton-Regular", fontSize: 20 }}
        style={styles.buttons}
      >
        Choose from gallery
      </Button> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#131313", // primary
    // secondary : #303030
    // white: #fff
    // blue: #a8c8fb
    // darker blue: #004a77
    // font: #0a3171
    // font: #a6c2ed
  },
  text: {
    color: "#fff",
    fontFamily: "Anton-Regular",
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 126,
    fontSize: 50,
  },

  button1: {
    marginTop: 150,
  },
  button2: {
    marginTop: 80,
  },

  buttons: {
    marginRight: 50,
    padding: 5,
    marginLeft: 50,
    marginTop: 40,
    borderRadius: 50,
    backgroundColor: "#a8c8fb",
    borderWidth: 5,
    // borderColor: "#a8c8fb",
    fontFamily: "Anton-Regular",
  },
  // buttonText: {
  //   color: "black",
  // },
});

export default HomeScreen;
