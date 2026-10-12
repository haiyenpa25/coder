# X32 AI Sound Engineer — Mandatory Agent Rules

These rules govern all AI coding agents, automation services, and developers working on ChurchMix:

1. **NEVER send write OSC to a real mixer in development or tests by default.**
   - All tests must execute against `packages/mock_x32/server.py` or isolated fixtures.
   - Hardware connects must always default to `READ_ONLY_MODE = True`.

2. **Every hardware integration starts in `READ_ONLY_MODE = True`.**
   - No parameter mutations are allowed until the operator explicitly switches modes.

3. **All OSC writes must pass through server-side `SafetyGate` whitelist.**
   - Unwhitelisted paths (e.g. `/config/routing/*`, `/outputs/p16/*`, `/main/st/mix/fader` without admin) are strictly denied.

4. **Never touch AES50, P16/Ultranet, routing, scene recall, preamp, phantom power, or main bus without a separate admin maintenance workflow.**

5. **Hard Safety Invariant: DL16 input 11 (Band Talkback) must NEVER route to Main FOH or Matrix FOH.**
   - It is strictly reserved for Ultranet P16 in-ear personal monitors.
   - Any transaction that violates this invariant must immediately abort with an `InvariantViolationError`.

6. **Do not assume physical DL16 input number equals X32 channel or Ultranet slot.**
   - Preamps, channels, and outputs are independent abstraction layers in X32 architecture.

7. **A proposal is never a command.**
   - AI language models and analysis routines only explain, guide, and formulate proposals.
   - They cannot directly generate or dispatch executable OSC mutations without explicit operator approval.

8. **Validate source tap points and measurement clock before DSP inference.**
   - Do not mistake pre-EQ signals for post-EQ signals.
   - Invalidate measurements upon clock drift, sample drops, or buffer overruns.

9. **Never claim zero feedback risk.**
   - Prefer physical microphone positioning, cardioid technique, and proper gain structure over destructive acoustic EQ carving.
   - Feedback notch filters must be surgical ($Q \ge 6.0$, depth $\le -4.5\text{ dB}$).

10. **No auto-boost while channel is silent (Silence Hold invariant).**
    - Never drift faders upward during speaker pauses or silent segments.
    - Freeze immediately on uncertain meter, route change, or feedback risk.

11. **Every mutation must follow the 5-step Safety Transaction Protocol:**
    - (1) Snapshot revision integrity check (SHA-256)
    - (2) Explicit operator authorization
    - (3) Rate-limited writes (minimum 20ms pacing)
    - (4) OSC readback verification
    - (5) Automated rollback to pre-mutation snapshot on any mismatch

12. **Preserve open-source licenses, notices, commit SHAs, and attributions.**
    - Document all third-party references in `docs/licensing-SBOM.md`.
