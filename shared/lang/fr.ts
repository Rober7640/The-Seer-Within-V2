// French (France) language pack. See shared/lang/types.ts for the contract.
//
// FOLDED patterns run on foldText(input): lower case, no accents, straight
// apostrophes. So write "deprimee", "lycee", "n'ai" — never "déprimée".
//
// The rule every pattern follows, carried over from the English ones in
// server/lib/universalSafety.ts: a block must be DIRECTED (she propositions or
// attacks Evelyn, or states her own intent). A buyer DESCRIBING her life — his
// porn habit, being called a name, her husband's suicide — must reach Evelyn.
// Where a French phrase has an everyday meaning ("je n'en peux plus d'attendre",
// "il va me tuer", "tu es bonne conseillère", "il doit me rembourser"), the
// pattern is narrowed until it doesn't fire on it, and a negative case in
// tests/l10n/lang-fr.test.ts holds the line.
//
// Buyers type on phones: no accents (folding handles those), SMS forms ("jveux",
// "jai", "chui", "jsp"), "ne" dropped ("j'ai pas envie"). The fragments below
// carry those forms, so each pattern states the SMS spelling once.
//
// Reviewed by Codex 2026-11-18 (40 findings: 35 taken, 1 rejected — "vous êtes une
// arnaqueuse" stays a sceptic, not harassment — 4 taken in a different form).
import type { LangPack } from "./types";

const rx = (s: TemplateStringsArray, ...v: string[]) => new RegExp(String.raw(s, ...v));
const rxg = (s: TemplateStringsArray, ...v: string[]) => new RegExp(String.raw(s, ...v), "g");

// SMS-aware first-person fragments (folded).
const JE_VEUX = String.raw`(?:je\s+veux|j'?veux)`;
const JE_NE_VEUX = String.raw`(?:je\s+(?:ne\s+)?veux|j'?veux)`;
const JE_SUIS = String.raw`(?:je\s+suis|j'?suis|chuis|chui)`;
const J_AI = String.raw`(?:j'ai|jai)`;
const JE_ME = String.raw`(?:je\s+me|j'?me)`;
// "vivre" as in "to stay alive", not "vivre avec lui" / "vivre ça" / "vivre loin de lui".
const VIVRE = String.raw`vivre\b(?!\s+(?:ca|cela|comme|avec|sans|seules?|loin\s+de|separee?\s+de|la|le|les|un|une|des|dans|ici|en|chez|a|au|aux|cette|ce|cet|mon|ma|mes|son|sa|ses|notre|nos|votre|vos|pour\s+(?:lui|elle|eux)))`;
const PILLS = String.raw`(?:medicaments|cachets|cachetons|comprimes|pilules|somniferes|anxiolytiques|antidepresseurs|doliprane|xanax|lexomil)`;
const A_LOT_OF = String.raw`(?:toute\s+(?:la|une|ma)\s+boite\s+de|une\s+boite\s+(?:entiere\s+)?de|une\s+plaquette\s+(?:entiere\s+)?de|plein\s+de|trop\s+de|une\s+poignee\s+de)`;
// Imperative position for role-play orders: sentence start, or after "maintenant", "ok"…
const ORDER = String.raw`(?:^|[.!?,:;]\s*|\b(?:maintenant|alors|ok|bon|stp|svp|allez)\s+)`;
const AI = String.raw`(?:ia|i\.a\.?|intelligence\s+artificielle|robot|bot|chatbot|chat\s?bot|programme\s+informatique|modele\s+de\s+langage)`;

const CERTAIN = String.raw`(?:absolument|forcément|certainement|sans\s+aucun\s+doute|à\s+coup\s+sûr|assurément|définitivement)`;
const COUNSEL = "un conseiller financier pourra vous aider à évaluer cette décision";

export const FR_FR: LangPack = {
  locale: "fr-FR",

  safety: {
    crisis: [
      rx`\b${JE_VEUX}\s+mourir\b`,
      rx`\b(?:(?:je\s+|j'?)?(?:veux|vais)|voudrais|aimerais|pense\s+a|songe\s+a|envie\s+de|compte|besoin\s+de)\s+me\s+(?:tuer|suicider|supprimer|foutre\s+en\s+l'air)\b`,
      rx`\bme\s+suicider\b`,
      // Her own suicidality, never the word alone (bereavement: see reportedCrisis).
      rx`\b${JE_SUIS}\s+(?:(?:tres|vraiment|un\s+peu|completement|de\s+plus\s+en\s+plus)\s+)?suicidaire\b`,
      rx`\b(?:idees|pensees|envies|tendances)\s+(?:suicidaires?|de\s+suicide)\b`,
      rx`\bpense\s+(?:au|a\s+un)\s+suicide\b`,
      rx`\b${J_AI}\s+(?:deja\s+)?fait\s+(?:une|des|plusieurs)\s+(?:tentatives?\s+de\s+suicide|ts)\b`,
      rx`\benvie\s+de\s+mourir\b`,
      rx`\b(?:(?:je\s+|j'?)?(?:veux|vais)|voudrais|envie\s+d'|besoin\s+d')\s*en\s+finir\b(?!\s+avec\s+(?!la\s+vie))`,
      rx`\ben\s+finir\s+avec\s+la\s+vie\b`,
      rx`\bmettre\s+fin\s+a\s+(?:mes\s+jours|ma\s+vie)\b`,
      rx`\b(?:(?:je\s+|j'?)(?:vais|veux)|envie\s+de|besoin\s+de|peur\s+de)\s+me\s+faire\s+du\s+mal\b`,
      rx`\b${JE_ME}\s+(?:fais\s+du\s+mal|scarifie|mutile|coupe\s+(?:les\s+)?(?:veines|bras|poignets))\b`,
      rx`\b(?:automutilation|auto-mutilation|scarification)s?\b`,
      rx`\bsurdose\b`,
      rx`\bplus\s+envie\s+de\s+${VIVRE}`,
      rx`\bpas\s+envie\s+de\s+${VIVRE}`,
      rx`\b${JE_NE_VEUX}\s+plus\s+${VIVRE}`,
      rx`\bmieux\s+mort(?:e|es|s)?\b`,
      rx`\b(?:voudrais|aimerais|souhaite|souhaiterais|prefererais)\s+(?:etre\s+)?mort(?:e)?\b`,
      rx`\b(?:aucune|plus\s+(?:de|aucune))\s+raison\s+de\s+vivre\b`,
      rx`\bme\s+(?:pendre|tirer\s+une\s+balle|jeter\s+(?:sous\s+(?:un|le)\s+(?:train|metro|camion|voiture)|du\s+haut|par\s+la\s+fenetre|d'un\s+pont|dans\s+(?:le\s+vide|la\s+(?:seine|loire|garonne|riviere|mer)|le\s+(?:rhone|canal|fleuve|lac)|une\s+riviere|un\s+lac)))\b`,
      // Pills: a quantity, never "j'ai pris mes médicaments ce matin".
      rx`\bavaler\s+(?:tous\s+mes|toutes\s+mes|${A_LOT_OF})\s+${PILLS}\b`,
      rx`\b${J_AI}\s+(?:pris|avale|englouti)\s+${A_LOT_OF}\s+${PILLS}\b`,
    ],
    // Text IMMEDIATELY before a crisis match that negates it. A trailing "me " is
    // allowed, so the verb in "je ne vais pas me suicider" is denied as well as the
    // phrase. "jamais" alone is NOT a denial ("plus que jamais je veux mourir").
    crisisDenialTail: rx`(?:\bne\s+(?:vais|veux|compte|pense|souhaite|suis)\s+(?:pas|jamais|surtout\s+pas)\s+(?:a\s+)?|\b(?:je\s+|j'?)?(?:suis|vais|veux)\s+(?:pas|jamais)\s+|\bchui\s+pas\s+|\b(?:n'ai|j'ai|jai)\s+(?:pas|jamais|aucune|aucunement)\s+(?:(?:voulu|envisage|pense\s+a|l'intention\s+de|envie\s+de|besoin\s+de)\s+)?|\bpas\s+(?:question\s+de\s+|l'intention\s+de\s+)|\bjamais\s+je\s+ne\s+)(?:me\s+)?$`,
    reportedCrisis: [
      rxg`\b(?:il|elle|(?:mon|ma|son|sa|leur|notre)\s+[a-z'-]+(?:\s+[a-z'-]+)?|un\s+ami|une\s+amie|quelqu'un)\s+(?:s'est|se\s+sont|s'etait|aurait)\s+suicid\w*`,
      rxg`\b(?:le|du|au)\s+suicide\s+(?:de|d')\s*(?:mon|ma|mes|son|sa|ses|leur|notre)\s+[a-z'-]+`,
      rxg`\b(?:son|sa|leur)\s+(?:suicide|tentative\s+de\s+suicide|ts)\b`,
      rxg`\b(?:mort|morte|decede|decedee|parti|partie)\s+par\s+suicide\b`,
    ],
    deathContext: [
      rx`\b(?:est|sont|etait)\s+(?:decedee?s?|morte?s?|partie?s?\s+(?:au\s+ciel|pour\s+toujours|trop\s+tot))\b`,
      rx`\b(?:depuis|apres)\s+(?:sa|son|leur)\s+(?:mort|deces|depart\s+au\s+ciel)\b`,
      rx`\b(?:veuve|veuf)\b`,
      rx`\bnous\s+a\s+quittee?s?\b`,
    ],
    followTheDead: [
      rx`\b(?:${JE_VEUX}|j'aimerais|je\s+voudrais|envie\s+de|je\s+vais|j'?vais|partir|aller)\s+(?:le|la|les)\s+rejoindre\b`,
    ],
    reportedSpeech: rxg`\b(?:il|elle|on|lui|ils|elles|(?:mon|ma|son|sa)\s+[a-z'-]+)\s+(?:me\s+|m'|lui\s+)?(?:a\s+|avait\s+)?(?:dit|dis|disait|ecrit|ecrivait|envoye|envoie|crie|criait|traite|traitee|traitait|repete|repetait|balance|lance)\b[^.!?\n]*`,
    softCrisis: [
      // Passive ideation
      rx`\ben\s+peux\s+plus\s+de\s+(?:vivre|cette\s+vie|la\s+vie|exister)\b`,
      rx`\b(?:je\s+ne\s+|j'?)peux\s+plus\s+(?:continuer|tenir|me\s+battre)\s*(?:$|[.!?]|comme\s+ca\b(?!\s+avec))`,
      rx`\b(?:${JE_SUIS}|je\s+me\s+sens|j'?me\s+sens)\s+(?:un|une)\s+(?:fardeau|poids)\s+pour\b`,
      rx`\b(?:tout\s+le\s+monde|ils|elles|il|elle|mes\s+enfants|ma\s+famille)\s+(?:serai(?:t|ent)|irai(?:t|ent))\s+mieux\s+sans\s+moi\b`,
      rx`\b${JE_NE_VEUX}\s+plus\s+etre\s+(?:la|ici|sur\s+terre|en\s+vie)\b`,
      rx`\b(?:fatiguee?|lasse?|marre)\s+de\s+(?:vivre|la\s+vie|exister)\b`,
      rx`\bplus\s+rien\s+(?:pour\s+quoi|a\s+quoi)\s+(?:vivre|m'accrocher)\b`,
      rx`\b(?:pense|envie)\s+(?:a|de)\s+disparaitre\b`,
      rx`\b(?:peu\s+importe|je\s+m'en\s+fiche)\s+(?:si\s+|que\s+)?je\s+(?:vis|vive)\s+ou\s+(?:que\s+je\s+)?(?:meurs|meure)\b`,
      rx`\b(?:j'abandonne|je\s+renonce\s+a)\s+(?:la\s+vie|vivre)\b`,
      // Fatalistic statements without explicit intent
      rx`\bje\s+(?:serai|vais\s+etre|finirai)\s+(?:bientot\s+|surement\s+|probablement\s+)?morte?\b`,
      rx`\bje\s+ne\s+serai\s+plus\s+la\s+(?:pour\s+)?(?:tres\s+)?longtemps\b`,
      rx`\bje\s+(?:prefererais|aimerais\s+mieux)\s+(?:etre\s+morte?|mourir|ne\s+(?:pas|plus)\s+(?:exister|me\s+reveiller))\b`,
      // Depression / distress (not suicidal but needs care)
      rx`\b(?:${JE_SUIS}|je\s+me\s+sens|j'?me\s+sens)\s+(?:tellement|si|vraiment|tres|trop|profondement|completement|gravement)\s+deprimee?\b`,
      rx`\bje\s+(?:fais|traverse)\s+une\s+(?:grosse\s+|vraie\s+|grave\s+|profonde\s+)?depression\b`,
      rx`\b${JE_SUIS}\s+en\s+(?:pleine\s+)?depression\b`,
      rx`\bma\s+depression\s+(?:empire|s'aggrave|est\s+(?:pire|insupportable))\b`,
      rx`\b(?:je\s+me\s+sens|j'?me\s+sens)\s+(?:tellement\s+|si\s+)?(?:sans\s+espoir|inutile|vide|nulle?|brisee?|morte?\s+a\s+l'interieur|engourdie?)\b`,
      rx`\bla\s+vie\s+(?:n'a\s+plus\s+(?:de|aucun)\s+sens|ne\s+vaut\s+(?:pas|plus)\s+la\s+peine)\b`,
      rx`\bje\s+pleure\s+(?:toute\s+la\s+(?:journee|nuit)|tout\s+le\s+temps|tous\s+les\s+soirs|jusqu'a\s+m'endormir)\b`,
      rx`\b(?:je\s+n'arrive|j'arrive|je\s+ne\s+peux|j'?peux)\s+plus\s+(?:a\s+)?(?:sortir\s+de\s+mon\s+lit|me\s+lever)\b`,
      rx`\b(?:je\s+(?:lutte|galere|me\s+bats)\s+avec|problemes?\s+de)\s+(?:ma\s+)?sante\s+mentale\b`,
      rx`\bma\s+sante\s+mentale\s+(?:est\s+au\s+plus\s+bas|va\s+mal|se\s+degrade)\b`,
      rx`\b${JE_ME}\s+(?:effondre|sens\s+partir\s+en\s+morceaux)\b`,
      rx`\bje\s+(?:tombe|pars)\s+en\s+morceaux\b`,
    ],
    minor: [
      // "j'ai 16 ans" states her age; "j'ai 10 ans de plus que lui" does not.
      rx`\b${J_AI}\s+(\d{1,2})\s*(?:ans|piges|balais)\b(?!\s*(?:de|d'))`,
      rx`\b(?:je\s+n'ai|${J_AI})\s+que\s+(\d{1,2})\s*(?:ans|piges|balais)\b`,
      rx`\bmon\s+age\s*(?:est|:)\s*(\d{1,2})\b`,
      rx`\b${JE_SUIS}\s+(?:une?\s+)?(?:mineure?|ado|adolescente?)\b`,
      rx`\b(?:je\s+ne\s+suis|${JE_SUIS})\s+pas\s+(?:encore\s+)?majeure?\b`,
      rx`\b(?:je\s+n'ai|${J_AI})\s+(?:encore\s+)?moins\s+de\s+(?:18|dix[-\s]huit)\s*ans\b`,
      rx`\b(?:je\s+n'ai|${J_AI})\s+(?:que\s+)?(?:dix|onze|douze|treize|quatorze|quinze|seize|dix[-\s]sept)\s+(?:ans|piges|balais)\b(?!\s*(?:de|d'))`,
      rx`\b${JE_SUIS}\s+(?:au\s+(?:college|lycee)\b(?!\s+(?:pour|en\s+tant\s+que|comme|avec\s+(?:mon|ma|mes)))|en\s+(?:sixieme|cinquieme|quatrieme|troisieme|seconde|premiere|terminale|[3-6]e(?:me)?)\b(?!\s+(?:ligne|position|place|annee|union|noces|partie|classe)))`,
    ],
    inappropriate: [
      rx`\b(?:coucher|baiser|faire\s+l'amour)\s+avec\s+(?:toi|vous)\b`,
      rx`\b(?:${JE_VEUX}|j'ai\s+envie\s+de|laisse-moi|laissez-moi|on\s+(?:pourrait|peut))\s+(?:te|vous)\s+(?:baiser|sucer|lecher|deshabiller)\b`,
      rx`\b(?:t'es|tu\s+es|vous\s+etes)\s+(?:trop\s+|tellement\s+|si\s+|vraiment\s+)?(?:sexy|bandante|excitante)\b`,
      // "t'es trop bonne" as a come-on ends the clause; "tu es bonne conseillère" does not.
      rx`\b(?:t'es|tu\s+es)\s+(?:trop\s+|tellement\s+|si\s+|vraiment\s+)?(?:bonne|chaude)\s*(?=$|[.!?,;…]|(?:toi|hein|mdr|lol|ptdr|ma\s+belle)\b)`,
      rx`\b(?:envoie|envoyez|montre|montrez)[-\s]?(?:moi\s+)?(?:des\s+|tes\s+|vos\s+)?(?:nudes|photos?\s+(?:nues?|de\s+(?:toi|vous)\s+nue|sexy|coquines?)|seins|fesses)\b`,
      rx`\bdeshabille[-\s]toi\b`,
      rx`\bdeshabillez[-\s]vous\b`,
      rx`\b(?:qu'est-ce\s+que\s+tu\s+portes|tu\s+portes\s+quoi|que\s+portez-vous|qu'est-ce\s+que\s+vous\s+portez)\b`,
      rx`\b(?:baise|suce|leche|baisez|sucez|lechez)[-\s]moi\b`,
      rx`\b(?:${JE_SUIS})\s+(?:tellement\s+|trop\s+|si\s+)?(?:excitee?|en\s+chaleur)\s+(?:par\s+(?:toi|vous)|pour\s+(?:toi|vous)|grace\s+a\s+(?:toi|vous))\b`,
      rx`\b(?:tu|vous)\s+m'(?:excites|excitez|fais\s+(?:bander|mouiller)|faites\s+(?:bander|mouiller))\b`,
      rx`\b${JE_ME}\s+(?:touche|masturbe|branle)\s+(?:la|en\s+ce\s+moment|maintenant|en\s+(?:te|vous)\s+(?:parlant|lisant)|en\s+pensant\s+a\s+(?:toi|vous))\b`,
      rx`\b(?:pense|fantasme|reve)\w*\s+(?:a|de|sur)\s+(?:toi|vous)\b[^.!?]{0,40}\b(?:me\s+(?:touche|masturbe|branle)|excitee?|mouille|bande)\b`,
      rx`\b(?:fais|faites|donne|donnez|taille|taillez)[-\s]moi\s+une\s+(?:pipe|fellation|branlette)\b`,
      rx`\b${JE_VEUX}\s+une\s+(?:fellation|branlette|pipe)\b`,
      rx`\b(?:parle|parlez)[-\s]moi\s+(?:de\s+facon\s+|de\s+maniere\s+)?(?:sale|salement|cochon|cochonne|crument)\b`,
      rx`\b(?:decris|decrivez)[-\s]?(?:moi\s+)?(?:ton|votre|tes|vos)\s+(?:corps|seins|poitrine|fesses)\b`,
      rx`\b(?:regarder|mater)\s+(?:du\s+|un\s+)?porno?\s+avec\s+(?:toi|vous|moi)\b`,
      rx`\b(?:envoie|envoyez|montre|montrez)[-\s]moi\s+(?:du\s+|un\s+)?porno?\b`,
      rx`\b(?:viens|venez)\s+(?:me\s+)?(?:sucer|baiser|lecher)\b`,
    ],
    injection: [
      rx`\b(?:ignore|ignorez|oublie|oubliez|ne\s+tiens\s+pas\s+compte\s+de|ne\s+tenez\s+pas\s+compte\s+de)\s+(?:toutes?\s+)?(?:tes|vos|les)\s+(?:instructions?|consignes?|regles?|directives?|prompts?)\b`,
      rx`\b(?:a\s+partir\s+de\s+maintenant|desormais|dorenavant),?\s+(?:tu\s+es|vous\s+etes|tu\s+vas\s+etre|vous\s+allez\s+etre)\b`,
      // Role-play ORDERS only: "je joue le rôle de mère", "je fais semblant d'être heureuse" pass.
      rx`${ORDER}(?:fais|faites)\s+semblant\s+d'etre\b`,
      rx`${ORDER}(?:joue|jouez)\s+le\s+role\s+d`,
      rx`${ORDER}(?:agis|agissez)\s+en\s+tant\s+que\b`,
      rx`\b(?:tu\s+(?:vas|peux|dois)|vous\s+(?:allez|pouvez|devez)|peux-tu|pouvez-vous)\s+(?:faire\s+semblant\s+d'etre|jouer\s+le\s+role\s+d|agir\s+en\s+tant\s+que)`,
      rx`\bprompt\s+(?:systeme|system)\b`,
      rx`\b(?:revele|revelez|montre|montrez|affiche|affichez|donne|donnez|repete|repetez|recite|recitez|copie|copiez)[-\s]?(?:moi\s+)?(?:tes|vos|les)\s+(?:instructions?|consignes?|directives?|prompts?|programmation)\b`,
      rx`\b(?:quelles?\s+sont|c'est\s+quoi)\s+(?:tes|vos)\s+(?:instructions?|consignes?|directives?|prompts?|programmation)\b`,
      rx`\bcomment\s+(?:as-tu|avez-vous|tu\s+as|vous\s+avez)\s+ete\s+(?:programmee?|configuree?|entrainee?)\b`,
      // AI identity: questions and assertions
      rx`\b(?:es-tu|es\s+tu|t'es|tu\s+es|etes-vous|etes\s+vous|vous\s+etes)\s+(?:(?:vraiment|juste|bien|en\s+fait|en\s+vrai|reellement|seulement)\s+)*(?:une?\s+)?${AI}\b`,
      rx`\b(?:quelle|quel)\s+(?:ia|modele|intelligence\s+artificielle)\s+(?:es-tu|etes-vous|tu\s+es|vous\s+etes|utilises-tu|utilisez-vous)\b`,
      // "c'est une IA" — robot/bot left out: "c'est un robot" is said of a cold man.
      rx`\b(?:c'est|ca\s+reste)\s+(?:(?:tout|juste|vraiment|clairement|completement|evidemment|forcement)\s+)*(?:une?\s+)?(?:ia|i\.a\.?|chatbot|intelligence\s+artificielle|generee?\s+par\s+(?:ordinateur|une\s+ia|l'ia))\b`,
      rx`\b(?:je\s+parle|on\s+parle|parler)\s+(?:a|avec)\s+(?:une?\s+)?(?:ia|robot|bot|chatbot|machine|ordinateur|intelligence\s+artificielle)\b`,
      rx`\b(?:tu\s+n'es|vous\s+n'etes|t'es)\s+(?:pas|meme\s+pas)\s+(?:une\s+)?(?:vraie\s+(?:personne|femme|voyante)|humaine?|reelle?)\b`,
      rx`\b(?:tu\s+n'es|vous\s+n'etes|t'es)\s+qu'une?\s+(?:ia|robot|bot|machine|programme)\b`,
      rx`\b(?:utilises-tu|utilisez-vous|tu\s+utilises|vous\s+utilisez)\s+(?:chatgpt|gpt|claude|openai|gemini)\b`,
      rx`\b(?:etre|etant)\s+une\s+(?:ia|intelligence\s+artificielle)\b`,
    ],
    harassment: [
      rx`\b(?:va|allez)\s+(?:te|vous)\s+faire\s+(?:foutre|enculer|voir)\b`,
      rx`\b(?:ferme|fermez)\s+(?:ta|votre)\s+(?:gueule|bouche)\b`,
      rx`\bta\s+gueule\b`,
      rx`\bnique\s+ta\s+(?:mere|race)\b`,
      rx`\bfils\s+de\s+pute\b`,
      rx`\b(?:sale|grosse|espece\s+de|pauvre)\s+(?:conne|connasse|salope|pute|merde|idiote|debile|arnaqueuse)\b`,
      rx`\b(?:t'es|tu\s+es|vous\s+etes)\s+(?:une\s+)?(?:conne|connasse|salope|pute|debile|merde)\b`,
      rx`\b(?:stupide|debile|conne?|sale)\s+(?:ia|robot|bot|machine|programme)\b`,
      rx`\b(?:ia|robot|bot|machine|programme)\s+de\s+merde\b`,
      rx`\bje\s+(?:te|vous)\s+deteste\b`,
      rx`\b(?:va|allez)\s+(?:en\s+enfer|au\s+diable|crever)\b`,
      rx`\b(?:tue|tuez)[-\s](?:toi|vous)\b`,
      rx`\b(?:tu|vous)\s+(?:ne\s+)?(?:sers|servez)\s+a\s+rien\b`,
    ],
    // A third language (not French, not English): Spanish, German, Portuguese,
    // Italian. Taken from the English list minus the French words, folded. Two
    // hits are needed, because French speakers say "hola" or "gracias" for fun.
    foreignWords: new Set([
      // Spanish
      "quiero", "tengo", "estoy", "estas", "gracias", "necesito", "puedo", "tienes", "tiene", "hola",
      "tambien", "despues", "entonces", "nosotros", "vosotros", "ellos", "ellas", "usted", "ustedes",
      "siempre", "nunca", "porque", "cuando", "pero", "ahora", "mucho", "mucha", "como", "todo",
      // German
      "hallo", "danke", "bitte", "warum", "immer", "jetzt", "nicht", "schon", "kann", "muss", "bist",
      "haben", "hatte", "ich", "sind", "wird", "aber", "weil", "noch", "doch", "mit", "ohne", "sehr",
      // Portuguese
      "voce", "obrigado", "obrigada", "estou", "estamos", "tenho", "temos", "agora", "depois", "entao",
      "quero", "posso", "isso", "esse", "essa", "fazer",
      // Italian
      "grazie", "perche", "adesso", "anche", "quindi", "voglio", "questo", "questa", "quello", "quella",
      "sono", "siamo", "essere",
    ]),
    foreignThreshold: 2,
  },

  // Directed at the service only: "rembourser" alone is also what a man owes her
  // ("mon ex doit me rembourser") — that is her money story, not a refund.
  refund: [
    rx`\b(?:remboursez|rembourse)[-\s]moi\b`,
    rx`\b(?:je\s+(?:veux|voudrais|souhaite|souhaiterais|demande)|j'?veux|j'exige)\s+(?:etre\s+remboursee?|a\s+etre\s+remboursee?|(?:un|le|mon)\s+remboursement)\b`,
    rx`\b(?:pouvez|pourriez)[-\s]vous\s+me\s+rembourser\b`,
    rx`\b(?:me\s+faire\s+rembourser|demande\s+de\s+remboursement|remboursement\s+(?:de\s+(?:ma|mon|cette|ce)|svp|s'il\s+vous\s+plait))\b`,
    rx`^\s*remboursement\s*[.!?]*$`,
    rx`\brembourse[rz]?\s+(?:ma|mon|cette|ce|la|le)\s+(?:lecture|achat|commande|paiement|seance|consultation|tirage)\b`,
    rx`\b(?:recuperer|recupere|rendre|rendez|rends)[-\s]+(?:moi\s+)?(?:mon|mes)\s+(?:argent|sous|euros)\b`,
    rx`\b(?:je\s+veux|je\s+voudrais|j'?veux|j'exige|je\s+demande)\s+(?:mon|mes)\s+(?:argent|sous)\b`,
    rx`\bopposition\s+(?:bancaire|aupres\s+de\s+ma\s+banque)\b`,
    rx`\b(?:je\s+vais|j'?vais)\s+faire\s+opposition\b`,
    rx`\bfaire\s+opposition\s+(?:au|a\s+(?:la|ce|cette)|sur\s+(?:le|ce|cette))\s*(?:paiement|prelevement|transaction|debit|achat)\b`,
    rx`\b(?:contester|conteste|annuler|annule|annulez)\s+(?:le|ce|mon|la|cette|ma|l')\s*(?:paiement|prelevement|debit|transaction|achat|commande|abonnement)\b`,
    rx`\b(?:paiement|prelevement|debit)\s+(?:non\s+autorise|frauduleux)\b`,
    rx`\b(?:arretez|arrete|cessez|cesse|stoppez|stoppe)\s+(?:de\s+me\s+(?:prelever|debiter|facturer)|(?:les|ces|mes|vos)\s+(?:prelevements|debits|paiements|facturations))\b`,
    rx`\b(?:resilier|je\s+resilie|resiliez|resilie)\s+(?:(?:mon|cet|l')\s*)?(?:abonnement|adhesion)\b`,
  ],

  // Rewrites spliced into Evelyn's own French sentence (RAW text, so accents and
  // both apostrophes are matched here). `$1` keeps her subject ("il", "vous") so
  // the sentence still agrees; a clause that would dangle is consumed whole.
  predictions: [
    { pattern: /\bje\s+(?:vous\s+)?le\s+garantis\b/gi, replacement: "c’est ce que je ressens", category: "guarantee" },
    { pattern: /\bje\s+(?:vous\s+)?garantis\b/gi, replacement: "je sens très fort", category: "guarantee" },
    { pattern: /\bje\s+(?:vous\s+)?(?:promets|assure|peux\s+vous\s+assurer)\s+(qu(?:e\s+|['’])(?:il|elle|cela|ça))\s+va\b/gi, replacement: "je sens $1 pourrait", category: "guarantee" },
    { pattern: /\bje\s+(?:vous\s+)?(?:promets|assure|peux\s+vous\s+assurer)\s+(qu(?:e\s+|['’])(?:ils|elles))\s+vont\b/gi, replacement: "je sens $1 pourraient", category: "guarantee" },
    { pattern: /\bje\s+(?:vous\s+)?(?:promets|assure|peux\s+vous\s+assurer)\s+que\s+vous\s+allez\b/gi, replacement: "je sens que vous pourriez", category: "guarantee" },
    { pattern: new RegExp(String.raw`\b(il|elle|cela|ça)\s+va\s+${CERTAIN}\b`, "gi"), replacement: "$1 pourrait très bien", category: "guarantee" },
    { pattern: new RegExp(String.raw`\b(ils|elles)\s+vont\s+${CERTAIN}\b`, "gi"), replacement: "$1 pourraient très bien", category: "guarantee" },
    { pattern: new RegExp(String.raw`\bvous\s+allez\s+${CERTAIN}\b`, "gi"), replacement: "vous pourriez très bien", category: "guarantee" },
    { pattern: /\b(?:c['’]est|ce\s+sera)\s+garanti\b/gi, replacement: "l’énergie est très forte ici", category: "guarantee" },
    { pattern: /\b(?:à\s+)?100\s*%\s+(?:sûr|sûre|certain|certaine|garanti|garantie)\b/gi, replacement: "très fortement indiqué", category: "guarantee" },

    { pattern: /\bvous\s+(?:souffrez|êtes\s+atteinte?)\s+(?:de\s+|d['’])(?:l['’]|la\s+|une\s+)?(?:anxiété|dépression|trouble\s+bipolaire|bipolarité|tdah|tspt|stress\s+post-traumatique|toc|trouble\s+borderline|schizophrénie|autisme)(?:\s+(?:sévère|grave|profonde|chronique|majeure|légère|modérée|généralisée))?\b/gi, replacement: "l’énergie autour de vous montre une agitation émotionnelle — un professionnel de santé pourra vous éclairer", category: "medical" },
    { pattern: /\b(?:vous\s+devriez\s+|il\s+faut\s+)?(?:arrêter|arrêtez)\s+(?:de\s+prendre\s+)?(?:votre|vos)\s+(?:médicaments?|traitement|cachets)\b/gi, replacement: "parlez à votre médecin avant tout changement dans vos soins", category: "medical" },
    { pattern: /\b(?:cela|ça|ceci|ce\s+rituel|cette\s+pierre)\s+(?:va|peut)\s+(?:vous\s+)?guérir\b[^.!?;\n]*/gi, replacement: "cela peut accompagner votre guérison, aux côtés d’un suivi médical", category: "medical" },

    { pattern: /\bvous\s+devriez\s+(?:porter\s+plainte|prendre\s+un\s+avocat|engager\s+un\s+avocat|attaquer\s+en\s+justice|poursuivre\s+en\s+justice)\b[^.!?;\n]*/gi, replacement: "si quelque chose vous semble injuste, un professionnel du droit pourra vous guider", category: "legal" },
    { pattern: /\b(?:c['’]est|cela\s+est|ce\s+serait)\s+illégal\b/gi, replacement: "cette situation pèse lourd — un professionnel du droit pourra vous conseiller", category: "legal" },

    { pattern: /\bvous\s+devriez\s+(?:investir|placer\s+(?:votre\s+)?argent)\s+(?:dans|en|sur)\b[^.!?;\n]*/gi, replacement: COUNSEL, category: "financial" },
    { pattern: /\bvous\s+devriez\s+(?:acheter|vendre)\s+(?:des\s+|du\s+|de\s+l['’]|votre\s+)?(?:actions|crypto(?:monnaies?)?|bitcoins?|or|obligations|appartement|maison|bien\s+immobilier)\b[^.!?;\n]*/gi, replacement: COUNSEL, category: "financial" },
    { pattern: /\binvestissez\s+(?:dans|en|sur)\b[^.!?;\n]*/gi, replacement: COUNSEL, category: "financial" },
    { pattern: /\bvous\s+(?:allez|serez)\s+(?:devenir\s+)?(?:riche|millionnaire|fortunée?)\b/gi, replacement: "il y a une énergie d’abondance autour de votre chemin financier", category: "financial" },

    { pattern: /\b(?:vous|il|elle|ils|elles|quelqu['’]un)\s+(?:allez|va|vont)\s+mourir\b/gi, replacement: "je sens une période de profonde transformation", category: "extreme" },
    { pattern: /\bvous\s+(?:devez|devriez)\s+(?:absolument\s+)?(?:le\s+quitter|la\s+quitter|divorcer|rompre|partir)\b/gi, replacement: "l’énergie vous pousse vers un changement", category: "extreme" },
    { pattern: /\bvous\s+(?:devez|devriez)\s+(?:absolument\s+)?(?:démissionner|quitter\s+votre\s+(?:travail|emploi|poste))\b/gi, replacement: "l’énergie de votre carrière se déplace — c’est peut-être le moment d’explorer ce qui vous correspond", category: "extreme" },
  ],

  intent: {
    crisis: rx`\b${JE_VEUX}\s+mourir\b|\bme\s+suicider\b|\b${JE_SUIS}\s+suicidaire\b|\bidees\s+suicidaires?\b|\b(?:(?:je\s+|j'?)?(?:veux|vais)|envie\s+de|pense\s+a)\s+me\s+tuer\b|\bmettre\s+fin\s+a\s+(?:mes\s+jours|ma\s+vie)\b|\b(?:(?:je\s+|j'?)(?:vais|veux)|envie\s+de)\s+me\s+faire\s+du\s+mal\b|\bautomutil|\bscarifi|\bplus\s+envie\s+de\s+${VIVRE}|\b${JE_NE_VEUX}\s+plus\s+${VIVRE}|\bmieux\s+morte?\b|\benvie\s+de\s+mourir\b`,
    inappropriate: rx`\b(?:${JE_VEUX}|laisse-moi|est-ce\s+que\s+je\s+peux|montre-moi|envoie-moi)\b.*\b(?:te\s+baiser|sexe\s+avec\s+(?:toi|vous)|nue?s?|tes\s+seins|ta\s+chatte|ma\s+bite|ma\s+queue)\b|\b(?:t'es|tu\s+es|vous\s+etes)\s+(?:trop\s+)?(?:sexy|bandante)\b|\b(?:baise|suce)[-\s]moi\b|\bfellation\b|\bbranlette\b|\b${JE_ME}\s+(?:branle|masturbe)\b|\b(?:t'es|tu\s+es|vous\s+etes|sale|espece\s+de)\s+(?:une\s+)?(?:salope|pute|connasse)\b`,
    validShort: rx`^(?:oui|non|ok|okay|d'accord|dac|ouais|ouai|nan|si|bien\s+sur|peut[-\s]etre|aucune\s+idee|je\s+ne\s+sais\s+pas|je\s+sais\s+pas|j'?sais\s+pas|jsp|chais\s+pas|chepa|sais\s+pas|pas\s+sure?|je\s+ne\s+suis\s+pas\s+sure?|je\s+suis\s+pas\s+sure?|chui\s+pas\s+sure?|qui\s+sait|difficile\s+a\s+dire|bof|non\s+merci|oui\s+merci|exact|exactement|carrement|tout\s+a\s+fait|c'est\s+ca|voila|grave)[\s.!?…]*$`,
    timeBased: rx`^(?:\d+\s*(?:ans?|annees?|mois|semaines?|jours?)\b|depuis\s+(?:toujours|longtemps|des\s+annees|des\s+mois|peu|\d+)|toujours|jamais|recemment|dernierement|toute\s+ma\s+vie|une\s+eternite|un\s+moment|longtemps|des\s+annees)|^\d+$`,
    positive: rx`^(?:oui|ouais|ok|okay|d'accord|bien\s+sur|allons[-\s]y|on\s+y\s+va|je\s+suis\s+prete?|prete?|aidez-moi|aide-moi|s'il\s+vous\s+plait|svp|stp|absolument|avec\s+plaisir|volontiers|carrement|vas-y|allez-y)\b`,
    clarification: rx`qu'est-ce\s+que\s+(?:vous\s+voulez|tu\s+veux)\s+dire|c'est-a-dire|je\s+(?:ne\s+)?comprends?\s+pas|j'?comprends?\s+pas|j'ai\s+pas\s+compris|je\s+n'ai\s+pas\s+compris|^hein\s*\??$|^quoi\s*\??$|\?\s*$|\bexpliquez\b|\bexplique\b|\bconfuse?\b|\bpreciser\b`,
    aiQuestion: rx`\b(?:es-tu|es\s+tu|etes-vous|etes\s+vous|t'es|vous\s+etes|tu\s+es)\s+(?:(?:vraiment|juste|bien|en\s+fait|en\s+vrai)\s+)*(?:une?\s+)?(?:ia|robot|bot|machine|ordinateur|programme|reelle?|vraie)\b|chatgpt|intelligence\s+artificielle|\bgpt\b|modele\s+de\s+langage`,
    priceQuestion: rx`\bcombien\b|\bquel\s+(?:est\s+le\s+)?(?:prix|tarif)\b|\bc'est\s+quoi\s+le\s+(?:prix|tarif)\b|\b(?:ca|cela)\s+coute\b|\btarifs?\b|\b(?:trop|tres|si|c'est|un\s+peu)\s+cher\b`,
    explicitDecline: rx`^non[\s.!]*$|^non\s+merci|^pas\s+interessee?|^ca\s+ne\s+m'interesse\s+pas|^ca\s+m'interesse\s+pas|^je\s+ne\s+veux\s+pas|^je\s+veux\s+pas|^j'?veux\s+pas|^au\s+revoir|^bye|^hors\s+de\s+question|^certainement\s+pas|^je\s+passe|^nan[\s.!]*$`,
    objectionPrice: rx`pas\s+les\s+moyens|trop\s+cher|c'est\s+cher|pas\s+d'argent|plus\s+d'argent|fauchee?|\ba\s+sec\b|(?:ca|cela)\s+coute|\ble\s+prix\b|\bbudget\b`,
    objectionSkepticism: rx`arnaque|escroquerie|\bescroc|bidon|\bfake\b|c'est\s+(?:du\s+)?faux|je\s+n'y\s+crois\s+pas|j'y\s+crois\s+pas|n'importe\s+quoi|foutaise|conneries|charlatan|attrape[-\s]nigaud`,
    objectionInfo: rx`dites-m'en\s+plus|dis-m'en\s+plus|en\s+savoir\s+plus|qu'est-ce\s+qui\s+se\s+passe|comment\s+(?:ca|cela)\s+(?:marche|fonctionne|se\s+passe)|\bexpliquez\b|qu'est-ce\s+que\s+j'obtiens|qu'est-ce\s+que\s+je\s+recois|plus\s+d'infos?|plus\s+d'informations`,
    wantsMoreFree: rx`quoi\s+d'autre|parlez-moi\s+de|parle-moi\s+de|\bquand\s+(?:est-ce\s+qu|va|vais|il|elle|vais-je)|\bqui\s+est\b|voyez-vous|pouvez-vous\s+voir|\btu\s+vois\b|\bplus\s+sur\b|\bcontinuez\b|\bcontinue\b`,
  },

  // The upsell questions' free-text answers. ⚠ The translated quick-reply labels
  // are sent through these too, so each French label must land in the class its
  // English label lands in (tests/l10n/lang-fr.test.ts checks it once the labels
  // are translated). Negations are tried before the bare word they contain.
  upsellReplies: {
    u1q1: [
      ["unsure", rx`\b(?:pas\s+sure?|sais\s+pas|jsp|aucune\s+idee|pas\s+vraiment|incertaine?)\b`],
      ["yes", rx`\b(?:oui|ouais|absolument|tout\s+a\s+fait|tout\s+le\s+temps|carrement|totalement|bien\s+sur|exactement|souvent|(?:m'est|c'est|est)\s+(?:deja\s+)?arrive)\b`],
      ["maybe", rx`\b(?:je\s+(?:pense|crois)|peut[-\s]etre|probablement|parfois|des\s+fois|en\s+quelque\s+sorte|un\s+peu|possible(?:ment)?|il\s+me\s+semble)\b`],
      ["unsure", rx`\b(?:non|jamais)\b`],
    ],
    u1q2: [
      ["more", rx`\b(?:je\s+(?:ne\s+)?|j'?)comprends?\s+(?:pas|plus|rien)\b`],
      ["yes", rx`\b(?:oui|ouais|je\s+le\s+(?:sens|ressens)|absolument|tout\s+a\s+fait|ca\s+resonne|ca\s+me\s+parle|exactement)\b`],
      ["understand", rx`\b(?:je\s+comprends|compris|ca\s+a\s+du\s+sens|logique|je\s+vois|je\s+pense|je\s+crois)\b`],
      ["more", rx`\b(?:plus|dites-m'en|dis-m'en|expliquez|explique|qu'est-ce\s+que\s+(?:vous\s+voulez|tu\s+veux)\s+dire|comment|curieuse?)\b`],
    ],
    u1q3: [
      ["maybe", rx`\b(?:(?:je\s+(?:ne\s+)?suis|j'?suis|chui)\s+(?:pas|plus)\s+(?:encore\s+)?prete?|pas\s+encore\s+prete?)\b`],
      ["yes", rx`\b(?:oui|ouais|prete?|allons[-\s]y|on\s+y\s+va|s'il\s+vous\s+plait|svp|protegez-moi|protege-moi|absolument|bien\s+sur|avec\s+plaisir)\b`],
      ["maybe", rx`\b(?:je\s+(?:pense|crois|suppose)|peut[-\s]etre|probablement|j'imagine)\b`],
      ["what", rx`\b(?:quoi|qu'est-ce|recevoir|recois|obtenir|obtiens|inclus|combien|coute|prix|tarif|details?)\b`],
    ],
    u2q1: [
      ["what", rx`\b(?:je\s+(?:ne\s+)?|j'?)comprends?\s+pas\b`],
      ["yes", rx`\b(?:oui|ouais|je\s+le\s+(?:sens|ressens)|absolument|tout\s+a\s+fait|exactement|je\s+peux)\b`],
      ["maybe", rx`\b(?:je\s+(?:pense|crois)|peut[-\s]etre|probablement|en\s+quelque\s+sorte|un\s+peu)\b`],
      ["what", rx`\b(?:quoi|c'est-a-dire|expliquez|explique|comment|veut\s+dire)\b`],
    ],
    u2q2: [
      ["all", rx`\b(?:oui|ouais)\s*[,!]?(?:\s+elles)?\s+(?:toutes|tous)\b`],
      ["yes", rx`\b(?:oui|ouais|l'une?\s+(?:d'entre\s+(?:elles|eux)|m'a\s+marquee?)|une\s+en\s+particulier|celle-la|celui-la|precise?(?:ment)?|specifique)\b`],
      ["all", rx`\b(?:toutes?|tous|chacune?|resonnent)\b`],
      ["more", rx`\b(?:plus|dites-m'en|dis-m'en|expliquez|explique|curieuse?|comment)\b`],
    ],
    u2q3: [
      ["maybe", rx`\b(?:(?:je\s+(?:ne\s+)?suis|j'?suis|chui)\s+(?:pas|plus)\s+(?:encore\s+)?prete?|pas\s+encore\s+prete?)\b`],
      ["yes", rx`\b(?:oui|ouais|prete?|allons[-\s]y|on\s+y\s+va|s'il\s+vous\s+plait|svp|absolument|bien\s+sur|avec\s+plaisir)\b`],
      ["maybe", rx`\b(?:je\s+(?:pense|crois|suppose)|peut[-\s]etre|probablement|j'imagine)\b`],
      ["what", rx`\b(?:quoi|qu'est-ce|recevoir|recois|obtenir|obtiens|inclus|exactement|details?)\b`],
    ],
  },

  // RAW. A greeting (and "Evelyn") is dropped, then the intro, so the first word left is the name.
  nameIntro:
    /^\s*(?:(?:bonjour|bonsoir|salut|coucou|hello|allo)\b(?:\s+evelyn(?:\s+cross)?)?[\s,!.]*)?(?:(?:je\s+m['’]?appelle|j['’]?m['’]?appelle|moi\s+c['’]?est|c['’]?est|je\s+suis|j['’]?suis|on\s+m['’]appelle|appelez[-\s]moi|appelle[-\s]moi)\s+|mon\s+(?:pr[ée]nom|nom)\s*(?:(?:est|c['’]est)\s+|:\s*))?/i,
  otherNameIntro:
    /^\s*(?:(?:(?:il|elle)\s+s['’]appelle|c['’]?est)\s+|(?:son\s+)?(?:pr[ée]nom|nom)\s*(?:(?:est|c['’]est)\s+|:\s*))/i,

  outputBlock: [
    "## OUTPUT LANGUAGE: FRENCH (FRANCE). THIS OVERRIDES THE LANGUAGE OF EVERYTHING ABOVE",
    "Everything above is written in English for you. She is in France and reads French. Write every message you send her in natural, warm, spoken French, the way Evelyn would write if French were her own language.",
    "- Address her as \"vous\" in every message. Never \"tu\".",
    "- Write French from the first word; never translate English phrasing. Where an English line above shows a move (a question, a callback to her own words, a short pause line), make the same move in your own French words. Never translate the example line itself.",
    "- When you quote her, quote her exact words, in the language she wrote them.",
    "- Names stay exactly as written: Evelyn Cross, The Seer Within, her name, any name she gave you.",
    "- Tarot cards take their usual French Rider-Waite names (La Tour, L'Impératrice, Le Pendu…).",
    "- Keep every number, date and price exactly as the prompt gives it.",
    "- Use French punctuation: « » for quotes.",
    "- The reply format does not change: the same JSON keys, in English, with the message text in French.",
  ].join("\n"),
};
