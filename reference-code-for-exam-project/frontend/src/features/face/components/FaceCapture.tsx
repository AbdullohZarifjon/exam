import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "../../../shared/ui";
import { Camera, ArrowsClockwise } from "@phosphor-icons/react";

/**
 * Kiosk FaceCapture: getUserMedia preview + one-shot capture.
 * Active liveness: blink / head-turn is approximated by quality + single-use
 * session. For v1 the server enforces score+gap; continuous CV is v2.
 */

export function FaceCapture({
  onCapture,
  busy,
  label = "Capture face",
}: {
  onCapture: (imageBase64: string) => void;
  busy?: boolean;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        setError("Camera unavailable. Use the kiosk camera or check permissions.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 640, 640);
    const jpeg = canvas.toDataURL("image/jpeg", 0.85);
    onCapture(jpeg);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-64 w-64 overflow-hidden rounded-3xl border border-border bg-navy-950 shadow-[0_12px_32px_rgba(10,25,49,0.18)]">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-[#CBD6EF]">
            <Spinner />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-3">
          <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white">
            Center your face, good light
          </span>
        </div>
      </div>
      {error ? (
        <p className="text-center text-xs text-red-700">{error}</p>
      ) : (
        <Button onClick={capture} disabled={!ready || busy} size="lg">
          {busy ? <Spinner className="h-3.5 w-3.5" /> : <Camera size={14} weight="bold" />}
          {label}
        </Button>
      )}
      {error && (
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <ArrowsClockwise size={12} weight="bold" /> Retry
        </Button>
      )}
    </div>
  );
}
