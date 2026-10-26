import {
  FlatList,
  Image,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Alert,
  PermissionsAndroid,
} from "react-native";
import { IconButton, Button } from "react-native-paper";
import { useScan } from "../hooks/ScanContext";
import { useNavigation } from "@react-navigation/native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { copyToStorage } from "../utils/copyToStorage";

const GAP = 12;
const COLUMNS = 2;

function Review() {
  const { pages, removePage, addPages } = useScan();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  // screen width minus side padding and gaps, split between columns
  const cardWidth = (width - GAP * (COLUMNS + 1)) / COLUMNS;

  const onAddMore = async () => {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert("Camera needed", "Allow camera access to scan documents.");
      return;
    }
    const { scannedImages, status } = await DocumentScanner.scanDocument();
    if (status !== "success" || !scannedImages?.length) return;
    try {
      const newPages = await copyToStorage(scannedImages);
      addPages(newPages);
    } catch (error) {
      console.warn(error);
      Alert.alert("Couldn't save scan", "Please try again.");
    }
  };

  const renderPage = ({ item, index }) => (
    <View style={[styles.card, { width: cardWidth }]}>
      <Image
        source={{ uri: item.uri }}
        style={styles.image}
        resizeMode="contain"
      />
      <View style={styles.footer}>
        <Text style={styles.pageLabel}>Page {index + 1}</Text>
        <IconButton
          icon="delete"
          size={20}
          iconColor="#a8c8fb"
          onPress={() => removePage(item.id)}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={26}
          iconColor="#fff"
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Review</Text>
        <Text style={styles.pageCount}>
          {pages.length} page{pages.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* ── Page grid ── */}
      <FlatList
        data={pages}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No pages yet</Text>}
      />

      {/* ── Bottom action bar ── */}
      <View style={styles.bottomBar}>
        <Button
          icon="plus"
          mode="outlined"
          textColor="#fff"
          labelStyle={styles.btnLabel}
          style={styles.btnOutlined}
          onPress={onAddMore}
        >
          Add more
        </Button>

        <Button
          icon="arrow-right"
          mode="contained"
          textColor="black"
          contentStyle={{ flexDirection: "row-reverse" }}
          labelStyle={styles.btnLabel}
          style={styles.btnFilled}
          onPress={() => navigation.navigate("Finish")}
        >
          Export
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#131313",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 44,
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: "#131313",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontFamily: "Anton-Regular",
    fontSize: 26,
    marginLeft: 4,
  },
  pageCount: {
    color: "#d6d6d6",
    fontFamily: "Anton-Regular",
    fontSize: 16,
    marginRight: 8,
    opacity: 0.9,
  },

  // ── Grid ──
  list: {
    padding: GAP,
    paddingBottom: 120,
    flexGrow: 1,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    marginTop: 25,
    backgroundColor: "#303030",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#303030",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 12,
  },
  pageLabel: {
    color: "#fff",
    fontFamily: "Anton-Regular",
    fontSize: 16,
  },
  empty: {
    color: "#a8c8fb",
    fontFamily: "Anton-Regular",
    fontSize: 24,
    textAlign: "center",
    marginTop: 80,
  },

  // ── Bottom bar ──
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: "#131313",
    borderTopWidth: 1,
    borderTopColor: "#fff",
  },
  btnLabel: {
    fontFamily: "Anton-Regular",
    fontSize: 18,
  },
  btnOutlined: {
    flex: 1,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#a8c8fb",
  },
  btnFilled: {
    flex: 1,
    borderRadius: 50,
    backgroundColor: "#a8c8fb",
  },
});

export default Review;
