const fs = require('fs');
const assert = require('assert');

// Load script.js and extract class definition
const scriptCode = fs.readFileSync('script.js', 'utf8');
const classCode = scriptCode.split('document.addEventListener')[0];
eval(classCode + '\nglobalThis.CCValidator = CCValidator;');

const validator = new CCValidator();

// Test cases
const sampleCards = [
  '374355122997139|06|2033|0348',
  '4472270104413398|10|2029|609',
  '4049460078621134|06|2029|812',
  '5156769986523117|02|2030|442',
  '4100390265639605|11|2029|976',
  '5290970018676439|07|2027|471',
  '374355129230039|01|32|3267',
  '4628450066332033|10|28|227',
  '4616994834389191|05|2029|234',
  '4217832026702933|03|27|005'
];

console.log("Testing determinism of simulateStatus...");

sampleCards.forEach(card => {
  const status1 = validator.simulateStatus(card);
  const status2 = validator.simulateStatus(card);
  const status3 = validator.simulateStatus(card);

  assert.strictEqual(status1, status2, `Status for ${card} is not deterministic!`);
  assert.strictEqual(status2, status3, `Status for ${card} is not deterministic!`);
});

console.log("All sample cards produced consistent deterministic statuses across multiple calls.");

// Test batch processing
(async () => {
  let results1 = [];
  let results2 = [];

  const v1 = new CCValidator();
  await v1.processBatch(sampleCards, () => {}, res => results1.push(res));

  const v2 = new CCValidator();
  await v2.processBatch(sampleCards, () => {}, res => results2.push(res));

  assert.deepStrictEqual(results1, results2, "Batch results were not identical!");
  console.log("Batch processing is 100% deterministic and predictable!");
})();
