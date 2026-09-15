# Marcus reference voice assets

Joel supplied two candidate sources on 2026-09-13 for the Marcus audio product.

## Sources

### Voice v1 — retained alternate

- YouTube source: <https://www.youtube.com/watch?v=fnDRXZMOKI0>
- Video title: `Voice Over Artist with NO EXPERIENCE? Here's How`
- YouTube ID: `fnDRXZMOKI0`
- Original duration: 894.381 seconds
- Selected passage: 143.36–171.36 seconds
- Status: retained for comparison; superseded by voice v2 on 2026-09-13.

### Voice v2 — selected voice

- YouTube source: <https://www.youtube.com/watch?v=ArpQoAWy6M4>
- Video title: `Voice Over Reading-Improve Your Skills`
- YouTube ID: `ArpQoAWy6M4`
- Original duration: 571.921 seconds
- Selected passage: 94.38–122.38 seconds
- Status: selected by Joel on 2026-09-13 for the Marcus audio product.

## Files

| File | Purpose | SHA-256 |
|---|---|---|
| `source/marcus-source.webm` | Complete English original audio downloaded with `yt-dlp`; preserve as the source master. | `a052367d3acdd799b9d38120dfb7711793700ef6876e8adccf0c0330edbc4440` |
| `source/marcus-source.info.json` | YouTube/`yt-dlp` source metadata. | — |
| `source/marcus-source.en.vtt` | Auto-generated English captions used to find a continuous spoken passage. | — |
| `reference/marcus-voice-v1-raw.wav` | Unnormalized 28-second mono PCM extraction from the source. | `721168e811b4e7cbe72fb9bc036085413b24be23f9df59841a10dd945513baae` |
| `reference/marcus-voice-v1.wav` | Retained alternate Chatterbox input normalized to about -18 LUFS. | `4e3b70ee8c3deb337c478e886f3f5f4208290f90f88307a86186202e10cbda2b` |
| `source-v2/marcus-source-v2.webm` | Complete English audio from the second YouTube source. | `46e0423a17937fc858122dc26bd4a79be02bff37bf490ac38aa30b29ec5ffeb7` |
| `source-v2/marcus-source-v2.info.json` | Second source's YouTube/`yt-dlp` metadata. | — |
| `source-v2/marcus-source-v2.en.vtt` | Second source's auto-generated English captions. | — |
| `reference/marcus-voice-v2-raw.wav` | Unnormalized 28-second mono PCM extraction from source v2. | `c1f136b61cce1cbf6e5a8d928be93eebac1d4ed2cea9e5f60f3fe791171ba9a1` |
| `reference/marcus-voice-v2.wav` | Selected Chatterbox input normalized to about -18 LUFS. | `142e611d82c7ce92e23aa2837b7b453f642f31747db9052dad3321fa953c2700` |
| `reference/marcus-voice-v2-10s-raw.wav` | Reproducible 9.99-second extraction at 241.36–251.35 seconds for provider testing. | `5050d2a4cefc2abc3a6a446ef5d34fc5f55ff4b309820dae8d2c6b345b116d7b` |
| `reference/marcus-voice-v2-10s.wav` | Normalized 9.99-second provider reference. | `7475c80452f865a2ec08638fca8b8fa1f421e1b72ddfd9f9cdb19c3cb89a88bb` |
| `selected-voice.json` | Machine-readable selected version, source, hash and pending storage state. | — |

Both candidate WAV files are 28 seconds, mono, 48 kHz, 16-bit PCM. Automated checks found v1 at -18.1 LUFS with a -2.0 dBTP peak and v2 at -17.0 LUFS with a -2.0 dBTP peak. These checks prove that the files decode and have usable signal; they do not prove speaker identity or absence of background sound.

## Before a live Chatterbox run

- [x] Joel selects `reference/marcus-voice-v2.wav` for the current local test and product direction.
- [x] Upload voice v2 privately as `marcus/08/audio/voices/marcus-voice-v2-142e611d.wav` and record its object key, hash and voice version.
- [x] Upload the 10-second provider reference privately as `marcus/08/audio/voices/marcus-voice-v2-10s-7475c804.wav` and verify a signed range request.
- [ ] Keep the full source and raw extraction unchanged so a future voice version can be reproduced.
- [x] Run provider smoke tests with the 28-second reference, 10-second reference, and no reference. All reached Replicate but its hosted model returned the same CUDA device assertion.
- [x] Run the 10-second voice-v2 reference through the maintained Chatterbox Turbo deployment; prediction `s9g4pxdgh5rmy0d0kbyrd42rew` produced a valid 14.14-second WAV.
- [x] Joel listened to the saved Turbo output on 2026-09-13 and approved it ("its good"): `tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew.wav`, SHA-256 `70986b34f84d77e2a00d32d04664b37cb839d485aa8479c4056eecb0e18b270c`. The 0.90× pacing comparison was not separately ruled on.

## Rights note (coordinator, 2026-09-13)

Both candidate voices are real, identifiable people from public YouTube videos (v2: the uploader "Aliso Creek Voice Over Classes", 2019) who have not consented to cloning. Resemble's Chatterbox and Replicate's terms require consent for voice cloning; a paid product on this voice can be cut off, and a voice-over professional is the person most likely to recognise their own voice. Joel has been told.

**Rights secured 2026-09-15 (Joel): approved for customer audio.** The test-only caveat above is closed.
