import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStore } from './store';

test('durable transactions roll back every partial write and enforce unique keys', () => {
  const dir=mkdtempSync(join(tmpdir(),'marcus-store-'));const path=join(dir,'fixtures.sqlite');
  let store=new LocalStore(path);
  try {
    store.insert('intakes','one',{name:'Jane'});
    assert.throws(()=>store.transaction(()=>{store.insert('orders','paid',{draw:['cups']});store.insert('intakes','one',{});}));
    assert.equal(store.get('orders','paid'),undefined);
    store.transaction(()=>{store.insert('orders','paid',{draw:['cups']});store.insert('paidByIntake','one','paid');});
    store.close();store=new LocalStore(path);
    assert.deepEqual(store.get('orders','paid'),{draw:['cups']});assert.equal(store.get('paidByIntake','one'),'paid');
    const detached=store.get<any>('orders','paid');detached.draw.push('other');
    assert.deepEqual(store.get('orders','paid'),{draw:['cups']});
    assert.throws(()=>store.update<any>('orders','paid',value=>{value.draw=[];throw new Error('fixture failure');}));
    assert.deepEqual(store.get('orders','paid'),{draw:['cups']});
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
