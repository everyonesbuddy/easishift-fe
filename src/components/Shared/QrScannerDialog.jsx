import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import jsQR from "jsqr";

const START_TIMEOUT_MS = 10000;

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(timeoutMessage)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const canUseCameraInContext = () => {
  const hostname = window?.location?.hostname || "";
  const protocol = window?.location?.protocol || "";
  if (protocol === "https:") return true;
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const toFriendlyCameraError = (message) => {
  const lower = String(message || "").toLowerCase();

  if (lower.includes("https") || lower.includes("secure")) {
    return "Camera access needs HTTPS (or localhost).";
  }
  if (lower.includes("permission") || lower.includes("notallowed")) {
    return "Camera permission was blocked. Allow camera access in your browser settings.";
  }
  if (lower.includes("notreadable")) {
    return "Camera is already in use by another app or tab.";
  }
  if (lower.includes("constraint") || lower.includes("overconstrained")) {
    return "The selected camera could not be started. Try another camera option.";
  }
  if (lower.includes("notfound") || lower.includes("devicesnotfound")) {
    return "No camera device was found on this computer.";
  }
  if (lower.includes("timed out")) {
    return "Camera startup timed out. Select a camera and try Start Camera again.";
  }

  if (message) return `Camera error: ${message}`;
  return "Unable to start camera scanner.";
};

const stopStreamTracks = (stream) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // Ignore stop errors.
    }
  });
};

export default function QrScannerDialog({
  open,
  onClose,
  onScan,
  title = "Scan QR Code",
  description = "Point your camera at the facility QR code.",
}) {
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [starting, setStarting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [supportsBarcodeDetector, setSupportsBarcodeDetector] = useState(true);

  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onScanRef = useRef(onScan);
  const didScanRef = useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const stream = streamRef.current;
    streamRef.current = null;
    stopStreamTracks(stream);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  };

  const scanFrame = async () => {
    if (
      !scanning ||
      !videoRef.current ||
      !detectorRef.current ||
      didScanRef.current
    ) {
      return;
    }

    try {
      if (detectorRef.current.mode === "native") {
        const detections = await detectorRef.current.instance.detect(
          videoRef.current,
        );
        if (Array.isArray(detections) && detections.length > 0) {
          const rawValue = detections[0]?.rawValue;
          if (rawValue) {
            didScanRef.current = true;
            await stopScanner();
            onScanRef.current?.(rawValue);
            return;
          }
        }
      } else {
        const videoEl = videoRef.current;
        const canvasEl = canvasRef.current;
        if (
          videoEl &&
          canvasEl &&
          videoEl.videoWidth > 0 &&
          videoEl.videoHeight > 0
        ) {
          canvasEl.width = videoEl.videoWidth;
          canvasEl.height = videoEl.videoHeight;
          const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
            const imageData = ctx.getImageData(
              0,
              0,
              canvasEl.width,
              canvasEl.height,
            );
            const result = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              {
                inversionAttempts: "dontInvert",
              },
            );
            if (result?.data) {
              didScanRef.current = true;
              await stopScanner();
              onScanRef.current?.(result.data);
              return;
            }
          }
        }
      }
    } catch {
      // Ignore per-frame decode errors and keep scanning.
    }

    rafRef.current = requestAnimationFrame(() => {
      scanFrame();
    });
  };

  const loadCameraDevices = async () => {
    setLoadingCameras(true);
    setErrorMessage("");

    try {
      if (!canUseCameraInContext()) {
        throw new Error("Camera access requires HTTPS (or localhost).");
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported in this browser.");
      }

      const hasBarcodeDetector =
        typeof window !== "undefined" && "BarcodeDetector" in window;
      setSupportsBarcodeDetector(hasBarcodeDetector);

      const probeStream = await withTimeout(
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }),
        START_TIMEOUT_MS,
        "Opening camera timed out",
      );
      stopStreamTracks(probeStream);

      const devices = await withTimeout(
        navigator.mediaDevices.enumerateDevices(),
        START_TIMEOUT_MS,
        "Enumerating cameras timed out",
      );

      const cameras = Array.isArray(devices)
        ? devices.filter((device) => device.kind === "videoinput")
        : [];

      setCameraDevices(cameras);

      if (!cameras.length) {
        throw new Error("No camera device was found on this computer.");
      }

      setSelectedCameraId((prev) => {
        if (prev && cameras.some((camera) => camera.deviceId === prev)) {
          return prev;
        }

        const preferred =
          cameras.find((camera) => {
            const label = String(camera?.label || "").toLowerCase();
            return label.includes("front") || label.includes("facetime");
          }) || cameras[0];

        return preferred?.deviceId || "";
      });
    } catch (err) {
      setCameraDevices([]);
      setSelectedCameraId("");
      setErrorMessage(toFriendlyCameraError(err?.message));
    } finally {
      setLoadingCameras(false);
    }
  };

  const startScanner = async (cameraId = selectedCameraId) => {
    if (!cameraId) {
      setErrorMessage("Select a camera before starting the scanner.");
      return;
    }

    setErrorMessage("");
    setStarting(true);
    didScanRef.current = false;

    await stopScanner();

    try {
      const stream = await withTimeout(
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: { exact: cameraId },
            facingMode: { ideal: "environment" },
          },
        }),
        START_TIMEOUT_MS,
        "Opening camera timed out",
      );

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Video preview element not ready.");
      }

      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      await videoRef.current.play();

      if (!("BarcodeDetector" in window)) {
        detectorRef.current = { mode: "jsqr" };
      } else {
        detectorRef.current = {
          mode: "native",
          instance: new window.BarcodeDetector({ formats: ["qr_code"] }),
        };
      }

      setScanning(true);
      rafRef.current = requestAnimationFrame(() => {
        scanFrame();
      });
    } catch (exactErr) {
      try {
        // Fallback: allow browser to pick camera when exact ID fails.
        const stream = await withTimeout(
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          }),
          START_TIMEOUT_MS,
          "Opening camera timed out",
        );

        streamRef.current = stream;

        if (!videoRef.current) {
          throw new Error("Video preview element not ready.");
        }

        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();

        if (!("BarcodeDetector" in window)) {
          detectorRef.current = { mode: "jsqr" };
        } else {
          detectorRef.current = {
            mode: "native",
            instance: new window.BarcodeDetector({ formats: ["qr_code"] }),
          };
        }

        setScanning(true);
        rafRef.current = requestAnimationFrame(() => {
          scanFrame();
        });
      } catch (fallbackErr) {
        const message = fallbackErr?.message || exactErr?.message || "";
        setErrorMessage(toFriendlyCameraError(message));
        await stopScanner();
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;

    let disposed = false;

    const init = async () => {
      await loadCameraDevices();
      if (disposed) return;
    };

    init();

    return () => {
      disposed = true;
      stopScanner();
    };
  }, [open]);

  const handleClose = () => {
    onClose?.();
  };

  const handleRefreshDevices = async () => {
    await stopScanner();
    await loadCameraDevices();
  };

  const handleCameraChange = async (event) => {
    const nextId = String(event.target.value || "");
    setSelectedCameraId(nextId);
    if (scanning) {
      await startScanner(nextId);
    }
  };

  const hasCameras = cameraDevices.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {description}
        </Typography>

        <Stack spacing={1.25} sx={{ mb: 1.25 }}>
          <FormControl
            size="small"
            fullWidth
            disabled={loadingCameras || !hasCameras}
          >
            <InputLabel id="qr-camera-select-label">Camera</InputLabel>
            <Select
              labelId="qr-camera-select-label"
              label="Camera"
              value={selectedCameraId}
              onChange={handleCameraChange}
            >
              {cameraDevices.map((camera, index) => (
                <MenuItem
                  key={camera.deviceId || index}
                  value={camera.deviceId}
                >
                  {camera.label || `Camera ${index + 1}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={startScanner}
              disabled={!hasCameras || loadingCameras || starting}
            >
              {scanning ? "Restart Camera" : "Start Camera"}
            </Button>
            <Button
              variant="outlined"
              onClick={handleRefreshDevices}
              disabled={loadingCameras || starting}
            >
              Refresh Cameras
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            position: "relative",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
            minHeight: 280,
            bgcolor: "common.black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            component="video"
            ref={videoRef}
            autoPlay
            playsInline
            muted
            sx={{
              width: "100%",
              height: 280,
              objectFit: "cover",
              display: scanning ? "block" : "none",
            }}
          />

          {(loadingCameras || starting) && (
            <Box
              sx={{
                position: "absolute",
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "common.white",
                pointerEvents: "none",
              }}
            >
              <CircularProgress size={22} sx={{ color: "common.white" }} />
              <Typography variant="body2">
                {loadingCameras ? "Loading cameras..." : "Opening camera..."}
              </Typography>
            </Box>
          )}

          {!loadingCameras && !starting && !scanning && !errorMessage ? (
            <Typography
              variant="body2"
              sx={{ color: "common.white", px: 2, textAlign: "center" }}
            >
              Select a camera and click Start Camera.
            </Typography>
          ) : null}
        </Box>

        {!supportsBarcodeDetector ? (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Using browser compatibility scan mode for this device.
          </Alert>
        ) : null}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {scanning ? (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            Camera ready. Hold the QR code steady in view.
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {errorMessage}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
