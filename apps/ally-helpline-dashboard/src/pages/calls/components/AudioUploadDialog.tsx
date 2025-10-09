import { FC, useEffect, useState } from "react";

import { Dialog } from "@mui/material";
import axios from "axios";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { motion } from "framer-motion";
import { toast } from "sonner";

import {
  useGetAudioUploadUrlMutation,
  useGetCounsellorsQuery,
  useCancelAudioUploadMutation,
} from "@api";
import { Dropdown, DatePicker, TimePicker, Button, ButtonVariant } from "@components";
import { addAudioUpload, updateUploadProgress, updateUploadError } from "@reducer";
import { store } from "@src/store";
import { UploadStatus } from "@types";

import AudioUploadInterface from "./AudioUploadInterface";
import { defaultAudioFormData, timezoneOptions } from "./constants";
import { AudioUploadDialogProps, AudioUploadFormData } from "./types";
import { getMaxSelectableTimeForDate } from "./utils";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const AudioUploadDialog: FC<AudioUploadDialogProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<AudioUploadFormData>(defaultAudioFormData);
  const [duration, setDuration] = useState<number>(0);

  const { data: counsellorsData } = useGetCounsellorsQuery({ offset: 0 });
  const [
    getAudioUploadUrl,
    { isLoading: isGetAudioUploadUrlLoading, error: getAudioUploadUrlError },
  ] = useGetAudioUploadUrlMutation();
  const [cancelAudioUpload] = useCancelAudioUploadMutation();
  const { data: counsellors = [] } = counsellorsData || {};

  const isUploadButtonDisabled =
    files.length === 0 ||
    !formData.counsellorId ||
    !formData.date ||
    !formData.time ||
    !formData.timeZone ||
    !duration;

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (getAudioUploadUrlError) {
      toast.error((getAudioUploadUrlError as any)?.data?.message || "Audio Upload failed!");
    }
  }, [getAudioUploadUrlError]);

  const onDropAccepted = (files: File[]) => {
    setFiles(files);
  };

  const handleCancel = () => {
    onClose();
    setFiles([]);
    setFormData(defaultAudioFormData);
  };

  const getStartedTimestampInUtc = (date: Dayjs, time: Dayjs, tz: string): string | undefined => {
    if (!date || !time || !tz) return undefined;
    // Basic guard: rely on IANA values from dropdown; skip extra validation here
    const zoned = dayjs.tz(
      `${date.format("YYYY-MM-DD")} ${time.format("HH:mm")}`,
      "YYYY-MM-DD HH:mm",
      tz,
    );
    // Return ISO without milliseconds to avoid backend validation issues
    return zoned.utc().format("YYYY-MM-DD[T]HH:mm:ss[Z]");
  };

  const onUpload = async () => {
    const audioFile = files[0];
    const response = await getAudioUploadUrl({
      contentType: audioFile.type,
      fileSize: audioFile.size, // in bytes
      fileName: audioFile.name,
      counselorId: Number(formData.counsellorId),
      startedAt: getStartedTimestampInUtc(formData.date, formData.time, formData.timeZone),
      platform: "WEB",
      duration,
    });
    const { presignedUrl, chatId } = response.data;

    // upload audio file to s3
    try {
      if (presignedUrl && chatId) {
        let uploadStarted = false;
        await axios.put(presignedUrl, audioFile, {
          headers: { "Content-Type": audioFile.type },
          onUploadProgress: e => {
            if (!uploadStarted) {
              uploadStarted = true;
              store.dispatch(
                addAudioUpload({
                  chatId,
                  fileName: audioFile.name,
                  status: UploadStatus.IN_PROGRESS,
                  progress: 0,
                  error: null,
                }),
              );
              handleCancel();
            }
            if (e.total)
              store.dispatch(
                updateUploadProgress({
                  chatId,
                  progress: Math.round((e.loaded * 100) / e.total),
                }),
              );
          },
          timeout: 1800000, // 30 Minutes
        });
      }
    } catch (error) {
      console.error(error);
      store.dispatch(updateUploadError({ chatId, error: "Failed to upload audio" }));
      // store.dispatch(removeAudioUpload(chatId));
      cancelAudioUpload({ chatId });
      toast.error("Failed to upload audio");
    }
  };

  // Disable future selections considering the selected time zone
  const nowInSelectedTz = formData.timeZone ? dayjs().tz(formData.timeZone) : dayjs();
  const maxDateForTz = dayjs(nowInSelectedTz.format("YYYY-MM-DD"), "YYYY-MM-DD");

  const maxTimeForPicker = getMaxSelectableTimeForDate(formData.timeZone, formData.date);
  const disableTimePicker = !formData.date || !formData.timeZone;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        style: {
          borderRadius: "8px",
          overflow: "hidden",
        },
      }}
    >
      <motion.div
        className="max-w-[760px] min-w-[600px] w-full flex flex-col gap-6 p-6 sm:p-8 md:p-10"
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="flex items-center justify-between"
        >
          <span className="text-[24px] font-['Replay_Pro'] text-[#0D0D0D]">
            Upload audio recording
          </span>
        </motion.div>

        {/* Dropzone placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          <AudioUploadInterface
            duration={duration}
            setDuration={setDuration}
            files={files}
            onDropSuccess={onDropAccepted}
            onDeleteClick={() => setFiles([])}
          />
        </motion.div>

        {/* Form grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-['IBM_Plex_Serif'] text-[#1A1A1A]"
        >
          {/* Counsellor */}
          <div className="flex flex-col gap-2">
            <label>Counsellor name</label>
            <Dropdown
              value={formData.counsellorId}
              options={counsellors.map(({ id, name }) => ({
                label: name,
                value: id,
              }))}
              onChange={value => setFormData({ ...formData, counsellorId: value })}
              placeholder="Select Counsellor"
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-2">
            <label>Session date</label>
            <DatePicker
              value={formData.date}
              onChange={value => setFormData({ ...formData, date: value })}
              maxDate={maxDateForTz}
            />
          </div>

          {/* Time zone */}
          <div className="flex flex-col gap-2">
            <label>Time zone</label>
            <Dropdown
              value={formData.timeZone}
              options={timezoneOptions}
              onChange={value => setFormData({ ...formData, timeZone: value })}
              placeholder="Select time zone"
            />
          </div>

          {/* Time */}
          <div className="flex flex-col gap-2">
            <label>Session time</label>
            <TimePicker
              value={formData.time}
              onChange={value => setFormData({ ...formData, time: value })}
              maxTime={maxTimeForPicker}
              disabled={disableTimePicker}
            />
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="flex items-center justify-between gap-4"
        >
          <Button fullWidth variant={ButtonVariant.SECONDARY} onClick={handleCancel}>
            Cancel
          </Button>
          <Button fullWidth onClick={onUpload} disabled={isUploadButtonDisabled}>
            {isGetAudioUploadUrlLoading ? "Uploading..." : "Upload"}
          </Button>
        </motion.div>
      </motion.div>
    </Dialog>
  );
};

export default AudioUploadDialog;
