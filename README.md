# Shadow — PS4 & PS5 Exploit Host

Self-hosted jailbreak server for PlayStation 4 and PlayStation 5. Combines multiple WebKit exploits into one unified interface with automatic firmware detection and payload delivery.

## Supported Targets

### PS4

| Exploit | Firmware Range | Kernel Method | Status |
|---------|---------------|---------------|--------|
| CSSFontFace | 6.00 – 11.02 | Lapse / NetCtrl | Stable |
| PSFree + Lapse | 7.00 – 9.60 | Lapse kernel | Stable |
| PSFree 9.00 | 9.00 | ChendoChap | Stable |
| Afterglow | 11.00 – 14.00 | apm-UAF | Stable |

**Supported PS4 firmwares:** 6.00, 6.20, 6.50, 6.70, 6.72, 7.00, 7.02, 7.50, 7.55, 8.00, 8.01, 8.03, 8.50, 8.52, 9.00, 9.03, 9.04, 9.50, 9.51, 9.60, 10.00, 10.01, 10.50, 10.70, 10.71, 11.00, 11.02, 11.50, 12.00, 12.02, 12.50, 12.52, 13.00, 13.02, 13.04, 13.50, 13.52, 14.00

### PS5

| Feature | Status |
|---------|--------|
| Firmware detection | Done |
| WebKit exploit (1.00 – 7.51) | In progress |
| Kernel exploit (1.00 – 7.51) | Planned |
| PS5 HEN / homebrew enabler | Planned |
| Payload manager | Planned |

**Stay on the lowest PS5 firmware possible.** Do not update.

## Payloads

| Payload | Description | Type |
|---------|-------------|------|
| GoldHEN | Full HEN + FTP + debug + cheats | Enabler (recommended) |
| PS4-HEN | Lightweight homebrew enabler | Enabler |
| Disable Updates | Block system update downloads | Utility |
| Enable Updates | Restore update downloads | Utility |
| Fan Threshold | Lower fan activation temp | Utility |
| Disable ASLR | Turn off address randomization | Utility |

Utility payloads send PS4 notification popups on success (e.g. "Shadow: Updates Disabled").

## How to Use

### Quick Start

1. Clone this repo on your PC
2. Run the server:
   ```bash
   python serve.py          # port 8000
   python serve.py 8080     # custom port
   ```
3. On your PS4/PS5 browser, go to `http://<your-pc-ip>:<port>/`
4. Shadow auto-detects your firmware and picks the best exploit
5. Press **Jailbreak** — it runs automatically

### After Jailbreak

Once jailbroken, the landing page shows utility buttons to send payloads like Disable Updates, Fan Threshold, etc. These are sent via GoldHEN's BinLoader (port 9090).

### Offline Use

Shadow uses AppCache manifests to cache all files on the PS4 browser. After the first load, exploits and payloads work without an internet connection (the server must still be reachable on your local network).

## Architecture

```
ps4_jb_shadow/
  index.html          Landing page shell
  style.css           All styling (CSS custom properties)
  shadow.js           FW detection, exploit/payload selection, routing
  shadow.png          Background image
  serve.py            Python HTTP server + BinLoader bridge
  cache.manifest      AppCache for landing page
  payloads/           .bin payload files
    goldhen.bin       GoldHEN (loaded by exploit directly)
    hen.bin           PS4-HEN (loaded by exploit directly)
    disable-updates.bin   ELF utility payload
    enable-updates.bin    ELF utility payload
    fan-threshold.bin     ELF utility payload
    disable-aslr.bin      ELF utility payload
  exploits/
    cssfontface/      CSSFontFace UAF (FW 6.00–11.02)
    psfree-lapse/     PSFree + Lapse (FW 7.00–9.60)
    psfree900/        PSFree 9.00 (FW 9.00)
    afterglow/        Afterglow (FW 11.00–14.00)
```

## Technical Details

- **Firmware detection**: Parses `PlayStation 4/XX.XX` or `PlayStation 5/XX.XX` from the browser user agent
- **Payload delivery**: Server-side Python bridges HTTP POST to GoldHEN BinLoader (TCP port 9090)
- **ELF payloads**: Utility payloads are ELF64 binaries (FreeBSD OS/ABI, x86-64) that end with `thr_exit` syscall (not `ret`, since BinLoader runs them in a thread)
- **Notifications**: Utility payloads call `sceKernelSendNotificationRequest` via libkernel to show PS4 notification popups
- **Caching**: AppCache manifests per exploit page, version-bumped on updates
- **PS4 browser constraints**: Uses `var` (no `let`/`const`), no arrow functions, no template literals in landing page JS

## Credits

- **theflow0** — PSFree WebKit exploit
- **ChendoChap** — 9.00 kernel exploit
- **ABC / Doogie** — CSSFontFace UAF
- **SiSTR0** — GoldHEN
- **LightningMods** — Itemzflow & payloads
- **well0nez / m0zz** — Afterglow exploit chain (FW 11.00–14.00)
- **Specter** — PS4-HEN & Lapse kernel
- **Al-Azif** — Exploit host tooling
- **Znullptr** — WebKit research

## License

This project aggregates open-source exploit research for educational and personal use. Each exploit directory retains its original license. Do not use for piracy.
