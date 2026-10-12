"""
Audio Stream Worker for Real-Time Multi-Channel Ingestion & Level Monitoring
"""
from typing import Optional, Callable, Dict, Any, List
import numpy as np
import threading
import time
import logging

try:
    import sounddevice as sd
    SOUNDDEVICE_AVAILABLE = True
except ImportError:
    SOUNDDEVICE_AVAILABLE = False

logger = logging.getLogger("CaptureAgent.StreamWorker")


class AudioStreamWorker:
    """Worker handling live audio streaming or simulated multichannel signals."""

    def __init__(
        self,
        device_id: int = -1,
        channels: int = 2,
        sample_rate: int = 48000,
        block_size: int = 1024,
        on_block_callback: Optional[Callable[[np.ndarray], None]] = None,
    ):
        self.device_id = device_id
        self.channels = channels
        self.sample_rate = sample_rate
        self.block_size = block_size
        self.on_block_callback = on_block_callback

        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stream = None
        self._lock = threading.Lock()

        # Telemetry metrics
        self.latest_peak_dbfs: List[float] = [-90.0] * channels
        self.latest_rms_dbfs: List[float] = [-90.0] * channels
        self.overflow_count: int = 0
        self.blocks_processed: int = 0
        self.latest_buffer: Optional[np.ndarray] = None

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self):
        """Start the audio stream worker."""
        with self._lock:
            if self._running:
                return
            self._running = True

            if self.device_id >= 0 and SOUNDDEVICE_AVAILABLE:
                self._start_physical_stream()
            else:
                self._start_simulated_stream()

    def stop(self):
        """Stop the audio stream worker."""
        with self._lock:
            if not self._running:
                return
            self._running = False

            if self._stream is not None:
                try:
                    self._stream.stop()
                    self._stream.close()
                except Exception as e:
                    logger.warning(f"Error closing stream: {e}")
                self._stream = None

            if self._thread is not None and self._thread.is_alive():
                self._thread.join(timeout=1.0)
                self._thread = None

    def _start_physical_stream(self):
        """Start physical sounddevice InputStream with callback."""
        def callback(indata, frames, time_info, status):
            if status:
                self.overflow_count += 1
                logger.warning(f"Audio stream status: {status}")
            self._process_audio_block(indata.copy())

        try:
            self._stream = sd.InputStream(
                device=self.device_id,
                channels=self.channels,
                samplerate=self.sample_rate,
                blocksize=self.block_size,
                dtype="float32",
                callback=callback,
            )
            self._stream.start()
            logger.info(f"Physical audio stream started on device {self.device_id} ({self.channels}ch @ {self.sample_rate}Hz)")
        except Exception as e:
            logger.error(f"Failed to start physical stream: {e}. Falling back to simulation.")
            self._start_simulated_stream()

    def _start_simulated_stream(self):
        """Run simulated audio generator loop in a background thread."""
        self._thread = threading.Thread(target=self._simulated_loop, daemon=True)
        self._thread.start()
        logger.info(f"Simulated audio stream started ({self.channels}ch @ {self.sample_rate}Hz)")

    def _simulated_loop(self):
        """Generates realistic live church audio signal blocks."""
        dt = self.block_size / self.sample_rate
        t_accum = 0.0

        while self._running:
            t = np.linspace(t_accum, t_accum + dt, self.block_size, endpoint=False)
            buffer = np.zeros((self.block_size, self.channels), dtype=np.float32)

            for ch in range(self.channels):
                if ch == 0:
                    # Pastor speech tone (speech fundamental 180Hz + harmonics)
                    speech = 0.25 * np.sin(2 * np.pi * 180 * t) + 0.15 * np.sin(2 * np.pi * 360 * t)
                    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.2 * t_accum)
                    buffer[:, ch] = (speech * mod).astype(np.float32)
                elif ch == 1:
                    # Lead vocal (440Hz A4)
                    voc = 0.3 * np.sin(2 * np.pi * 440 * t) + 0.15 * np.sin(2 * np.pi * 880 * t)
                    buffer[:, ch] = voc.astype(np.float32)
                else:
                    noise = np.random.normal(0, 0.005, self.block_size).astype(np.float32)
                    buffer[:, ch] = noise

            self._process_audio_block(buffer)
            t_accum += dt
            time.sleep(dt * 0.95)

    def _process_audio_block(self, block: np.ndarray):
        """Compute metrics and dispatch block."""
        self.blocks_processed += 1
        self.latest_buffer = block

        peak_levels = []
        rms_levels = []
        num_ch = block.shape[1] if block.ndim > 1 else 1

        for c in range(min(num_ch, self.channels)):
            col = block[:, c] if block.ndim > 1 else block
            peak = float(np.max(np.abs(col)))
            rms = float(np.sqrt(np.mean(col ** 2)))

            peak_dbfs = 20.0 * np.log10(max(1e-7, peak))
            rms_dbfs = 20.0 * np.log10(max(1e-7, rms))

            peak_levels.append(round(peak_dbfs, 1))
            rms_levels.append(round(rms_dbfs, 1))

        self.latest_peak_dbfs = peak_levels
        self.latest_rms_dbfs = rms_levels

        if self.on_block_callback:
            try:
                self.on_block_callback(block)
            except Exception as e:
                logger.error(f"Callback error in audio stream: {e}")

    def get_status(self) -> Dict[str, Any]:
        """Return real-time stream status."""
        return {
            "is_running": self._running,
            "device_id": self.device_id,
            "channels": self.channels,
            "sample_rate": self.sample_rate,
            "block_size": self.block_size,
            "blocks_processed": self.blocks_processed,
            "overflow_count": self.overflow_count,
            "peak_dbfs": self.latest_peak_dbfs,
            "rms_dbfs": self.latest_rms_dbfs,
        }
