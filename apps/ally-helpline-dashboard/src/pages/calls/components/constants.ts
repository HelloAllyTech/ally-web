import { Accept } from "react-dropzone";

import { AudioUploadFormData } from "./types";

export const TRANSCRIPT_PAGE_SIZE = 30;

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
  { label: "(GMT +5:30) IST (Asia/Kolkata)", value: "Asia/Kolkata" },
  { label: "(GMT -8:00) PST (America/Los_Angeles)", value: "America/Los_Angeles" },
  { label: "(GMT -5:00) EST (America/New_York)", value: "America/New_York" },
  { label: "(GMT +0:00) UTC", value: "UTC" },
  { label: "(GMT -7:00) MST (America/Denver)", value: "America/Denver" },
  { label: "(GMT -7:00) MST (America/Phoenix)", value: "America/Phoenix" },
  { label: "(GMT -6:00) CST (America/Chicago)", value: "America/Chicago" },
  { label: "(GMT -5:00) EST (America/Toronto)", value: "America/Toronto" },
  { label: "(GMT -6:00) CST (America/Mexico_City)", value: "America/Mexico_City" },
  { label: "(GMT -5:00) COT (America/Bogota)", value: "America/Bogota" },
  { label: "(GMT -5:00) PET (America/Lima)", value: "America/Lima" },
  { label: "(GMT -3:00) BRT (America/Sao_Paulo)", value: "America/Sao_Paulo" },
  { label: "(GMT -3:00) ART (America/Buenos_Aires)", value: "America/Buenos_Aires" },
  { label: "(GMT -1:00) AZOT (Atlantic/Azores)", value: "Atlantic/Azores" },
  { label: "(GMT +0:00) GMT (Europe/London)", value: "Europe/London" },
  { label: "(GMT +0:00) GMT (Europe/Dublin)", value: "Europe/Dublin" },
  { label: "(GMT +0:00) GMT (Europe/Lisbon)", value: "Europe/Lisbon" },
  { label: "(GMT +1:00) CET (Europe/Paris)", value: "Europe/Paris" },
  { label: "(GMT +1:00) CET (Europe/Berlin)", value: "Europe/Berlin" },
  { label: "(GMT +1:00) CET (Europe/Madrid)", value: "Europe/Madrid" },
  { label: "(GMT +1:00) CET (Europe/Rome)", value: "Europe/Rome" },
  { label: "(GMT +1:00) CET (Europe/Warsaw)", value: "Europe/Warsaw" },
  { label: "(GMT +2:00) EET (Africa/Cairo)", value: "Africa/Cairo" },
  { label: "(GMT +2:00) SAST (Africa/Johannesburg)", value: "Africa/Johannesburg" },
  { label: "(GMT +2:00) IST (Asia/Jerusalem)", value: "Asia/Jerusalem" },
  { label: "(GMT +3:00) MSK (Europe/Moscow)", value: "Europe/Moscow" },
  { label: "(GMT +4:00) GST (Asia/Dubai)", value: "Asia/Dubai" },
  { label: "(GMT +5:00) PKT (Asia/Karachi)", value: "Asia/Karachi" },
  { label: "(GMT +6:00) BST (Asia/Dhaka)", value: "Asia/Dhaka" },
  { label: "(GMT +7:00) ICT (Asia/Bangkok)", value: "Asia/Bangkok" },
  { label: "(GMT +7:00) WIB (Asia/Jakarta)", value: "Asia/Jakarta" },
  { label: "(GMT +8:00) SGT (Asia/Singapore)", value: "Asia/Singapore" },
  { label: "(GMT +8:00) CST (Asia/Shanghai)", value: "Asia/Shanghai" },
  { label: "(GMT +8:00) AWST (Australia/Perth)", value: "Australia/Perth" },
  { label: "(GMT +9:00) JST (Asia/Tokyo)", value: "Asia/Tokyo" },
  { label: "(GMT +9:00) KST (Asia/Seoul)", value: "Asia/Seoul" },
  { label: "(GMT +10:00) AEST (Australia/Sydney)", value: "Australia/Sydney" },
  { label: "(GMT +12:00) NZST (Pacific/Auckland)", value: "Pacific/Auckland" },
];

export const defaultAudioFormData: AudioUploadFormData = {
  counsellorId: "",
  date: null,
  time: null,
  timeZone: timezoneOptions[0].value,
};
