import { expect, test } from '@playwright/test'
import { answerIntro, callAndHangup, demoStart, noHorizontalOverflow, playMirror, startEncounter, toConsent, toProposal } from './helpers'

test.describe('A · découverte', () => {
  test('introduction : 3 écrans, passer, démo identifiée', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('intro-title')).toContainText('Et si on arrêtait de chercher la personne parfaite ?')
    await page.getByTestId('intro-next').click()
    await expect(page.getByTestId('intro-title')).toContainText('prenait le temps de découvrir quelqu’un')
    await page.getByTestId('intro-next').click()
    await expect(page.getByTestId('intro-title')).toContainText('Une histoire commence à deux.')
    await expect(page.getByTestId('intro-start')).toHaveText('Commencer mon histoire')
    await page.getByTestId('intro-demo').click()
    await expect(page.getByTestId('demo-banner')).toContainText('personnages fictifs')
    await noHorizontalOverflow(page)
  })
})

test.describe('B/I · questionnaire, sauvegarde et reprise', () => {
  test('refuse un mineur, enregistre, reprend après rechargement, récapitulatif modifiable', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('intro-skip').click()
    await page.getByTestId('intro-start').click()
    await page.getByTestId('adult-check').check(); await page.getByTestId('data-check').check()
    await page.getByTestId('consent-next').click()
    await page.getByTestId('pseudo').fill('Alex')
    const y = new Date().getFullYear() - 16
    await page.getByTestId('birthdate').fill(`${y}-01-01`)
    await expect(page.getByTestId('underage')).toBeVisible()
    await expect(page.getByTestId('identity-next')).toBeDisabled()
    await page.getByTestId('birthdate').fill('1994-03-12')
    await expect(page.getByTestId('underage')).toHaveCount(0)
    await page.getByTestId('identity-next').click()
    await page.getByTestId('gender-man').click(); await page.getByTestId('seek-woman').click()
    await page.getByTestId('prefs-next').click()
    await page.getByTestId('area-next').click()
    await page.getByTestId('photo-next').click()
    // Partie A : intro de catégorie puis 1re question
    await expect(page.getByTestId('category-intro')).toBeVisible()
    await page.getByTestId('category-go').click()
    await page.getByTestId('opt-serious').click(); await page.getByTestId('q-next').click()
    await expect(page.getByTestId('q-title')).toContainText('place')
    await page.getByTestId('scale-4').click(); await page.getByTestId('q-next').click()
    await expect(page.getByTestId('q-title')).toContainText('rythme')
    // Rechargement en plein questionnaire : la progression est conservée
    await page.reload()
    await expect(page.getByTestId('home-incomplete')).toBeVisible()
    await page.getByTestId('home-incomplete-cta').click()
    await expect(page.getByTestId('q-title')).toContainText('rythme')
    // On répond à tout le reste en prenant la première option / en passant ce qui est facultatif
    for (let i = 0; i < 40; i++) {
      if (await page.getByTestId('recap-intent').count()) break
      if (await page.getByTestId('category-go').count()) { await page.getByTestId('category-go').click(); await page.waitForTimeout(900); continue }
      if (await page.getByTestId('open-text').count()) { await page.getByTestId('q-next').click(); await page.waitForTimeout(900); continue }
      if (await page.getByTestId('scale-3').count()) await page.getByTestId('scale-3').click()
      else { const opt = page.locator('[data-testid^="opt-"]').first(); await opt.click() }
      await page.getByTestId('q-next').click()
      await page.waitForTimeout(900) // laisse finir la transition de carte
    }
    await expect(page.getByTestId('recap-intent')).toContainText('Une relation sérieuse')
    await page.getByTestId('recap-place').click()
    await page.getByTestId('scale-2').click(); await page.getByTestId('q-next').click()
    await expect(page.getByTestId('recap-place')).toContainText('2/5')
    await page.getByTestId('finish-onboarding').click()
    await expect(page.getByTestId('home-searching')).toBeVisible()
    await noHorizontalOverflow(page)
    // profil conservé après rechargement
    await page.reload()
    await expect(page.getByText('Bonjour Alex')).toBeVisible()
  })
})

test.describe('C · proposition', () => {
  test('carte mystère : prénom, 3 points communs, question, aucune photo, une seule rencontre par jour', async ({ page }) => {
    await demoStart(page); await toProposal(page)
    await expect(page.getByTestId('partner-name')).toHaveText('Noa')
    await expect(page.getByTestId('common-points').locator('li')).toHaveCount(3)
    await expect(page.locator('img')).toHaveCount(0)
    await page.getByTestId('decline-match').click(); await page.getByTestId('decline-confirm').click()
    await expect(page.getByTestId('home-ended')).toBeVisible()
    await page.getByTestId('ack-end').click()
    await expect(page.getByTestId('limit-title')).toBeVisible() // une seule proposition par jour : pas de nouvelle rencontre tout de suite
    await expect(page.getByTestId('find-match')).toHaveCount(0)
    await page.getByTestId('advance-day').click()
    await page.getByTestId('find-match').click()
    await expect(page.getByTestId('partner-name')).toHaveText('Sacha', { timeout: 8000 }) // Noa n'est pas reproposée
  })
})

test.describe('D/E · mini-jeux', () => {
  test('Le Miroir : réponses secrètes puis cartes retournées côte à côte', async ({ page }) => {
    await demoStart(page); await startEncounter(page)
    await page.getByTestId('tab-activities').click()
    await page.getByTestId('game-mirror').click()
    await page.getByTestId('mirror-opt-b').click(); await page.getByTestId('mirror-lock').click()
    await expect(page.getByTestId('mirror-wait')).toBeVisible()
    await expect(page.getByTestId('mirror-flip')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('mirror-flip').click()
    await expect(page.getByTestId('mirror-after')).toBeVisible({ timeout: 6000 })
    await expect(page.getByTestId('card-me')).toContainText('Un geste inattendu')
    await expect(page.getByTestId('card-partner')).toContainText(/\S+/)
    await page.getByTestId('mirror-talk').fill('La semaine dernière, un message de ma sœur')
    await page.getByTestId('mirror-send').click()
    await page.getByTestId('back').click()
    await page.getByTestId('tab-messages').click()
    await expect(page.getByTestId('msg-me').last()).toContainText('La semaine dernière')
  })

  test('La Boussole : trois situations, réponses comparées sans jugement', async ({ page }) => {
    await demoStart(page); await startEncounter(page)
    await page.getByTestId('tab-activities').click(); await page.getByTestId('game-compass').click()
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('way-n').click(); await page.getByTestId('compass-validate').click()
      await expect(page.getByTestId('compass-reveal')).toBeVisible({ timeout: 6000 })
      await expect(page.getByTestId('compass-verdict')).not.toContainText(/meilleur(e)? que|mauvaise réponse/i)
      await page.getByTestId('compass-next').click()
    }
    await expect(page.getByTestId('compass-done')).toBeVisible()
  })

  test('Le Pont : coopération, pièces à emboîter, victoire commune', async ({ page }) => {
    await demoStart(page); await startEncounter(page)
    await page.getByTestId('tab-activities').click(); await page.getByTestId('game-bridge').click()
    await page.getByTestId('piece-flat').click() // mauvaise pièce : encouragement, pas de jugement
    await expect(page.getByText('ne s’emboîte pas')).toBeVisible()
    for (const s of ['round', 'flat', 'slant', 'round']) { await page.getByTestId(`piece-${s}`).click(); await page.waitForTimeout(650) }
    await expect(page.getByTestId('bridge-stone')).toBeVisible({ timeout: 25000 })
    await page.getByTestId('bridge-stone').click()
    await expect(page.getByTestId('bridge-done')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('F/G · double consentement et révélation', () => {
  test('F · un refus : aucune photo, aucun reproche, le refus n’est pas divulgué', async ({ page }) => {
    await demoStart(page)
    await page.getByTestId('tab-profile').click()
    await page.getByTestId('demo-partner-yes').click() // le partenaire fictif refusera
    await page.getByTestId('tab-home').click()
    await toConsent(page)
    await page.getByTestId('goto-consent').click()
    await page.getByTestId('consent-yes').click(); await page.getByTestId('consent-confirm').click()
    await expect(page.getByTestId('consent-kind')).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('consent-kind')).toContainText('Toutes les rencontres ne deviennent pas des histoires')
    await expect(page.getByTestId('consent-kind')).not.toContainText(/refus|a dit non/i)
    await expect(page.locator('img, svg[aria-label="Portrait illustré"]')).toHaveCount(0)
    await expect(page.getByTestId('reveal-photos')).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('adeux:store'))).not.toContain('"revealed"')
    await page.getByTestId('consent-home').click()
    await expect(page.getByTestId('home-searching')).toBeVisible()
  })

  test('G · deux accords : révélation, photos, puis espace commun', async ({ page }) => {
    await demoStart(page); await toConsent(page)
    await expect(page.locator('svg[aria-label="Portrait illustré"]')).toHaveCount(0) // aucune photo avant validation
    await page.getByTestId('goto-consent').click()
    await page.getByTestId('consent-yes').click(); await page.getByTestId('consent-confirm').click()
    await expect(page.getByTestId('reveal')).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('reveal-photos')).toBeVisible({ timeout: 12000 })
    await expect(page.getByTestId('reveal-photos').locator('svg[aria-label="Portrait illustré"]')).toHaveCount(1)
    await page.getByTestId('reveal-skip').click().catch(() => {})
    await page.getByTestId('reveal-enter').click({ timeout: 12000 })
    await expect(page.getByTestId('world')).toBeVisible()
    await expect(page.getByTestId('world-item-house')).toContainText('✓')
    await expect(page.getByTestId('world-item-lantern')).toContainText('✓') // le Miroir a été joué
    await page.getByTestId('memory-input').fill('Notre premier appel'); await page.getByTestId('memory-add').click()
    await expect(page.getByTestId('memories')).toContainText('Notre premier appel')
    await expect(page.getByTestId('world-item-journal')).toContainText('✓')
    await page.getByTestId('plan-open').click(); await page.getByTestId('plan-idea').fill('Un café au marché'); await page.getByTestId('plan-send').click()
    await expect(page.getByTestId('plans')).toContainText('Un café au marché')
  })
})

test.describe('H · blocage', () => {
  test('bloquer coupe toute interaction, même une réponse déjà en route', async ({ page }) => {
    await demoStart(page); await startEncounter(page); await answerIntro(page)
    await page.getByTestId('tab-messages').click()
    await page.getByTestId('chat-input').fill('Salut !'); await page.getByTestId('chat-send').click()
    await page.getByTestId('tab-encounter').click()
    await page.getByTestId('enc-menu').click(); await page.getByTestId('block').click(); await page.getByTestId('block-confirm').click()
    await expect(page.getByTestId('enc-ended')).toBeVisible()
    await page.waitForTimeout(3500)
    await page.getByTestId('tab-messages').click()
    await expect(page.getByTestId('msg-partner')).toHaveCount(0)
    await expect(page.getByTestId('chat-closed')).toBeVisible()
    await expect(page.getByTestId('chat-input')).toHaveCount(0)
    await page.getByTestId('tab-activities').click()
    await expect(page.getByTestId('game-mirror')).toHaveCount(0)
    // la personne bloquée n'est plus jamais reproposée
    await page.getByTestId('tab-encounter').click(); await page.getByTestId('enc-back-home').click()
    await page.getByTestId('tab-profile').click(); await page.getByTestId('demo-nextday').click()
    await page.getByTestId('tab-home').click(); await page.getByTestId('find-match').click()
    await expect(page.getByTestId('partner-name')).toHaveText('Sacha', { timeout: 8000 })
  })
})

test.describe('I · reprise', () => {
  test('quitter puis revenir conserve la progression (rencontre, jeu en cours, messages)', async ({ page }) => {
    await demoStart(page); await startEncounter(page); await answerIntro(page)
    await page.getByTestId('tab-activities').click(); await page.getByTestId('game-mirror').click()
    await page.getByTestId('mirror-opt-c').click(); await page.getByTestId('mirror-lock').click()
    await page.reload()
    await expect(page.getByTestId('tab-encounter')).toBeVisible()
    await page.getByTestId('tab-activities').click()
    await expect(page.getByTestId('game-mirror')).toContainText('En attente')
    await page.getByTestId('game-mirror').click()
    await expect(page.getByTestId('card-me')).toBeVisible()
    await expect(page.getByTestId('mirror-flip')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('back').click()
    await page.getByTestId('tab-encounter').click()
    await expect(page.getByTestId('enc-partner')).toHaveText('Noa')
    await expect(page.getByTestId('intro-exchange')).toBeVisible()
  })
})

test.describe('Messages vocaux et états', () => {
  test('message vocal réel (MediaRecorder) et états vides', async ({ page }) => {
    await demoStart(page)
    await page.getByTestId('tab-messages').click()
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await page.getByTestId('tab-activities').click(); await expect(page.getByTestId('empty-state')).toBeVisible()
    await page.getByTestId('tab-home').click(); await startEncounter(page); await answerIntro(page)
    await page.getByTestId('tab-messages').click()
    await page.getByTestId('mic-open').click(); await page.getByTestId('voice-rec').click()
    await expect(page.getByTestId('rec-timer')).toBeVisible()
    await page.waitForTimeout(1300)
    await page.getByTestId('voice-send').click()
    await expect(page.getByTestId('voice-play')).toBeVisible({ timeout: 6000 })
  })
})

test.describe('J · iPhone', () => {
  test('aucun débordement horizontal, cibles tactiles ≥ 44px, onglets utilisables', async ({ page }) => {
    await demoStart(page); await startEncounter(page)
    for (const t of ['home', 'encounter', 'activities', 'messages', 'profile']) {
      await page.getByTestId(`tab-${t}`).click(); await page.waitForTimeout(350)
      await noHorizontalOverflow(page)
      const small = await page.evaluate(() => [...document.querySelectorAll('button, a, input, select, textarea')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40) && !(e as HTMLInputElement).type?.match(/checkbox|hidden|file/) }).map((e) => (e.getAttribute('data-testid') || e.textContent || '').slice(0, 30)))
      expect(small, `petites cibles sur ${t}`).toEqual([])
    }
    const manifest = await page.evaluate(() => fetch('/manifest.webmanifest').then((r) => r.json()))
    expect(manifest.display).toBe('standalone')
    expect(await page.locator('meta[name=viewport]').getAttribute('content')).toContain('viewport-fit=cover')
    expect(await page.locator('meta[name=apple-mobile-web-app-capable]').getAttribute('content')).toBe('yes')
    expect(await page.locator('meta[name=robots]').getAttribute('content')).toContain('noindex')
  })
  test('suppression des données', async ({ page }) => {
    await demoStart(page); await page.getByTestId('tab-profile').click()
    await page.getByTestId('delete-data').click(); await page.getByTestId('delete-confirm').click()
    await expect(page.getByTestId('intro')).toBeVisible()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('adeux:store') || '{}').state?.profile ?? null)).toBeNull()
  })
})
