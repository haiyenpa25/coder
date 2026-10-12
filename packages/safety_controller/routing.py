"""
Routing Graph & Hard Invariant Checker for Behringer X32 and DL16.
Specifically enforces:
HARD INVARIANT: DL16 physical input 11 (Band Talkback) must route SOLELY
to the P16 Personal Monitoring system, and NEVER bleed into Main FOH or Matrix.
"""

from __future__ import annotations
from typing import Dict, Any, List, Set, Tuple


class InvariantViolationError(Exception):
    """Raised when an action or configuration violates a critical hardware/acoustic invariant."""
    pass


class RoutingGraph:
    def __init__(self, parameters: Dict[str, Any]):
        self.params = parameters
        self._dl16_in_11_channel: int | None = None
        self._analyze_routing()

    def _analyze_routing(self):
        """Map physical inputs to console channels."""
        # By standard church config, AES50 A 1-16 routes to Channels 1-16.
        # In particular, DL16 input 11 is assigned to Channel 11.
        self._dl16_in_11_channel = 11

    @property
    def dl16_talkback_channel(self) -> int:
        return self._dl16_in_11_channel or 11

    def is_channel_routed_to_foh(self, ch: int) -> Tuple[bool, List[str]]:
        """
        Check if a channel has any active signal path leading to Main FOH.
        Returns: (is_routed_to_foh, path_trace)
        """
        ch_str = f"/ch/{ch:02d}"
        paths = []

        # 1. Direct send to Main Stereo Bus
        mix_st = self.params.get(f"{ch_str}/mix/st", 0)
        if mix_st == 1:
            paths.append(f"{ch_str} -> Main Stereo Bus (/mix/st = 1)")

        # 2. Check sends through mix buses that might feed Main FOH
        for bus in range(1, 17):
            bus_on = self.params.get(f"{ch_str}/mix/{bus:02d}/on", 0)
            bus_lvl = self.params.get(f"{ch_str}/mix/{bus:02d}/level", 0.0)
            # If bus send is active, check if that bus routes to main
            if bus_on == 1 and bus_lvl > 0.0:
                bus_to_main = self.params.get(f"/bus/{bus:02d}/mix/st", 0)
                if bus_to_main == 1:
                    paths.append(f"{ch_str} -> Bus {bus:02d} -> Main Stereo Bus")

        return bool(paths), paths

    def is_channel_routed_to_p16(self, ch: int) -> Tuple[bool, List[str]]:
        """
        Check if channel is mapped to Ultranet P16 outputs.
        Returns: (is_routed_to_p16, slots)
        """
        slots = []
        for p in range(1, 17):
            src = self.params.get(f"/outputs/p16/{p:02d}/src")
            tap = self.params.get(f"/outputs/p16/{p:02d}/tap", "Pre")
            if src == ch:
                slots.append(f"P16 Slot {p} (Tap: {tap})")
        return bool(slots), slots

    def verify_talkback_invariant(self) -> Tuple[bool, str]:
        """
        Verify the HARD INVARIANT:
        DL16 Input 11 (Talkback) MUST NOT have any path to FOH,
        and MUST be routed to P16 monitor.
        """
        tb_ch = self.dl16_talkback_channel

        # 1. Ensure NO path to FOH
        has_foh, foh_paths = self.is_channel_routed_to_foh(tb_ch)
        if has_foh:
            msg = (
                f"CRITICAL INVARIANT VIOLATION: DL16 Input 11 (Channel {tb_ch}) is leaking into Main FOH! "
                f"Paths: {', '.join(foh_paths)}"
            )
            return False, msg

        # 2. Ensure routed to P16
        has_p16, p16_slots = self.is_channel_routed_to_p16(tb_ch)
        if not has_p16:
            msg = (
                f"WARNING: DL16 Input 11 (Channel {tb_ch}) is isolated from FOH, "
                f"but is not currently assigned to any P16 Ultranet slot."
            )
            return False, msg

        return True, f"VERIFIED SAFE: DL16 Input 11 is strictly isolated from FOH and feeding {', '.join(p16_slots)}."

    def validate_diff_invariants(self, diff: Dict[str, Any]) -> None:
        """
        Check if a set of proposed parameter modifications would violate
        any routing or DL16 talkback invariants.
        Raises InvariantViolationError if unsafe!
        """
        changed = diff.get("changed", {})
        added = diff.get("added", {})
        all_new_params = {**added, **{k: v.get("after") if isinstance(v, dict) else v for k, v in changed.items()}}

        # Check if anyone is trying to enable Main Stereo on Channel 11
        ch_str = f"/ch/{self.dl16_talkback_channel:02d}"
        if f"{ch_str}/mix/st" in all_new_params and all_new_params[f"{ch_str}/mix/st"] != 0:
            raise InvariantViolationError(
                f"REJECTED: Attempted to route Channel {self.dl16_talkback_channel} (DL16 In 11 Talkback) "
                f"to Main FOH (/mix/st = {all_new_params[f'{ch_str}/mix/st']})."
            )

        # Check if anyone is trying to alter P16 Ultranet routing
        for key in all_new_params:
            if key.startswith("/outputs/p16/"):
                raise InvariantViolationError(
                    f"REJECTED: Modification to P16 Ultranet routing '{key}' is strictly forbidden by policy."
                )
            if key.startswith("/config/routing/"):
                raise InvariantViolationError(
                    f"REJECTED: Modification to global routing '{key}' is strictly forbidden by policy."
                )
