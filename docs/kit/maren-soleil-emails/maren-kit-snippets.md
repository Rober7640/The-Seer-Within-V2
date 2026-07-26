# Maren Soleil — Kit Reusable Snippets

Three standalone HTML blocks extracted from the email templates so you can save
each as a Kit **reusable snippet** and drop it into any broadcast/sequence email.

How to save a snippet in Kit:
1. In the email editor, add an **HTML block** (or use the snippet manager if your
   plan exposes it).
2. Paste one block below.
3. Save it as a snippet with the exact name noted above each block.
4. Reuse by inserting the snippet; edit only the `EDIT:` regions per send.

All colors are inline (dark-mode safe). All links use the `/maren` pre-login
lander with UTMs — change `utm_content=MS-XX` per send.

`{{BASE_URL}}` placeholder = `https://theseerwithin.com` (already baked into hrefs;
swap that domain portion only if you migrate domains).

**Accuracy (love empath):** felt-truths only — never predictions or promised
outcomes; no cards/tools; never claim a personal fact about the reader or the
other person, and never claim a reading was already done for them. The reading
happens live in the chat.

---

## 1) Masthead — save as snippet named **"MS · Masthead"**

Ember band, live-text wordmark + gold tagline, current/tide watermark (degrades),
gold hairline with center tide node, and a 28px spacer. Live text only — never an
image for the wordmark.

```html
<!-- ===== MS · MASTHEAD ===== -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" bgcolor="#5E2A2C" background="https://theseerwithin.com/assets/maren/current-watermark-600x88.png"
        style="background-color:#5E2A2C; background-image:url('https://theseerwithin.com/assets/maren/current-watermark-600x88.png'); background-position:center; background-repeat:no-repeat; padding:24px 24px 20px 24px;">
      <!-- Maren avatar — web-optimized JPEG (150px asset, shown at 72px), round w/ gold ring. Host at {{BASE_URL}}/assets/maren/maren-avatar.jpg -->
      <img src="https://theseerwithin.com/assets/maren/maren-avatar.jpg" width="72" height="72" alt="Maren Soleil, your twin-flame oracle" style="display:block; margin:0 auto 12px auto; width:72px; height:72px; border-radius:50%; border:2px solid #C9A24B; outline:none;">
      <div style="margin:0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:26px; line-height:30px; font-weight:600; letter-spacing:0.5px; color:#FBF5EF;">
        MAREN SOLEIL
      </div>
      <div style="margin:6px 0 0 0; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:11px; line-height:14px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#C9A24B;">
        Twin Flame Oracle &middot; Love Empath
      </div>
    </td>
  </tr>
  <tr>
    <td bgcolor="#FBF5EF" style="background-color:#FBF5EF; padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td height="1" bgcolor="#C9A24B" style="background-color:#C9A24B; line-height:1px; font-size:1px;">&nbsp;</td>
          <td width="26" align="center" bgcolor="#FBF5EF" style="background-color:#FBF5EF; font-family:'Inter',Helvetica,Arial,sans-serif; font-size:13px; line-height:13px; color:#C9A24B; padding:0 4px;">&#8776;</td>
          <td height="1" bgcolor="#C9A24B" style="background-color:#C9A24B; line-height:1px; font-size:1px;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td height="28" bgcolor="#FBF5EF" style="background-color:#FBF5EF; height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>
</table>
<!-- ===== /MS · MASTHEAD ===== -->
```

---

## 2) CTA Block — save as snippet named **"MS · CTA"**

The conversion unit. Identical across all 3 templates. Order: 24px spacer →
`{{CHAT_BLURB}}` → 18px → bulletproof button (VML for Outlook) → 10px → italic
friction line → 28px. Button href is the `/maren` lander; edit `utm_content=MS-XX`
per send and rotate the friction line. **Button is ivory text on the terracotta
"flame" `#9C4A3C`** (the one inverted-contrast element in the system).

```html
<!-- ===== MS · CTA BLOCK ===== -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td height="24" bgcolor="#FBF5EF" style="background-color:#FBF5EF; height:24px; line-height:24px; font-size:1px;">&nbsp;</td></tr>

  <!-- EDIT: {{CHAT_BLURB}} (Inter 16/26, ink, centered, <=2 lines) -->
  <tr>
    <td class="ms-gutter" align="center" bgcolor="#FBF5EF" style="background-color:#FBF5EF; padding:0 40px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:26px; color:#2A2024;">
      I'll feel for your end of the cord first &mdash; how warm it is, which way it's pulling, whether the current still runs both ways. No guessing, no flattery. What I sense, straight.
    </td>
  </tr>

  <tr><td height="18" bgcolor="#FBF5EF" style="background-color:#FBF5EF; height:18px; line-height:18px; font-size:1px;">&nbsp;</td></tr>

  <!-- BULLETPROOF BUTTON -->
  <tr>
    <td class="ms-btn-td" align="center" bgcolor="#FBF5EF" style="background-color:#FBF5EF; padding:0 40px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://theseerwithin.com/maren?utm_source=kit&amp;utm_medium=email&amp;utm_campaign=maren-daily&amp;utm_content=MS-XX" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="15%" stroke="f" fillcolor="#9C4A3C">
        <w:anchorlock/>
        <center style="color:#FBF5EF;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.5px;">I'LL TELL YOU STRAIGHT &#8594;</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <!-- EDIT: href utm_content=MS-XX  |  EDIT: button label -->
      <table role="presentation" class="ms-btn-a" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr>
          <td align="center" bgcolor="#9C4A3C" style="background-color:#9C4A3C; border-radius:8px;">
            <a href="https://theseerwithin.com/maren?utm_source=kit&amp;utm_medium=email&amp;utm_campaign=maren-daily&amp;utm_content=MS-XX"
               style="display:inline-block; padding:16px 34px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; letter-spacing:0.5px; color:#FBF5EF; text-decoration:none; border-radius:8px;">
              I'LL TELL YOU STRAIGHT &#8594;
            </a>
          </td>
        </tr>
      </table>
      <!--<![endif]-->
    </td>
  </tr>

  <tr><td height="10" bgcolor="#FBF5EF" style="background-color:#FBF5EF; height:10px; line-height:10px; font-size:1px;">&nbsp;</td></tr>

  <!-- EDIT: friction line (rotate per send). Variants:
       A) "Your first 3 minutes are free. No card, no catch — just talk to me like you'd text a friend."
       B) "No card needed, no long story required. Say 'hi' and we'll feel into it together. Three minutes on me."
       C) "3 free minutes, nothing to cancel. Come as you are — mid-feeling, unsure."
       D) "No card. No script. No birthday. Just 3 free minutes and the connection on your mind." -->
  <tr>
    <td class="ms-gutter" align="center" bgcolor="#FBF5EF" style="background-color:#FBF5EF; padding:0 40px;">
      <span style="font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-style:italic; font-size:14px; line-height:20px; color:#6B5550;">
        Your first 3 minutes are free. No card, no catch &mdash; just talk to me like you'd text a friend.
      </span>
    </td>
  </tr>

  <tr><td height="28" bgcolor="#FBF5EF" style="background-color:#FBF5EF; height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>
</table>
<!-- ===== /MS · CTA BLOCK ===== -->
```

> **Note on the button width:** the VML `roundrect` is fixed at **320px** for Outlook
> (fits the default label `I'LL TELL YOU STRAIGHT →`). If you make the label much
> longer, bump the VML `width:` to match, or the Outlook-only button will clip.
> The button text is **ivory `#FBF5EF` on terracotta `#9C4A3C`** — if you change the
> fill, keep the text/fill contrast ≥4.5:1.

---

## 3) Footer — save as snippet named **"MS · Footer"**

Gold hairline → cord stamp (placeholder img) → identity + tagline → list reason →
Kit `{{ unsubscribe_url }}` / preferences links (deep-terracotta underline) →
CAN-SPAM physical address. All on paper bg. Sender shown is the **brand inbox
`hi@theseerwithin.com`** (Kit broadcasts), not the per-persona app address.

```html
<!-- ===== MS · FOOTER ===== -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td class="ms-gutter" bgcolor="#FBF5EF" style="background-color:#FBF5EF; padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="1" bgcolor="#C9A24B" style="background-color:#C9A24B; line-height:1px; font-size:1px;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <tr><td height="18" bgcolor="#FBF5EF" style="background-color:#FBF5EF; height:18px; line-height:18px; font-size:1px;">&nbsp;</td></tr>

  <tr>
    <td align="center" bgcolor="#FBF5EF" style="background-color:#FBF5EF; padding:0 40px;">
      <!-- EDIT: footer stamp image URL -->
      <img src="https://theseerwithin.com/assets/maren/cord-stamp-48.png" width="48" height="48" alt="Maren Soleil cord mark" style="display:block; width:48px; height:48px; border:0; outline:none;">
    </td>
  </tr>

  <tr><td height="12" bgcolor="#FBF5EF" style="background-color:#FBF5EF; height:12px; line-height:12px; font-size:1px;">&nbsp;</td></tr>

  <tr>
    <td align="center" bgcolor="#FBF5EF" style="background-color:#FBF5EF; padding:0 40px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#6B5550;">
      <div style="font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#6B5550;">
        <strong style="color:#2A2024;">Maren Soleil &middot; The Seer Within</strong><br>
        hi@theseerwithin.com &middot; Felt, daily.
      </div>
      <div style="margin-top:10px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#9A8B82;">
        You're getting this because you joined Maren's list.
      </div>
      <div style="margin-top:10px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#9A8B82;">
        <!-- Kit merge tags: {{ unsubscribe_url }} + preferences URL -->
        <a href="{{ unsubscribe_url }}" style="color:#8A3D34; text-decoration:underline;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="{{ preferences_url }}" style="color:#8A3D34; text-decoration:underline;">Update preferences</a>
      </div>
      <!-- CAN-SPAM physical mailing address (REQUIRED). EDIT: real address. -->
      <div style="margin-top:10px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#9A8B82;">
        The Seer Within, 930 Washington Avenue, Suite 210-109, Miami Beach, FL 33139, USA
      </div>
    </td>
  </tr>

  <tr><td height="28" bgcolor="#FBF5EF" style="background-color:#FBF5EF; height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>
</table>
<!-- ===== /MS · FOOTER ===== -->
```

---

### Kit merge-tag reminder
- `{firstName}` in copy → replace with `{{ subscriber.first_name | default: "friend" }}`
- `{{ unsubscribe_url }}` → Kit auto-fills the unsubscribe link.
- `{{ preferences_url }}` → swap for your actual Kit preferences/profile URL if it
  differs from this token on your plan.
