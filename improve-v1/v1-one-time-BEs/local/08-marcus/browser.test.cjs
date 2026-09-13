const {chromium}=require(process.cwd()+'/node_modules/playwright');
const assert=require('node:assert/strict');
const origin=process.env.MARCUS_TEST_ORIGIN||'http://127.0.0.1:5088';
// The token sheet loads Bodoni Moda + Spectral from the same Google Fonts link the email uses.
// The test ABORTS every off-origin request (nothing leaves the machine) and asserts that the
// fonts hosts are the only ones the page ever tried to reach; the page must render on the
// Georgia fallback (display=swap) exactly as it would for a reader whose phone blocks Google.
// Off-origin hosts the locked pages legitimately reference (fonts, and the same S3 asset host the email uses).
// Every off-origin request is still ABORTED so nothing leaves the machine; only the attempted hosts are checked.
const ALLOWED_OFF_ORIGIN=new Set(['https://fonts.googleapis.com','https://fonts.gstatic.com','https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com']);

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1100,height:950}});
    const errors=[];
    const external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',async response=>{
      if(response.status()>=400)console.log('HTTP',response.status(),response.url(),await response.text());
    });
    await page.route('**/*',route=>{
      const url=route.request().url();
      if(/^https?:/.test(url)&&new URL(url).origin!==origin){external.push(url);return route.abort();}
      return route.continue();
    });
    const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page must fit viewport');
    const tall=async(selector,min=44)=>{const box=await page.locator(selector).boundingBox();assert(box&&box.height>=min,selector+' must be at least '+min+'px tall, was '+(box&&box.height));};
    const bodyPx=async()=>page.evaluate(()=>parseFloat(getComputedStyle(document.body).fontSize));
    const minFontPx=async()=>page.evaluate(()=>Math.min(...[...document.querySelectorAll('main *')].filter(e=>e.textContent.trim()&&getComputedStyle(e).display!=='none').map(e=>parseFloat(getComputedStyle(e).fontSize))));
    const fillCheckout=async({email='reader@example.test',name='Joel Chue',birth='Joel Chue',dob=['3','14','1961']}={})=>{
      await page.locator('#email').fill(email);
      await page.locator('#name-on-card').fill(name);
      await page.locator('#birth-name').fill(birth);
      await page.locator('#dob-month').fill(dob[0]);await page.locator('#dob-day').fill(dob[1]);await page.locator('#dob-year').fill(dob[2]);
    };

    // AWeber handoff fixture -> booking (cards, price, bump, ONE button; no personal fields).
    await page.goto(origin+'/email?edition=healing-v1');
    await page.locator('#to-booking').click();
    assert.equal(new URL(page.url()).pathname,'/booking');
    assert.equal(await page.locator('#same-day').count(),1,'speed bump belongs on booking page');
    assert.equal(await page.locator('#to-checkout').count(),1,'booking page has one button to secure payment');
    assert.equal(await page.locator('#app input:not([type=checkbox])').count(),0,'booking page collects no personal data');
    assert.match(await page.locator('#masthead').innerText(),/Marcus Stone[\s\S]*Order form/i,'masthead nameplate + dateline');
    assert.equal(await page.locator('#masthead .rule-scotch').count(),1);
    assert.equal(await page.locator('#footer .rule-folio').count(),1);
    assert.equal(await page.locator('.up-cards figure.up img').count(),2);
    assert.equal(await page.locator('.down-cards figure.down img').count(),4);
    assert.match(await page.locator('.up-cards figcaption').first().innerText(),/FIG\. I/i,'face-up card carries a FIG. caption');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.up-cards img')).borderTopColor),'rgb(20, 18, 15)','face-up ink frame');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.down-cards img')).borderTopColor),'rgb(196, 185, 161)','face-down hair frame');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#to-checkout')).backgroundColor),'rgb(143, 43, 31)','stamp button is the press red');
    await page.locator('#same-day').check();
    assert.equal(await page.locator('#booking-total').innerText(),'$47.77');
    assert.match(await page.locator('#to-checkout').innerText(),/Continue to secure payment — \$47\.77/);
    await tall('#to-checkout');await tall('.check',56);
    await fits();
    await page.screenshot({path:'/tmp/marcus-local-booking-desktop.png',fullPage:true});
    await page.locator('#to-checkout').click();

    // Checkout stand-in: validation, birth-name guard, then simulated pay.
    await page.locator('#pay').waitFor();
    assert.equal(new URL(page.url()).pathname,'/checkout-sim');
    const intakeId=new URL(page.url()).searchParams.get('intake');
    const intake=(await (await page.request.get(origin+'/api/intake/'+encodeURIComponent(intakeId))).json()).intake;
    assert.deepEqual(Object.keys(intake).sort(),['editionId','editionVersion','id','sameDay'],'intake carries no personal data');
    assert.equal(intake.sameDay,true);
    assert.match(await page.locator('#app').innerText(),/Local stand-in/,'clearly labelled as a stand-in');
    assert(!/stripe/i.test(await page.evaluate(()=>{const c=document.querySelector('#app').cloneNode(true);c.querySelector('.co-notice').remove();return c.innerText})),'no Stripe wording outside the stand-in notice');
    assert.match(await page.locator('#pay').innerText(),/Pay \$47\.77/);
    assert(await page.locator('#masthead').isHidden()&&await page.locator('#footer').isHidden(),'broadsheet chrome hidden on the checkout stand-in');
    await fillCheckout({name:'',birth:'Cher',dob:['3','14','61']});
    await page.locator('#pay').click();
    assert(await page.locator('#name-on-card-error').isVisible(),'per-field error for the name on card');
    assert(await page.locator('#birth-name-error').isVisible(),'per-field error for the birth name');
    assert.match(await page.locator('#dob-month-error').innerText(),/four numbers/,'year needs four digits');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'name-on-card','focus moves to the first bad field');
    assert.equal(await page.locator('#error:visible').count(),0,'client-side problems do not hit the server');
    await fillCheckout({name:'Joël Chue',birth:'Joël Chue'});
    await page.locator('#pay').click();
    await page.locator('#error:visible').waitFor();
    assert.match(await page.locator('#error').innerText(),/personal-card method/);
    assert(await page.locator('#birth-name').isVisible(),'rejected input stays editable');
    await fillCheckout({name:'Joel Chue',birth:'Mary Anne Chue',dob:['3','14','1961']});
    await page.screenshot({path:'/tmp/marcus-local-checkout-desktop.png',fullPage:true});
    await page.locator('#pay').click();

    // Main payment -> bridge -> direct-response audio offer -> thank-you.
    // Ruling 1: the bridge forwards to /upsell by itself after a 7 s countdown. The test never waits
    // for that — it asserts the countdown is there and clicks the plain "continue now" link (#to-upsell).
    await page.locator('#to-upsell').waitFor();
    assert.equal(new URL(page.url()).pathname,'/bridge');
    const orderId=new URL(page.url()).searchParams.get('order');
    assert.match(await page.locator('h1').innerText(),/being prepared/);
    assert.match(await page.locator('#delivery-facts').innerText(),/within 12 hours/);
    assert.equal(await page.locator('.status-box').count(),0,'order facts are ruled paper, not a grey box');
    assert.match(await page.locator('#app').innerText(),/Thank you, Joel\./,'display first name comes from the name on card');
    assert.match(await page.locator('#countdown-line').innerText(),/The next page opens in [1-7] seconds?\./,'visible, plain countdown');
    assert.equal(await page.locator('#to-upsell').evaluate(a=>a.tagName+' '+a.getAttribute('href')),'A /upsell?order='+orderId,'continue now is a real link to the upsell with the order id');
    assert.match(await page.locator('.under').innerText(),/Nothing on the next page changes or delays that order\./);
    const linkBox=await page.locator('#to-upsell').boundingBox(),underBox=await page.locator('.under').boundingBox();
    assert(underBox.y>=linkBox.y+linkBox.height,'the reassurance sits directly under the action');
    assert.match(await page.locator('#masthead').innerText(),/Order confirmed/i);
    await page.screenshot({path:'/tmp/marcus-local-bridge-desktop.png',fullPage:true});
    const readOrder=async()=>(await (await page.request.get(origin+'/api/orders/'+encodeURIComponent(orderId))).json()).order;
    const paid=await readOrder();
    assert(!paid.audio?.purchased);
    assert.equal(paid.displayFirstName,'Joel');assert.equal(paid.fullBirthName,'Mary Anne Chue');assert.equal(paid.dateOfBirth,'1961-03-14');
    assert.equal(paid.draw.personalLens.firstName,'Mary Anne');assert.equal(paid.draw.personalLens.lastName,'Chue');
    assert.equal(await page.locator('#delivery-email').innerText(),paid.deliveryEmail,'delivery email comes from the saved order');
    await page.reload();
    await page.locator('#to-upsell').waitFor();
    assert.match(await page.locator('#countdown').innerText(),/^[67]$/,'refresh restarts only the countdown');
    assert(!(await readOrder()).audio?.purchased,'refresh writes nothing');
    await page.locator('#to-upsell').click();
    assert.equal(new URL(page.url()).pathname,'/upsell');
    assert.match(await page.locator('h1').innerText(),/Don't skip to the answer/);
    assert.equal(await page.locator('.offer-stack li').count(),4);
    assert.match(await page.locator('#audio-yes').innerText(),/add my audio reading for \$17/i);
    assert.match(await page.locator('#audio-no').innerText(),/read it on my own/i);
    assert(!/healing/i.test(await page.locator('#app').innerText()),'upsell is question independent');
    assert.match(await page.locator('#masthead').innerText(),/One addition/i);
    await tall('#audio-yes');await tall('#audio-no');
    assert.equal(await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#audio-no')).fontSize)),17,'decline is 17px');
    await fits();
    await page.screenshot({path:'/tmp/marcus-local-audio-desktop.png',fullPage:true});
    await page.locator('#audio-yes').click();
    await page.locator('#fulfill').waitFor();
    assert.equal(new URL(page.url()).pathname,'/thank-you');
    assert.match(await page.locator('#app').innerText(),/64\.77/);
    assert.match(await page.locator('#masthead').innerText(),/Receipt/i);
    const order=await readOrder();
    assert.equal(order.deliveryHours,12);
    assert.equal(Date.parse(order.dueAt)-Date.parse(order.paidAt),12*3600000);
    assert.match(await page.locator('#written-deadline').innerText(),/within 12 hours/);
    assert.match(await page.locator('#audio-status').innerText(),/separately/);
    await page.locator('#fulfill').click();
    await page.locator('#artifact pre').waitFor();
    assert.match(await page.locator('#artifact').innerText(),/NOT A CUSTOMER READING/);
    const pdfHref=await page.locator('#pdf-link').getAttribute('href');
    const pdf=await page.request.get(origin+pdfHref);
    assert.equal(pdf.status(),200);
    assert.equal(pdf.headers()['content-type'],'application/pdf');
    assert.equal((await pdf.body()).subarray(0,4).toString(),'%PDF');
    await page.screenshot({path:'/tmp/marcus-local-thanks-desktop.png',fullPage:true});

    // Mobile base-order decline path, with the measured floors from review 05.
    await page.setViewportSize({width:390,height:844});
    await page.goto(origin+'/booking?edition=commitment-v1');
    await page.locator('#to-checkout').waitFor();
    assert.equal(await page.locator('.up-cards img').count(),2);
    assert.equal(await page.locator('.down-cards img').count(),4);
    assert.equal(await bodyPx(),18,'body is 18px on phones');
    assert(await minFontPx()>=13,'nothing under 13px on the booking page');
    await tall('#to-checkout');
    await fits();
    await page.screenshot({path:'/tmp/marcus-local-booking-mobile.png',fullPage:true});
    await page.locator('#to-checkout').click();
    await page.locator('#pay').waitFor();
    await fits();
    await fillCheckout();
    await page.screenshot({path:'/tmp/marcus-local-checkout-mobile.png',fullPage:true});
    await page.locator('#pay').click();
    await page.locator('#to-upsell').waitFor();
    assert.equal(await bodyPx(),18,'body is 18px on the bridge page');
    assert(await minFontPx()>=13,'nothing under 13px on the bridge page');
    assert.equal(await page.locator('#countdown-line').count(),1,'the countdown is present on the phone');
    await tall('#to-upsell');
    // The action and the reassurance sit inside the first 390×844 screen. The harness banner does not
    // ship, so its height (plus its bottom margin) is discounted.
    const bannerPx=await page.evaluate(()=>{const b=document.querySelector('.test-banner');return b.getBoundingClientRect().height+parseFloat(getComputedStyle(b).marginBottom);});
    const reassure=await page.locator('.under').boundingBox();
    assert(reassure.y+reassure.height-bannerPx<=844,'reassurance inside the first phone screen, ended at '+Math.round(reassure.y+reassure.height-bannerPx));
    await fits();
    await page.screenshot({path:'/tmp/marcus-local-bridge-mobile.png',fullPage:true});
    await page.locator('#to-upsell').click();
    await page.locator('#audio-no').waitFor();
    assert(!/healing/i.test(await page.locator('#app').innerText()));
    assert(await minFontPx()>=13,'nothing under 13px on the upsell page');
    await tall('#audio-no');
    await fits();
    await page.screenshot({path:'/tmp/marcus-local-audio-mobile.png',fullPage:true});
    await page.locator('#audio-no').click();
    await page.locator('#fulfill').waitFor();
    assert.match(await page.locator('#app').innerText(),/35\.00/);
    assert.match(await page.locator('#written-deadline').innerText(),/within 24 hours/);
    assert.equal(await page.locator('#audio-status').count(),0);
    assert(await minFontPx()>=13,'nothing under 13px on the thank-you page');
    await fits();
    await page.screenshot({path:'/tmp/marcus-local-thanks-mobile.png',fullPage:true});

    // All exported edition images and narrow layouts.
    await page.setViewportSize({width:320,height:740});
    const catalog=await (await page.request.get(origin+'/api/editions')).json();
    for(const {id:editionId} of catalog.editions){
      await page.goto(origin+'/booking?edition='+editionId);
      await page.locator('#to-checkout').waitFor();
      await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
      await fits();
    }
    assert.deepEqual(errors,[]);
    const offOrigin=external.filter(url=>!ALLOWED_OFF_ORIGIN.has(new URL(url).origin));
    assert.deepEqual(offOrigin,[],'no external requests other than the (aborted) Google Fonts and S3 asset links');
    console.log('PASS local UI: AWeber handoff fixture -> booking (cards/price/bump, one button, no personal fields) -> checkout stand-in (validation, birth name, DOB boxes) -> bridge -> audio upsell -> thank-you -> adaptive PDF; accept/decline, 12/24-hour deadlines, masthead datelines, review-05 floors, all edition images, 320/390/1100 widths, no JavaScript errors; '+external.length+' off-origin request(s) (Google Fonts + S3 assets) attempted and aborted, nothing else off-origin.');
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
