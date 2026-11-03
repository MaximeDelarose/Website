/**
 * Invitations des enfants (personnages de jeu, adaptées à leurs âges, ton toujours positif).
 * Les prénoms ne sont jamais écrits ici : les locuteurs sont 'kid1' | 'kid2' | 'kid3' et le nom vient du jeu (données chiffrées).
 */
import type { EventDef } from '../types';

export const FAMILY: EventDef[] = [
  {
    id: 'f-bouquet', title: 'Un bouquet à composer', sender: 'kid1', category: 'family', big: true, repeatable: true, weight: 9, minPlayMin: 5,
    teaser: 'Maman, on fait un bouquet ?',
    invite: 'Maman, on fait un bouquet ?',
    steps: [
      { t: 'scene', lines: [{ who: 'kid1', text: 'Les fleurs ! Les couleurs ! Maman, viens !' }] },
      { t: 'activity', id: 'bouquet', params: { mode: 'kid' } },
      { t: 'scene', lines: [{ who: 'kid1', text: 'Il est trop joli !!' }] },
      { t: 'photo', place: 'garden', title: 'Notre bouquet', withKids: ['kid1'] },
    ],
    reward: { coins: 70, flowers: 4, furniture: ['flowerbed'] }, replayReward: { coins: 25, flowers: 2 },
    memoryTitle: 'Notre bouquet', achievements: ['ev_family'],
  },
  {
    id: 'f-fashion', title: 'Séance mode', sender: 'kid2', category: 'family', big: true, repeatable: true, weight: 8, minPlayMin: 6,
    teaser: 'Maman, viens, on fait des looks !',
    invite: 'Maman, viens, on fait des looks !',
    steps: [
      { t: 'scene', lines: [{ who: 'kid2', text: 'J’ai trois thèmes pour toi. Tu vas voir, c’est facile… enfin presque !' }] },
      { t: 'activity', id: 'fashionThemes' },
      { t: 'scene', lines: [{ who: 'kid2', text: 'Bon, ça passe. Tu as du style, maman.' }] },
      { t: 'photo', place: 'home', title: 'Séance mode', withKids: ['kid2'] },
    ],
    reward: { coins: 80, fabric: 3, cloth: ['gl-heart-pink'] }, replayReward: { coins: 30, fabric: 1 },
    memoryTitle: 'Séance mode', achievements: ['ev_family'],
  },
  {
    id: 'f-challenge', title: 'Le défi surprise', sender: 'kid3', category: 'family', big: true, repeatable: true, weight: 8, minPlayMin: 7,
    teaser: 'Maman, j’ai un défi pour toi !',
    invite: 'Maman, j’ai un défi pour toi !',
    steps: [
      { t: 'scene', lines: [{ who: 'kid3', text: 'Un défi de mémoire. Tu ne vas pas y arriver… ou peut-être que si.' }] },
      { t: 'activity', id: 'memoryChallenge', params: { kid: 'kid3', level: 2 } },
      { t: 'scene', lines: [{ who: 'kid3', text: 'Pas mal du tout, maman !' }] },
      { t: 'photo', place: 'home', title: 'Le défi', withKids: ['kid3'] },
    ],
    reward: { coins: 70, diamonds: 3, furniture: ['game-shelf'] }, replayReward: { coins: 25 },
    memoryTitle: 'Le défi', achievements: ['ev_family'],
  },
  {
    id: 'f-garden', title: 'Fête dans le jardin', sender: 'kid1', category: 'family', big: true, repeatable: true, weight: 6, minPlayMin: 14,
    needs: { doneAll: ['f-bouquet'] },
    teaser: 'Maman, on fait une fête dans le jardin ?',
    invite: 'Maman, on fait une fête dans le jardin ? Avec tout le monde !',
    steps: [
      { t: 'travel', place: 'garden', label: 'Direction le jardin' },
      { t: 'scene', lines: [
        { who: 'kid1', text: 'Une fête ! Une fête !' },
        { who: 'kid2', text: 'On installe la table, et toi tu fais les bouquets, maman.' },
        { who: 'kid3', text: 'Et les chocolats, on n’oublie pas les chocolats.' },
      ] },
      { t: 'activity', id: 'decorTable', params: { mode: 'garden' } },
      { t: 'activity', id: 'bouquet', params: { mode: 'kid' } },
      { t: 'activity', id: 'chocolateBox' },
      { t: 'photo', place: 'garden', title: 'La fête du jardin', withAuguste: false, withKids: ['kid1', 'kid2', 'kid3'] },
    ],
    reward: { coins: 150, flowers: 6, cocoa: 3, diamonds: 5 }, replayReward: { coins: 45, flowers: 2 },
    memoryTitle: 'La fête du jardin', achievements: ['ev_family'],
  },
  {
    id: 'f-pajama', title: 'Soirée pyjama', sender: 'kid2', category: 'family', big: true, repeatable: true, weight: 6, minPlayMin: 16,
    teaser: 'Maman, ce soir c’est soirée pyjama !',
    invite: 'Maman, ce soir c’est soirée pyjama ! On décore le salon et on choisit un jeu.',
    steps: [
      { t: 'dress', hint: 'Choisis ton pyjama pour la soirée', style: 'casual' },
      { t: 'travel', place: 'pajama', label: 'On rejoint le salon' },
      { t: 'activity', id: 'decorTable', params: { mode: 'pajama' } },
      { t: 'activity', id: 'memoryChallenge', params: { kid: 'kid1', level: 1 } },
      { t: 'scene', lines: [{ who: 'kid2', text: 'Encore un film après ? Pas de pression, on est bien là.' }] },
      { t: 'photo', place: 'pajama', title: 'Soirée pyjama', withKids: ['kid1', 'kid2', 'kid3'] },
    ],
    reward: { coins: 140, diamonds: 5, cloth: ['dr-pajama-stars'] }, replayReward: { coins: 40 },
    memoryTitle: 'Soirée pyjama', achievements: ['ev_family'],
  },
];
