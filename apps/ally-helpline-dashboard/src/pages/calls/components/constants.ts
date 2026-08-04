import { Accept } from "react-dropzone";

import { AudioUploadFormData } from "./types";

export const TRANSCRIPT_PAGE_SIZE = 30;

export const GENERAL_COMMENTS_PAGE_SIZE = 10;

export const SUMMARY_FEEDBACK_TIMEOUT = 30000; // 30 seconds

export const audioUploadExtensions: Accept = {
  // MP3 files - various MIME types
  "audio/mpeg": [".mp3"],
  "audio/mp3": [".mp3"],
  "audio/x-mp3": [".mp3"],

  // WAV files - various MIME types
  "audio/wav": [".wav"],
  "audio/x-wav": [".wav"],
  "audio/wave": [".wav"],
  "audio/vnd.wave": [".wav"],

  // M4A files - various MIME types
  "audio/mp4": [".m4a"],
  "audio/x-m4a": [".m4a"],
  "audio/m4a": [".m4a"],
  "audio/mp4a-latm": [".m4a"],
};

export const AUDIO_UPLOAD_SIZE_IN_BYTES = 800 * 1024 * 1024; // 800 MB

export const timezoneOptions = [
  { label: "(GMT -5:30) IST (Asia/Calcutta)", value: "Asia/Kolkata" },
  { label: "(GMT -8:00) PST (America/Los_Angeles)", value: "America/Los_Angeles" },
  { label: "(GMT -5:00) EST (America/New_York)", value: "America/New_York" },
  { label: "(GMT +0:00) UTC", value: "UTC" },
];

export const defaultAudioFormData: AudioUploadFormData = {
  counsellorId: "",
  date: null,
  time: null,
  timeZone: timezoneOptions[0].value,
};

export const TRANSCRIPT_LANGUAGE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
];
