const {chromium}=require(process.cwd()+'/node_modules/playwright');
const assert=require('node:assert/strict');
const origin=process.env.MARCUS_TEST_ORIGIN||'http://127.0.0.1:5088';

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
    page.on('request',request=>{
      if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==origin)external.push(request.url());
    });
    const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page must fit viewport');

    // AWeber handoff fixture -> booking with bump and payment on one page.
    await page.goto(origin+'/email?edition=healing-v1');
    await page.locator('#to-booking').click();
    assert.equal(new URL(page.url()).pathname,'/booking');
    assert.equal(await page.locator('#same-day').count(),1,'speed bump belongs on booking page');
    assert.equal(await page.locator('#pay').count(),1,'booking page owns the payment action');
    await page.locator('#first-name').fill('   ');
    await page.locator('#last-name').fill('Tan');
    await page.locator('#pay').click();
    await page.locator('#error:visible').waitFor();
    assert(await page.locator('#first-name').isVisible(),'rejected input stays editable');

    await page.locator('#first-name').fill('Joël');
    await page.locator('#last-name').fill('O’Connor');
    await page.locator('#same-day').check();
    assert.equal(await page.locator('#booking-total').innerText(),'$47.77');
    assert.match(await page.locator('#pay').innerText(),/47\.77/);
    await page.screenshot({path:'/tmp/marcus-local-booking-desktop.png',fullPage:true});
    await page.locator('#pay').click();
    await page.locator('#error:visible').waitFor();
    assert.match(await page.locator('#error').innerText(),/personal-card method/);
    await page.locator('#first-name').fill('Joel');
    await page.locator('#last-name').fill('Chue');
    await page.locator('#pay').click();

    // Main payment -> bridge -> direct-response audio offer -> thank-you.
    await page.locator('#to-upsell').waitFor();
    assert.equal(new URL(page.url()).pathname,'/bridge');
    assert.match(await page.locator('h1').innerText(),/being prepared/);
    assert.match(await page.locator('.status-box').innerText(),/within 12 hours/);
    await page.screenshot({path:'/tmp/marcus-local-bridge-desktop.png',fullPage:true});
    const orderId=new URL(page.url()).searchParams.get('order');
    const readOrder=async()=>(await (await page.request.get(origin+'/api/orders/'+encodeURIComponent(orderId))).json()).order;
    assert(!(await readOrder()).audio?.purchased);
    await page.reload();
    await page.locator('#to-upsell').waitFor();
    await page.locator('#to-upsell').click();
    assert.equal(new URL(page.url()).pathname,'/upsell');
    assert.match(await page.locator('h1').innerText(),/Don't skip to the answer/);
    assert.equal(await page.locator('.offer-stack li').count(),4);
    assert.match(await page.locator('#audio-yes').innerText(),/add my audio reading for \$17/i);
    assert.match(await page.locator('#audio-no').innerText(),/read it on my own/i);
    assert(!/healing/i.test(await page.locator('#app').innerText()),'upsell is question independent');
    await fits();
    await page.screenshot({path:'/tmp/marcus-local-audio-desktop.png',fullPage:true});
    await page.locator('#audio-yes').click();
    await page.locator('#fulfill').waitFor();
    assert.equal(new URL(page.url()).pathname,'/thank-you');
    assert.match(await page.locator('#app').innerText(),/64\.77/);
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

    // Mobile base-order decline path.
    await page.setViewportSize({width:390,height:844});
    await page.goto(origin+'/booking?edition=commitment-v1');
    await page.locator('#first-name').waitFor();
    assert.equal(await page.locator('.up-cards img').count(),2);
    assert.equal(await page.locator('.down-cards img').count(),4);
    await page.locator('#first-name').fill('Joel');
    await page.locator('#last-name').fill('Chue');
    await page.screenshot({path:'/tmp/marcus-local-booking-mobile.png',fullPage:true});
    await page.locator('#pay').click();
    await page.locator('#to-upsell').click();
    await page.locator('#audio-no').waitFor();
    assert(!/healing/i.test(await page.locator('#app').innerText()));
    await fits();
    await page.screenshot({path:'/tmp/marcus-local-audio-mobile.png',fullPage:true});
    await page.locator('#audio-no').click();
    await page.locator('#fulfill').waitFor();
    assert.match(await page.locator('#app').innerText(),/35\.00/);
    assert.match(await page.locator('#written-deadline').innerText(),/within 24 hours/);
    assert.equal(await page.locator('#audio-status').count(),0);
    await fits();

    // All exported edition images and narrow layouts.
    await page.setViewportSize({width:320,height:740});
    const catalog=await (await page.request.get(origin+'/api/editions')).json();
    for(const {id:editionId} of catalog.editions){
      await page.goto(origin+'/booking?edition='+editionId);
      await page.locator('#first-name').waitFor();
      await page.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth>0));
      await fits();
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(external,[]);
    console.log('PASS local UI: AWeber handoff fixture -> booking with bump/payment -> bridge -> audio upsell -> thank-you -> adaptive PDF; accept/decline, 12/24-hour deadlines, all edition images, 320/390/1100 widths, no external requests or JavaScript errors.');
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
