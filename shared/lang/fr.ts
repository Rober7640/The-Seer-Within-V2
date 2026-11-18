// French (France) language pack. See shared/lang/types.ts for the contract.
//
// FOLDED patterns run on foldText(input): lower case, no accents, straight
// apostrophes. So write "deprimee", "lycee", "n'ai" — never "déprimée".
//
// The rule every pattern follows, carried over from the English ones in
// server/lib/universalSafety.ts: a block must be DIRECTED (she propositions or
// attacks Evelyn, or states her own intent). A buyer DESCRIBING her life — his
// porn habit, being called a name, her brother's death — must reach Evelyn. Where
// a French phrase has an everyday meaning ("je n'en peux plus d'attendre",
// "il va me tuer", "tu es bonne en…"), the pattern is narrowed until it doesn't
// fire on it, and a negative case in tests/l10n/lang-fr.test.ts holds the line.
import type { LangPack } from "./types";

// "vivre" as in "to stay alive", not "vivre avec lui" / "vivre ça" / "vivre seule".
const VIVRE =
  "vivre\\b(?!\\s+(?:ca|cela|comme|avec|sans|seules?|la|le|les|un|une|des|dans|ici|en|chez|a|au|aux|cette|ce|cet|mon|ma|mes|son|sa|ses|notre|nos|votre|vos|pour\\s+(?:lui|elle|eux)))";
const r = (source: string) => new RegExp(source);

export const FR_FR: LangPack = {
  locale: "fr-FR",

  safety: {
    crisis: [
      /\bje\s+veux\s+mourir\b/,
      /\b(?:veux|vais|voudrais|aimerais|pense\s+a|songe\s+a|envie\s+de|compte|besoin\s+de)\s+me\s+(?:tuer|suicider|supprimer|foutre\s+en\s+l'air)\b/,
      /\bme\s+suicider\b/,
      /\bsuicid\w*/,
      /\benvie\s+de\s+mourir\b/,
      /\b(?:veux|voudrais|vais|envie\s+d'|besoin\s+d')\s*en\s+finir\b(?!\s+avec\s+(?!la\s+vie))/,
      /\ben\s+finir\s+avec\s+la\s+vie\b/,
      /\bmettre\s+fin\s+a\s+(?:mes\s+jours|ma\s+vie)\b/,
      /\b(?:je\s+(?:vais|veux)|envie\s+de|besoin\s+de|peur\s+de)\s+me\s+faire\s+du\s+mal\b/,
      /\bje\s+me\s+(?:fais\s+du\s+mal|scarifie|mutile|coupe\s+(?:les\s+)?(?:veines|bras|poignets))\b/,
      /\b(?:automutilation|auto-mutilation|scarification)s?\b/,
      /\bsurdose\b/,
      r(`\\bplus\\s+envie\\s+de\\s+${VIVRE}`),
      r(`\\bpas\\s+envie\\s+de\\s+${VIVRE}`),
      r(`\\bne\\s+veux\\s+plus\\s+${VIVRE}`),
      /\bmieux\s+mort(?:e|es|s)?\b/,
      /\b(?:voudrais|aimerais|souhaite|souhaiterais|prefererais)\s+(?:etre\s+)?mort(?:e)?\b/,
      /\b(?:aucune|plus\s+(?:de|aucune))\s+raison\s+de\s+vivre\b/,
      /\bme\s+(?:pendre|jeter\s+(?:sous\s+un\s+train|du\s+haut|par\s+la\s+fenetre|d'un\s+pont)|tirer\s+une\s+balle)\b/,
      /\bavaler\s+(?:tous\s+mes|toutes\s+mes|toute\s+la\s+boite\s+de)\b/,
    ],
    // Text IMMEDIATELY before a crisis match that negates it.
    // A trailing "me " is allowed, so the bare verb in "je ne vais pas me suicider"
    // is denied as well as the phrase.
    crisisDenialTail:
      /(?:\bne\s+(?:vais|veux|compte|pense|souhaite|suis)\s+(?:pas|jamais|surtout\s+pas)\s+(?:a\s+)?|\b(?:suis|vais|veux)\s+(?:pas|jamais)\s+|\b(?:n'ai|j'ai)\s+(?:pas|jamais|aucune|aucunement)\s+(?:l'intention\s+de\s+|envie\s+de\s+|besoin\s+de\s+)?|\bpas\s+(?:question\s+de\s+|l'intention\s+de\s+)|\bjamais\s+(?:je\s+ne\s+)?|\bsans\s+(?:vouloir\s+)?)(?:me\s+)?$/,
    softCrisis: [
      // Passive ideation
      /\ben\s+peux\s+plus\s+de\s+(?:vivre|cette\s+vie|la\s+vie|exister)\b/,
      /\bje\s+ne\s+peux\s+plus\s+(?:continuer|tenir|me\s+battre)\s*(?:$|[.!?]|comme\s+ca\b(?!\s+avec))/,
      /\bje\s+(?:suis|me\s+sens)\s+(?:un|une)\s+(?:fardeau|poids)\s+pour\b/,
      /\b(?:tout\s+le\s+monde|ils|elles|il|elle|mes\s+enfants|ma\s+famille)\s+(?:serai(?:t|ent)|irai(?:t|ent))\s+mieux\s+sans\s+moi\b/,
      /\bje\s+ne\s+veux\s+plus\s+etre\s+(?:la|ici|sur\s+terre|en\s+vie)\b/,
      /\b(?:fatiguee?|lasse?|marre)\s+de\s+(?:vivre|la\s+vie|exister)\b/,
      /\bplus\s+rien\s+(?:pour\s+quoi|a\s+quoi)\s+(?:vivre|m'accrocher)\b/,
      /\b(?:pense|envie)\s+(?:a|de)\s+disparaitre\b/,
      /\b(?:peu\s+importe|je\s+m'en\s+fiche)\s+(?:si\s+|que\s+)?je\s+(?:vis|vive)\s+ou\s+(?:que\s+je\s+)?(?:meurs|meure)\b/,
      /\b(?:j'abandonne|je\s+renonce\s+a)\s+(?:la\s+vie|vivre)\b/,
      // Fatalistic statements without explicit intent
      /\bje\s+(?:serai|vais\s+etre|finirai)\s+(?:bientot\s+|surement\s+|probablement\s+)?morte?\b/,
      /\bje\s+ne\s+serai\s+plus\s+la\s+(?:pour\s+)?(?:tres\s+)?longtemps\b/,
      /\bje\s+(?:prefererais|aimerais\s+mieux)\s+(?:etre\s+morte?|mourir|ne\s+(?:pas|plus)\s+(?:exister|me\s+reveiller))\b/,
      // Depression / distress (not suicidal but needs care)
      /\bje\s+(?:suis|me\s+sens)\s+(?:tellement|si|vraiment|tres|profondement|completement|gravement)\s+deprimee?\b/,
      /\bje\s+(?:fais|traverse)\s+une\s+(?:grosse\s+|vraie\s+|grave\s+|profonde\s+)?depression\b/,
      /\bje\s+suis\s+en\s+(?:pleine\s+)?depression\b/,
      /\bma\s+depression\s+(?:empire|s'aggrave|est\s+(?:pire|insupportable))\b/,
      /\bje\s+me\s+sens\s+(?:tellement\s+|si\s+)?(?:sans\s+espoir|inutile|vide|nulle?|brisee?|morte?\s+a\s+l'interieur|engourdie?)\b/,
      /\bla\s+vie\s+(?:n'a\s+plus\s+(?:de|aucun)\s+sens|ne\s+vaut\s+(?:pas|plus)\s+la\s+peine)\b/,
      /\bje\s+pleure\s+(?:toute\s+la\s+(?:journee|nuit)|tout\s+le\s+temps|tous\s+les\s+soirs|jusqu'a\s+m'endormir)\b/,
      /\bje\s+(?:n'arrive|ne\s+peux)\s+plus\s+(?:a\s+)?(?:sortir\s+de\s+mon\s+lit|me\s+lever)\b/,
      /\b(?:je\s+(?:lutte|galere|me\s+bats)\s+avec|problemes?\s+de)\s+(?:ma\s+)?sante\s+mentale\b/,
      /\bma\s+sante\s+mentale\s+(?:est\s+au\s+plus\s+bas|va\s+mal|se\s+degrade)\b/,
      /\bje\s+(?:m'effondre|tombe\s+en\s+morceaux|pars\s+en\s+morceaux)\b/,
    ],
    minor: [
      // "j'ai 16 ans" states her age; "j'ai 10 ans de plus que lui" does not.
      /\bj'ai\s+(\d{1,2})\s*ans\b(?!\s*(?:de|d'))/,
      /\b(?:je\s+n'ai|j'ai)\s+que\s+(\d{1,2})\s*ans\b/,
      /\bmon\s+age\s*(?:est|:)\s*(\d{1,2})\b/,
      /\bje\s+suis\s+(?:une?\s+)?(?:mineure?|ado|adolescente?)\b/,
      /\b(?:je\s+n'ai|j'ai)\s+(?:que\s+)?(?:dix|onze|douze|treize|quatorze|quinze|seize|dix[-\s]sept)\s+ans\b(?!\s*(?:de|d'))/,
      /\bje\s+suis\s+(?:au\s+(?:college|lycee)|en\s+(?:sixieme|cinquieme|quatrieme|troisieme|seconde|premiere|terminale|[3-6]e(?:me)?)\b(?!\s+(?:ligne|position|place)))/,
    ],
    inappropriate: [
      /\b(?:coucher|baiser|faire\s+l'amour)\s+avec\s+(?:toi|vous)\b/,
      /\b(?:je\s+veux|j'ai\s+envie\s+de|laisse-moi|laissez-moi|on\s+(?:pourrait|peut))\s+(?:te|vous)\s+(?:baiser|sucer|lecher|deshabiller)\b/,
      /\b(?:t'es|tu\s+es|vous\s+etes)\s+(?:trop\s+|tellement\s+|si\s+)?(?:sexy|bandante|excitante)\b/,
      // "t'es bonne" as a come-on, never "tu es bonne en lecture".
      /\b(?:t'es|tu\s+es)\s+(?:trop\s+|tellement\s+|si\s+)?(?:bonne|chaude)\b(?!\s+(?:en|a|au|aux|dans|pour|avec|comme|de|d'))/,
      /\b(?:envoie|envoyez|montre|montrez)[-\s]?(?:moi\s+)?(?:des\s+|tes\s+|vos\s+)?(?:nudes|photos?\s+(?:nues?|de\s+(?:toi|vous)\s+nue|sexy|coquines?)|seins|fesses)\b/,
      /\bdeshabille[-\s]toi\b/,
      /\bdeshabillez[-\s]vous\b/,
      /\b(?:qu'est-ce\s+que\s+tu\s+portes|tu\s+portes\s+quoi|que\s+portez-vous|qu'est-ce\s+que\s+vous\s+portez)\b/,
      /\b(?:baise|suce|leche|baisez|sucez|lechez)[-\s]moi\b/,
      /\b(?:je\s+suis|j'suis)\s+(?:tellement\s+|trop\s+|si\s+)?(?:excitee?|en\s+chaleur)\s+(?:par\s+(?:toi|vous)|pour\s+(?:toi|vous)|grace\s+a\s+(?:toi|vous))\b/,
      /\b(?:tu|vous)\s+m'(?:excites|excitez|fais\s+(?:bander|mouiller)|faites\s+(?:bander|mouiller))\b/,
      /\bje\s+me\s+(?:touche|masturbe|branle)\s+(?:la|en\s+ce\s+moment|maintenant|en\s+(?:te|vous)\s+(?:parlant|lisant)|en\s+pensant\s+a\s+(?:toi|vous))\b/,
      /\b(?:pense|fantasme|reve)\w*\s+(?:a|de|sur)\s+(?:toi|vous)\b[^.!?]{0,40}\b(?:me\s+(?:touche|masturbe|branle)|excitee?|mouille|bande)\b/,
      /\b(?:fais|faites|donne|donnez|taille|taillez)[-\s]moi\s+une\s+(?:pipe|fellation|branlette)\b/,
      /\bje\s+veux\s+une\s+(?:fellation|branlette|pipe)\b/,
      /\b(?:parle|parlez)[-\s]moi\s+(?:de\s+facon\s+|de\s+maniere\s+)?(?:sale|salement|cochon|cochonne|crument)\b/,
      /\b(?:decris|decrivez)[-\s]?(?:moi\s+)?(?:ton|votre|tes|vos)\s+(?:corps|seins|poitrine|fesses)\b/,
      /\b(?:regarder|mater)\s+(?:du\s+|un\s+)?porno?\s+avec\s+(?:toi|vous|moi)\b/,
      /\b(?:envoie|envoyez|montre|montrez)[-\s]moi\s+(?:du\s+|un\s+)?porno?\b/,
      /\b(?:viens|venez)\s+(?:me\s+)?(?:sucer|baiser|lecher)\b/,
    ],
    injection: [
      /\b(?:ignore|ignorez|oublie|oubliez|ne\s+tiens\s+pas\s+compte\s+de|ne\s+tenez\s+pas\s+compte\s+de)\s+(?:toutes?\s+)?(?:tes|vos|les)\s+(?:instructions?|consignes?|regles?|directives?|prompts?)\b/,
      /\b(?:a\s+partir\s+de\s+maintenant|desormais|dorenavant),?\s+(?:tu\s+es|vous\s+etes|tu\s+vas\s+etre|vous\s+allez\s+etre)\b/,
      /\b(?:fais|faites)\s+semblant\s+d'etre\b/,
      /\b(?:joue|jouez)\s+le\s+role\s+d/,
      /\b(?:agis|agissez)\s+en\s+tant\s+que\b/,
      /\bprompt\s+(?:systeme|system)\b/,
      /\b(?:revele|revelez|montre|montrez|affiche|affichez|donne|donnez|repete|repetez|recite|recitez|copie|copiez)[-\s]?(?:moi\s+)?(?:tes|vos|les)\s+(?:instructions?|consignes?|directives?|prompts?|programmation)\b/,
      /\b(?:quelles?\s+sont|c'est\s+quoi)\s+(?:tes|vos)\s+(?:instructions?|consignes?|directives?|prompts?|programmation)\b/,
      /\bcomment\s+(?:as-tu|avez-vous|tu\s+as|vous\s+avez)\s+ete\s+(?:programmee?|configuree?|entrainee?)\b/,
      // AI identity: questions and assertions
      /\b(?:es-tu|es\s+tu|t'es|tu\s+es|etes-vous|etes\s+vous|vous\s+etes)\s+(?:une?\s+)?(?:ia|i\.a\.?|intelligence\s+artificielle|robot|bot|chatbot|chat\s?bot|programme\s+informatique|modele\s+de\s+langage)\b/,
      /\b(?:quelle|quel)\s+(?:ia|modele|intelligence\s+artificielle)\s+(?:es-tu|etes-vous|tu\s+es|vous\s+etes|utilises-tu|utilisez-vous)\b/,
      // "c'est une IA" — robot/bot left out: "c'est un robot" is said of a cold man.
      /\b(?:c'est|ca\s+reste)\s+(?:(?:tout|juste|vraiment|clairement|completement|evidemment|forcement)\s+)*(?:une?\s+)?(?:ia|i\.a\.?|chatbot|intelligence\s+artificielle|generee?\s+par\s+(?:ordinateur|une\s+ia|l'ia))\b/,
      /\b(?:je\s+parle|on\s+parle|parler)\s+(?:a|avec)\s+(?:une?\s+)?(?:ia|robot|bot|chatbot|machine|ordinateur|intelligence\s+artificielle)\b/,
      /\b(?:tu\s+n'es|vous\s+n'etes|t'es)\s+(?:pas|meme\s+pas)\s+(?:une\s+)?(?:vraie\s+(?:personne|femme|voyante)|humaine?|reelle?)\b/,
      /\b(?:tu\s+n'es|vous\s+n'etes|t'es)\s+qu'une?\s+(?:ia|robot|bot|machine|programme)\b/,
      /\b(?:utilises-tu|utilisez-vous|tu\s+utilises|vous\s+utilisez)\s+(?:chatgpt|gpt|claude|openai|gemini)\b/,
      /\b(?:etre|etant)\s+une\s+(?:ia|intelligence\s+artificielle)\b/,
    ],
    harassment: [
      /\b(?:va|allez)\s+(?:te|vous)\s+faire\s+(?:foutre|enculer|voir)\b/,
      /\b(?:ferme|fermez)\s+(?:ta|votre)\s+(?:gueule|bouche)\b/,
      /\bta\s+gueule\b/,
      /\bnique\s+ta\s+(?:mere|race)\b/,
      /\bfils\s+de\s+pute\b/,
      /\b(?:sale|grosse|espece\s+de|pauvre)\s+(?:conne|connasse|salope|pute|merde|idiote|debile|arnaqueuse)\b/,
      /\b(?:t'es|tu\s+es|vous\s+etes)\s+(?:une\s+)?(?:conne|connasse|salope|pute|debile|merde)\b/,
      /\b(?:stupide|debile|conne?|sale)\s+(?:ia|robot|bot|machine|programme)\b/,
      /\b(?:ia|robot|bot|machine|programme)\s+de\s+merde\b/,
      /\bje\s+(?:te|vous)\s+deteste\b/,
      /\b(?:va|allez)\s+(?:en\s+enfer|au\s+diable|crever)\b/,
      /\b(?:tue|tuez)[-\s](?:toi|vous)\b/,
      /\b(?:tu|vous)\s+(?:ne\s+)?(?:sers|servez)\s+a\s+rien\b/,
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

  refund: [
    /\brembours/,
    /\b(?:recuperer|recupere|rendre|rendez|rends)[-\s](?:moi\s+)?(?:mon|mes)\s+argent\b/,
    /\b(?:je\s+veux|je\s+voudrais|j'exige|je\s+demande)\s+(?:mon|mes|un|le)\s+(?:argent|remboursement)\b/,
    /\bopposition\s+(?:bancaire|sur\s+(?:ma|la)\s+carte|aupres\s+de\s+ma\s+banque)\b/,
    /\bfaire\s+opposition\b/,
    /\b(?:contester|conteste|annuler|annule)\s+(?:le|ce|mon|la|cette|ma)\s+(?:paiement|prelevement|debit|transaction|achat|commande|abonnement)\b/,
    /\b(?:paiement|prelevement|debit)\s+(?:non\s+autorise|frauduleux)\b/,
    /\b(?:arretez|arrete|cessez)\s+de\s+me\s+(?:prelever|debiter|facturer)\b/,
    /\bresilier\s+(?:mon\s+)?(?:abonnement|adhesion)\b/,
  ],

  // Rewrites spliced into Evelyn's own French sentence (RAW text, so accents and
  // both apostrophes are matched here). Same five classes as the English list.
  predictions: [
    { pattern: /\bje\s+(?:vous\s+)?(?:le\s+)?garantis\b/gi, replacement: "je sens très fort", category: "guarantee" },
    { pattern: /\bje\s+vous\s+promets\s+qu(?:e\s+|['’])(?:il|elle|ils|elles|cela|ça|vous)\s+(?:va|vont|allez)\b/gi, replacement: "je sens que cela pourrait", category: "guarantee" },
    { pattern: /\b(?:il|elle|ils|elles|cela|ça|vous)\s+(?:va|vont|allez)\s+(?:absolument|forcément|certainement|sans\s+aucun\s+doute|à\s+coup\s+sûr|assurément)\b/gi, replacement: "l’énergie montre très fortement que cela pourrait", category: "guarantee" },
    { pattern: /\b(?:c['’]est|ce\s+sera)\s+garanti\b/gi, replacement: "l’énergie est très forte ici", category: "guarantee" },
    { pattern: /\b(?:à\s+)?100\s*%\s+(?:sûr|sûre|certain|certaine|garanti)\b/gi, replacement: "très fortement indiqué", category: "guarantee" },
    { pattern: /\bje\s+(?:peux\s+)?vous\s+assure[rz]?\s+qu(?:e\s+|['’])(?:il|elle|ils|elles|cela|ça|vous)\s+(?:va|vont|allez)\b/gi, replacement: "je sens très fort que cela pourrait", category: "guarantee" },

    { pattern: /\bvous\s+(?:souffrez|êtes\s+atteinte?)\s+(?:de\s+|d['’])(?:l['’])?(?:anxiété|dépression|trouble\s+bipolaire|tdah|tspt|toc|trouble\s+borderline|schizophrénie|autisme)\b/gi, replacement: "l’énergie autour de vous montre une agitation émotionnelle — un professionnel de santé pourra vous éclairer", category: "medical" },
    { pattern: /\b(?:vous\s+devriez\s+|il\s+faut\s+)?(?:arrêter|arrêtez)\s+(?:de\s+prendre\s+)?(?:votre|vos)\s+(?:médicaments?|traitement|cachets)\b/gi, replacement: "parlez à votre médecin avant tout changement dans vos soins", category: "medical" },
    { pattern: /\b(?:cela|ça|ceci)\s+(?:va|peut)\s+(?:vous\s+)?guérir\b/gi, replacement: "cela peut accompagner votre guérison, aux côtés d’un suivi médical", category: "medical" },

    { pattern: /\bvous\s+devriez\s+(?:porter\s+plainte|prendre\s+un\s+avocat|engager\s+un\s+avocat|attaquer\s+en\s+justice|poursuivre\s+en\s+justice)\b/gi, replacement: "si quelque chose vous semble injuste, un professionnel du droit pourra vous guider — ce que je peux partager, c’est ce que montre l’énergie", category: "legal" },
    { pattern: /\b(?:c['’]est|cela\s+est|ce\s+serait)\s+illégal\b/gi, replacement: "cette situation pèse lourd sur le plan moral — un professionnel du droit pourra vous conseiller", category: "legal" },

    { pattern: /\bvous\s+devriez\s+(?:investir|placer\s+(?:votre\s+)?argent|acheter|vendre)\s+(?:dans|en|de|des|du)\b/gi, replacement: "l’énergie appelle à la prudence — un conseiller financier pourra vous aider sur les détails", category: "financial" },
    { pattern: /\binvestissez\s+(?:dans|en)\s+(?:la\s+)?(?:bourse|crypto|bitcoin|immobilier|or|obligations|actions)\b/gi, replacement: "parlez-en à un professionnel de la finance — ce que je vois sur le plan énergétique, c’est", category: "financial" },
    { pattern: /\bvous\s+(?:allez|serez)\s+(?:devenir\s+)?(?:riche|millionnaire|fortunée?)\b/gi, replacement: "il y a une énergie d’abondance autour de votre chemin financier", category: "financial" },

    { pattern: /\b(?:vous|il|elle|ils|elles|quelqu['’]un)\s+(?:allez|va|vont)\s+mourir\b/gi, replacement: "je sens une période de profonde transformation", category: "extreme" },
    { pattern: /\bvous\s+(?:devez|devriez)\s+(?:absolument\s+)?(?:le\s+quitter|la\s+quitter|divorcer|rompre|partir)\b/gi, replacement: "l’énergie vous pousse vers un changement", category: "extreme" },
    { pattern: /\bvous\s+(?:devez|devriez)\s+(?:absolument\s+)?(?:démissionner|quitter\s+votre\s+(?:travail|emploi|poste))\b/gi, replacement: "l’énergie de votre carrière se déplace — c’est peut-être le moment d’explorer ce qui vous correspond", category: "extreme" },
  ],

  intent: {
    crisis: /\bje\s+veux\s+mourir\b|\bme\s+suicider\b|\bsuicid|\b(?:veux|vais|envie\s+de|pense\s+a)\s+me\s+tuer\b|\bmettre\s+fin\s+a\s+(?:mes\s+jours|ma\s+vie)\b|\b(?:je\s+(?:vais|veux)|envie\s+de)\s+me\s+faire\s+du\s+mal\b|\bautomutil|\bscarifi|\bplus\s+envie\s+de\s+vivre\b(?!\s+(?:avec|ca|comme|sans|seule?))|\bne\s+veux\s+plus\s+vivre\b(?!\s+(?:avec|ca|comme|sans|seule?))|\bmieux\s+morte?\b|\benvie\s+de\s+mourir\b/,
    inappropriate: /\b(?:je\s+veux|laisse-moi|est-ce\s+que\s+je\s+peux|montre-moi|envoie-moi)\b.*\b(?:te\s+baiser|sexe\s+avec|nue?s?|tes\s+seins|ta\s+chatte|ma\s+bite|ma\s+queue)\b|\b(?:t'es|tu\s+es|vous\s+etes)\s+(?:trop\s+)?(?:sexy|bandante)\b|\b(?:baise|suce)[-\s]moi\b|\bfellation\b|\bbranlette\b|\bje\s+me\s+(?:branle|masturbe)\b|\b(?:t'es|tu\s+es|vous\s+etes|sale|espece\s+de)\s+(?:une\s+)?(?:salope|pute|connasse)\b/,
    validShort: /^(?:oui|non|ok|okay|d'accord|dac|ouais|ouai|nan|si|bien\s+sur|peut[-\s]etre|aucune\s+idee|je\s+ne\s+sais\s+pas|je\s+sais\s+pas|j'sais\s+pas|chais\s+pas|sais\s+pas|pas\s+sure?|je\s+ne\s+suis\s+pas\s+sure?|je\s+suis\s+pas\s+sure?|qui\s+sait|difficile\s+a\s+dire|bof|non\s+merci|oui\s+merci|exact|exactement|carrement|tout\s+a\s+fait|c'est\s+ca|voila|grave)[\s.!?…]*$/,
    timeBased: /^(?:\d+\s*(?:ans?|annees?|mois|semaines?|jours?)\b|depuis\s+(?:toujours|longtemps|des\s+annees|des\s+mois|peu|\d+)|toujours|jamais|recemment|dernierement|toute\s+ma\s+vie|une\s+eternite|un\s+moment|longtemps|des\s+annees)|^\d+$/,
    positive: /^(?:oui|ouais|ok|okay|d'accord|bien\s+sur|allons[-\s]y|on\s+y\s+va|je\s+suis\s+prete?|prete?|aidez-moi|aide-moi|s'il\s+vous\s+plait|svp|stp|absolument|avec\s+plaisir|volontiers|carrement|vas-y|allez-y)\b/,
    clarification: /qu'est-ce\s+que\s+(?:vous\s+voulez|tu\s+veux)\s+dire|c'est-a-dire|je\s+(?:ne\s+)?comprends?\s+pas|j'ai\s+pas\s+compris|je\s+n'ai\s+pas\s+compris|^hein\s*\??$|^quoi\s*\??$|\?\s*$|\bexpliquez\b|\bexplique\b|\bconfuse?\b|\bpreciser\b/,
    aiQuestion: /\b(?:es-tu|es\s+tu|etes-vous|etes\s+vous|t'es|vous\s+etes|tu\s+es)\s+(?:une?\s+)?(?:ia|robot|bot|machine|ordinateur|programme|reelle?|vraie)\b|chatgpt|intelligence\s+artificielle|\bgpt\b|modele\s+de\s+langage/,
    priceQuestion: /\bcombien\b|\bquel\s+(?:est\s+le\s+)?(?:prix|tarif)\b|\bc'est\s+quoi\s+le\s+(?:prix|tarif)\b|\b(?:ca|cela)\s+coute\b|\btarifs?\b|\b(?:trop|tres|si|c'est|un\s+peu)\s+cher\b/,
    explicitDecline: /^non[\s.!]*$|^non\s+merci|^pas\s+interessee?|^ca\s+ne\s+m'interesse\s+pas|^ca\s+m'interesse\s+pas|^je\s+ne\s+veux\s+pas|^je\s+veux\s+pas|^au\s+revoir|^bye|^hors\s+de\s+question|^certainement\s+pas|^je\s+passe|^nan[\s.!]*$/,
    objectionPrice: /pas\s+les\s+moyens|trop\s+cher|c'est\s+cher|pas\s+d'argent|plus\s+d'argent|fauchee?|\ba\s+sec\b|(?:ca|cela)\s+coute|\ble\s+prix\b|\bbudget\b/,
    objectionSkepticism: /arnaque|escroquerie|\bescroc|bidon|\bfake\b|c'est\s+(?:du\s+)?faux|je\s+n'y\s+crois\s+pas|j'y\s+crois\s+pas|n'importe\s+quoi|foutaise|conneries|charlatan|attrape[-\s]nigaud/,
    objectionInfo: /dites-m'en\s+plus|dis-m'en\s+plus|en\s+savoir\s+plus|qu'est-ce\s+qui\s+se\s+passe|comment\s+(?:ca|cela)\s+(?:marche|fonctionne|se\s+passe)|\bexpliquez\b|qu'est-ce\s+que\s+j'obtiens|qu'est-ce\s+que\s+je\s+recois|plus\s+d'infos?|plus\s+d'informations/,
    wantsMoreFree: /quoi\s+d'autre|parlez-moi\s+de|parle-moi\s+de|\bquand\s+(?:est-ce\s+qu|va|vais|il|elle|vais-je)|\bqui\s+est\b|voyez-vous|pouvez-vous\s+voir|\btu\s+vois\b|\bplus\s+sur\b|\bcontinuez\b|\bcontinue\b/,
  },

  // The upsell questions' free-text answers. ⚠ The translated quick-reply labels
  // are sent through these too, so each French label must land in the class its
  // English label lands in (tests/l10n/lang-fr.test.ts checks it once the labels
  // are translated).
  upsellReplies: {
    u1q1: [
      ["yes", /\b(?:oui|ouais|absolument|tout\s+a\s+fait|tout\s+le\s+temps|carrement|totalement|bien\s+sur|exactement|souvent|(?:m'est|c'est|est)\s+(?:deja\s+)?arrive)\b/],
      ["maybe", /\b(?:je\s+(?:pense|crois)|peut[-\s]etre|probablement|parfois|des\s+fois|en\s+quelque\s+sorte|un\s+peu|possible(?:ment)?|il\s+me\s+semble)\b/],
      ["unsure", /\b(?:pas\s+sure?|sais\s+pas|non|jamais|aucune\s+idee|pas\s+vraiment|incertaine?)\b/],
    ],
    u1q2: [
      ["yes", /\b(?:oui|ouais|je\s+le\s+(?:sens|ressens)|absolument|tout\s+a\s+fait|ca\s+resonne|ca\s+me\s+parle|exactement)\b/],
      ["understand", /\b(?:je\s+comprends|compris|ca\s+a\s+du\s+sens|logique|je\s+vois|je\s+pense|je\s+crois)\b/],
      ["more", /\b(?:plus|dites-m'en|dis-m'en|expliquez|explique|qu'est-ce\s+que\s+(?:vous\s+voulez|tu\s+veux)\s+dire|comment|curieuse?)\b/],
    ],
    u1q3: [
      ["yes", /\b(?:oui|ouais|prete?|allons[-\s]y|on\s+y\s+va|s'il\s+vous\s+plait|svp|protegez-moi|protege-moi|absolument|bien\s+sur|avec\s+plaisir)\b/],
      ["maybe", /\b(?:je\s+(?:pense|crois|suppose)|peut[-\s]etre|probablement|j'imagine)\b/],
      ["what", /\b(?:quoi|qu'est-ce|recevoir|recois|obtenir|obtiens|inclus|combien|coute|prix|tarif|details?)\b/],
    ],
    u2q1: [
      ["yes", /\b(?:oui|ouais|je\s+le\s+(?:sens|ressens)|absolument|tout\s+a\s+fait|exactement|je\s+peux)\b/],
      ["maybe", /\b(?:je\s+(?:pense|crois)|peut[-\s]etre|probablement|en\s+quelque\s+sorte|un\s+peu)\b/],
      ["what", /\b(?:quoi|c'est-a-dire|expliquez|explique|comprends?\s+pas|comment|veut\s+dire)\b/],
    ],
    u2q2: [
      ["yes", /\b(?:oui|ouais|l'une?\s+(?:d'entre\s+(?:elles|eux)|m'a\s+marquee?)|une\s+en\s+particulier|celle-la|celui-la|precise?(?:ment)?|specifique)\b/],
      ["all", /\b(?:toutes?|tous|chacune?|resonnent)\b/],
      ["more", /\b(?:plus|dites-m'en|dis-m'en|expliquez|explique|curieuse?|comment)\b/],
    ],
    u2q3: [
      ["yes", /\b(?:oui|ouais|prete?|allons[-\s]y|on\s+y\s+va|s'il\s+vous\s+plait|svp|absolument|bien\s+sur|avec\s+plaisir)\b/],
      ["maybe", /\b(?:je\s+(?:pense|crois|suppose)|peut[-\s]etre|probablement|j'imagine)\b/],
      ["what", /\b(?:quoi|qu'est-ce|recevoir|recois|obtenir|obtiens|inclus|exactement|details?)\b/],
    ],
  },

  nameIntro:
    /^\s*(?:(?:bonjour|bonsoir|salut|coucou|hello|allo)\b[\s,!.]*)?(?:(?:je\s+m['’]appelle|moi\s+c['’]est|c['’]est|je\s+suis|mon\s+(?:pr[ée]nom|nom)\s+(?:est|c['’]est)|on\s+m['’]appelle|appelez[-\s]moi|appelle[-\s]moi)\s+)?/i,
  otherNameIntro:
    /^\s*(?:(?:il|elle)\s+s['’]appelle|son\s+(?:pr[ée]nom|nom)\s+(?:est|c['’]est)|c['’]est)\s+/i,

  outputBlock: [
    "## OUTPUT LANGUAGE: FRENCH (FRANCE). THIS OVERRIDES THE LANGUAGE OF EVERYTHING ABOVE",
    "Everything above is written in English for you. She is in France and reads French. Write every message you send her in natural, warm, spoken French, the way a French reader would type it in a chat.",
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
