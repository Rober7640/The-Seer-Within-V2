import type { Card, Edition } from './contracts';
import fixture from './editions.json';
const majors = ['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World'];
const slug = (s: string) => s.toLowerCase().replace(/^the /,'').replaceAll(' ','-');
export const deck: Card[] = [...majors, ...['Wands','Cups','Swords','Pentacles'].flatMap(suit => ['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'].map(rank => `${rank} of ${suit}`))].map(name => ({id:slug(name),name,image:`/api/assets/${slug(name)}`}));
// Generated from the daily builder + original markdown; never publish these local fixtures.
if (fixture.publicationScope !== 'local-fixture-only') throw new Error('Unexpected edition fixture scope');
export const editions = fixture.editions as Edition[];
