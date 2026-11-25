import {useCallback, useEffect, useRef, useState} from 'react';

export type VoiceStatus = 'idle' | 'recording' | 'transcribing';

interface UseVoiceSearchOptions {
  onTranscribed: (text: string) => void;
}

const MAX_RECORDING_MS = 12000;

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error("Audio faylni o'qib bo'lmadi."));
    reader.readAsDataURL(blob);
  });
}

export function useVoiceSearch({onTranscribed}: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const onTranscribedRef = useRef(onTranscribed);

  useEffect(() => {
    onTranscribedRef.current = onTranscribed;
  }, [onTranscribed]);

  const cleanupResources = useCallback(() => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }
      cleanupResources();
    };
  }, [cleanupResources]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError("Brauzeringizda mikrofon orqali yozish qo'llab-quvvatlanmaydi.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Setup audio level meter
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as {webkitAudioContext: typeof AudioContext})
            .webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length / 255;
            setAudioLevel(Math.min(1, avg * 2.4));
            rafRef.current = window.requestAnimationFrame(updateLevel);
          };
          rafRef.current = window.requestAnimationFrame(updateLevel);
        }
      } catch {
        // Audio level visualizer is optional; recording continues cleanly
      }

      const preferredMime = pickSupportedMimeType();
      const recorder = preferredMime
        ? new MediaRecorder(stream, {mimeType: preferredMime})
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType =
          recorder.mimeType || preferredMime || 'audio/webm';
        const recordedChunks = chunksRef.current;
        chunksRef.current = [];
        cleanupResources();

        const blob = new Blob(recordedChunks, {type: mimeType});
        if (blob.size < 400) {
          setStatus('idle');
          setError("Ovoz juda qisqa bo'ldi. Tugmani bosib biroz uzoqroq gapiring.");
          return;
        }

        setStatus('transcribing');
        try {
          const audioBase64 = await blobToBase64(blob);
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({audioBase64, mimeType}),
          });

          const payload = (await res.json().catch(() => ({}))) as {
            text?: string;
            error?: string;
          };

          if (!res.ok) {
            setError(
              payload.error || "Ovozni matnga aylantirib bo'lmadi."
            );
            setStatus('idle');
            return;
          }

          const transcribed = (payload.text ?? '').trim();
          if (!transcribed) {
            setError("Ovoz aniqlanmadi. Yana bir bor aniqroq gapiring.");
            setStatus('idle');
            return;
          }

          setStatus('idle');
          onTranscribedRef.current(transcribed);
        } catch {
          setError(
            "Server bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring."
          );
          setStatus('idle');
        }
      };

      recorder.start(250);
      setStatus('recording');

      maxTimerRef.current = window.setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'recording'
        ) {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_MS);
    } catch (err: unknown) {
      cleanupResources();
      setStatus('idle');
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setError(
          "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan mikrofonni yoqing."
        );
      } else if (errName === 'NotFoundError') {
        setError('Qurilmada mikrofon topilmadi.');
      } else {
        setError("Mikrofonni ishga tushirib bo'lmadi.");
      }
    }
  }, [cleanupResources]);

  const toggleRecording = useCallback(() => {
    if (status === 'recording') {
      stopRecording();
    } else if (status === 'idle') {
      void startRecording();
    }
  }, [status, startRecording, stopRecording]);

  return {
    voiceStatus: status,
    voiceError: error,
    audioLevel,
    toggleRecording,
    clearVoiceError: clearError,
  };
}
