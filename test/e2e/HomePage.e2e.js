import { ClientFunction, Selector } from 'testcafe';
import { getPageUrl } from './helpers';

const getPageTitle = ClientFunction(() => document.title);
const counterSelector = Selector('[data-tid="counter"]');
const buttonsSelector = Selector('[data-tclass="btn"]');
const clickToCounterLink = (t) => t.click(Selector('a').withExactText('to Counter'));
const incrementButton = buttonsSelector.nth(0);
const decrementButton = buttonsSelector.nth(1);
const oddButton = buttonsSelector.nth(2);
const asyncButton = buttonsSelector.nth(3);
const getCounterText = () => counterSelector().innerText;
const assertNoConsoleErrors = async (t) => {
  const { error } = await t.getBrowserConsoleMessages();
  await t.expect(error).eql([]);
};

fixture`Home Page`.page('../../app/app.html').afterEach(assertNoConsoleErrors);

const assertWindowAndTitle = async (t) => {
  await t.expect(getPageTitle()).eql('StatWrap');
};
test('should open window and contain expected page title', assertWindowAndTitle);

test('should not have any logs in console of main window', assertNoConsoleErrors);

const assertCounterLinkClick = async (t) => {
  await t.click('[data-tid=container] > a').expect(getCounterText()).eql('0');
};
test('should navigate to Counter with click on the "to Counter" link', assertCounterLinkClick);

const assertCounterLink = async (t) => {
  await t.click('a').expect(getPageUrl()).contains('/counter');
};
test('should navigate to /counter', assertCounterLink);

fixture`Counter Tests`
  .page('../../app/app.html')
  .beforeEach(clickToCounterLink)
  .afterEach(assertNoConsoleErrors);

const assertIncrementButton = async (t) => {
  await t.click(incrementButton).expect(getCounterText()).eql('1');
};
test('should display updated count after the increment button click', assertIncrementButton);

const assertDecrementButton = async (t) => {
  await t.click(decrementButton).expect(getCounterText()).eql('-1');
};
test('should display updated count after the decrement button click', assertDecrementButton);

const assertOddButton = async (t) => {
  await t.click(oddButton).expect(getCounterText()).eql('0');
};
test('should not change even counter if odd button clicked', assertOddButton);

const assertOddButton2 = async (t) => {
  await t.click(incrementButton).click(oddButton).expect(getCounterText()).eql('2');
};
test('should change odd counter if odd button clicked', assertOddButton2);

const assertAsyncButton = async (t) => {
  await t.click(asyncButton).expect(getCounterText()).eql('0').expect(getCounterText()).eql('1');
};
test('should change if async button clicked and a second later', assertAsyncButton);

const assertBackButton = async (t) => {
  await t
    .click('[data-tid="backButton"] > a')
    .expect(Selector('[data-tid="container"]').visible)
    .ok();
};
test('should back to home if back button clicked', assertBackButton);
