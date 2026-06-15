# Meta Custom Conversions — Screen-by-Screen Checklist

**Who:** whoever manages the Meta Business account (Lewis / Claudia / Mike)
**When:** AFTER the `fix/fb-upsell-as-purchase` code is deployed **and** one real
test purchase has flowed through (Meta must "see" the `content_category` tag once
before it appears in the dropdown).
**Time:** ~5–10 minutes. One-time setup.

> These describe each Meta screen in words (live UI, not captured images). Button
> names match Events Manager as of 2026. If a label differs slightly, the flow is
> the same.

---

## Before you start — 1 test purchase

`content_category` only appears in Meta's dropdowns after at least one event
carries it. So:

- [ ] Code deployed to the environment whose pixel you're configuring.
- [ ] Run ONE real front-end purchase + ONE upsell through that funnel.
- [ ] Wait ~15–20 min for Meta to register the new parameter.

---

## SCREEN 1 — Open Events Manager

- [ ] Go to **business.facebook.com** → top-left menu (≡) → **Events Manager**.
      (Or direct: business.facebook.com/events_manager2)
- [ ] In the left rail you'll see your **Data Sources** (pixels) listed. Confirm
      you can see the pixel for the funnel you're setting up:
  - Default funnel pixel: **446814716830295**
  - Soulmate pixel: **738651185965027**

---

## SCREEN 2 — Confirm the tag arrived (sanity check)

- [ ] Click the pixel → **Test Events** tab (top).
- [ ] In another tab, do a test purchase (if you haven't).
- [ ] Back in Test Events, click the **Purchase** event row → it expands to show
      **Parameters**.
- [ ] Confirm you see **`content_category`** with value `frontend` or `upsell`.
  - ✅ If yes → proceed.
  - ❌ If missing → the code/Stape isn't passing it yet; stop and tell the dev.

---

## SCREEN 3 — Start a Custom Conversion

- [ ] Left rail → **Custom Conversions**.
- [ ] Click the blue **Create Custom Conversion** button (top-right).
- [ ] A dialog titled **"Create a custom conversion"** opens.

---

## SCREEN 4 — Fill in "FE Purchases"

The dialog is titled **"Create a custom conversion"**. Fill it top to bottom:

- [ ] **Action Source** → leave as **Website**.
- [ ] **Event** → select **Purchase**. (If your pixel hasn't sent a Purchase yet
      it won't appear — do a test purchase first; see Screen 2.)
- [ ] **Rules · Required** — "This custom conversion must meet all of these rules."
      The rule row has 4 parts, left to right:
  - [ ] **1st dropdown** → **Event Parameters**. (Default is often **URL** — you
        MUST change it. The dropdown also lists Referring Domain / Page and
        Product Info — ignore those.)
  - [ ] **2nd box (parameter name, free text)** → type exactly `content_category`
        (lowercase, underscore — a typo matches nothing).
  - [ ] **3rd dropdown (operator)** → choose **equals** if offered; **contains**
        also works (our values are exact single words).
  - [ ] **4th box (value)** → type exactly `frontend`.
- [ ] **Name** → scroll within the dialog to find it; set to `FE Purchases`.
- [ ] **Description** (optional) → `Front-end ritual purchases only`.
- [ ] (Leave value/currency defaults — the $ flows from the event.)
- [ ] Click **Create**.

You should now see "FE Purchases" in the Custom Conversions list.

> Note: the parameter is a **free-text box**, not a dropdown — Meta won't
> suggest `content_category`, you type it. It only *validates* against received
> events, so confirm Screen 2 first.

---

## SCREEN 5 — Repeat for "Upsells"

- [ ] Click **Create Custom Conversion** again.
- [ ] **Action Source** → **Website**; **Event** → **Purchase** (same as above).
- [ ] Rule: **Event Parameters** → `content_category` → **equals** → `upsell`.
- [ ] **Name** → `Upsells`.
- [ ] Click **Create**.

You now have two Custom Conversions: **FE Purchases** and **Upsells**.

---

## SCREEN 5b — Per-pixel: repeat for the soulmate pixel (only if needed)

**Custom Conversions are tied to ONE pixel.** The two you just made live on the
default pixel (**446814716830295**, used by V1 / fb / fb2 / gdn / **palm** / aiden /
evelyn). They will NOT count events from the soulmate funnel, which uses its own
pixel (**738651185965027**).

Two separate concerns — don't conflate them:

- **ROAS correction is AUTOMATIC on every pixel — no setup needed.** Website Purchase
  ROAS sums all `Purchase` events on a pixel, and soulmate upsells (bracelet, love
  tuner) now fire as `Purchase` too. So the soulmate pixel's ROAS already includes
  upsell value with zero extra work.
- **The FE-vs-upsell split COLUMNS are per-pixel and manual.** To see that split on
  the soulmate funnel, you must recreate the two Custom Conversions on the soulmate
  pixel.

**Do you need the soulmate split?**
- [ ] **Actively running / reading soulmate ad stats** → yes. Repeat Screens 3–5 with
      **data source = soulmate pixel 738651185965027** (same `content_category` rules:
      `frontend` → "FE Purchases (Soulmate)", `upsell` → "Upsells (Soulmate)" — name
      them distinctly so they don't collide with the default-pixel pair).
- [ ] **Soulmate not an active channel** → skip. The data (`content_category`) is
      already flowing, so you can add these anytime later with no loss.

> Before trusting soulmate numbers, run the Screen 2 check on the **soulmate pixel**:
> a soulmate Purchase → expand parameters → confirm `content_category` is present.

---

## SCREEN 6 — Show them as columns in Ads Manager

- [ ] Go to **Ads Manager** (≡ menu → Ads Manager).
- [ ] Open any campaign view (Campaigns / Ad sets / Ads tab).
- [ ] Click the **Columns** dropdown (right side, above the table) →
      **Customize Columns**.
- [ ] In the search box type `FE Purchases` → tick its checkboxes
      (you'll see count, value, cost-per options — tick at least count + value).
- [ ] Search `Upsells` → tick the same.
- [ ] (Optional) tick **Website Purchase ROAS** if not already shown.
- [ ] Bottom-right → **Apply**.
- [ ] Click the **Columns** dropdown again → **Save as preset** so it sticks
      (name it e.g. "Seer ROAS view").

---

## SCREEN 7 — Retire the OLD upsell event/columns

The old custom `Upsell` / `Upsell2` events stop receiving data after deploy.

- [ ] In Customize Columns, **untick** any old "Upsell" / "Upsell2" custom event
      columns so the dashboard isn't cluttered with frozen numbers.
- [ ] (Optional) In Events Manager, you can leave the old custom events alone —
      they just go quiet. No need to delete.

---

## SCREEN 8 — Campaign optimization (the actual win)

- [ ] When creating/editing a Sales campaign, set the optimization event to
      **Purchase** with **Value optimization / Highest value (tROAS)** enabled.
- [ ] Meta now optimizes on the full order value (FE + upsells), not flat $35.

---

## Done — what you'll see

| Column | Meaning | Example |
|---|---|---|
| Purchases | all Purchases (FE + upsells) | 30 |
| **FE Purchases** | front-ends only | 18 |
| **Upsells** | upsells only | 12 |
| Website Purchase ROAS | full value, correct | 1.3–2.0 |

> Repeat Screens 3–5 for the **soulmate pixel (738651185965027)** if you want the
> same split on that funnel.

---

## Troubleshooting

- **`content_category` not in the dropdown** → Meta hasn't seen it yet. Do a test
  purchase, wait 20 min, refresh. Confirm via Test Events (Screen 2) first.
- **Numbers look doubled in Test Events** → that's the known fallback-checkout
  double-fire; Meta dedups it in real reporting. Ask dev to ship the bundled fix
  if it bothers you.
- **Custom Conversion stuck at 0** → check the rule uses **Event Parameters**
  (not URL) and the value is lowercase `frontend` / `upsell` (exact match).
