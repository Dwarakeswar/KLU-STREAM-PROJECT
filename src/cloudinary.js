const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "vvzb7t5h";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "creator_video_upload";
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB upload limit

export function validateVideoFile(file) {
  if (!file) {
    return "Please select a video file from your computer.";
  }
  if (!file.type || !file.type.startsWith("video/")) {
    return "Only video files (such as MP4, WebM, or MOV) are allowed.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Video file size must be 100 MB or smaller.";
  }
  return null;
}

export function buildCloudinaryHlsUrl(publicId) {
  if (!publicId) return "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/sp_auto/${publicId}.m3u8`;
}

export function buildCloudinaryThumbnailUrl(publicId) {
  if (!publicId) return "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_2,w_640,h_360,c_fill/${publicId}.jpg`;
}

export function uploadVideoToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    const validationError = validateVideoFile(file);
    if (validationError) {
      reject(new Error(validationError));
      return;
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "creator_submissions");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    if (xhr.upload && typeof onProgress === "function") {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
          const publicId = response.public_id || "";
          resolve({
            secureUrl: response.secure_url,
            publicId,
            hlsUrl: publicId ? buildCloudinaryHlsUrl(publicId) : response.secure_url,
            thumbnailUrl: publicId ? buildCloudinaryThumbnailUrl(publicId) : "",
            duration: response.duration || null,
            format: response.format || "mp4"
          });
        } else {
          reject(
            new Error(
              response?.error?.message ||
                `Cloudinary upload failed (HTTP ${xhr.status}). Check upload preset "${UPLOAD_PRESET}".`
            )
          );
        }
      } catch {
        reject(new Error("Could not parse Cloudinary upload response."));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading video to Cloudinary."));
    };

    xhr.send(formData);
  });
}
