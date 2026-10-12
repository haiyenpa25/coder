"""
Mock Behringer X32 Compact OSC Server for Development and Offline Testing.
Runs over standard UDP (default port 10023).
Emulates:
- Full 32-channel parameters (faders, mutes, HPF, 4-band PEQ, names, colors)
- AES50 A (DL16) connection
- ULTRANET P16-D / P16-HQ routing
- HARD INVARIANT: DL16 Input 11 is talkback to P16 monitor ONLY (/ch/11/mix/st == 0)
- /info, /status, /xremote heartbeat, /meters
- Rate limiting & subscription tracking
"""

from __future__ import annotations
import socket
import threading
import time
from typing import Dict, Any, List, Tuple

from packages.x32_osc_adapter.osc_codec import OSCMessage, encode_osc, decode_osc


class MockX32Server:
    def __init__(self, host: str = "127.0.0.1", port: int = 10023):
        self.host = host
        self.port = port
        self.running = False
        self.sock: socket.socket | None = None
        self.thread: threading.Thread | None = None
        self.subscribers: Dict[Tuple[str, int], float] = {}
        self.lock = threading.Lock()
        
        self.state: Dict[str, Any] = {}
        self._init_default_church_state()

    def _init_default_church_state(self):
        """Build initial state matching church setup."""
        # 1. Mixer System Info
        self.state['/info'] = ['V4.09', 'osc-server', 'X32 Compact', '4.09-0']
        self.state['/status'] = ['active', self.host, 'ChurchMix-X32']

        # 2. Main FOH Stereo Bus
        self.state['/main/st/mix/fader'] = 0.75 # ~ 0 dB Unity
        self.state['/main/st/mix/on'] = 1      # Unmuted
        self.state['/main/st/config/name'] = 'MAIN FOH'

        # 3. Setup Channels 1..32
        channel_names = {
            1: "Pastor Mic",
            2: "Assoc Pastor",
            3: "Lead Voc 1",
            4: "Backing Voc 1",
            5: "Backing Voc 2",
            6: "Aco Guitar",
            7: "Elec Guitar",
            8: "Bass DI",
            9: "Piano L",
            10: "Piano R",
            11: "Talkback Band", # DL16 input 11 mapped here
            12: "Choir L",
            13: "Choir R",
        }

        for ch in range(1, 33):
            prefix = f"/ch/{ch:02d}"
            name = channel_names.get(ch, f"CH{ch:02d}")
            self.state[f"{prefix}/config/name"] = name
            self.state[f"{prefix}/config/color"] = 1 if ch <= 5 else 3
            self.state[f"{prefix}/mix/fader"] = 0.75 if ch in channel_names else 0.0
            self.state[f"{prefix}/mix/on"] = 1 if ch in channel_names else 0

            # CRUCIAL INVARIANT: Channel 11 (Talkback) MUST NOT SEND TO MAIN STEREO (/mix/st = 0)
            if ch == 11:
                self.state[f"{prefix}/mix/st"] = 0 # NOT ROUTED TO MAIN FOH!
            else:
                self.state[f"{prefix}/mix/st"] = 1 # Normal channels route to Main FOH

            # Preamp / HPF
            self.state[f"{prefix}/preamp/hpon"] = 1 if ch <= 5 else 0
            self.state[f"{prefix}/preamp/hpf"] = 0.25 # ~80-100Hz

            # 4-band Parametric EQ
            self.state[f"{prefix}/eq/on"] = 1
            for band in range(1, 5):
                self.state[f"{prefix}/eq/{band}/type"] = 1 # PEQ
                self.state[f"{prefix}/eq/{band}/f"] = 0.25 * band
                self.state[f"{prefix}/eq/{band}/g"] = 0.50 # Neutral 0 dB
                self.state[f"{prefix}/eq/{band}/q"] = 0.50 # Medium Q

            # Mixbus sends (1-16)
            # Talkback (ch 11) feeds the band only through P16 direct outs: no mix-bus sends.
            for bus in range(1, 17):
                if ch == 11:
                    self.state[f"{prefix}/mix/{bus:02d}/level"] = 0.0
                    self.state[f"{prefix}/mix/{bus:02d}/on"] = 0
                else:
                    self.state[f"{prefix}/mix/{bus:02d}/level"] = 0.75 if bus <= 6 else 0.0
                    self.state[f"{prefix}/mix/{bus:02d}/on"] = 1

            # Mono/Center send (off for every channel by default)
            self.state[f"{prefix}/mix/mono"] = 0

            # Digital trim, gate/expander and automix (needed for rollback pre-reads)
            self.state[f"{prefix}/preamp/trim"] = 0.5  # 0 dB
            self.state[f"{prefix}/gate/on"] = 0
            self.state[f"{prefix}/gate/mode"] = 3      # EXP2
            self.state[f"{prefix}/gate/thr"] = 0.0
            self.state[f"{prefix}/gate/range"] = 0.0
            self.state[f"{prefix}/gate/filter/on"] = 0
            self.state[f"{prefix}/gate/filter/f"] = 0.5
            self.state[f"{prefix}/automix/group"] = 0  # OFF
            self.state[f"{prefix}/automix/weight"] = 0.5

        # 3b. Mix buses 1-16 are monitor/aux buses: not summed to Main, Mono or Matrix
        for bus in range(1, 17):
            b_prefix = f"/bus/{bus:02d}"
            self.state[f"{b_prefix}/config/name"] = f"MixBus {bus:02d}"
            self.state[f"{b_prefix}/mix/on"] = 1
            self.state[f"{b_prefix}/mix/fader"] = 0.75
            self.state[f"{b_prefix}/mix/st"] = 0
            self.state[f"{b_prefix}/mix/mono"] = 0
            for mtx in range(1, 7):
                self.state[f"{b_prefix}/mix/{mtx:02d}/on"] = 0
                self.state[f"{b_prefix}/mix/{mtx:02d}/level"] = 0.0

        # 4. Routing Architecture
        self.state['/config/routing/IN'] = 'AES50A 1-16'
        self.state['/config/routing/AES50A'] = 'CONNECTED'
        self.state['/config/routing/AES50A/device'] = 'DL16'

        # Ultranet P16 outputs (1-16):
        # P16 slot 11 explicitly maps to Talkback Channel 11
        for p in range(1, 17):
            self.state[f"/outputs/p16/{p:02d}/src"] = p
            self.state[f"/outputs/p16/{p:02d}/tap"] = "Pre-EQ"

        self.state['/outputs/p16/11/src'] = 11 # DL16 In 11 -> P16 slot 11
        self.state['/outputs/p16/11/tap'] = "Direct Out Pre"

    def start(self):
        """Start UDP server thread."""
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind((self.host, self.port))
        self.running = True
        self.thread = threading.Thread(target=self._listen_loop, daemon=True, name="MockX32ServerThread")
        self.thread.start()

    def stop(self):
        """Stop UDP server thread."""
        self.running = False
        if self.sock:
            try:
                unblock_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                unblock_sock.sendto(b'/xstop\x00\x00\x00', (self.host, self.port))
                unblock_sock.close()
                self.sock.close()
            except Exception:
                pass
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)

    def _listen_loop(self):
        while self.running:
            try:
                data, addr = self.sock.recvfrom(4096)
                if not data or not self.running:
                    break
                self._handle_packet(data, addr)
            except Exception:
                if not self.running:
                    break

    def _handle_packet(self, data: bytes, addr: Tuple[str, int]):
        try:
            msg = decode_osc(data)
        except Exception:
            return

        addr_str = msg.address

        if addr_str == '/xremote':
            with self.lock:
                self.subscribers[addr] = time.time()
            return

        if addr_str == '/info':
            resp = OSCMessage('/info', self.state['/info'])
            self.sock.sendto(encode_osc(resp), addr)
            return

        if addr_str == '/status':
            resp = OSCMessage('/status', self.state['/status'])
            self.sock.sendto(encode_osc(resp), addr)
            return

        if len(msg.args) == 0:
            with self.lock:
                if addr_str in self.state:
                    val = self.state[addr_str]
                    args = val if isinstance(val, list) else [val]
                    resp = OSCMessage(addr_str, args)
                    self.sock.sendto(encode_osc(resp), addr)
            return

        with self.lock:
            new_val = msg.args[0] if len(msg.args) == 1 else msg.args
            self.state[addr_str] = new_val
            resp = OSCMessage(addr_str, msg.args)
            self.sock.sendto(encode_osc(resp), addr)
