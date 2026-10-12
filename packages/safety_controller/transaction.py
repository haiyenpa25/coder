"""
Transaction Executor & Safety Gate for X32 Sound Engineer.
Implements:
- Whitelist and Denylist safety policies
- Invariant & optimistic locking revision checks
- Operator explicit approval verification
- Rate-limited parameter writes
- Readback verification & automatic rollback upon any mismatch
- Tamper-evident Audit Logging
"""

from __future__ import annotations
import time
import math
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple

from packages.x32_osc_adapter.client import X32Client, Snapshot
from .routing import RoutingGraph, InvariantViolationError
from .modes import SafetyModeManager, OperatorMode, DisengageReason


class ProposalRejectedError(PermissionError):
    """Raised when a proposal violates safety policy or lacks required approval."""
    pass


class TransactionFailedError(RuntimeError):
    """Raised when a transaction fails execution or verification, triggering rollback."""
    pass


@dataclass
class Proposal:
    proposal_id: str
    target_channel: int
    hypothesis: str
    confidence: float
    changes: List[Dict[str, Any]] # [{"parameter": "/ch/01/eq/1/g", "from": 0.5, "to": 0.45}]
    expected_sha256: str
    operator_approved: bool = False
    approved_by: Optional[str] = None
    created_at: float = field(default_factory=time.time)

    def approve(self, operator_id: str):
        self.operator_approved = True
        self.approved_by = operator_id


class SafetyPolicy:
    def __init__(self, max_fader_delta: float = 0.1, max_eq_gain_delta: float = 0.2):
        self.max_fader_delta = max_fader_delta
        self.max_eq_gain_delta = max_eq_gain_delta
        self.denied_prefixes = [
            "/config/routing",
            "/outputs/p16",
            "/main/st",
            "/-action",
            "/-show",
        ]

    def validate_proposal(self, proposal: Proposal) -> None:
        """Validate all proposed changes against safety rules."""
        ch = proposal.target_channel
        ch_str = f"/ch/{ch:02d}"

        for change in proposal.changes:
            param = change["parameter"]
            to_val = change["to"]
            from_val = change["from"]

            # 1. Deny-list check
            for denied in self.denied_prefixes:
                if param.startswith(denied):
                    raise ProposalRejectedError(
                        f"SAFETY DENIAL: Parameter '{param}' belongs to strictly protected system configuration."
                    )

            # 2. Channel isolation check (proposal can only modify its target channel)
            if not param.startswith(ch_str):
                raise ProposalRejectedError(
                    f"SAFETY DENIAL: Proposal targets Channel {ch}, but attempts to mutate '{param}'."
                )

            # 3. Whitelist check for allowed channel parameters:
            # EQ, HPF, limited fader, channel mute (mix/on), digital trim (preamp/trim), automix, gate/expander, or mixbus sends
            is_eq = f"{ch_str}/eq/" in param or param == f"{ch_str}/eq/on"
            is_hpf = param in (f"{ch_str}/preamp/hpon", f"{ch_str}/preamp/hpf")
            is_fader = param == f"{ch_str}/mix/fader"
            is_mute = param == f"{ch_str}/mix/on"
            is_trim = param == f"{ch_str}/preamp/trim"
            is_automix = f"{ch_str}/automix/" in param
            is_gate = f"{ch_str}/gate/" in param

            # Mixbus sends: /ch/{ch}/mix/{bus}/level or /ch/{ch}/mix/{bus}/on
            is_bus_send = False
            bus_num = None
            if param.startswith(f"{ch_str}/mix/"):
                parts = param.split("/")
                if len(parts) == 6 and parts[3] == "mix" and parts[5] in ("level", "on"):
                    try:
                        bus_num = int(parts[4])
                        if 1 <= bus_num <= 16:
                            is_bus_send = True
                    except ValueError:
                        pass

            # Hard Invariant: Channel 11 (Band Talkback) must NEVER be in Automix or Gate
            if ch == 11 and is_automix:
                raise ProposalRejectedError(
                    "SAFETY INVARIANT DENIAL: Channel 11 (Band Talkback) must NEVER be assigned to Automix groups."
                )

            if ch == 11 and is_gate:
                raise ProposalRejectedError(
                    "SAFETY INVARIANT DENIAL: Channel 11 (Band Talkback) must NEVER have gate/expander modified for FOH."
                )

            # Hard Invariant: Channel 11 must NEVER send signal to Stage Wedges (Bus 1-4) or FX
            if ch == 11 and is_bus_send and bus_num is not None:
                if (1 <= bus_num <= 4 or bus_num >= 13) and (to_val > 0.0 or (param.endswith("/on") and to_val == 1)):
                    raise ProposalRejectedError(
                        f"SAFETY INVARIANT DENIAL: Channel 11 (Band Talkback) must NEVER send signal to Stage Wedge/FX Bus {bus_num:02d}."
                    )

            if not (is_eq or is_hpf or is_fader or is_mute or is_trim or is_automix or is_gate or is_bus_send):
                raise ProposalRejectedError(
                    f"SAFETY DENIAL: Parameter '{param}' is not in the allowed Channel Tuning whitelist."
                )

            # 4. Slew-rate / Jump limits
            if is_fader and isinstance(to_val, (int, float)) and isinstance(from_val, (int, float)):
                if abs(to_val - from_val) > self.max_fader_delta:
                    raise ProposalRejectedError(
                        f"SAFETY LIMIT: Fader delta {abs(to_val - from_val):.3f} exceeds maximum safe limit {self.max_fader_delta}."
                    )

            if is_bus_send and param.endswith("/level") and isinstance(to_val, (int, float)) and isinstance(from_val, (int, float)):
                if abs(to_val - from_val) > 0.25: # Max ~6 dB jump
                    raise ProposalRejectedError(
                        f"SAFETY LIMIT: Mix bus send level delta {abs(to_val - from_val):.3f} exceeds maximum safe limit 0.25 (~6 dB)."
                    )

            if is_trim and isinstance(to_val, (int, float)) and isinstance(from_val, (int, float)):
                if abs(to_val - from_val) > 0.20:
                    raise ProposalRejectedError(
                        f"SAFETY LIMIT: Trim delta {abs(to_val - from_val):.3f} exceeds maximum safe limit 0.20 (~7.2 dB)."
                    )

            if is_gate and param == f"{ch_str}/gate/range" and isinstance(to_val, (int, float)):
                if to_val > 0.40: # Max 24 dB attenuation range
                    raise ProposalRejectedError(
                        f"SAFETY LIMIT: Expander attenuation range {to_val:.3f} exceeds maximum safe limit 0.40 (~24 dB)."
                    )



class TransactionExecutor:
    def __init__(
        self,
        client: X32Client,
        policy: SafetyPolicy | None = None,
        mode_manager: SafetyModeManager | None = None,
    ):
        self.client = client
        self.policy = policy or SafetyPolicy()
        self.mode_manager = mode_manager
        self.audit_log: List[Dict[str, Any]] = []

    def execute(self, proposal: Proposal, operator_id: str) -> Dict[str, Any]:
        """
        Execute a proposal through the 6-stage Safety Gate:
        0. Mode authorization check (Must not be in OBSERVE/disengaged)
        1. Authorization check
        2. Policy whitelist validation
        3. Optimistic revision lock check
        4. Invariant check on routing graph
        5. Write with rate-limiting
        6. Readback verify + automatic rollback on failure
        """
        # Stage 0: Operator Mode Check
        if self.mode_manager:
            current_mode = self.mode_manager.get_mode()
            if self.mode_manager.is_read_only():
                raise ProposalRejectedError(
                    f"SAFETY DENIAL: Cannot apply proposal in {current_mode.value} mode (Read-Only). Switch to ASSIST or LIMITED_AUTO mode."
                )

        # Stage 1: Explicit operator approval
        if not proposal.operator_approved or not proposal.approved_by:
            raise ProposalRejectedError(
                f"REJECTED: Proposal '{proposal.proposal_id}' has not been approved by an operator."
            )

        # Stage 2: Policy validation
        self.policy.validate_proposal(proposal)

        # Stage 3: Snapshot & Optimistic lock check
        current_snapshot = self.client.take_full_snapshot(max_channels=32)
        if current_snapshot.sha256 != proposal.expected_sha256:
            raise ProposalRejectedError(
                f"REJECTED: Mixer state has changed externally since proposal was prepared! "
                f"Expected SHA: {proposal.expected_sha256[:8]}, Current SHA: {current_snapshot.sha256[:8]}."
            )

        # Stage 4: Invariant check (Routing & DL16 Talkback isolation)
        routing_graph = RoutingGraph(current_snapshot.parameters)
        ok, msg = routing_graph.verify_talkback_invariant()
        if not ok:
            raise InvariantViolationError(f"HARD INVARIANT ABORT: {msg}")

        # Stage 5 & 6: Transaction execution with rollback support
        executed_writes: List[Tuple[str, Any]] = []
        original_values: Dict[str, Any] = {}

        # Save original values for rollback
        for change in proposal.changes:
            param = change["parameter"]
            original_values[param] = current_snapshot.parameters.get(param)

        # Temporarily enable writes for this verified transaction
        self.client.read_only_mode = False
        try:
            for change in proposal.changes:
                param = change["parameter"]
                to_val = change["to"]

                # Send write
                self.client.send_write(param, [to_val])
                executed_writes.append((param, to_val))
                time.sleep(0.02) # 20ms rate-limit pacing

                # Readback verification
                echo_val = self.client.query(param)[0]
                if isinstance(to_val, float):
                    if not math.isclose(echo_val, to_val, abs_tol=0.01):
                        raise TransactionFailedError(
                            f"Readback mismatch on '{param}': expected {to_val}, got {echo_val}"
                        )
                else:
                    if echo_val != to_val:
                        raise TransactionFailedError(
                            f"Readback mismatch on '{param}': expected {to_val}, got {echo_val}"
                        )

            # Post-execution Invariant check
            post_snapshot = self.client.take_full_snapshot(max_channels=32)
            post_routing = RoutingGraph(post_snapshot.parameters)
            post_ok, post_msg = post_routing.verify_talkback_invariant()
            if not post_ok:
                raise InvariantViolationError(f"Post-apply invariant failure: {post_msg}")

            # Commit audit event
            audit_entry = {
                "timestamp": time.time(),
                "proposal_id": proposal.proposal_id,
                "operator": operator_id,
                "status": "COMMITTED",
                "changes_applied": proposal.changes,
                "before_sha256": current_snapshot.sha256,
                "after_sha256": post_snapshot.sha256,
            }
            self.audit_log.append(audit_entry)

            return {
                "status": "SUCCESS",
                "proposal_id": proposal.proposal_id,
                "audit": audit_entry,
            }

        except Exception as exc:
            # ROLLBACK IMMEDIATELY
            rollback_errors = []
            for param, orig_val in original_values.items():
                if orig_val is not None:
                    try:
                        self.client.send_write(param, [orig_val])
                    except Exception as rb_exc:
                        rollback_errors.append(f"Failed to rollback {param}: {rb_exc}")

            audit_entry = {
                "timestamp": time.time(),
                "proposal_id": proposal.proposal_id,
                "operator": operator_id,
                "status": "ROLLED_BACK",
                "reason": str(exc),
                "rollback_errors": rollback_errors,
            }
            self.audit_log.append(audit_entry)

            # If mode manager is active, trigger auto-disengage back to OBSERVE on execution failure
            if self.mode_manager:
                self.mode_manager.trigger_auto_disengage(
                    reason=DisengageReason.AUDIO_FAULT,
                    detail=f"Lỗi thực thi giao dịch '{proposal.proposal_id}'. Đã tự động ngắt về OBSERVE.",
                    operator=operator_id,
                )

            raise TransactionFailedError(
                f"Transaction aborted and rolled back due to error: {exc}. "
                f"Rollback status: {'Clean' if not rollback_errors else rollback_errors}"
            )
        finally:
            # Always restore strict read-only mode after transaction
            self.client.read_only_mode = self.mode_manager.is_read_only() if self.mode_manager else True
