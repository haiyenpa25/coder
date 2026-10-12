"""
Conservative PEQ Recommendation Engine for Behringer X32.
- Respects church sound guidelines: preserve voice warmth, reduce mud, notch feedback surgically
- Translates between real acoustic units (Hz, dB, Q) and X32 normalized floats (0.0 to 1.0)
- Generates proposal diffs ready for Safety Gate & Transaction Executor
- Simulates cascaded magnitude response for A/B preview
"""

from __future__ import annotations
import math
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional
import numpy as np

from packages.safety_controller.transaction import Proposal
from packages.feedback_detector.detector import FeedbackCandidate


# --- X32 Normalized Float Conversions ---

def freq_to_x32(freq_hz: float, f_min: float = 20.0, f_max: float = 20000.0) -> float:
    """Map frequency in Hz to X32 logarithmic float (0.0 to 1.0)."""
    clamped = max(f_min, min(f_max, freq_hz))
    val = math.log2(clamped / f_min) / math.log2(f_max / f_min)
    return round(max(0.0, min(1.0, val)), 4)


def x32_to_freq(val: float, f_min: float = 20.0, f_max: float = 20000.0) -> float:
    """Map X32 float (0.0 to 1.0) to frequency in Hz."""
    clamped = max(0.0, min(1.0, val))
    freq = f_min * (2.0 ** (clamped * math.log2(f_max / f_min)))
    return round(freq, 1)


def gain_to_x32(gain_db: float, min_db: float = -15.0, max_db: float = 15.0) -> float:
    """Map Gain in dB (-15dB to +15dB) to X32 float (0.0 to 1.0, 0.5 = 0dB)."""
    clamped = max(min_db, min(max_db, gain_db))
    val = (clamped - min_db) / (max_db - min_db)
    return round(max(0.0, min(1.0, val)), 4)


def x32_to_gain(val: float, min_db: float = -15.0, max_db: float = 15.0) -> float:
    """Map X32 float (0.0 to 1.0) to Gain in dB."""
    clamped = max(0.0, min(1.0, val))
    gain = min_db + clamped * (max_db - min_db)
    return round(gain, 2)


def q_to_x32(q: float, q_min: float = 0.3, q_max: float = 10.0) -> float:
    """Map Q factor to X32 float (0.0 to 1.0)."""
    clamped = max(q_min, min(q_max, q))
    val = math.log2(clamped / q_min) / math.log2(q_max / q_min)
    return round(max(0.0, min(1.0, val)), 4)


def x32_to_q(val: float, q_min: float = 0.3, q_max: float = 10.0) -> float:
    """Map X32 float (0.0 to 1.0) to Q factor."""
    clamped = max(0.0, min(1.0, val))
    q = q_min * (2.0 ** (clamped * math.log2(q_max / q_min)))
    return round(q, 2)


@dataclass
class PEQBandProposal:
    band_index: int # 1, 2, 3, or 4
    filter_type: str # "PEQ", "LCut", "LowShelf", "HighShelf"
    freq_hz: float
    gain_db: float
    q_factor: float
    rationale: str


@dataclass
class ChannelTuningProposal:
    channel_id: int
    role: str
    hpf_on: bool
    hpf_freq_hz: float
    bands: List[PEQBandProposal]
    expected_tradeoffs: List[str]
    simulated_curve: List[Dict[str, float]] # [{"freq": 100, "response_db": -0.5}, ...]


class PEQRecommender:
    def __init__(self):
        pass

    def recommend_pastor_speech(
        self,
        channel_id: int,
        expected_sha256: str,
        current_eq_params: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Proposal, ChannelTuningProposal]:
        """
        Generate conservative tuning for Pastor/Speech mic:
        - HPF: 85 Hz (filters body handling and HVAC air rumble)
        - Band 1 (Low-Mid): -1.8 dB at 250 Hz, Q=1.5 (cleans church hall mud and chestiness)
        - Band 2 (Speech Presence): +1.2 dB at 2800 Hz, Q=1.2 (improves sermon intelligibility)
        - Band 3: Neutral
        - Band 4: Neutral
        """
        ch_str = f"/ch/{channel_id:02d}"
        bands = [
            PEQBandProposal(
                band_index=1,
                filter_type="PEQ",
                freq_hz=250.0,
                gain_db=-1.8,
                q_factor=1.5,
                rationale="Giảm đục và ù âm học nhà thờ ở dải 250 Hz giúp giọng nói rõ ràng hơn.",
            ),
            PEQBandProposal(
                band_index=2,
                filter_type="PEQ",
                freq_hz=2800.0,
                gain_db=1.2,
                q_factor=1.2,
                rationale="Tăng nhẹ hiện diện ở dải 2.8 kHz giúp hội chúng nghe rõ từng âm tiết bài giảng.",
            ),
        ]

        changes: List[Dict[str, Any]] = []

        # HPF
        changes.append({"parameter": f"{ch_str}/preamp/hpon", "from": 0, "to": 1})
        changes.append({"parameter": f"{ch_str}/preamp/hpf", "from": 0.0, "to": freq_to_x32(85.0, 20.0, 400.0)})

        # Bands
        for b in bands:
            prefix = f"{ch_str}/eq/{b.band_index}"
            changes.append({"parameter": f"{prefix}/f", "from": 0.5, "to": freq_to_x32(b.freq_hz)})
            changes.append({"parameter": f"{prefix}/g", "from": 0.5, "to": gain_to_x32(b.gain_db)})
            changes.append({"parameter": f"{prefix}/q", "from": 0.5, "to": q_to_x32(b.q_factor)})

        proposal = Proposal(
            proposal_id=f"speech-tuning-ch{channel_id:02d}",
            target_channel=channel_id,
            hypothesis="Cải thiện độ rõ lời bài giảng Mục sư, khử ù 250Hz và lọc rung HPF 85Hz",
            confidence=0.88,
            changes=changes,
            expected_sha256=expected_sha256,
        )

        sim_curve = self.simulate_response(hpf_freq=85.0, bands=bands)

        tuning_detail = ChannelTuningProposal(
            channel_id=channel_id,
            role="PASTOR_SPEECH",
            hpf_on=True,
            hpf_freq_hz=85.0,
            bands=bands,
            expected_tradeoffs=[
                "Giảm nhẹ độ trầm giả tạo do hiệu ứng tiệm cận (proximity effect) khi để mic sát miệng.",
                "Cải thiện độ rõ lời trong hội trường dội âm mà không làm mỏng chất giọng thật.",
            ],
            simulated_curve=sim_curve,
        )

        return proposal, tuning_detail

    def recommend_feedback_notch(
        self,
        candidate: FeedbackCandidate,
        expected_sha256: str,
        preferred_band: int = 3,
    ) -> Proposal:
        """
        Generate surgical PEQ notch for an identified feedback frequency:
        - Q: High (Q = 7.0) to isolate resonance
        - Gain: -3.5 dB (conservative cut, avoids mutilating vocal tone)
        """
        ch = candidate.channel_id
        ch_str = f"/ch/{ch:02d}"
        prefix = f"{ch_str}/eq/{preferred_band}"

        changes = [
            {"parameter": f"{prefix}/f", "from": 0.5, "to": freq_to_x32(candidate.freq_hz)},
            {"parameter": f"{prefix}/g", "from": 0.5, "to": gain_to_x32(-3.5)},
            {"parameter": f"{prefix}/q", "from": 0.5, "to": q_to_x32(7.0)},
        ]

        return Proposal(
            proposal_id=f"feedback-notch-ch{ch:02d}-{int(candidate.freq_hz)}hz",
            target_channel=ch,
            hypothesis=f"Cắt notch hẹp tại {candidate.freq_hz} Hz để triệt tiêu cộng hưởng hú monitor/FOH",
            confidence=candidate.confidence,
            changes=changes,
            expected_sha256=expected_sha256,
        )

    def simulate_response(
        self,
        hpf_freq: Optional[float],
        bands: List[PEQBandProposal],
        num_points: int = 80,
    ) -> List[Dict[str, float]]:
        """
        Simulate magnitude response in dB from 20 Hz to 20,000 Hz.
        Calculates biquad filter transfer functions.
        """
        freq_grid = np.geomspace(20.0, 20000.0, num_points)
        curve: List[Dict[str, float]] = []

        for f in freq_grid:
            total_db = 0.0

            # 1. HPF 12dB/oct (2nd order Butterworth)
            if hpf_freq and hpf_freq > 20.0:
                ratio = f / hpf_freq
                # Magnitude of 2nd order HPF: ratio^2 / sqrt((1 - ratio^2)^2 + 2*ratio^2)
                denom = math.sqrt((1.0 - ratio**2)**2 + 2.0 * (ratio**2))
                mag = (ratio**2) / max(1e-6, denom)
                total_db += 20.0 * math.log10(max(1e-3, mag))

            # 2. PEQ Bands (Parametric Bell EQ)
            for b in bands:
                if abs(b.gain_db) > 0.05:
                    w = 2.0 * math.pi * f
                    w0 = 2.0 * math.pi * b.freq_hz
                    # Standard bell filter approximation
                    bw = b.freq_hz / b.q_factor
                    delta_f = abs(f - b.freq_hz)
                    # Gaussian bell profile in log-frequency space
                    x = math.log2(f / b.freq_hz) * b.q_factor
                    band_effect = b.gain_db * math.exp(-0.5 * (x**2))
                    total_db += band_effect

            curve.append({
                "freq": round(float(f), 1),
                "response_db": round(max(-36.0, min(18.0, total_db)), 2),
            })

        return curve
