import { useEffect } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Button } from "react-native-paper";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { useNavigation } from "@react-navigation/native";
import { useScan } from "../hooks/ScanContext";

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

/** Save the PDF to Documents (persistent, not cache) and return its uri */
async function savePdfToDocuments(tmpUri) {
  const name = `scan_${Date.now()}.pdf`;
  const dest = new File(Paths.document, name);
  await new File(tmpUri).copy(dest); // must await — copy() is async
  return dest.uri;
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function Finish() {
  const navigation = useNavigation();
  const { pages, exportStatus, pdfUri, exportError, startExport, finishExport, failExport, clearAll } =
    useScan();

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
      // expo-print renders HTML → PDF and gives us a tmp uri
      const { uri: tmpUri } = await Print.printToFileAsync({ html, base64: false });
      // copy to Documents so it survives app restarts
      const savedUri = await savePdfToDocuments(tmpUri);
      // delete the tmp file
      try { new File(tmpUri).delete(); } catch (_) {}
      finishExport(savedUri); // also clears page images from disk
    } catch (err) {
      console.error(err);
      failExport(err?.message ?? "Unknown error");
    }
  };

  const onShare = async () => {
    if (!pdfUri) return;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(pdfUri, { mimeType: "application/pdf" });
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
        <ActivityIndicator size="large" color="beige" />
        <Text style={styles.statusText}>Creating PDF…</Text>
      </View>
    );
  }

  // ── error ──
  if (exportStatus === "error") {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.icon}>⚠️</Text>
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
          textColor="beige"
        >
          Start over
        </Button>
      </View>
    );
  }

  // ── success ──
  return (
    <View style={[styles.container, styles.center]}>
      <Text style={styles.icon}>✅</Text>
      <Text style={styles.title}>PDF saved!</Text>
      <Text style={styles.subtitle} numberOfLines={3} ellipsizeMode="middle">
        {pdfUri}
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
        textColor="beige"
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
    backgroundColor: "#040411",
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
    color: "beige",
    fontFamily: "Anton-Regular",
    fontSize: 36,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    color: "beige",
    fontFamily: "Anton-Regular",
    fontSize: 13,
    opacity: 0.5,
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  statusText: {
    color: "beige",
    fontFamily: "Anton-Regular",
    fontSize: 20,
    marginTop: 20,
    opacity: 0.7,
  },
  btn: {
    width: "100%",
    borderRadius: 50,
    backgroundColor: "beige",
    marginBottom: 16,
    paddingVertical: 4,
  },
  btnOutlined: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "beige",
  },
  btnLabel: {
    fontFamily: "Anton-Regular",
    fontSize: 18,
  },
});
