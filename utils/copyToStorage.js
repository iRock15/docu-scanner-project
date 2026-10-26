// storage.js
import { File, Directory, Paths } from "expo-file-system";

const SCANS_DIR_NAME = "scanned-images";

export function deletePageFile(page) {
  try {
    const file = new File(page.uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn("Could not delete", page.uri, e);
  }
}

function getScansDirectory() {
  const directory = new Directory(Paths.document, SCANS_DIR_NAME);
  if (!directory.exists) {
    directory.create();
  }
  return directory;
}

function getExtension(uri) {
  const dot = uri.lastIndexOf(".");
  return dot === -1 ? ".jpg" : uri.slice(dot);
}

function rollback(pages) {
  pages.forEach(deletePageFile);
}

export async function copyToStorage(uris) {
  const saved = [];

  try {
    const directory = getScansDirectory();
    const batch = Date.now();

    for (let index = 0; index < uris.length; index++) {
      const uri = uris[index];
      const id = `${batch}_${index}`;
      const destination = new File(directory, `${id}${getExtension(uri)}`);

      await new File(uri).copy(destination); // copy() is async — must await
      saved.push({ id, uri: destination.uri });
    }

    return saved;
  } catch (error) {
    rollback(saved);
    throw error;
  }
}
