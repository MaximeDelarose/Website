import { expect, type Page } from '@playwright/test'

export const demoStart = async (page: Page) => {
  await page.goto('./')
  await page.getByTestId('intro-demo').click()
  await expect(page.getByTestId('home-searching')).toBeVisible()
}
export const toProposal = async (page: Page) => {
  await page.getByTestId('find-match').click()
  await expect(page.getByTestId('proposal')).toBeVisible({ timeout: 8000 })
}
export const startEncounter = async (page: Page) => {
  await toProposal(page)
  await page.getByTestId('accept-match').click({ timeout: 15000 })
  await expect(page.getByTestId('tab-encounter')).toBeVisible()
  await expect(page.getByTestId('step-card-0')).toBeVisible()
}
export const answerIntro = async (page: Page) => {
  await page.getByTestId('intro-answer').fill('Un canard en plastique ce matin')
  await page.getByTestId('intro-send').click()
  await expect(page.getByTestId('step-card-1')).toBeVisible()
}
export const playMirror = async (page: Page) => {
  await page.getByTestId('tab-activities').click()
  await page.getByTestId('game-mirror').click()
  await page.getByTestId('mirror-opt-a').click()
  await page.getByTestId('mirror-lock').click()
  await page.getByTestId('mirror-flip').click({ timeout: 15000 })
  await expect(page.getByTestId('mirror-after')).toBeVisible({ timeout: 8000 })
  await page.getByTestId('back').click()
}
export const callAndHangup = async (page: Page) => {
  await page.getByTestId('tab-encounter').click()
  await expect(page.getByTestId('step-card-2')).toBeVisible()
  await page.getByTestId('start-call').click()
  await page.getByTestId('call-start').click()
  await expect(page.getByTestId('call-timer')).toBeVisible({ timeout: 10000 })
  await page.waitForTimeout(6200)
  await page.getByTestId('call-hangup').click()
  await expect(page.getByTestId('call-ended')).toBeVisible()
  await page.getByTestId('call-done').click()
  await expect(page.getByTestId('step-card-3')).toBeVisible()
}
export const toConsent = async (page: Page) => {
  await startEncounter(page); await answerIntro(page); await playMirror(page); await callAndHangup(page)
}
export const noHorizontalOverflow = async (page: Page) => {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(o).toBeLessThanOrEqual(0)
}
