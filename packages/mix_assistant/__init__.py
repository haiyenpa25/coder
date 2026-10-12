"""
mix_assistant package:
- Voice Activity Detection (VAD) & Silence Hold
- Anti-Clipping Guard
- Conservative Speech Leveler (Inspired by M32LiveConsoleTool with Church Safety Constraints)
"""

from .leveler import (
    VoiceActivityState,
    VoiceActivityDetector,
    AntiClippingGuard,
    SpeechLeveler,
    LevelerAction,
)

__all__ = [
    "VoiceActivityState",
    "VoiceActivityDetector",
    "AntiClippingGuard",
    "SpeechLeveler",
    "LevelerAction",
]
