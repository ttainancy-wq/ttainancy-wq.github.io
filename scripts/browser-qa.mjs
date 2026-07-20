import { chromium } from 'playwright-core'

const baseUrl = 'http://127.0.0.1:4173/'
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'ipad-landscape', width: 1024, height: 768 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const results = []

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport })
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`)
  })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.screenshot({
    path: `/private/tmp/mia-qa-${viewport.name}-home.png`,
    fullPage: true,
  })

  const home = await page.evaluate(() => ({
    title: document.title,
    width: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    books: [...document.querySelectorAll('.book-card h3')].map((node) => node.textContent?.trim()),
    skillCards: document.querySelectorAll('.skill-grid > button').length,
    minButtonHeight: Math.min(
      ...[...document.querySelectorAll('button')]
        .map((node) => node.getBoundingClientRect().height)
        .filter((height) => height > 0),
    ),
  }))

  await page.locator('.book-card button').first().click()
  await page.waitForSelector('.book-learning')
  const bookPage = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    stages: document.querySelectorAll('.stage-map button').length,
    exitVisible: Boolean(document.querySelector('.learning-header > button')),
    repeatVisible: Boolean(document.querySelector('.learning-header > button:last-child')),
  }))
  await page.screenshot({
    path: `/private/tmp/mia-qa-${viewport.name}-book.png`,
    fullPage: true,
  })

  await page.locator('.complete-stage-button').click()
  await page.waitForSelector('.reward-overlay')
  const stageReward = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    flowersAndStars: document.querySelectorAll('.celebration-field i').length,
    title: document.querySelector('.reward-overlay h2')?.textContent?.trim(),
    hasReplayShower: [...document.querySelectorAll('.reward-actions button')]
      .some((node) => node.textContent?.includes('再来一场星星雨')),
    hasContinue: [...document.querySelectorAll('.reward-actions button')]
      .some((node) => node.textContent?.includes('进入第 2 阶段')),
  }))
  await page.screenshot({
    path: `/private/tmp/mia-qa-${viewport.name}-reward.png`,
    fullPage: true,
  })
  await page.locator('.reward-continue').click()
  await page.waitForSelector('.reward-overlay', { state: 'detached' })

  await page.goto(`${baseUrl}#/parent`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Book Studio/ }).click()
  await page.waitForSelector('.book-studio')
  const studio = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasCreate: [...document.querySelectorAll('button')].some((node) => node.textContent?.includes('创建新绘本')),
    hasImport: [...document.querySelectorAll('button')].some((node) => node.textContent?.includes('导入 JSON')),
    hasPublish: [...document.querySelectorAll('button')].some((node) => node.textContent?.includes('发布')),
  }))

  await page.evaluate(() => {
    const progress = {
      schemaVersion: 4,
      stars: 20,
      stickers: [],
      learnedBookIds: ['brown-bear', 'rain-rain-go-away', 'there-is-thunder'],
      words: {},
      patterns: {},
      books: {},
      daily: [],
      difficultWords: ['rainy'],
    }
    localStorage.setItem('forest-english-progress-v4', JSON.stringify(progress))
  })
  await page.goto(`${baseUrl}#/skills/listening`, { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.listening-lab')
  const listening = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    listeningModes: document.querySelectorAll('.listening-mode-tabs button').length,
    choices: document.querySelectorAll('.training-question .answer-grid button').length,
    hasSenseBridge: Boolean(document.querySelector('.sense-bridge')),
    senseChoices: document.querySelectorAll('.sense-choices button').length,
    containsInjectedLocation: /\b(near|behind|beside)\b/i.test(document.querySelector('.skills-content')?.textContent ?? ''),
  }))
  await page.screenshot({
    path: `/private/tmp/mia-qa-${viewport.name}-sense-bridge.png`,
    fullPage: true,
  })

  results.push({
    viewport,
    home,
    bookPage,
    stageReward,
    studio,
    listening,
    errors,
    passed:
      home.width <= home.clientWidth + 1 &&
      bookPage.width <= bookPage.clientWidth + 1 &&
      stageReward.width <= stageReward.clientWidth + 1 &&
      studio.width <= studio.clientWidth + 1 &&
      listening.width <= listening.clientWidth + 1 &&
      home.books.join('|') === 'Brown Bear|Rain Rain Go Away|There Is Thunder' &&
      home.skillCards === 5 &&
      bookPage.stages === 6 &&
      stageReward.flowersAndStars === 84 &&
      stageReward.title === 'Stage 1 Complete!' &&
      stageReward.hasReplayShower &&
      stageReward.hasContinue &&
      studio.hasCreate &&
      studio.hasImport &&
      studio.hasPublish &&
      listening.listeningModes === 7 &&
      listening.hasSenseBridge &&
      listening.senseChoices === 2 &&
      !listening.containsInjectedLocation &&
      errors.length === 0,
  })

  await page.close()
}

await browser.close()

console.log(JSON.stringify(results, null, 2))
if (results.some((result) => !result.passed)) process.exitCode = 1
