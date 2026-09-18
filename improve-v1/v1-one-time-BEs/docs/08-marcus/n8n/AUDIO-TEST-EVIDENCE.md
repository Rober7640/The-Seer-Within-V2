# Marcus audio test evidence

Status: passed with Replicate Chatterbox Turbo on 2026-09-13. The original standard Chatterbox deployment failed inside its hosted GPU runtime, so the provider smoke test was moved to the maintained Turbo deployment. Turbo generated a valid WAV from the 10-second voice-v2 reference.

## Test configuration

- Workflow: `Lksy14rvjB5Z7aYg` — `08 Marcus — Numerology-Anchored Stage 1 / Stage 2 Parked`
- Selected voice: `marcus-voice-v2`
- Provider reference variant: `marcus-voice-v2-10s`
- Provider reference hash: `7475c80452f865a2ec08638fca8b8fa1f421e1b72ddfd9f9cdb19c3cb89a88bb`
- Private object: `marcus/08/audio/voices/marcus-voice-v2-10s-7475c804.wav`
- Replicate credential ID: `jiau9jiN0hsPPE91`, displayed as `Marcus Replicate`
- Passing model endpoint: `POST /v1/models/resemble-ai/chatterbox-turbo/predictions`

The private object upload passed `HeadObject`. A fresh one-hour signed GET URL returned HTTP 206 for a range request before it was supplied to n8n.

## Runs

| Execution | Provider prediction | Result | Finding |
|---|---|---|---|
| `31260` | — | Failed before provider request | n8n rejected the temporary test harness's dynamic body expression. The body was changed to fixed JSON. |
| `31261` | — | Replicate HTTP 401 | The request reached Replicate, but the credential value was invalid. |
| `31262` | — | Replicate HTTP 401 | The same invalid-token response was reproduced. |
| `31263` | — | Replicate HTTP 401 | The saved credential still contained the wrong token value. |
| `31268` | `6k4xwq6x21rmy0d0kbv92ej9rr` | Provider failed | Authentication succeeded and Replicate created a prediction. The 28-second voice reference triggered `CUDA error: device-side assert triggered`. |
| `31269` | `tqfb7bjnmhrmt0d0kbvrecqdam` | Provider failed | A second 28-second attempt produced the same CUDA assertion. |
| `31270` | `nwjp1enbw1rmy0d0kbx93tk0wm` | Provider failed | A normalized 9.99-second voice-v2 reference produced the same CUDA assertion. |
| `31271` | `80vf5z3jm9rmw0d0kbxv5smncg` | Provider failed | A diagnostic request with no `audio_prompt` produced the same CUDA assertion immediately. This isolates the fault to the hosted model runtime rather than the Marcus reference file. |
| `31276` | `s9g4pxdgh5rmy0d0kbyrd42rew` | **Succeeded** | Chatterbox Turbo used `text` plus the 10-second voice-v2 `reference_audio`. It generated a 14.14-second mono 24 kHz float WAV in 4.4 seconds. |

The n8n Header Auth field is saved as `Authorization` with a valid bearer token. Successful prediction creation in executions `31268`–`31271` verifies the credential. Do not store the token in this repository.

The successful output is saved as [`marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew.wav`](assets/marcus-voice/tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew.wav). It is 1,357,498 bytes with SHA-256 `70986b34f84d77e2a00d32d04664b37cb839d485aa8479c4056eecb0e18b270c`.

A pitch-preserving 0.90× comparison is saved as [`marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew-90pct.wav`](assets/marcus-voice/tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew-90pct.wav). It is a 15.70-second mono 24 kHz PCM WAV with SHA-256 `bbbbfee933fb48bf81f5c4b93ede5968faf42bcea79df111ee1c5c30c0d3eb91`.

After every attempt the workflow was deactivated. The temporary four-node webhook lane was removed and the authoritative inactive 37-node canvas was restored. The written-report lane was preserved.

## Next action

- [x] Verify Replicate authentication.
- [x] Verify the private reference object and signed URL.
- [x] Test both the selected 28-second reference and a provider-sized 10-second reference.
- [x] Test without reference audio to isolate the provider failure.
- [x] Test the maintained Chatterbox Turbo deployment with the selected voice.
- [x] Download the successful provider output and verify its container, codec, duration, and hash.
- [x] Joel listened on 2026-09-13 and approved the sample ("its good").
- [ ] Build the production audio branch around Turbo only after the saved sample is accepted.
