export const imageTypes = {
  JPEG: "image/jpeg",
  PNG: "image/png",
};

export const FILE_TYPE = {
  IMAGE: "image",
  VIDEO: "video",
  ANY: "any",
};

export const FILE_SIZE_LIMITS = {
  IMAGE: 2 * 1024 * 1024, // 2MB
  VIDEO: 15 * 1024 * 1024, // 15MB
};

export const ASPECT_RATIO = 16 / 9;
export const ASPECT_RATIO_TOLERANCE = 0.01;
export const PROFILE_ASPECT_RATIO = 1 / 1;

export const ACCEPTED_FILE_TYPES = {
  IMAGE: { "image/jpeg": [".jpeg", ".jpg"], "image/png": [".png"] },
  VIDEO: {
    "video/mp4": [".mp4"],
    "video/quicktime": [".mov"],
    "video/x-msvideo": [".avi"],
  },
};

export const ACCEPT_ATTRIBUTES = {
  IMAGE: "image/jpeg,image/png",
  VIDEO: "video/mp4,video/quicktime,video/x-msvideo",
  ANY: "image/jpeg,image/png,video/mp4,video/quicktime,video/x-msvideo",
};
