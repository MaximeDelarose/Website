// Vérification RÉELLE du système de mise à jour : on déploie deux builds successifs (dist/ servi par `vite preview`)
// et on observe le service worker, la bannière, le report pendant une activité, et la conservation des données.
import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { demoStart, startEncounter } from './helpers'

const deploy = (id: string) => execSync(process.env.DEPLOY_CMD ?? 'npm run build', { env: { ...process.env, ADEUX_BUILD_ID: id }, stdio: 'pipe' })
test.use({ serviceWorkers: 'allow' })
test.setTimeout(240_000)

test('mise à jour automatique : détection → bannière → application → données conservées', async ({ page, context }) => {
  deploy('vtest-1')
  await demoStart(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  const cachesV1 = await page.evaluate(() => caches.keys())
  expect(cachesV1).toContain('adeux-static-vtest-1')

  // Hors ligne : l'application installée démarre quand même (pré-cache)
  await context.setOffline(true); await page.reload()
  await expect(page.getByTestId('home-searching')).toBeVisible(); await context.setOffline(false)

  // Une donnée de la personne, à retrouver après la mise à jour
  await startEncounter(page)
  await page.getByTestId('tab-profile').click()
  await expect(page.getByText('Build vtest-1')).toBeVisible()
  await expect(page.getByTestId('update-banner')).toHaveCount(0)

  // Déploiement d'une nouvelle version, pendant que l'application est ouverte
  deploy('vtest-2')
  // Pendant une activité : la mise à jour est détectée mais JAMAIS proposée/appliquée
  await page.getByTestId('tab-activities').click(); await page.getByTestId('game-mirror').click()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r?.waiting)), { timeout: 20000 }).toBe(true)
  await page.waitForTimeout(800)
  await expect(page.getByTestId('update-banner')).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).__rl ?? 'no-reload')).toBe('no-reload')
  // L'activité terminée : la bannière discrète apparaît
  await page.getByTestId('back').click()
  await expect(page.getByTestId('update-banner')).toBeVisible()
  await expect(page.getByTestId('update-banner')).toContainText('Une nouvelle version est disponible')
  // Appliquer
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), page.getByTestId('update-apply').click()])
  await expect(page.getByTestId('tab-profile')).toBeVisible({ timeout: 15000 })
  await page.getByTestId('tab-profile').click()
  await expect(page.getByText('Build vtest-2')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('update-banner')).toHaveCount(0)
  // Données conservées : profil et rencontre en cours
  await expect(page.getByTestId('profile-name')).toHaveText('Camille')
  await page.getByTestId('tab-encounter').click()
  await expect(page.getByTestId('enc-partner')).toHaveText('Noa')
  // Plus aucun ancien cache
  const cachesV2 = await page.evaluate(() => caches.keys())
  expect(cachesV2.filter((k) => k.startsWith('adeux-static-'))).toEqual(['adeux-static-vtest-2'])
  deploy('') // restaure un build normal
})
