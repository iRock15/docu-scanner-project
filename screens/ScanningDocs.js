import { StyleSheet, Text, View, Pressable } from "react-native";

function ScanningDocs() {
  return (
    <View>
      <Pressable
        // The 'pressed' boolean is provided by React Native when the user touches the component
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text>Scanning Docs</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});

export default ScanningDocs;
