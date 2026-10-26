import { useEffect } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Button } from "react-native-paper";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { StorageAccessFramework, EncodingType } from "expo-file-system/legacy";
import { File, Paths } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useScan } from "../hooks/ScanContext";

const SAF_DIR_KEY = "saf_save_directory_uri";

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Read a file as a base64 string using the new expo-file-system File API.
 * File.arrayBuffer() returns the raw bytes; we convert in 8 KB chunks to
 * avoid blowing the JS call-stack with a single spread on large images.
 */
async function toBase64(uri) {
  const buffer = await new File(uri).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Build an HTML document where every page is a full-page <img> */
async function buildHtml(pages) {
  const imgs = await Promise.all(
    pages.map(async ({ uri }) => {
      const ext = uri.split(".").pop().toLowerCase();
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      const b64 = await toBase64(uri);
      return `<img src="data:${mime};base64,${b64}" />`;
    }),
  );

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#fff; }
      img {
        display:block;
        width:100%;
        height:100vh;
        object-fit:contain;
        page-break-after:always;
      }
      img:last-child { page-break-after:auto; }
    </style>
  </head>
  <body>${imgs.join("\n")}</body>
</html>`;
}

/**
 * Save the PDF to a user-chosen public folder (Downloads by default) using
 * the Android Storage Access Framework (SAF).
 *
 * SAF is the only reliable way to write arbitrary files to public storage on
 * Android 10+ without a dangerous MANAGE_EXTERNAL_STORAGE permission.
 *
 * Flow:
 *  1. First export ever  → system folder-picker opens (pre-aimed at Downloads)
 *                          → user taps "Use this folder" once
 *  2. SAF directory URI is persisted in AsyncStorage
 *  3. Every subsequent export writes directly — zero user interaction
 */
async function savePdfToPublicDownloads(sourceUri, fileName) {
  // --- 1. Resolve or request the SAF directory permission ---
  let dirUri = await AsyncStorage.getItem(SAF_DIR_KEY);

  if (!dirUri) {
    // Pre-navigate the picker to the public Downloads folder
    const downloadsHint =
      StorageAccessFramework.getUriForDirectoryInRoot("Download");
    const result =
      await StorageAccessFramework.requestDirectoryPermissionsAsync(
        downloadsHint,
      );

    if (!result.granted) {
      throw new Error(
        "Folder access denied — please grant permission to save PDFs.",
      );
    }
    dirUri = result.directoryUri;
    await AsyncStorage.setItem(SAF_DIR_KEY, dirUri);
  }

  // --- 2. Read the PDF as base64 ---
  const base64 = await StorageAccessFramework.readAsStringAsync(sourceUri, {
    encoding: EncodingType.Base64,
  });

  // --- 3. Create the file in the chosen public directory ---
  const fileUri = await StorageAccessFramework.createFileAsync(
    dirUri,
    fileName,
    "application/pdf",
  );

  // --- 4. Write the base64 content ---
  await StorageAccessFramework.writeAsStringAsync(fileUri, base64, {
    encoding: EncodingType.Base64,
  });

  return fileUri;
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function Finish() {
  const navigation = useNavigation();
  const {
    pages,
    exportStatus,
    pdfUri,
    exportError,
    startExport,
    finishExport,
    failExport,
    clearAll,
  } = useScan();

  // kick off export as soon as the screen mounts
  useEffect(() => {
    if (exportStatus === "idle") {
      runExport();
    }
  }, []);

  const runExport = async () => {
    startExport();
    try {
      const html = await buildHtml(pages);
      // expo-print renders HTML → PDF into a temporary cache file
      const { uri: tmpUri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const fileName = `scan_${Date.now()}.pdf`;

      // 1. Save to app's persistent document directory (local file:// URI, required for ExpoSharing)
      const localFile = new File(Paths.document, fileName);
      await new File(tmpUri).copy(localFile);

      // 2. Save a copy to public folder via SAF (visible in file manager)
      await savePdfToPublicDownloads(localFile.uri, fileName);

      // 3. Clean up the tmp cache file
      try {
        new File(tmpUri).delete();
      } catch (_) {}

      finishExport(localFile.uri); // also wipes the raw page images from disk
    } catch (err) {
      console.error(err);
      failExport(err?.message ?? "Unknown error");
    }
  };

  // Share the saved PDF using the local file:// URI
  const onShare = async () => {
    if (!pdfUri) return;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Share your PDF",
        UTI: "com.adobe.pdf",
      });
    }
  };

  const onStartOver = () => {
    clearAll();
    navigation.popToTop();
  };

  // ── loading ──
  if (exportStatus === "idle" || exportStatus === "exporting") {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#a8c8fb" />
        <Text style={styles.statusText}>Creating PDF…</Text>
      </View>
    );
  }

  // ── error ──
  if (exportStatus === "error") {
    return (
      <View style={[styles.container, styles.center]}>
        {/* <Text style={styles.icon}>⚠️</Text> */}
        <Text style={styles.title}>Export failed</Text>
        <Text style={styles.subtitle}>{exportError}</Text>
        <Button
          mode="contained"
          onPress={runExport}
          style={styles.btn}
          labelStyle={styles.btnLabel}
          textColor="black"
        >
          Try again
        </Button>
        <Button
          mode="outlined"
          onPress={onStartOver}
          style={[styles.btn, styles.btnOutlined]}
          labelStyle={styles.btnLabel}
          textColor="#fff"
        >
          Start over
        </Button>
      </View>
    );
  }

  // ── success ──
  return (
    <View style={[styles.container, styles.center]}>
      {/* <Text style={styles.icon}>✅</Text> */}
      <Text style={styles.title}>PDF saved!</Text>
      <Text style={styles.subtitle} numberOfLines={3} ellipsizeMode="middle">
        File name: {pdfUri ? decodeURIComponent(pdfUri.split("/").pop()) : ""}
      </Text>

      <Button
        icon="share-variant"
        mode="contained"
        onPress={onShare}
        style={styles.btn}
        labelStyle={styles.btnLabel}
        textColor="black"
      >
        Share PDF
      </Button>

      <Button
        icon="refresh"
        mode="outlined"
        onPress={onStartOver}
        style={[styles.btn, styles.btnOutlined]}
        labelStyle={styles.btnLabel}
        textColor="#fff"
      >
        Start over
      </Button>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#131313",
    padding: 32,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    color: "#a8c8fb",
    fontFamily: "Anton-Regular",
    fontSize: 50,
    marginBottom: 2,
    textAlign: "center",
  },
  subtitle: {
    color: "#fff",
    fontFamily: "Anton-Regular",
    fontSize: 15,
    opacity: 0.8,
    textAlign: "center",
    marginBottom: 80,
    paddingHorizontal: 16,
  },
  statusText: {
    color: "#fff",
    fontFamily: "Anton-Regular",
    fontSize: 20,
    marginTop: 20,
    opacity: 0.7,
  },
  btn: {
    width: "100%",
    borderRadius: 50,
    backgroundColor: "#a8c8fb",
    marginBottom: 16,
    paddingVertical: 4,
  },
  btnOutlined: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#fff",
  },
  btnLabel: {
    fontFamily: "Anton-Regular",
    fontSize: 18,
  },
});
