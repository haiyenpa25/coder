"""Select and label the actual audio source without assuming mixer routing."""
import math
import time
import numpy as np


def collect_signal(soundcheck, worker, elapsed, profiles):
    now = time.monotonic()
    source = {"valid": True, "reasons": [], "sample_rate": 48000,
              "mapping_verified": False, "tap_point": "SIMULATED", "clock_verified": True}
    if soundcheck.is_active:
        block = soundcheck.generate_audio_block(block_size=1024)
        source.update(id=f"soundcheck:{soundcheck.current_session.id}", label="Soundcheck ảo", simulated=True,
                      sample_rate=soundcheck.sample_rate)
        peaks = 20 * np.log10(np.maximum(np.max(np.abs(block), axis=0), 1e-7))
        rms = 20 * np.log10(np.maximum(np.sqrt(np.mean(block ** 2, axis=0)), 1e-7))
    elif worker and worker.is_running:
        frame = worker.get_latest_frame()
        block = frame["samples"]
        simulated = frame["is_simulated"]
        source.update(id=f"capture:{id(worker)}", label="USB mô phỏng" if simulated else f"USB Audio • thiết bị {worker.device_id}",
                      simulated=simulated, sample_rate=worker.sample_rate,
                      tap_point="SIMULATED" if simulated else worker.tap_point,
                      clock_verified=frame["clock_verified"], overflow_count=frame["overflow_count"],
                      clock_fault=frame["clock_fault"], capture_error=frame["capture_error"])
        if frame["capture_error"]:
            source["reasons"].append("Không mở được thiết bị thật; đang phát dữ liệu mô phỏng")
        if block is None or frame["captured_at"] is None or now - frame["captured_at"] > 0.5:
            source["valid"] = False
            source["reasons"].append("Buffer chưa có hoặc đã cũ quá 0,5 giây")
        if not simulated and (not frame["clock_verified"] or frame["overflow_count"] or frame["clock_fault"]):
            source["valid"] = False
            source["reasons"].append("Clock chưa xác minh hoặc có lỗi buffer/clock; khởi động lại capture sau khi kiểm tra")
        peaks, rms = frame["peaks"], frame["rms"]
        if block is None:
            block = np.zeros((1024, 0), dtype=np.float32)
    else:
        source.update(id="demo", label="Demo • dữ liệu mô phỏng", simulated=True)
        t = elapsed + np.arange(1024, dtype=np.float32) / 48000
        block = np.zeros((1024, 32), dtype=np.float32)
        for ch in (1, 3, 6, 7, 9, 10, 11):
            level = (-36 if ch == 11 else -14 if ch == 3 else -20) + (2 if ch == 11 else 12 if ch == 3 else 8) * math.sin(elapsed * 1.3 + ch)
            phase = 2 * np.pi * (170 + ch * 70) * t
            tone = (np.sin(phase) + 0.3 * np.sin(3 * phase) + 0.15 * np.sin(5 * phase)) / 1.45
            block[:, ch - 1] = 10 ** (level / 20) * tone
        peaks = 20 * np.log10(np.maximum(np.max(np.abs(block), axis=0), 1e-7))
        rms = 20 * np.log10(np.maximum(np.sqrt(np.mean(block ** 2, axis=0)), 1e-7))
    if block.ndim == 1:
        block = block.reshape(-1, 1)
    if not np.all(np.isfinite(block)):
        source["valid"] = False
        source["reasons"].append("Buffer chứa giá trị không hữu hạn")
    source["dsp_valid"] = source["valid"] and (source["simulated"] or source["tap_point"] in ("PRE_EQ", "POST_EQ"))
    if not source["simulated"]:
        source["reasons"].append("Chưa xác nhận USB Input tương ứng với kênh X32/nguồn vật lý nào")
        if not source["dsp_valid"]:
            source["reasons"].append("Tap point chưa xác nhận; tạm ngừng suy luận DSP/feedback")
    meters = []
    for ch in range(1, 33):
        measured = source["valid"] and ch <= block.shape[1] and ch <= len(peaks)
        name = (profiles.get(ch, {}).get("name", f"Kênh {ch:02d}") if source["simulated"]
                else f"USB Input {ch:02d} • chưa ánh xạ")
        meters.append({"channel": ch, "name": name,
            "meter_dbfs": round(float(peaks[ch - 1]), 1) if measured else None,
            "rms_dbfs": round(float(rms[ch - 1]), 1) if measured else None})
    # Analyze one explicitly identified input, never a sum mislabeled as channel 3.
    index = 2 if block.shape[1] >= 3 and source["simulated"] else 0
    samples = block[:, index] if block.shape[1] else np.zeros(1024, dtype=np.float32)
    source["spectrum_input"] = index + 1
    return meters, samples, source
