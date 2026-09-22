import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  args: ["--start-maximized", "--disable-blink-features=AutomationControlled"],
});

// Login flow events start
const page = await browser.newPage();

// posthog-js drops every capture() when navigator.webdriver is true (its bot filter).
// Chrome sets that flag under automation, so strip it before any app code runs.
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => false });
});

const clickStable = async (selector: string) => {
  const handle = await page.waitForSelector(selector, { visible: true });
  await handle!.evaluate(el => el.scrollIntoView({ block: "center" }));
  await page.locator(selector).setVisibility("visible").click();
};
await page.goto("http://localhost:8080");

const input = page.locator('xpath///input[@placeholder="Enter your email address"]');
await input.fill("learner@example.com");

const button = page.locator('xpath///*[@id="root"]/div/div/div[2]/div/div/div/button');
await button.click();

await page
  .locator('xpath///*[@id="root"]/div/div/div[2]/div/div/div/div[2]/div[1]/input[1]')
  .fill("1");

await page
  .locator('xpath///*[@id="root"]/div/div/div[2]/div/div/div/div[2]/div[1]/input[2]')
  .fill("2");

await page
  .locator('xpath///*[@id="root"]/div/div/div[2]/div/div/div/div[2]/div[1]/input[3]')
  .fill("3");

await page
  .locator('xpath///*[@id="root"]/div/div/div[2]/div/div/div/div[2]/div[1]/input[4]')
  .fill("4");

await page.locator('xpath///*[@id="root"]/div/div/div[2]/div/div/div/button').click();

await clickStable("#agreement_checkbox");

const isChecked = await page.$eval("#agreement_checkbox", el => (el as HTMLInputElement).checked);
if (!isChecked) throw new Error("Agreement checkbox did not get checked");

await clickStable('xpath///input[@id="agreement_checkbox"]/../following-sibling::button');
// Login flow events end

// opening cases
await page
  .locator('xpath///*[@id="root"]/div/div[5]/div[2]/div/div[2]/div[1]/nav/button[2]')
  .click();

await page.locator('xpath///*[@id="root"]/div/div[5]/div[2]/div/div[4]/div/div[1]/div/div').click();

await page
  .locator('xpath///*[@id="root"]/div/div[5]/div[2]/div[1]/div[1]/div[1]/div[1]/button')
  .click();

// opening simulations

await page
  .locator('xpath///*[@id="root"]/div/div[5]/div[2]/div/div[2]/div[1]/nav/button[3]')
  .click();

await page.locator('xpath///*[@id="root"]/div/div[5]/div[2]/div/div[4]/div/div[1]/div').click();

await page.locator('xpath///*[@id="root"]/div/div[5]/div[2]/div/div[1]/button').click();

// opening pathways

await page
  .locator('xpath///*[@id="root"]/div/div[5]/div[2]/div/div[2]/div[1]/nav/button[4]')
  .click();

await page.locator('xpath///*[@id="root"]/div/div[5]/div[2]/div/div[4]/div/div[1]/div').click();

// opening settings

await page.locator('xpath///*[@id="root"]/div/div[1]/div[3]/div/div/div[1]/div/div/div').click();

await page.locator('xpath///*[@id="root"]/div/div[1]/div[3]/div/div[2]/div[5]/button[1]').click();

await clickStable('xpath///*[@id="root"]/div/div[3]/div/div/div[2]/div/button[2]');

// open data policy
await new Promise(res => setTimeout(res, 2000));
await page.locator('xpath///*[@id="root"]/div/div[1]/div[3]/div/div/div[1]/div/div/div').click();

await page.keyboard.down("Meta");
await page.locator('xpath///*[@id="root"]/div/div[1]/div[3]/div/div[2]/div[5]/button[2]').click();
await page.keyboard.up("Meta");

await new Promise(res => setTimeout(res, 2000));
await page.locator('xpath///*[@id="root"]/div/div[1]/div[3]/div/div/div[1]/div/div/div').click();

await page.locator('xpath///*[@id="root"]/div/div[1]/div[2]/div[1]').click();

// expand streak
await page
  .locator('xpath///*[@id="root"]/div/div[6]/div[2]/div/section/div[1]/div/button[1]')
  .click();

// clicking community
await page.locator('xpath///*[@id="root"]/div/div[1]/div[2]/div[2]').click();

await page
  .locator('xpath///*[@id="root"]/div/div[5]/div[2]/div/div[2]/div[1]/div[1]/div/button[2]')
  .click();

// roleplay summary

await page.locator('xpath///*[@id="root"]/div/div[1]/div[2]/div[4]/div').click();

await page
  .locator(
    'xpath///*[@id="root"]/div/div[6]/div[2]/div/div[2]/div/div/table/tbody/tr[1]/td[6]/button',
  )
  .click();

await page
  .locator(
    'xpath///*[@id="root"]/div/div[6]/div[2]/div/div[2]/aside/div[1]/div/div/div[1]/div/div[1]/div/button[2]',
  )
  .click();

await page
  .locator(
    'xpath///*[@id="root"]/div/div[6]/div[2]/div/div[2]/aside/div[2]/div/div/div[2]/div/div/div/div/div/div[1]/button[2]',
  )
  .click();

await clickStable(
  'xpath///*[@id="root"]/div/div[6]/div[2]/div/div[2]/aside/div[2]/div/div/div[2]/div/div/div/div/div/button',
);

await new Promise(res => setTimeout(res, 2000));

await page
  .locator('xpath///*[@id="root"]/div/div[6]/div[2]/div/div[2]/aside/div[1]/span/div/button')
  .click();

// report problem

await page.locator('xpath///*[@id="root"]/div/div[1]/div[2]/div[6]').click();

await page.locator('xpath///*[@id="bug-report-description"]').fill("some complaint");

await clickStable('xpath///*[@id="root"]/div/div[4]/div/div/div[3]/button[2]');

// PostHog batches requests — flush the queue before tearing the browser down,
// otherwise the last few events never leave the page.
await page.evaluate(async () => {
  const ph = (window as unknown as { posthog?: { flush?: () => void } }).posthog;
  ph?.flush?.();
});
await new Promise(res => setTimeout(res, 3000));

await browser.close();
