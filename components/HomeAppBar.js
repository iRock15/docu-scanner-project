import { Appbar } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";

function HomeAppBar() {
  const navigation = useNavigation();

  return (
    <Appbar.Header style={styles.appBar} elevated={true}>
      <Appbar.Content color={"beige"} />

      <Appbar.Action
        icon="cog"
        size={45}
        color={"beige"}
        onPress={() => navigation.navigate("Settings")}
      />
      {/* <Appbar.Action icon="dots-vertical" onPress={_handleMore} /> */}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  appBar: {
    backgroundColor: "#040411",
    zIndex: 1,
    elevation: 5,
    margin: 10,
    borderBottomWidth: 3,
    borderBottomColor: "beige",
  },
});

export default HomeAppBar;
