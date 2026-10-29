// Run with: node tests/seasonality-engine.test.js
// Synthetic fixtures test the calculation rules; historical EODHD validation is separate.
const assert = require('node:assert/strict');
const {monthlyReturns, summary} = require('../seasonality-engine.js');
const approx = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

const rows = [
  {date:'2023-12-29',adjusted_close:100},
  {date:'2024-01-02',adjusted_close:130},
  {date:'2024-01-31',adjusted_close:110},
  {date:'2024-02-28',adjusted_close:99},
  {date:'2024-02-29',adjusted_close:121},
  {date:'2024-04-30',adjusted_close:242}, // March missing; April must not bridge it
  {date:'2024-05-31',adjusted_close:121},
  {date:'bad-date',adjusted_close:50},
  {date:'2024-06-31',adjusted_close:200}, // invalid calendar date
  {date:'2024-07-31',adjusted_close:-1}
];
const returns = monthlyReturns(rows);
assert.deepEqual(returns.map(x=>[x.year,x.month]), [[2024,1],[2024,2],[2024,5]]);
approx(returns[0].returnPct,10); // December to January; not January first to last
approx(returns[1].returnPct,10);
approx(returns[2].returnPct,-50);
assert.equal(summary(returns,1,5,2024).yearsAvailable,1);
assert.equal(summary(returns,1,5,2024).complete,false);
assert.equal(summary(returns,1,5,2024).winningYears,1);
assert.equal(summary(returns,3,5,2024).averageReturnPct,null);
assert.throws(()=>summary(returns,13,5,2024),RangeError);

// Outlier is never silently discarded from the arithmetic mean.
const sample = [{year:2020,month:11,returnPct:40},{year:2021,month:11,returnPct:2},{year:2022,month:11,returnPct:-3}];
const s = summary(sample,11,3,2022);
assert.equal(s.yearsAvailable,3);
assert.equal(s.winningYears,2);
approx(s.averageReturnPct,13);
assert.equal(s.observations.length,3);
console.log('Seasonality engine synthetic tests passed.');
