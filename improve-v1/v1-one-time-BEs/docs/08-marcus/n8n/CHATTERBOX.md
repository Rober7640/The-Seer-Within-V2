# Marcus audio — Replicate Chatterbox Turbo

Selected direction: Replicate API with the maintained `resemble-ai/chatterbox-turbo` deployment and Joel's selected `marcus-voice-v2`. Voice v1 remains only as an alternate. Both source recordings and reproducible reference WAVs are stored under [`assets/marcus-voice/`](assets/marcus-voice/README.md).

The original `resemble-ai/chatterbox` endpoint is superseded for this project. Four authenticated predictions reached that endpoint on 2026-09-13, but its hosted GPU runtime returned the same CUDA device assertion with a 28-second reference, a 10-second reference, and no reference audio. Turbo succeeded with the 10-second voice-v2 reference. See [the execution evidence](AUDIO-TEST-EVIDENCE.md).

Replicate's [Chatterbox Turbo API](https://replicate.com/resemble-ai/chatterbox-turbo/api) accepts `text` and `reference_audio`. These are different from the standard model's `prompt` and `audio_prompt` fields.

## Proven request

```http
POST https://api.replicate.com/v1/models/resemble-ai/chatterbox-turbo/predictions
Authorization: Bearer <Replicate credential>
Content-Type: application/json
Prefer: wait=60
```

```json
{
  "input": {
    "text": "<one approved narration segment>",
    "reference_audio": "<fresh signed URL for Marcus voice v2, 10-second variant>",
    "top_p": 0.95,
    "top_k": 1000,
    "temperature": 0.8,
    "repetition_penalty": 1.2,
    "seed": 0
  }
}
```

The smoke test used n8n credential `jiau9jiN0hsPPE91` (`Marcus Replicate`) and private object `marcus/08/audio/voices/marcus-voice-v2-10s-7475c804.wav`. Prediction `s9g4pxdgh5rmy0d0kbyrd42rew` succeeded in 4.4 seconds. Its saved 14.14-second WAV is [`marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew.wav`](assets/marcus-voice/tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew.wav).

These controls are a tested starting configuration. Listening approval is still required before customer use. Pin the provider model, settings, reference voice version, reference hash, script hash, and seed in each audio job so retries remain reproducible.

## Pacing controls

Turbo has no speaking-rate input. `temperature`, `top_p`, `top_k`, and `repetition_penalty` control token sampling and stability; they are not dependable speed controls. `seed` makes a configuration reproducible. Turbo's implementation ignores `cfg_weight` and `exaggeration`, so do not add those standard-model controls to its request.

Use two deterministic pacing stages after synthesis:

1. Apply pitch-preserving `atempo=0.90` to each accepted segment. Joel approved `0.90` as the default on 2026-09-13; lower it only after another listening decision because heavy time stretching can sound artificial.
2. During assembly, insert about 300 ms between paragraphs, 600 ms between card sections, and 900 ms before the closing synthesis. Store these pause values with the audio configuration.

Do not depend on `[pause]` text tags. Generate separate semantic segments and insert real silence during assembly. The first 0.90× comparison is [`marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew-90pct.wav`](assets/marcus-voice/tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew-90pct.wav); it is 15.70 seconds versus 14.14 seconds for the provider output.

The machine-readable production default is [`config/marcus-audio-v1.json`](config/marcus-audio-v1.json). The backend must store its `configVersion` with each audio job and artifact.

## Voice and file handling

The selected master is `assets/marcus-voice/reference/marcus-voice-v2.wav`, a normalized 28-second, mono, 48 kHz, 16-bit PCM file. The provider input is `assets/marcus-voice/reference/marcus-voice-v2-10s.wav`, a normalized 9.99-second excerpt from the same selected source. Their sources, clip ranges, metadata, and hashes are recorded in the [voice asset manifest](assets/marcus-voice/README.md) and [`selected-voice.json`](assets/marcus-voice/selected-voice.json).

The production audio job must obtain a fresh signed URL for the 10-second private object and pass it as `reference_audio`. Never make the voice source public or store signed URLs in committed workflow JSON. Store `marcus-voice-v2-10s` and its hash with each audio job.

Use asynchronous predictions in production even though the smoke test used `Prefer: wait=60`: save the prediction ID, poll it with a bounded budget, and reconcile an uncertain create request before submitting again. Replicate documents [prediction creation and polling](https://replicate.com/docs/topics/predictions/create-a-prediction).

Copy every successful segment to private storage immediately. Replicate output files are temporary; a provider URL is not a customer listening link. See [Replicate output-file retention](https://replicate.com/docs/topics/predictions/output-files/).

## Build status

- [x] Two Marcus voice sources downloaded and converted into versioned reference WAVs.
- [x] Voice v2 selected; voice v1 retained as an alternate.
- [x] Selected master and 10-second provider reference uploaded privately with pinned hashes.
- [x] Replicate Header Auth credential corrected and verified without exposing its token.
- [x] Fresh signed input URL created and verified for the provider reference.
- [x] One real Turbo synthesis completed through a temporary n8n lane and was saved locally.
- [ ] Joel listens to and approves identity, clarity, pacing, and tarot-name pronunciation.
- [ ] Freeze the script normalizer, segment-sizing policy, and pronunciation overrides.
- [ ] Build backend prediction persistence, private segment copy, assembly, QA, and recovery operations.
- [ ] Build the private player and audio-ready delivery adapter.

Audio follows [DELIVERY-POLICY.md](DELIVERY-POLICY.md): it shares the order's 24-hour or 12-hour deadline.
