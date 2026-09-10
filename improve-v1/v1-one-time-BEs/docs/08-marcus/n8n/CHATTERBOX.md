# Marcus audio — Replicate Chatterbox

Selected direction: Replicate API with `resemble-ai/chatterbox`, using the Marcus reference voice Joel will provide. No voice sample has been received and no synthesis run has been made.

Replicate’s [Chatterbox schema](https://replicate.com/resemble-ai/chatterbox/api/schema) accepts `prompt` for the spoken text and `audio_prompt` for a reference audio URI, and returns an audio URI. This is the standard Chatterbox model; do not mix its field names with Chatterbox Turbo or Multilingual.

## Request used in the new n8n draft

```http
POST https://api.replicate.com/v1/models/resemble-ai/chatterbox/predictions
Authorization: Bearer <Replicate credential>
Content-Type: application/json
```

```json
{
  "input": {
    "prompt": "<one approved narration segment>",
    "audio_prompt": "<fresh signed URL for the supplied Marcus reference voice>",
    "exaggeration": 0.5,
    "cfg_weight": 0.5,
    "temperature": 0.8,
    "seed": 0
  }
}
```

These voice controls are starting test settings, not a claim of approved sound quality. Pin the approved model/config and reference-voice version in each job. Validate a sample before using the voice for customer work. Use authorized Marcus source audio supplied by Joel; do not substitute an unrelated voice.

Use asynchronous predictions: save the prediction ID, poll its status with a bounded budget, and reconcile an uncertain create request before submitting again. Replicate documents [prediction creation and polling](https://replicate.com/docs/topics/predictions/create-a-prediction).

After success, copy every segment to our own private storage immediately. Replicate API output files are removed after about an hour; a Replicate output URL is not a durable customer listening link. See [output-file retention](https://replicate.com/docs/topics/predictions/output-files/).

## Still to supply/build

- [ ] Marcus reference recording, stored privately with a version and signed input URL.
- [ ] Dedicated Replicate credential in n8n. No token is embedded in workflow JSON.
- [ ] Approved script normalizer and tested segment sizing; the current schema does not establish an accepted report-length policy.
- [ ] Backend segment/prediction persistence, private copy, media assembly and QA operations listed in README.
- [ ] Real pronunciation/quality test, including tarot names, sentence joins and representative first names.
- [ ] Private player and audio-ready delivery adapter.

Delivery follows [DELIVERY-POLICY.md](DELIVERY-POLICY.md): audio shares the order’s 24-hour or 12-hour deadline.
