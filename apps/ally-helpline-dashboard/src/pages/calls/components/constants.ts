import { Accept } from "react-dropzone";

import { AudioUploadFormData } from "./types";

export const TRANSCRIPT_PAGE_SIZE = 30;

export const SUMMARY_FEEDBACK_TIMEOUT = 30000; // 30 seconds

export const audioUploadExtensions: Accept = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/mp4": [".m4a"],
};

export const AUDIO_UPLOAD_SIZE_IN_BYTES = 300 * 1024 * 1024; // 300MB

export const defaultAudioFormData: AudioUploadFormData = {
  counsellorId: "",
  date: null,
  time: null,
  timeZone: "",
};

export const timezoneOptions = [
  { label: "(GMT -5:30) IST (Asia/Calcutta)", value: "Asia/Kolkata" },
  { label: "(GMT -8:00) PST (America/Los_Angeles)", value: "America/Los_Angeles" },
  { label: "(GMT -5:00) EST (America/New_York)", value: "America/New_York" },
  { label: "(GMT +0:00) UTC", value: "UTC" },
];
