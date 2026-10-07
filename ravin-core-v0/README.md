# RAVIN Core v0

A zero-dependency prototype where an iPhone is the interface and a Mac is the local RAVIN server.

## Start it

1. Put the Mac and iPhone on the same Wi-Fi network.
2. On the Mac, double-click `start.command`.
   - If macOS blocks it, right-click it -> Open.
   - Or open Terminal in this folder and run `python3 server.py`.
3. Terminal will print a Phone URL such as `http://192.168.1.42:8765`.
4. Type that exact address into Safari on the iPhone.
5. Tap the text field and use the microphone button on the iPhone keyboard for voice dictation.
6. RAVIN's reply is spoken by the iPhone using built-in browser speech synthesis.

## What works now

- Phone -> Mac over local Wi-Fi
- RAVIN-style interface
- Dictated input through the iPhone keyboard
- Text replies
- Spoken replies
- Simple conversation history
- Demo brain so the hardware/software link can be tested immediately

## Connect the real RAVIN brain

The server can forward messages to an existing HTTP endpoint without changing the phone UI.

Before starting the server:

```bash
export RAVIN_API_URL="https://your-ravin-endpoint.example/api/chat"
export RAVIN_API_TOKEN="your-token-if-needed"
python3 server.py
```

It sends JSON shaped like:

```json
{
  "message": "What do I need to do tonight?",
  "history": [],
  "source": "ravin-core-v0"
}
```

The endpoint can return any of these fields for the reply: `reply`, `response`, `message`, `text`, or `content`.

## School Mac caveats

- The school network may block device-to-device traffic. If the phone cannot open the printed URL, try a permitted home Wi-Fi network.
- macOS Firewall may ask whether Python can accept incoming connections; allow it if school policy permits.
- This prototype installs nothing and uses only Python's standard library.
