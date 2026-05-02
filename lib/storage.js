import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload an ID proof file for a tenant.
 * @param {string} tenantId
 * @param {File} file
 * @param {(pct: number) => void} onProgress  0–100
 * @returns {Promise<string>} download URL
 */
export function uploadIdProof(tenantId, file, onProgress) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop();
    const storageRef = ref(storage, `id-proofs/${tenantId}/${Date.now()}.${ext}`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * Delete an ID proof file by its storage URL.
 */
export async function deleteIdProof(url) {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch {
    // ignore if already deleted
  }
}
