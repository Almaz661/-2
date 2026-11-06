import { getLocalDateString, parseNaturalDate, getDaysUntilBirthday } from '../src/utils/dateUtils';
import { splitOutsideBrackets, parseShoppingInput } from '../src/utils/shoppingParser';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

console.log('--- 1. Testing dateUtils.getLocalDateString ---');
const today = new Date();
const localToday = getLocalDateString(today);
assert(/^\d{4}-\d{2}-\d{2}$/.test(localToday), `Formatted local date is YYYY-MM-DD (${localToday})`);

console.log('\n--- 2. Testing dateUtils.parseNaturalDate ---');
const r1 = parseNaturalDate('напомнить мне 5 декабря день рождения двойняшек в 9-00');
assert(r1 !== null, 'Found result for birthday with date and time');
assert(r1?.isBirthday === true, 'isBirthday is true');
assert(r1?.recurrence === 'yearly', 'recurrence is yearly');
assert(r1?.date.includes('-12-05') === true, 'Target date is December 5');
assert(r1?.time === '09:00', 'Time is 09:00');
assert(r1?.cleanText.includes('День рождения двойняшек') === true, `Title is cleaned: "${r1?.cleanText}"`);

const r2 = parseNaturalDate('Помыть окна 10 января');
assert(r2 !== null, 'Found result for task with date');
assert(r2?.date.includes('-01-10') === true, 'Target date is January 10');
assert(r2?.isBirthday === false, 'Not a birthday');

const r3 = parseNaturalDate('встреча завтра в 14:30');
assert(r3 !== null, 'Found result for tomorrow with time');
assert(r3?.time === '14:30', 'Time is 14:30');

const r4 = parseNaturalDate('купить фильтры послезавтра');
assert(r4 !== null, 'Found result for day after tomorrow');

console.log('\n--- 3. Testing dateUtils.getDaysUntilBirthday ---');
const bdayResult = getDaysUntilBirthday('1990-12-05');
assert(bdayResult.daysLeft >= 0 && bdayResult.daysLeft <= 366, `Days left is within valid year range (${bdayResult.daysLeft})`);
assert(bdayResult.nextDate.includes('-12-05'), `Next occurrence preserves MM-DD (${bdayResult.nextDate})`);

console.log('\n--- 4. Testing shoppingParser.splitOutsideBrackets ---');
const inputWithParentheses = 'Молоко 3.2%, Нурофен (Ибупрофен, 100 мг), Хлеб';
const chunks = splitOutsideBrackets(inputWithParentheses);
assert(chunks.length === 3, `Preserved parenthesized item as one chunk (got ${chunks.length} chunks)`);
assert(chunks[1].includes('Нурофен (Ибупрофен, 100 мг)'), `Item 2 contains full parentheses content: "${chunks[1]}"`);

const parsedItems = parseShoppingInput(inputWithParentheses);
assert(parsedItems.length === 3, `Parsed into 3 distinct items (got ${parsedItems.length})`);
assert(parsedItems.some(i => i.title.includes('Нурофен (Ибупрофен, 100 мг)')), 'Shopping item has complete title with dosage');

console.log('\n========================================');
console.log(`TOTAL: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
