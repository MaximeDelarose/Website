/* Les tests des activités démarrent avec une session « en cours » d'une heure (sans passer par l'écran parent) : voir session.cjs pour le mode parent. */
module.exports = function () {
  try { if (!localStorage.getItem('celia.session')) localStorage.setItem('celia.session', JSON.stringify({ v: 1, minutes: 60, state: 'playing', remaining: 3600000, tick: null, warned: false, pin: null, fails: 0, lockUntil: 0, endedAt: 0 })); } catch (e) { }
};
