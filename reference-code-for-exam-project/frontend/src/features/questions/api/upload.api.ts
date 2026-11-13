import { client } from "../../../shared/api";

export const uploadApi = {
  requestUpload(entityType: string, entityId: string, file: File) {
    return client<{ success: true; data: { uploadId: string; uploadUrl: string; key: string } }>("/uploads/request", {
      method: "POST",
      body: JSON.stringify({
        entityType,
        entityId,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    });
  },

  confirmUpload(uploadId: string) {
    return client<{ success: true; data: { key: string; imageUrl: string } }>(`/uploads/${uploadId}/confirm`, {
      method: "POST",
    });
  },

  deleteUpload(uploadId: string) {
    return client<{ success: true; data: { id: string; deleted: true } }>(`/uploads/${uploadId}`, {
      method: "DELETE",
    });
  },
};

export function uploadFileToS3(uploadUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.send(file);
  });
}

export function getImageUrl(key: string) {
  return client<{ success: true; data: { imageUrl: string } }>(`/uploads/image-url?key=${encodeURIComponent(key)}`);
}
