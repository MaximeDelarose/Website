/**
 * Compréhension des messages LIBRES de Radia (Tindeur et Snapchien). Logique pure, sans réseau : normalisation (accents, argot, SMS, lettres
 * répétées), tolérance aux fautes (distance d'édition ≤ 1 sur les mots longs), détection d'intentions (salutation, question, blague,
 * confidence, refus…), extraction du mot « utile » pour rebondir. Ce n'est PAS un modèle de langage : c'est un analyseur à règles qui sait
 * ce que Radia dit parmi ~45 intentions ; ce qui dépasse retombe sur une réaction qui cite ses propres mots (voir chat.ts).
 */
export type Intent =
  | 'greet' | 'how' | 'doing' | 'thanks' | 'bye' | 'night' | 'laugh' | 'sure' | 'why' | 'compliment' | 'flirt' | 'miss' | 'rude' | 'stop' | 'sexual' | 'sad' | 'busy' | 'nothing' | 'agree' | 'disagree' | 'maybe'
  | 'kids_all' | 'kids_some' | 'kids_no' | 'friends_only' | 'friends_unsure' | 'friend_talk' | 'single_yes' | 'single_complex' | 'single_none' | 'coupled'
  | 'ph_yes' | 'ph_no' | 'ph_later' | 'ph_tease' | 'ph_first' | 'ask_photo' | 'name_stop' | 'joke_bad' | 'joke_good' | 'name_q'
  | 'q_age' | 'q_job' | 'q_where' | 'q_hobby' | 'q_food' | 'q_single' | 'q_meet' | 'q_snap' | 'q_name' | 'q_dream' | 'q_weekend' | 'q_music' | 'q_movie' | 'q_pet' | 'q_kids' | 'q_you'
  | 'topic_weather' | 'topic_work' | 'topic_family' | 'topic_sport' | 'topic_food' | 'topic_sleep';

export interface Understood {
  raw: string; norm: string; words: string[];
  /** Vrai si le message pose une question (point d'interrogation ou tournure interrogative). */
  question: boolean;
  intents: Intent[];
  /** Mots « utiles » (sans mots vides), du plus saillant au moins saillant. */
  kw: string[];
  /** Nombre de mots : sert à adapter la longueur de la réponse. */
  size: 'tiny' | 'short' | 'medium' | 'long';
  shout: boolean; emoji: number;
}

const SLANG: [RegExp, string][] = [
  [/\bptdr+\b|\bmdr+\b|\blol+\b|\bxd+\b|\bhaha+h*\b|\bhihi+\b|\bhehe+\b|\bahah+h*\b/g, ' mdr '],
  [/\bjsp\b/g, ' je sais pas '], [/\btkt+\b|\bt inquiete\b/g, ' t inquiete '], [/\bpk\b|\bpq\b|\bpourquoi\b|\bpourkoi\b/g, ' pourquoi '],
  [/\bstp\b|\bs il te plait\b/g, ' stp '], [/\bslt\b|\bsalutt*\b|\bsalu\b/g, ' salut '], [/\bcc\b|\bcoucou+\b|\bkoukou\b/g, ' coucou '],
  [/\bbjr\b|\bbonjour\b/g, ' bonjour '], [/\bbsr\b|\bbonsoir\b/g, ' bonsoir '],
  [/\bcv\b|\bsava\b|\bca va\b|\bcava\b|\bsa va\b/g, ' ca va '],
  [/\btfk\b|\btu fe quoi\b|\btu fait quoi\b/g, ' tu fais quoi '],
  [/\bouai+s*\b|\bouais+\b|\bwesh\b|\boué\b|\boue\b|\bwi+\b|\bouaip\b/g, ' ouais '], [/\bnn\b|\bnop+e*\b|\bnan+\b/g, ' non '],
  [/\bjtm\b/g, ' je t aime '], [/\bjte\b/g, ' je te '], [/\bchui\b|\bjsuis\b|\bj suis\b|\bjuis\b/g, ' je suis '], [/\bjvais\b|\bj vais\b/g, ' je vais '],
  [/\bt es\b|\btes\b|\bt\'es\b|\btu es\b|\btu etes\b/g, ' tu es '], [/\btas\b|\bt as\b/g, ' tu as '], [/\bj ai\b|\bjai\b|\bjé\b/g, ' j ai '],
  [/\bfrr+\b|\bfrere\b|\bbg\b|\bgros\b|\bmec\b|\bmon pote\b/g, ' '], [/\bgenre\b|\bdu coup\b|\bbah\b|\bben\b|\bbref\b|\bhein\b|\balors\b/g, ' '],
  [/\bbcp\b|\bbeaucoup\b/g, ' beaucoup '], [/\bmtn\b|\bmaintenant\b/g, ' maintenant '], [/\bdemain\b|\b2m1\b/g, ' demain '],
  [/\bpar contre\b|\bpr\b/g, ' pour '], [/\bpkoi\b/g, ' pourquoi '], [/\bkoi\b|\bquoi\b/g, ' quoi '], [/\boki+\b|\bokk+\b|\bokay\b|\bd accord\b|\bdac\b|\bdaccord\b/g, ' ok '],
  [/\bpeut etre\b|\bptet\b|\bpt etre\b|\bptt\b/g, ' peut etre '], [/\bvraiment\b|\bvrmt\b|\bvrmnt\b/g, ' vraiment '], [/\bserieux\b|\bserieuse\b|\bsrx\b|\bsrieux\b/g, ' serieux '],
  [/\bcelib\b|\bcelibataire\b/g, ' celibataire '], [/\bmama?n\b|\bmaman\b/g, ' maman '],
];
const rep = (s: string): string => s.replace(/([a-z])\1{2,}/g, '$1$1'); // « trooop » → « troop » ; les doubles légitimes (« mdrr ») sont gérées ensuite

export function normalize(t: string): string {
  let s = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/['’`´]/g, ' ').replace(/[^a-z0-9?!+\s]/g, (c) => (/[?!]/.test(c) ? c : ' '));
  s = rep(s).replace(/\b(m+d+r+)\b/g, 'mdr').replace(/\b(h(a|e|i)+h(a|e|i)*h?)\b/g, 'haha');
  s = ` ${s} `;
  for (const [re, to] of SLANG) s = s.replace(re, to);
  return s.replace(/\s+/g, ' ').trim();
}

const STOP = new Set(('le la les un une des du de d l et ou mais donc car ni que qui quoi dont ou je tu il elle on nous vous ils elles me te se moi toi lui leur leurs mon ma mes ton ta tes son sa ses ce cet cette ces ca ceci cela '
  + 'est es suis sommes etes sont etre ai as a avons avez ont avoir fait fais faire va vas vais vont aller peux peut veux veut dois doit dit dis pas ne plus tres trop assez bien mal oui non ok ouais ah oh eh hein bon ben euh '
  + 'dans sur sous avec sans pour par en au aux chez vers entre comme si alors aussi encore deja toujours jamais rien tout tous toute toutes tant tellement vraiment juste surtout peut etre mdr haha stp salut coucou bonjour bonsoir '
  + 'quel quelle quels quelles comment combien quand pourquoi cest cetait serais serait etait sera seront y a il y').split(/\s+/));

/** Distance d'édition bornée (≤ 1) : tolère une faute de frappe sur un mot assez long. */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || b.length < 5) return false;
  let i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return d + (a.length - i) + (b.length - j) <= 1;
}
/** Le texte contient-il (ou presque) un des mots ? Les mots composés (« ca va ») se cherchent tels quels. */
export function hasWord(norm: string, words: string[], list: readonly string[]): boolean {
  for (const k of list) {
    if (k.includes(' ')) { if (norm.includes(k)) return true; continue; }
    for (const w of words) if (w === k || (w.length >= 5 && near(w, k)) || (k.length >= 6 && w.startsWith(k.slice(0, k.length - 1)) && w.length <= k.length + 2 && w.length >= k.length - 1 && near(w, k))) return true;
  }
  return false;
}

type Rule = [Intent, (n: string, w: string[], q: boolean) => boolean];

function rules(): Rule[] {
  const any = (list: string[]) => (n: string, w: string[]) => hasWord(n, w, list);
  return [
    ['greet', (n, w) => /^(salut|coucou|bonjour|bonsoir|hello|hey|yo|allo|wesh)\b/.test(n) || (w.length <= 3 && hasWord(n, w, ['salut', 'coucou', 'bonjour', 'bonsoir', 'hello', 'hey']))],
    ['how', (n) => /\bca va\b/.test(n) || /comment (tu vas|vas tu|tu te portes|tu te sens|se passe ta)/.test(n) || /\bla forme\b/.test(n) || /comment tu vas/.test(n)],
    ['doing', (n) => /tu fais quoi|tu fais de beau|t as fait quoi|quoi de neuf|tu deviens quoi|tu es occupe|que fais tu|qu est ce que tu fais|tu fabriques|tu te fais quoi/.test(n)],
    ['thanks', any(['merci', 'thanks', 'mercii', 'remercie'])],
    ['night', (n) => /bonne nuit|fais de beaux reves|dors bien|je vais dormir|je vais me coucher|je me couche|a demain|dodo/.test(n)],
    ['bye', (n) => /\b(bisous|a plus|a bientot|ciao|bye|je file|je dois y aller|je te laisse|on se reparle|a tout a l heure|a toute)\b/.test(n)],
    ['laugh', (n) => /\bmdr\b|\bhaha\b|\bpas mal\b.*\b(blague|drole)|tu es (trop )?(drole|marrant|fort)|j ai (ri|rigole)|je rigole|je suis morte|je pleure de rire|trop drole/.test(n)],
    ['sure', (n) => /\bserieux\b|vraiment|pour de vrai|sans deconner|tu deconnes|tu rigoles|c est vrai|c est pas vrai|tu me fais marcher|tu mens|jure\b|t es sur|tu es sur|en vrai\s*\?/.test(n)],
    ['why', (n, _w, q) => /\bpourquoi\b|comment ca|c est a dire|ah bon|tu veux dire quoi|explique/.test(n) || (q && /^(et )?(pour|comment|ca veut dire)/.test(n))],
    ['compliment', (n) => /tu es (trop |vraiment |tellement |tres )?(mignon|beau|sympa|gentil|touchant|attentionne|charmant|adorable|special|different|rassurant|amusant|drole|marrant|cool|top|genial|sympathique|poli)|j aime (bien )?(ton|ta|tes|ce que|comment|discuter|parler)|tu me fais (rire|sourire|du bien)|tu me plais/.test(n)],
    ['flirt', (n) => /\b(craquer|craque|charme|charmeur|sourire|beau gosse|sexy|seduire|seduis|embrasse|bisou|calin|te voir|te rencontrer|me manque|je pense a toi|tu me fais rougir|rougi|coup de coeur|belle|belle journee)\b/.test(n)],
    ['miss', (n) => /tu (me )?manques?|j ai pense a toi|je pensais a toi|tu me manquais/.test(n)],
    ['rude', (n) => /\b(nul|nulle|con|cretin|debile|idiot|stupide|ridicule|pathetique|lourd|chiant|bete)\b/.test(n) && /tu (es|fais|etais)|ta |tes |t es/.test(n)],
    ['stop', (n) => /laisse (moi|nous) (tranquille|en paix)|arrete de m ecrire|ne m ecris plus|ecris[- ]moi plus|je ne veux plus (parler|discuter|te parler)|je veux plus (te )?parler|degage|fiche moi la paix|casse toi|je te bloque|stop\b.*\b(ecrire|parler|messages?)/.test(n)],
    ['sexual', (n) => /\b(nues?|nus|nu|sexe|sexy ?photo|coucher|baiser|baise|chaude|nudes?|seins?|fesses?|lingerie|erotique|cul|bite|branler|sexto|sexuel)\b/.test(n)],
    ['sad', (n) => /\b(triste|deprime|deprimee|pleure|pleurer|fatigue|fatiguee|epuise|epuisee|crevee|crevé|stresse|stressee|angoisse|angoissee|mal au|ca va pas|ca ne va pas|pas la forme|nulle journee|journee pourrie|mauvaise journee|mal dormi|anxieuse|anxieux|seule|seul|cafard|moral)\b/.test(n)],
    ['busy', (n) => /je dois (y aller|filer|partir|bosser|m occuper)|je suis (occupee|en route|au travail|au boulot|en train de|avec les enfants)|j ai (le temps|pas le temps|plus le temps)|plus tard|un peu plus tard|je reviens|deux secondes|une minute|attends un|les enfants (m|ont|veulent|arrivent|dorment)|je vais cuisiner|je prepare le diner|je conduis/.test(n)],
    ['nothing', (n) => /rien de special|rien de particulier|pas grand chose|rien d extraordinaire|^rien\b|comme d habitude|la routine|train train|toujours pareil|je m ennuie|^bof\b|tranquille de mon cote|rien de neuf|pas de nouveau/.test(n)],
    ['agree', (n, w) => (w.length <= 5 && hasWord(n, w, ['ouais', 'ok', 'oui', 'carrement', 'exactement', 'voila', 'grave', 'tout a fait', 'clairement', 'evidemment', 'bien sur', 'avec plaisir', 'volontiers', 'pourquoi pas', 'chaud'])) || /\bje suis d accord|moi aussi|pareil|idem|c est vrai\b/.test(n)],
    ['disagree', (n, w) => (w.length <= 5 && hasWord(n, w, ['non', 'jamais', 'sûrement pas', 'surement pas'])) || /pas du tout|pas vraiment|ca depend|je ne pense pas|je crois pas|je suis pas d accord|pas d accord|absolument pas|mais non/.test(n)],
    ['maybe', (n) => /peut etre|on verra|je sais pas|sais pas trop|pas sure|pas sur\b|ca depend|on va voir|j hesite|je verrai|je vais y reflechir|on en reparle/.test(n)],

    // famille
    ['kids_all', (n) => /divorc/.test(n) && /(3|trois)\s*(enfants?|gamins?|filles?|fils|petits?|mômes?|moms?)|trois enfants|maman de (3|trois)/.test(n) || (/\b(3|trois) enfants?\b/.test(n) && /(divorc|separ|seule|maman|mere)/.test(n)) || (/divorc/.test(n) && /(maman|mere|enfants?)/.test(n))],
    ['kids_some', (n) => /j ai (un|une|deux|trois|3|2|des|quatre|plusieurs|2|3) (petit |petite )?(enfants?|gamins?|filles?|fils|garcons?|garcon|fille|petits?|mômes?|bebes?|ados?)|\bmes enfants\b|\bmes (filles|fils|garcons|gamins|petits|bebes|ados)\b|\bje suis (une )?(maman|mere)\b|\bmaman de\b|\bmes (2|deux|3|trois) (filles|fils|garcons|enfants)\b|\bj ai des enfants\b|\bma fille\b|\bmon fils\b|\bmon garcon\b/.test(n)],
    ['kids_no', (n) => /(prefere|veux|voudrais|souhaite) (ne )?pas (en )?parler (de ca|des enfants|d eux|de mes enfants|famille|de ma famille|de cela|de ca)|ne parle pas (de mes enfants|de ma famille)|pas de questions sur (mes|ma)|laisse (mes enfants|ma famille)|c est prive|j ai pas envie d en parler/.test(n)],
    ['friends_only', (n) => /\b(cherche|veux|voudrais|souhaite|ici pour|juste|seulement|surtout|plutot|que des)\b.*\b(amis?|amitie|copains?|potes?|amies?)\b|\bamis? (seulement|uniquement|rien d autre|c est tout)\b|que de l amitie/.test(n)],
    ['friends_unsure', (n) => /(sais pas|ne sais pas|pas sure?|sais plus) (trop |vraiment )?(ce que|quoi|si) (je )?(cherche|veux)|je ne sais pas ce que je cherche|je cherche encore|je decouvre|j explore/.test(n)],
    ['friend_talk', (n) => /amitie (homme|entre)|homme[- ]femme|(un homme|une femme) et (une femme|un homme).*(amis|amitie)|etre amis|rester amis|amis? avec un (homme|mec|garcon)|possible d etre amis/.test(n)],
    ['single_yes', (n) => /\b(oui|ouais)\b.*\b(contact|touche|parle|vois|reste)\b|toujours en contact|on se parle toujours|oui on reste en contact/.test(n)],
    ['single_complex', (n) => /c est complique|compliquee?\b|difficile a dire|ca depend|tout est complique|ca se complique/.test(n)],
    ['single_none', (n) => /ca ne te regarde pas|ca te regarde pas|mind your|ca ne te concerne|c est mon histoire|c est prive|mystere/.test(n) && !/photo|selfie/.test(n)],
    ['coupled', (n) => /(je suis|j suis) (en couple|prise|casee|mariee|avec quelqu)|j ai (un copain|un mari|quelqu un|un petit ami|un homme)|mon (copain|mari|petit ami|homme|compagnon)\b/.test(n)],

    // photo
    ['ph_first', (n) => /(toi|le tien|la tienne|ton)\b.*\b(d abord|en premier|le premier)|envoie (le tien|la tienne) (d abord|en premier)|a toi de commencer|toi d abord/.test(n)],
    ['ph_later', (n) => /(pas|plus) (ce soir|maintenant|aujourd hui|tout de suite)|peut etre plus tard|une autre fois|un autre jour|demain peut|pas pour l instant|pas ce soir|pas la|plus tard pour la photo|je verrai pour la photo/.test(n)],
    ['ph_no', (n) => /(veux|peux|vais|souhaite|voudrais) pas (en )?(envoyer|montrer|faire)|ne veux pas envoyer|pas envie d envoyer|(pas|plus) (de |une |d)?(photo|selfie|snap|photos)|prefere (ne )?pas (envoyer|montrer|en envoyer)|n envoie pas de photo|jamais de photo|je n envoie pas|je ne montre pas|pas envie d envoyer|j envoie pas de photo|non merci pour la photo|je ne fais pas de photo|non pour la photo|pas de selfie|j ai pas envie de (photo|selfie)/.test(n)],
    ['ph_tease', (n) => /mystere|tu verras|tu ne sauras|tu sauras pas|devine|secret|suspense|laisse moi (un )?mystere/.test(n) && /photo|selfie|visage|tete|bouille|sourire|moi/.test(n)],
    ['ph_yes', (n) => /(je )?(t envoie|te l envoie|t en envoie|voila|tiens)\b.*\b(photo|selfie|snap|sourire|tete|bouille|tenue)|je t en envoie une|ok pour la photo|d accord pour la photo|je vais te (montrer|envoyer)/.test(n)],
    ['ask_photo', (n) => /(envoie|montre|fais voir|fais moi voir|j aimerais voir|je veux voir|t as une photo|tu as une photo|une photo de toi|ta photo|ta bouille|ta tete|ton visage|ton sourire|ta tenue|ta tete)\b/.test(n) && /\b(toi|ta|ton|tu|photo|selfie|bouille|tete|sourire|visage|tenue|snap)\b/.test(n)],

    // son prénom, ses blagues
    ['name_stop', (n) => /arrete (avec|de) (mon prenom|dire mon prenom|m appeler)|(mon prenom|radia).*(arrete|stop|assez|marre)|plus de blagues sur mon prenom|arrete avec radia/.test(n)],
    ['joke_bad', (n) => /\b(nul|nulle|naze|pourri|mauvaise|pas drole|bof|lourd)\b.*\b(blague|celle[- ]la|ca)\b|\bblague\b.*\b(nulle|naze|pourrie|ratee|bof)\b|c etait (nul|nulle|naze)|elle est (nulle|naze|pourrie)|mdr (c etait )?nul/.test(n)],
    ['joke_good', (n) => /pas mal (la )?(blague|celle)|bien (joue|trouve)|bravo|elle est bonne|bonne blague|elle etait bonne|celle[- ]la est (bien|bonne|drole)|j adore (ta )?blague/.test(n)],
    ['name_q', (n) => /(mon prenom|radia|comment tu m|pourquoi (je m appelle|radia))/.test(n) && (/\?/.test(n) || /pourquoi|comment|signifie|veut dire|origine|vient|vient de|cest|c est/.test(n))],

    // questions sur lui
    ['q_age', (n) => /quel age|ton age|tu as quel age|tu as (\d+) ans|tu as quel|t as quel age|tu fais quel age/.test(n)],
    ['q_job', (n) => /tu fais quoi dans la vie|ton (travail|metier|boulot|job)|tu travailles|tu bosses|tu fais comme (travail|metier|boulot)|quel est ton metier|tu es dans quoi|tu fais comme job|tu fais quoi comme (metier|travail)|dans la vie/.test(n)],
    ['q_where', (n) => /tu habites|tu vis ou|tu es d ou|d ou tu viens|tu es ou|t es ou|ou est ce que tu|tu es de quelle ville|ta ville|tu vis dans/.test(n)],
    ['q_hobby', (n) => /tes (hobbies|loisirs|passions|passe temps)|tu aimes quoi|tu fais quoi (pour te|comme|quand tu|pendant ton|de tes)|tu fais du sport|tu pratiques|une passion|qu est ce que tu aimes|ce que tu aimes|ton truc|tu kiffes|tu aimes faire/.test(n)],
    ['q_food', (n) => /tu (as|a) faim|tu manges|ton plat|plat prefere|tu cuisines|tu aimes (manger|cuisiner)|cuisine preferee|\bpizza|\bsushis?|\brestaurant|\bresto\b|tu as mange|\bdejeuner|\bdiner\b|petit dej|\bgouter|\bgateau|\bchocolat|\bcafe\b/.test(n) && /\?|tu |ton |ta /.test(n)],
    ['q_single', (n) => /tu es (en couple|celibataire|seul|libre|marie)|t es (en couple|celibataire|seul|libre)|tu as (une copine|quelqu un|une femme|une petite amie|une meuf)|tu es pris|tu es casse|tu vois quelqu|une copine\b.*\?|tu es celib/.test(n)],
    ['q_meet', (n) => /on se (voit|rencontre|retrouve)|se rencontrer|se voir|un (cafe|verre|resto|diner|rdv|rendez vous|ciné|cine)|sortir (avec|ensemble)|boire un verre|rendez vous|dejeuner ensemble|tu veux me voir|on se fait un|on y va ensemble|me retrouver|tu es dispo|tu es libre (ce|samedi|dimanche|vendredi|demain)|prendre un cafe/.test(n)],
    ['q_snap', (n) => /snap(chien)?|insta|whatsapp|ton (numero|num|tel|telephone|snap|compte)|on passe (sur|a)|passer sur|ajoute[- ]moi|tu as snap|tu as (un )?snap|ton pseudo|tu es sur snap/.test(n)],
    ['q_name', (n) => /comment tu (t appelles|t appeles)|ton (prenom|nom)|tu t appelles comment|tu t appelles/.test(n)],
    ['q_dream', (n) => /ton reve|tes projets|tu reves de|tu veux faire quoi|plus tard|ton avenir|dans dix ans|dans 10 ans|ton but|ton objectif|tu veux devenir|tu voudrais quoi|rencontre ideale|ce que tu cherches|tu cherches quoi|tu cherches quoi ici|tu cherches une/.test(n)],
    ['q_weekend', (n) => /ce week end|ce weekend|week end|weekend|ce soir|demain soir|samedi|dimanche|tes plans|tu fais quoi ce|tu as prevu|tu as des plans|vacances|tes vacances/.test(n) && /\?|tu |tes /.test(n)],
    ['q_music', (n) => /\b(musique|chanson|chansons|groupe prefere|tu ecoutes|concert|chanteur|chanteuse|playlist|guitare|piano|tu chantes|tu danses)\b/.test(n)],
    ['q_movie', (n) => /\b(films?|series?|netflix|cinema|tu regardes|acteurs?|actrices?|livres?|tu lis|lecture|romans?|jeux? video|tu joues)\b/.test(n)],
    ['q_pet', (n) => /\b(chiens?|chats?|animal|animaux|chiots?|chatons?|poissons?|lapins?|chevaux|cheval|oiseaux?|perroquets?)\b/.test(n)],
    ['q_kids', (n) => /tu (veux|voudrais|aimerais|as) (des |deja des )?enfants|des enfants\?|tu aimes les enfants|papa/.test(n) && /\?|tu /.test(n)],
    ['q_you', (n) => /^(et toi|et vous|toi\s*\?|et de ton cote|et tes?\b|et ton|et ta|et tu|tu en penses quoi|t en penses quoi|et pour toi|a toi|et toi alors)|\bet toi\b/.test(n)],

    // sujets
    ['topic_weather', any(['pluie', 'soleil', 'froid', 'chaud', 'neige', 'orage', 'meteo', 'vent', 'nuage', 'canicule', 'gelee'])],
    ['topic_work', any(['travail', 'boulot', 'bureau', 'collegue', 'patron', 'reunion', 'entretien', 'chomage', 'metier', 'poste', 'stage', 'client', 'shift'])],
    ['topic_family', any(['famille', 'maman', 'papa', 'soeur', 'frere', 'parents', 'grand mere', 'grand pere', 'tante', 'oncle', 'cousin', 'cousine', 'belle mere'])],
    ['topic_sport', any(['sport', 'foot', 'course', 'running', 'courir', 'yoga', 'gym', 'natation', 'nager', 'velo', 'rando', 'marche', 'muscu', 'tennis', 'pilates', 'fitness', 'zumba'])],
    ['topic_food', any(['manger', 'cuisine', 'cuisiner', 'repas', 'dejeuner', 'diner', 'recette', 'gateau', 'dessert', 'pizza', 'pates', 'riz', 'tajine', 'couscous', 'chocolat', 'cafe', 'the', 'faim', 'miam', 'resto', 'restaurant', 'sushi', 'burger'])],
    ['topic_sleep', any(['dormir', 'sommeil', 'lit', 'reveil', 'sieste', 'dodo', 'insomnie', 'couche', 'couchee', 'nuit'])],
  ];
}

const RULES = rules();
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}❤♡♥]/gu;

export function understand(raw: string): Understood {
  const text = (raw ?? '').slice(0, 600);
  const norm = normalize(text);
  const words = norm.replace(/[?!+]/g, ' ').split(/\s+/).filter(Boolean);
  const qMark = /\?/.test(text);
  const question = qMark || /^(est ce que|est-ce que|tu |t es |pourquoi|comment|combien|quand|ou |qui |quel|quelle|quoi)/.test(norm) && /\b(tu|ton|ta|tes|vous)\b/.test(norm) && /\b(quoi|comment|combien|quand|quel|quelle|qui|pourquoi|ou)\b/.test(norm);
  const intents: Intent[] = [];
  for (const [id, f] of RULES) { try { if (f(norm, words, question) && !intents.includes(id)) intents.push(id); } catch { /* règle défaillante : ignorée */ } }
  // règles de désambiguïsation
  if (intents.includes('kids_all')) { for (const x of ['kids_some', 'topic_family', 'q_kids'] as Intent[]) { const i = intents.indexOf(x); if (i >= 0) intents.splice(i, 1); } }
  if (intents.includes('kids_some')) { const i = intents.indexOf('q_kids'); if (i >= 0 && !/\?/.test(text)) intents.splice(i, 1); }
  if (intents.includes('ph_no')) { for (const x of ['ask_photo', 'ph_yes', 'ph_later'] as Intent[]) { const i = intents.indexOf(x); if (i >= 0) intents.splice(i, 1); } }
  if (intents.includes('friends_only')) { const i = intents.indexOf('friend_talk'); if (i >= 0) intents.splice(i, 1); }
  if (['q_music', 'q_movie', 'q_food', 'q_pet'].some((x) => intents.includes(x as Intent))) { const i = intents.indexOf('q_hobby'); if (i >= 0) intents.splice(i, 1); }
  if (intents.includes('doing')) { const i = intents.indexOf('q_weekend'); if (i >= 0 && !/week|samedi|dimanche|vacances/.test(norm)) intents.splice(i, 1); }
  if (intents.includes('sexual')) return finish(text, norm, words, question, ['sexual']);
  if (intents.includes('stop')) return finish(text, norm, words, question, ['stop']);
  const cleaned = words.filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
  // mot « saillant » : le plus long de la fin du message (le sujet vient souvent en dernier : « pourquoi apiculteur ? »)
  const kw = [...cleaned].reverse().sort((a, b) => b.length - a.length).slice(0, 3);
  const lastFirst = cleaned.length ? [cleaned[cleaned.length - 1], ...kw.filter((k) => k !== cleaned[cleaned.length - 1])] : [];
  return { raw: text, norm, words, question, intents, kw: lastFirst.slice(0, 3), size: words.length <= 2 ? 'tiny' : words.length <= 6 ? 'short' : words.length <= 16 ? 'medium' : 'long', shout: text.length > 5 && text === text.toUpperCase() && /[A-Z]/.test(text), emoji: (text.match(EMOJI) ?? []).length };
}
function finish(raw: string, norm: string, words: string[], question: boolean, intents: Intent[]): Understood {
  return { raw, norm, words, question, intents, kw: [], size: 'short', shout: false, emoji: 0 };
}

/** Mot sûr à reprendre tel quel dans une réponse (jamais un mot grossier, un nombre ou une chaîne bizarre). */
export function echoWord(u: Understood): string {
  const bad = /^(con|cul|pute|merde|putain|salope|encul|bite|nique|fdp|ntm|connard|salaud)/;
  const w = u.kw.find((k) => k.length >= 4 && k.length <= 18 && !bad.test(k) && /^[a-z]+$/.test(k));
  return w ?? '';
}
