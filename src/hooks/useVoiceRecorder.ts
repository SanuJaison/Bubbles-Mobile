import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../api/client";
import type { PickedFile } from "../api/messages";

type UseVoiceRecorderOptions = {
  onRecorded: (file: PickedFile) => void;
  onError: (message: string) => void;
};

const resetAudioMode = () =>
  setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
  }).catch(() => {});

export const useVoiceRecorder = ({
  onRecorded,
  onError,
}: UseVoiceRecorderOptions) => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [starting, setStarting] = useState(false);

  const start = useCallback(async () => {
    if (recorder.isRecording || recorderState.isRecording || starting) return;

    setStarting(true);

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        onError("Microphone permission is needed to record voice messages.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      await resetAudioMode();
      onError(getErrorMessage(error, "Unable to start recording."));
    } finally {
      setStarting(false);
    }
  }, [onError, recorder, recorderState.isRecording, starting]);

  const stop = useCallback(async () => {
    if (!recorder.isRecording) return;

    const duration = Math.max(
      1,
      Math.round(recorder.currentTime || recorderState.durationMillis / 1000)
    );

    try {
      await recorder.stop();
      const uri = recorder.uri;

      await resetAudioMode();

      if (!uri) {
        onError("The recording could not be saved. Please try again.");
        return;
      }

      onRecorded({
        uri,
        name: `voice-${Date.now()}.m4a`,
        type: "audio/m4a",
        duration,
        waveform: [],
      });
    } catch (error) {
      await resetAudioMode();
      onError(getErrorMessage(error, "Unable to save your voice message."));
    }
  }, [onError, onRecorded, recorder, recorderState.durationMillis]);

  const cancel = useCallback(async () => {
    if (!recorder.isRecording) return;

    try {
      await recorder.stop();
    } catch {
      // The recording is discarded either way.
    } finally {
      await resetAudioMode();
    }
  }, [recorder]);

  useEffect(
    () => () => {
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
      resetAudioMode();
    },
    [recorder]
  );

  return {
    isRecording: recorder.isRecording || recorderState.isRecording,
    durationMillis: recorderState.durationMillis,
    starting,
    start,
    stop,
    cancel,
  };
};
