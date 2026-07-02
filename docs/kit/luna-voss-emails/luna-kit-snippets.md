# Luna Voss — Kit Reusable Snippets

Three standalone HTML blocks extracted from the email templates so you can save
each as a Kit **reusable snippet** and drop it into any broadcast/sequence email.

How to save a snippet in Kit:
1. In the email editor, add an **HTML block** (or use the snippet manager if your
   plan exposes it).
2. Paste one block below.
3. Save it as a snippet with the exact name noted above each block.
4. Reuse by inserting the snippet; edit only the `EDIT:` regions per send.

All colors are inline (dark-mode safe). All links use the `/luna` pre-login
lander with UTMs — change `utm_content=LV-XX` per send.

`{{BASE_URL}}` placeholder = `https://theseerwithin.com` (already baked into hrefs;
swap that domain portion only if you migrate domains).

---

## 1) Masthead — save as snippet named **"LV · Masthead"**

Ink band, live-text wordmark + brass tagline, constellation watermark (degrades),
brass hairline with center sparkle, and a 28px spacer. Live text only — never an
image for the wordmark.

```html
<!-- ===== LV · MASTHEAD ===== -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" bgcolor="#1C2230" background="https://theseerwithin.com/assets/luna/constellation-watermark-600x88.png"
        style="background-color:#1C2230; background-image:url('https://theseerwithin.com/assets/luna/constellation-watermark-600x88.png'); background-position:center; background-repeat:no-repeat; padding:24px 24px 20px 24px;">
      <!-- Luna avatar — web-optimized JPEG (150px asset, shown at 72px), round w/ brass ring. Host at {{BASE_URL}}/assets/luna/luna-avatar.jpg -->
      <img src="https://theseerwithin.com/assets/luna/luna-avatar.jpg" width="72" height="72" alt="Luna Voss, your astrologer" style="display:block; margin:0 auto 12px auto; width:72px; height:72px; border-radius:50%; border:2px solid #B6863C; outline:none;">
      <div style="margin:0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:26px; line-height:30px; font-weight:600; letter-spacing:0.5px; color:#FBF7F0;">
        LUNA VOSS
      </div>
      <div style="margin:6px 0 0 0; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:11px; line-height:14px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#B6863C;">
        Your Natal Chart, Decoded.
      </div>
    </td>
  </tr>
  <tr>
    <td bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td height="1" bgcolor="#B6863C" style="background-color:#B6863C; line-height:1px; font-size:1px;">&nbsp;</td>
          <td width="22" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; font-family:'Inter',Helvetica,Arial,sans-serif; font-size:11px; line-height:11px; color:#B6863C; padding:0 4px;">&#10022;</td>
          <td height="1" bgcolor="#B6863C" style="background-color:#B6863C; line-height:1px; font-size:1px;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td height="28" bgcolor="#FBF7F0" style="background-color:#FBF7F0; height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>
</table>
<!-- ===== /LV · MASTHEAD ===== -->
```

---

## 2) CTA Block — save as snippet named **"LV · CTA"**

The conversion unit. Identical across all 3 templates. Order: 24px spacer →
`{{CHAT_BLURB}}` → 18px → bulletproof button (VML for Outlook) → 10px → italic
friction line → 28px. Button href is the `/luna` lander; edit `utm_content=LV-XX`
per send and rotate the friction line.

```html
<!-- ===== LV · CTA BLOCK ===== -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td height="24" bgcolor="#FBF7F0" style="background-color:#FBF7F0; height:24px; line-height:24px; font-size:1px;">&nbsp;</td></tr>

  <!-- EDIT: {{CHAT_BLURB}} (Inter 16/26, ink, centered, <=2 lines) -->
  <tr>
    <td class="lv-gutter" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:26px; color:#1C2230;">
      Don't guess which house it hits. I'll read it with you, live, in plain English.
    </td>
  </tr>

  <tr><td height="18" bgcolor="#FBF7F0" style="background-color:#FBF7F0; height:18px; line-height:18px; font-size:1px;">&nbsp;</td></tr>

  <!-- BULLETPROOF BUTTON -->
  <tr>
    <td class="lv-btn-td" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://theseerwithin.com/luna?utm_source=kit&amp;utm_medium=email&amp;utm_campaign=luna-daily&amp;utm_content=LV-XX" style="height:54px;v-text-anchor:middle;width:300px;" arcsize="15%" stroke="f" fillcolor="#C9963F">
        <w:anchorlock/>
        <center style="color:#1C2230;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.5px;">READ MY CHART LIVE &#8594;</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <!-- EDIT: href utm_content=LV-XX  |  EDIT: button label -->
      <table role="presentation" class="lv-btn-a" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr>
          <td align="center" bgcolor="#C9963F" style="background-color:#C9963F; border-radius:8px;">
            <a href="https://theseerwithin.com/luna?utm_source=kit&amp;utm_medium=email&amp;utm_campaign=luna-daily&amp;utm_content=LV-XX"
               style="display:inline-block; padding:16px 34px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; letter-spacing:0.5px; color:#1C2230; text-decoration:none; border-radius:8px;">
              READ MY CHART LIVE &#8594;
            </a>
          </td>
        </tr>
      </table>
      <!--<![endif]-->
    </td>
  </tr>

  <tr><td height="10" bgcolor="#FBF7F0" style="background-color:#FBF7F0; height:10px; line-height:10px; font-size:1px;">&nbsp;</td></tr>

  <!-- EDIT: friction line (rotate per send). Variants:
       A) "3 free minutes, no card — just talk to me like you'd text a friend."
       B) "First 3 minutes are on me. No card, no catch."
       C) "No card needed. Ask me anything for 3 free minutes."
       D) "Takes 30 seconds to start. 3 minutes free, no card." -->
  <tr>
    <td class="lv-gutter" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
      <span style="font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-style:italic; font-size:14px; line-height:20px; color:#3A4255;">
        3 free minutes, no card &mdash; just talk to me like you'd text a friend.
      </span>
    </td>
  </tr>

  <tr><td height="28" bgcolor="#FBF7F0" style="background-color:#FBF7F0; height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>
</table>
<!-- ===== /LV · CTA BLOCK ===== -->
```

> **Note on the button width:** the VML `roundrect` is fixed at 300px for Outlook
> (fits the default label). If you make the label much longer, bump the VML
> `width:` to match, or the Outlook-only button will clip.

---

## 3) Footer — save as snippet named **"LV · Footer"**

Brass hairline → natal-wheel stamp (placeholder img) → identity + tagline →
list reason → Kit `{{ unsubscribe_url }}` / preferences links (brass-deep
underline) → CAN-SPAM physical address. All on paper bg.

```html
<!-- ===== LV · FOOTER ===== -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td class="lv-gutter" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="1" bgcolor="#B6863C" style="background-color:#B6863C; line-height:1px; font-size:1px;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <tr><td height="18" bgcolor="#FBF7F0" style="background-color:#FBF7F0; height:18px; line-height:18px; font-size:1px;">&nbsp;</td></tr>

  <tr>
    <td align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
      <!-- EDIT: footer stamp image URL -->
      <img src="https://theseerwithin.com/assets/luna/natal-wheel-stamp-48.png" width="48" height="48" alt="Luna Voss natal-wheel mark" style="display:block; width:48px; height:48px; border:0; outline:none;">
    </td>
  </tr>

  <tr><td height="12" bgcolor="#FBF7F0" style="background-color:#FBF7F0; height:12px; line-height:12px; font-size:1px;">&nbsp;</td></tr>

  <tr>
    <td align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#3A4255;">
      <div style="font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#3A4255;">
        <strong style="color:#1C2230;">Luna Voss &middot; The Seer Within</strong><br>
        hi@theseerwithin.com &middot; Decoded daily.
      </div>
      <div style="margin-top:10px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#8A8475;">
        You're getting this because you joined Luna's list.
      </div>
      <div style="margin-top:10px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#8A8475;">
        <!-- Kit merge tags: {{ unsubscribe_url }} + preferences URL -->
        <a href="{{ unsubscribe_url }}" style="color:#8A6326; text-decoration:underline;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="{{ preferences_url }}" style="color:#8A6326; text-decoration:underline;">Update preferences</a>
      </div>
      <!-- CAN-SPAM physical mailing address (REQUIRED). EDIT: real address. -->
      <div style="margin-top:10px; font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#8A8475;">
        The Seer Within, 930 Washington Avenue, Suite 210-109, Miami Beach, FL 33139, USA
      </div>
    </td>
  </tr>

  <tr><td height="28" bgcolor="#FBF7F0" style="background-color:#FBF7F0; height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>
</table>
<!-- ===== /LV · FOOTER ===== -->
```

---

### Kit merge-tag reminder
- `{firstName}` in copy → replace with `{{ subscriber.first_name | default: "friend" }}`
- `{{ unsubscribe_url }}` → Kit auto-fills the unsubscribe link.
- `{{ preferences_url }}` → swap for your actual Kit preferences/profile URL if it
  differs from this token on your plan.
