import { CURATED_SCRIPTURE_QA, type TraditionKey, type TraditionGroup } from './curatedScriptureQA';
import type { ScriptureInquiryResult } from './scriptureInquiryApi';

export type ContextStatusType =
  | 'documented-occasion'
  | 'no-narrative-occasion'
  | 'split-consensus'
  | 'mythological-dialogue'
  | 'ritual-boundary-code'
  | 'abrogated-statute';

export type CriticalControversyVerse = {
  id: string;
  citation: string;
  tradition: TraditionKey;
  traditionName: string;
  book: string;
  bookId?: string;
  chapter: number;
  verseNumber: number;
  originalScript?: string;
  keyOriginalTerm?: {
    term: string;
    transliteration: string;
    literalMeaning: string;
    linguisticDebate?: string;
  };
  translation: string;
  coreControversy: {
    criticPosition: string;
    theologicalDefense: string;
  };
  contextStatus: ContextStatusType;
  contextStatusLabel: string;
  contextStatusDescription: string;
  historicalExegesis: {
    setting: string;
    classicalScholars: string;
    modernReformView?: string;
  };
  parallelScriptures: {
    tradition: TraditionKey;
    citation: string;
    note: string;
  }[];
  searchKeywords: string[];
};

export const CRITICAL_CONTROVERSIES: CriticalControversyVerse[] = [
  // ===========================================================================
  // 1. THE HOLY QURAN
  // ===========================================================================
  {
    id: 'crit-quran-4-34',
    citation: 'Surah An-Nisa 4:34',
    tradition: 'quran',
    traditionName: 'The Holy Quran',
    book: 'An-Nisa',
    chapter: 4,
    verseNumber: 34,
    originalScript: 'ٱلرِّجَالُ قَوَّٰمُونَ عَلَى ٱلنِّسَآءِ بِمَا فَضَّلَ ٱللَّهُ بَعْضَهُمْ عَلَىٰ بَعْضٍۢ وَبِمَآ أَنفَقُوا۟ مِنْ أَمْوَٰلِهِمْ ... وَٱلَّٰتِى تَخَافُونَ نُشُوزَهُنَّ فَعِظُوهُنَّ وَٱهْجُرُوهُنَّ فِى ٱلْمَضَاجِعِ وَٱضْرِبُوهُنَّ ۖ فَإِنْ أَطَعْنَكُمْ فَلَا تَبْغُوا۟ عَلَيْهِنَّ سَبِيلًا',
    keyOriginalTerm: {
      term: 'وَٱضْرِبُوهُنَّ',
      transliteration: 'Wadribuhunna (from root Daraba)',
      literalMeaning: 'And strike them / tap them / separate from them',
      linguisticDebate: 'Classical exegesis conditioned the verb with prophetic traditions as "ghayr mubarrih" (non-injurious, symbolic with a toothstick, never leaving marks or touching the face). Modern linguistic reformers argue Daraba means "to leave / depart" as used in Quran 4:94.',
    },
    translation:
      'Men are caretakers of women because Allah has favored one over the other and because they spend from their wealth... As to those women on whose part you fear ill-conduct (nushuz): admonish them [first], next refuse to share their beds, and [finally] strike them [non-violently]. But if they obey you, do not seek a way against them.',
    coreControversy: {
      criticPosition:
        'Critics view this text as institutionalizing domestic violence and codifying a husband’s legal prerogative to physically discipline his wife.',
      theologicalDefense:
        'Traditional jurists argue it restricted pre-Islamic abusive violence to a strict, staged dispute arbitration ending only in symbolic gesture without injury. Reformers maintain Daraba denotes physical separation or walk-out.',
    },
    contextStatus: 'split-consensus',
    contextStatusLabel: 'Documented Occasion & Split Consensus',
    contextStatusDescription:
      'Documented occasion of revelation regarding marital dispute arbitration; divergent consensus between classical conditional exegesis and contemporary linguistic reform.',
    historicalExegesis: {
      setting:
        'Asbab al-Nuzul (al-Wahidi): Habibah bint Zayd was struck by her husband Sa’d ibn al-Rabi after a domestic conflict. The Prophet initially permitted equal retaliation (qisas), then this revelation established arbitration protocols distinguishing civil crime from domestic breakdown.',
      classicalScholars:
        'Tafsir al-Jalalayn & Tabari: The striking is strictly conditional on persistent rebellion (nushuz) after verbal advice and bedroom separation fail. Prophetic hadith explicitly prohibited striking the face or inflicting any wound or contusion.',
      modernReformView:
        'Contemporary scholars note the Prophet never struck any woman or servant in his lifetime (Sahih Muslim) and declared: "The best of you are those who are best to their wives."',
    },
    parallelScriptures: [
      { tradition: 'bible-nt', citation: 'Ephesians 5:22', note: 'Wives submit; husbands love sacrificially as Christ loved the church.' },
      { tradition: 'bible-nt', citation: 'Colossians 3:19', note: 'Husbands love your wives and do not be bitter against them.' },
      { tradition: 'vedas', citation: 'Rigveda 8.33.17', note: 'Indra aphorism on female emotion; contrast with RV 10.85.46.' },
    ],
    searchKeywords: ['4:34', 'surah 4:34', 'quran 4:34', 'daraba', 'beat women', 'hit wife', 'nushuz', 'domestic discipline', 'wadribuhunna'],
  },
  {
    id: 'crit-quran-2-282',
    citation: 'Surah Al-Baqarah 2:282',
    tradition: 'quran',
    traditionName: 'The Holy Quran',
    book: 'Al-Baqarah',
    chapter: 2,
    verseNumber: 282,
    originalScript: 'وَٱسْتَشْهِدُوا۟ شَهِيدَيْنِ مِن رِّجَالِكُمْ ۖ فَإِن لَّمْ يَكُونَا رَجُلَيْنِ فَرَجُلٌۭ وَٱمْرَأَتَانِ مِمَّن تَرْضَوْنَ مِنَ ٱلشُّهَدَآءِ أَن تَضِلَّ إِحْدَىٰهُمَا فَتُذَكِّرَ إِحْدَىٰهُمَا ٱلْأُخْرَىٰ',
    keyOriginalTerm: {
      term: 'أَن تَضِلَّ إِحْدَىٰهُمَا',
      transliteration: 'An tadilla ihdahuma',
      literalMeaning: 'Lest one of them wanders / errs / forgets',
      linguisticDebate: 'Framed specifically in the context of commercial debt contracts (A-Dayn) where ancient Arabian women rarely operated as mercantile credit lenders.',
    },
    translation:
      '...And bring to witness two witnesses from among your men. And if there are not two men, then a man and two women from those whom you accept as witnesses—so that if one of them errs, the other can remind her...',
    coreControversy: {
      criticPosition:
        'Critics argue this establishes a 2:1 legal testimony ratio, demonstrating that a woman’s cognitive reliability and intellectual standing are worth half of a man’s.',
      theologicalDefense:
        'Scholars explain this was a specific pragmatic provision for long-term commercial credit transactions in ancient Medina where women lacked commercial experience. Outside business finance, a woman’s sole testimony was legally decisive.',
    },
    contextStatus: 'documented-occasion',
    contextStatusLabel: 'Documented Commercial Statute',
    contextStatusDescription:
      'Revealed as the longest verse in the Quran specifically codifying financial loan agreements and credit documentation in 7th-century Medina.',
    historicalExegesis: {
      setting:
        'Codified detailed rules for deferred mercantile credit agreements in Medina, protecting creditors from contractual disputes in an agrarian-mercantile transition.',
      classicalScholars:
        'Ibn al-Qayyim & Ibn Rushd: The ruling is regulatory (irshadi), not an ontology of intellect. In matters women traditionally oversaw—childbirth, paternity, nursing, domestic affairs, and transmitting prophetic hadith—the testimony of a single woman was legally equal or superior to men.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Deuteronomy 19:15', note: 'Mosaic rule requiring two or three witnesses; women generally excluded in Talmudic civil courts.' },
      { tradition: 'bible-nt', citation: '1 Timothy 2:12', note: 'Congregational speaking restrictions.' },
    ],
    searchKeywords: ['2:282', 'surah 2:282', 'two women witnesses', 'witness testimony', 'half witness', 'an tadilla ihdahuma', 'baqarah 282'],
  },
  {
    id: 'crit-quran-4-11',
    citation: 'Surah An-Nisa 4:11',
    tradition: 'quran',
    traditionName: 'The Holy Quran',
    book: 'An-Nisa',
    chapter: 4,
    verseNumber: 11,
    originalScript: 'يُوصِيكُمُ ٱللَّهُ فِىٓ أَوْلَٰدِكُمْ ۖ لِلذَّكَرِ مِثْلُ حَظِّ ٱلْأُنثَيَيْنِ',
    keyOriginalTerm: {
      term: 'لِلذَّكَرِ مِثْلُ حَظِّ ٱلْأُنثَيَيْنِ',
      transliteration: 'Lidh-dhakari mithlu hazzil-unthayayn',
      literalMeaning: 'For the male, what is equal to the share of two females',
      linguisticDebate: 'Applies specifically to sons and daughters inheriting together from parents; in several other kinship scenarios (e.g. maternal siblings or mother inheriting), shares are equal (1:1).',
    },
    translation:
      'Allah instructs you concerning your children: for the male, what is equal to the share of two females...',
    coreControversy: {
      criticPosition:
        'Critics view the 2:1 inheritance ratio as economic discrimination that deprives women of equal familial wealth.',
      theologicalDefense:
        'Jurists explain the division is bound to legal financial liability (nafaqah): men bear full legal obligation to financially sustain wife, children, and female relatives; women’s inheritance and dowry (mahr) are 100% private assets with zero liability.',
    },
    contextStatus: 'documented-occasion',
    contextStatusLabel: 'Documented Legal Reform',
    contextStatusDescription:
      'Revealed to abolish pre-Islamic Arabian inheritance customs that completely barred women and orphans from inheriting any family property.',
    historicalExegesis: {
      setting:
        'Asbab al-Nuzul: Following the Battle of Uhud, the widow of Sa’d ibn al-Rabi appealed that the brother-in-law took all estate wealth under customary tribal law. This verse was revealed guaranteeing independent property rights to daughters and wives.',
      classicalScholars:
        'Tafsir al-Jalalayn & Tabari: Established immutable legal shares (Fara’id). Jurists calculated that out of over 30 estate inheritance scenarios in Islamic law, women inherit equal to men in over 10 cases, more than men in over 10 cases, and half of men in only 4 direct sibling cases.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Numbers 27:8', note: 'Daughters of Zelophehad inherit only if there is no son.' },
      { tradition: 'torah', citation: 'Deuteronomy 21:17', note: 'Firstborn son receives double portion over younger brothers.' },
    ],
    searchKeywords: ['4:11', 'surah 4:11', 'inheritance', 'half inheritance', 'male female inheritance', 'two females share', 'faraid'],
  },
  {
    id: 'crit-quran-4-3',
    citation: 'Surah An-Nisa 4:3',
    tradition: 'quran',
    traditionName: 'The Holy Quran',
    book: 'An-Nisa',
    chapter: 4,
    verseNumber: 3,
    originalScript: 'وَإِنْ خِفْتُمْ أَلَّا تُقْسِطُوا۟ فِى ٱلْيَتَٰمَىٰ فَٱنكِحُوا۟ مَا طَابَ لَكُم مِّنَ ٱلنِّسَآءِ مَثْنَىٰ وَثُلَٰثَ وَرُبَٰعَ ۖ فَإِنْ خِفْتُمْ أَلَّا تَعْدِلُوا۟ فَوَٰحِدَةً',
    keyOriginalTerm: {
      term: 'فَإِنْ خِفْتُمْ أَلَّا تَعْدِلُوا۟ فَوَٰحِدَةً',
      transliteration: 'Fa-in khiftum alla ta’dilu fa-wahidah',
      literalMeaning: 'But if you fear that you will not be just, then [marry only] one',
      linguisticDebate: 'Polygyny is permitted up to 4 but strictly conditioned on justice (Adl). Quran 4:129 later clarifies: "You will never be able to be equal between wives, even if you should strive."',
    },
    translation:
      'And if you fear that you will not deal justly with the orphan girls, then marry those that please you of [other] women, two or three or four. But if you fear that you will not be just, then [marry only] one...',
    coreControversy: {
      criticPosition:
        'Critics question why polygamy is an exclusively male privilege, arguing it institutionalizes asymmetrical marital dynamics.',
      theologicalDefense:
        'Historians point out it was revealed in the wake of war casualties to shelter destitute widows and orphans, capping previously unlimited polygamy at 4 with rigorous justice conditions.',
    },
    contextStatus: 'documented-occasion',
    contextStatusLabel: 'Documented Post-War Crisis',
    contextStatusDescription:
      'Revealed following the Battle of Uhud (625 CE) where 70 Muslim men fell in battle, creating an acute orphan and widow crisis in Medina.',
    historicalExegesis: {
      setting:
        'Sahih Bukhari (Aisha): Guardians were managing the estates of orphaned girls and marrying them without giving fair dowries. This verse warned them to either treat orphan girls fairly or marry other women up to four, provided they maintain strict justice.',
      classicalScholars:
        'Tafsir al-Jalalayn: Capped polygamy at four and mandated absolute equity in housing, maintenance, and companionship. If financial or emotional equity was feared, monogamy was strictly commanded.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Exodus 21:10', note: 'If he takes another wife, he shall not diminish her food, clothing, or marital rights.' },
      { tradition: 'torah', citation: '2 Samuel 12:8', note: 'King David given multiple wives by God.' },
    ],
    searchKeywords: ['4:3', 'surah 4:3', 'polygamy', 'four wives', 'marry four', 'two three or four', 'orphan girls'],
  },
  {
    id: 'crit-quran-4-15',
    citation: 'Surah An-Nisa 4:15',
    tradition: 'quran',
    traditionName: 'The Holy Quran',
    book: 'An-Nisa',
    chapter: 4,
    verseNumber: 15,
    originalScript: 'وَٱلَّٰتِى يَأْتِينَ ٱلْفَٰحِشَةَ مِن نِّسَآئِكُمْ فَٱسْتَشْهِدُوا۟ عَلَيْهِنَّ أَرْبَعَةًۭ مِّنكُمْ ۖ فَإِن شَهِدُوا۟ فَأَمْسِكُوهُنَّ فِى ٱلْبُيُوتِ حَتَّىٰ يَتَوَفَّىٰهُنَّ ٱلْمَوْتُ أَوْ يَجْعَلَ ٱللَّهُ لَهُنَّ سَبِيلًۭا',
    keyOriginalTerm: {
      term: 'فَأَمْسِكُوهُنَّ فِى ٱلْبُيُوتِ',
      transliteration: 'Fa-amsikuhunna fil-buyut',
      literalMeaning: 'Confine them to houses',
      linguisticDebate: 'Ended with the clause "or Allah makes for them another way," explicitly signaling this was a temporary holding measure until fixed penal statutes were revealed.',
    },
    translation:
      'Those who commit unlawful sexual intercourse of your women—bring against them four witnesses from among you. And if they testify, confine them to houses until death arrives for them or Allah ordains for them [another] way.',
    coreControversy: {
      criticPosition:
        'Critics cite this as allowing domestic life imprisonment of women by their families for sexual misconduct.',
      theologicalDefense:
        'Classical Islamic scholars unanimously hold that this early Medinan verse was formally abrogated (Mansukh) and superseded when Surah An-Nur (24:2) and codified legal courts were established.',
    },
    contextStatus: 'abrogated-statute',
    contextStatusLabel: 'Formally Abrogated (*Mansukh*)',
    contextStatusDescription:
      'Unanimous classical scholarly consensus confirms this interim holding procedure was completely superseded when codified judicial penal law was revealed.',
    historicalExegesis: {
      setting:
        'Early Medinan period before judicial court systems and standardized penal punishments (Hudud) were instituted. House detention prevented vigilante honor violence.',
      classicalScholars:
        'Tafsir al-Jalalayn, Tabari, and Ibn Kathir: Unanimous consensus that the verse is abrogated. In Sahih Muslim, the Prophet declared: "Take from me, Allah has made for them another way: unmarried persons 100 lashes, married persons public trial."',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Deuteronomy 22:21', note: 'Ancient capital punishment for unchastity.' },
      { tradition: 'bible-nt', citation: 'John 8:7', note: 'He that is without sin among you, let him first cast a stone at her.' },
    ],
    searchKeywords: ['4:15', 'surah 4:15', 'confine to houses', 'life imprisonment', 'lewdness', 'abrogated', 'mansukh'],
  },

  // ===========================================================================
  // 2. THE TORAH & OLD TESTAMENT
  // ===========================================================================
  {
    id: 'crit-bible-gen-3-16',
    citation: 'Genesis 3:16',
    tradition: 'torah',
    traditionName: 'Torah & Old Testament',
    book: 'Genesis',
    bookId: 'GEN',
    chapter: 3,
    verseNumber: 16,
    originalScript: 'אֶֽל־הָאִשָּׁ֣ה אָמַ֗ר הַרְבָּ֤ה אַרְבֶּה֙ עִצְּבוֹנֵ֣ךְ וְהֵֽרֹנֵ֔ךְ בְּעֶ֖צֶב תֵּֽלְדִ֣י בָנִ֑ים וְאֶל־אִישֵׁךְ֙ תְּשׁ֣וּקָתֵ֔ךְ וְה֥וּא יִמְשָׁל־בָּֽךְ׃',
    keyOriginalTerm: {
      term: 'וְה֥וּא יִמְשָׁל־בָּֽךְ',
      transliteration: 'Ve-hu yimshol-bakh',
      literalMeaning: 'And he shall rule over you',
      linguisticDebate: 'Scholars debate whether yimshol expresses a descriptive prediction of the tragic fallen human reality or a prescriptive moral command.',
    },
    translation:
      'To the woman He said: “I will greatly multiply your pain in childbearing; in pain you shall bring forth children. Your desire shall be for your husband, and he shall rule over you.”',
    coreControversy: {
      criticPosition:
        'Critics view this verse as the theological foundation of patriarchal subjugation, portraying God as ordaining male dominance over women.',
      theologicalDefense:
        'Jewish and Christian theologians emphasize this is a descriptive consequence of the Fall (like the ground yielding thorns to Adam in 3:17–19), not God’s intended moral ideal for human marriage.',
    },
    contextStatus: 'no-narrative-occasion',
    contextStatusLabel: 'Descriptive Theological Etiology',
    contextStatusDescription:
      'No historical human incident; presented as an ancient primordial narrative describing the broken, tragic condition of humanity after the Fall.',
    historicalExegesis: {
      setting:
        'The Genesis Eden narrative, functioning as an etiological explanation for the universal presence of physical labor pain and marital conflict in human society.',
      classicalScholars:
        'Rashi & Matthew Henry: Descriptive rather than imperative. The verse depicts the tragic disruption of original Edenic mutual partnership (Gen 1:27) as an effect of sin, not a moral command to oppress.',
    },
    parallelScriptures: [
      { tradition: 'bible-nt', citation: 'Galatians 3:28', note: 'Neither male nor female; all are one in Christ, overcoming the Fall.' },
      { tradition: 'bible-nt', citation: '1 Timothy 2:14', note: 'Adam was not deceived, but the woman was deceived and fell into transgression.' },
      { tradition: 'quran', citation: 'Surah 7:22', note: 'Both Adam and Eve mutually err and ask forgiveness together; Eve is not singled out.' },
    ],
    searchKeywords: ['genesis 3:16', 'gen 3:16', 'he shall rule over you', 'pain in childbearing', 'desire for your husband', 'curse of eve'],
  },
  {
    id: 'crit-bible-deu-22-28',
    citation: 'Deuteronomy 22:28–29',
    tradition: 'torah',
    traditionName: 'Torah & Old Testament',
    book: 'Deuteronomy',
    bookId: 'DEU',
    chapter: 22,
    verseNumber: 28,
    originalScript: 'כִּֽי־יִמְצָ֣א אִ֗ישׁ נַעֲרָ֤ תְּבוּלָה֙ אֲשֶׁ֣ר לֹא־אֹרָ֔שָׂה וּתְפָשָׂ֖הּ וְשָׁכַ֣ב עִמָּ֑הּ וְנִמְצָֽאוּ׃ וְ֠נָתַן הָאִ֨ישׁ הַשֹּׁכֵ֥ב עִמָּ֛הּ לַאֲבִ֥י הַנַּעֲרָ֖ חֲמִשִּׁ֣ים כָּ֑סֶף וְלֽוֹ־תִהְיֶ֣ה לְאִשָּׁ֗ה תַּ֚חַת אֲשֶׁ֣ר עִנָּ֔הּ לֹא־יוּכַ֥ל שַׁלְּחָ֖הּ כָּל־יָמָֽיו׃',
    keyOriginalTerm: {
      term: 'וּתְפָשָׂ֖הּ',
      transliteration: 'U-tefasah (from Taphas)',
      literalMeaning: 'And seizes / lays hold of her',
      linguisticDebate: 'Contrast with verse 25 (chazaq - violent force). Talmudic jurists distinguish between consensual seduction, unbetrothed seizure, and betrothed rape.',
    },
    translation:
      'If a man finds a young woman who is a virgin, who is not betrothed, and he seizes her and lies with her, and they are found out, then the man who lay with her shall give to the young woman’s father fifty shekels of silver, and she shall be his wife because he has humbled her; he shall not be permitted to divorce her all his days.',
    coreControversy: {
      criticPosition:
        'Critics view this statute as treating women as damaged chattel, forcing a victim to marry her attacker and paying compensation to the father.',
      theologicalDefense:
        'Talmudic jurisprudence (Ketubot 39b–40a) explains that Hebrew law gave the woman the absolute right to refuse the marriage. The perpetrator was forced to pay the fine and must marry her if she consented, losing all male divorce privileges.',
    },
    contextStatus: 'no-narrative-occasion',
    contextStatusLabel: 'Statutory Civil Tort Code',
    contextStatusDescription:
      'No narrative historical occasion; preserved as part of the ancient Mosaic civil and family tort law in the Deuteronomic legal code.',
    historicalExegesis: {
      setting:
        'Ancient Near Eastern clan society where an unmarried non-virgin faced complete social destitution, abandonment, and poverty if rejected by prospective suitors.',
      classicalScholars:
        'Talmud (Tractate Ketubot 39b): "She may refuse him, or her father may refuse him." Maimonides notes the fine was punitive damages paid to the household, while the perpetrator was legally barred from ever divorcing her to prevent abandonment.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Exodus 22:16-17', note: 'If her father utterly refuses to give her to him, he shall pay money equal to the bride price.' },
      { tradition: 'quran', citation: 'Surah 24:4', note: 'Those who slander chaste women must produce 4 witnesses or face 80 lashes.' },
    ],
    searchKeywords: ['deuteronomy 22:28', 'deut 22:28', 'marry rapist', 'fifty shekels', 'unbetrothed virgin', 'seizes her'],
  },
  {
    id: 'crit-bible-num-5-19',
    citation: 'Numbers 5:19–22',
    tradition: 'torah',
    traditionName: 'Torah & Old Testament',
    book: 'Numbers',
    bookId: 'NUM',
    chapter: 5,
    verseNumber: 19,
    originalScript: 'וְהִשְׁבִּ֨יעַ אֹתָ֜הּ הַכֹּהֵ֗ן ... וּבָ֨אוּ הַמַּ֤יִם הַמְאָֽרְרִים֙ הָאֵ֣לֶּה בְּמֵעַ֔יִךְ לַצְבּ֥וֹת בֶּ֖טֶן וְלַנְפִּ֣ל יָרֵ֑ךְ וְאָמְרָ֥ה הָאִשָּׁ֖ה אָמֵ֥ן ׀ אָמֵֽן׃',
    keyOriginalTerm: {
      term: 'מֵי הַמָּרִים הַמְאָֽרְרִים',
      transliteration: 'Mei ha-marim ha-me’arerim',
      literalMeaning: 'The bitter water that brings a curse',
      linguisticDebate: 'Made of sanctified holy water mixed with dust from the tabernacle floor and ink blotted from the curse scroll.',
    },
    translation:
      'Then the priest shall put her under oath and say to the woman... “May this water that brings a curse enter your body to cause your abdomen to swell and your thigh to rot.” And the woman shall say, “Amen, Amen.”',
    coreControversy: {
      criticPosition:
        'Critics view this trial-by-ordeal (the Sotah ritual) as an institutionalized patriarchal ordeal that subjects suspected wives to public psychological and bodily terror.',
      theologicalDefense:
        'Scholars note it removed vigilante domestic honor killings from jealous husbands. The physical mixture (dust and water) was completely non-toxic, requiring divine miraculous intervention to trigger any effect.',
    },
    contextStatus: 'no-narrative-occasion',
    contextStatusLabel: 'Statutory Cultic Trial-by-Ordeal',
    contextStatusDescription:
      'A unique priestly cultic statute in the Mosaic wilderness code for unresolved domestic jealousy with no physical witnesses.',
    historicalExegesis: {
      setting:
        'Prescribed for a husband seized by a "spirit of jealousy" (ruach kin’ah) with no witnesses and no confession, preventing violent private retaliation.',
      classicalScholars:
        'Talmud (Tractate Sotah): The rabbis established that if the husband was himself guilty of infidelity, the water had zero effect. Formally abolished by Rabban Yohanan ben Zakkai in the 1st century CE.',
    },
    parallelScriptures: [
      { tradition: 'quran', citation: 'Surah 24:6-9', note: 'Li’an procedure: husband and wife swear 4 oaths and invoke the curse of God; her oath overrides his.' },
      { tradition: 'bible-nt', citation: 'John 8:3-11', note: 'Jesus refuses the execution of the woman caught in adultery.' },
    ],
    searchKeywords: ['numbers 5:19', 'num 5', 'sotah', 'bitter water', 'abdomen swell', 'ordeal', 'jealous husband'],
  },
  {
    id: 'crit-bible-exo-20-17',
    citation: 'Exodus 20:17',
    tradition: 'torah',
    traditionName: 'Torah & Old Testament',
    book: 'Exodus',
    bookId: 'EXO',
    chapter: 20,
    verseNumber: 17,
    originalScript: 'לֹ֥א תַחְמֹ֖ד בֵּ֣ית רֵעֶ֑ךָ לֹֽא־תַחְמֹ֞ד אֵ֣שֶׁת רֵעֶ֗ךָ וְעַבְדּ֤וֹ וַאֲמָתוֹ֙ וְשׁוֹר֣וֹ וַחֲמֹר֔וֹ וְכֹ֖ל אֲשֶׁ֥ר לְרֵעֶֽךָ׃',
    keyOriginalTerm: {
      term: 'לֹ֥א תַחְמֹ֖ד',
      transliteration: 'Lo tachmod',
      literalMeaning: 'You shall not covet / desire illicitly',
      linguisticDebate: 'In Exodus 20, the neighbor’s house is listed first; in Deuteronomy 5:21, the wife is listed first in her own distinct clause before house and field.',
    },
    translation:
      'You shall not covet your neighbor’s house. You shall not covet your neighbor’s wife, or his male servant, or his female servant, or his ox, or his donkey, or anything that belongs to your neighbor.',
    coreControversy: {
      criticPosition:
        'Critics highlight that wives are listed alongside domestic real estate, servants, and livestock, arguing the Ten Commandments classify women as male property.',
      theologicalDefense:
        'Commentators explain it reflects an ancient clan household inventory of valuable social relationships. In Deuteronomy 5:21, the wife is separated into the primary position of honor.',
    },
    contextStatus: 'no-narrative-occasion',
    contextStatusLabel: 'Decalogue Ethical Code',
    contextStatusDescription:
      'Foundational moral code of the Ten Commandments; no individual human incident recorded.',
    historicalExegesis: {
      setting:
        'The Decalogue at Mount Sinai, establishing communal covenantal ethics in an ancient pastoral-agrarian clan society.',
      classicalScholars:
        'Jamieson-Fausset-Brown: Addresses the inward corruption of the heart that desires to dissolve another’s marriage or household order. The pairing with servants and livestock describes the social household economy.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Deuteronomy 5:21', note: 'Parallel Decalogue placing the wife before house, field, and servants.' },
      { tradition: 'bible-nt', citation: 'Matthew 5:28', note: 'Whoever looks at a woman with lust has committed adultery with her already in his heart.' },
    ],
    searchKeywords: ['exodus 20:17', 'exo 20:17', 'covet neighbors wife', 'ten commandments', 'property', 'ox donkey'],
  },
  {
    id: 'crit-bible-lev-12-2',
    citation: 'Leviticus 12:2–5',
    tradition: 'torah',
    traditionName: 'Torah & Old Testament',
    book: 'Leviticus',
    bookId: 'LEV',
    chapter: 12,
    verseNumber: 2,
    originalScript: 'אִשָּׁה֙ כִּ֣י תַזְרִ֔יעַ וְיָלְדָ֖ה זָכָ֑ר וְטָֽמְאָה֙ שִׁבְעַ֣ת יָמִ֔ים ... וְאִם־נְקֵבָ֣ה תֵלֵ֔ד וְטָמְאָ֥ה שְׁבֻעַ֖יִם כְּנִדָּתָ֑הּ',
    keyOriginalTerm: {
      term: 'וְטָֽמְאָה֙',
      transliteration: 'Ve-tam’ah (from Tum’ah)',
      literalMeaning: 'And she shall be ritually impure',
      linguisticDebate: 'Tum’ah does not mean sin or physical dirtiness; it is a cultic boundary state associated with bodily emissions, birth, and death in the Tabernacle worship system.',
    },
    translation:
      'If a woman conceives and bears a male child, she shall be unclean seven days... But if she bears a female child, she shall be unclean two weeks, as in her menstruation...',
    coreControversy: {
      criticPosition:
        'Critics point out that giving birth to a female infant incurs double the time of ritual uncleanness (14 vs 7 days; 80 vs 40 total days), viewing it as a spiritual demotion of girls.',
      theologicalDefense:
        'Jewish scholars emphasize that Tum’ah has zero connection to moral guilt or sin. The text itself provides no reason; commentators suggest symbolic protection of the infant female future bearer of life.',
    },
    contextStatus: 'no-narrative-occasion',
    contextStatusLabel: 'Ritual Purity Code (No Reason Recorded)',
    contextStatusDescription:
      'Preserved as a priestly purity statute with zero narrative occasion and zero moral explanation given anywhere in the scriptural text.',
    historicalExegesis: {
      setting:
        'Priestly code governing ritual eligibility for entering the sanctuary and touching holy offerings in ancient Israel.',
      classicalScholars:
        'Rashi & Maimonides: Classical rabbis acknowledge the Torah gives no explicit divine rationale for the 7 vs 14 day disparity. Maimonides emphasizes that ritual impurity (tum’ah) carries no moral condemnation.',
    },
    parallelScriptures: [
      { tradition: 'bible-nt', citation: 'Luke 2:22', note: 'Mary presents Jesus at the Temple according to the law of purification in Leviticus 12.' },
      { tradition: 'quran', citation: 'Surah 16:58-59', note: 'Denounces pre-Islamic Arabian fathers who were gloomy and ashamed when a girl was born.' },
    ],
    searchKeywords: ['leviticus 12', 'lev 12:2', 'unclean birth', 'daughter twice unclean', 'fourteen days', 'purification childbirth'],
  },

  // ===========================================================================
  // 3. THE NEW TESTAMENT
  // ===========================================================================
  {
    id: 'crit-bible-1tim-2-12',
    citation: '1 Timothy 2:12',
    tradition: 'bible-nt',
    traditionName: 'New Testament',
    book: '1 Timothy',
    bookId: '1TI',
    chapter: 2,
    verseNumber: 12,
    originalScript: 'διδάσκειν δὲ γυναικὶ οὐκ ἐπιτρέπω, οὐδὲ αὐθεντεῖν ἀνδρός, ἀλλ’ εἶναι ἐν ἡσυχίᾳ.',
    keyOriginalTerm: {
      term: 'αὐθεντεῖν',
      transliteration: 'Authentein',
      literalMeaning: 'To exercise authority / to domineer / to usurp authority',
      linguisticDebate: 'A hapax legomenon (used only once in the entire Bible). Complementarians translate it as standard "exercise authority"; egalitarians translate it as "usurp authority / domineer" in connection with localized Ephesian heresies.',
    },
    translation:
      'I do not permit a woman to teach or to assume authority over a man; she must be quiet.',
    coreControversy: {
      criticPosition:
        'Critics view this passage as a permanent ecclesiastical gag order banning women from leadership, ordination, and theological teaching.',
      theologicalDefense:
        'Egalitarians argue it was a temporary pastoral restriction targeted at false teachers in Ephesus (1 Tim 1:3). Complementarians maintain it is an enduring creation-order principle (2:13).',
    },
    contextStatus: 'split-consensus',
    contextStatusLabel: 'Pastoral Epistle & Split Consensus',
    contextStatusDescription:
      'Historical pastoral letter to Timothy in Ephesus; acute modern disagreement between complementarian universalism and egalitarian localized heresy exegesis.',
    historicalExegesis: {
      setting:
        'Written to Timothy serving in Ephesus, a city renowned for the temple of Artemis where female priestesses led worship, amidst localized Ephesian Gnostic myths (1 Tim 1:4).',
      classicalScholars:
        'Jamieson-Fausset-Brown: Argues public preaching and teaching in church assemblies is forbidden based on verse 13 (priority in creation) and verse 14 (Eve being deceived).',
      modernReformView:
        'Egalitarian scholars highlight that Paul commended women ministers and apostles elsewhere (Phoebe in Romans 16:1, Junia in Romans 16:7, Priscilla teaching Apollos in Acts 18:26).',
    },
    parallelScriptures: [
      { tradition: 'bible-nt', citation: 'Romans 16:1', note: 'Phoebe commended as deacon / minister of the church at Cenchreae.' },
      { tradition: 'bible-nt', citation: 'Galatians 3:28', note: 'Neither male nor female; you are all one in Christ Jesus.' },
      { tradition: 'torah', citation: 'Judges 4:4', note: 'Deborah, a prophetess, judged Israel at that time.' },
    ],
    searchKeywords: ['1 timothy 2:12', '1 tim 2:12', 'women teach', 'assume authority', 'authentein', 'she must be quiet', 'women preach'],
  },
  {
    id: 'crit-bible-1cor-14-34',
    citation: '1 Corinthians 14:34–35',
    tradition: 'bible-nt',
    traditionName: 'New Testament',
    book: '1 Corinthians',
    bookId: '1CO',
    chapter: 14,
    verseNumber: 34,
    originalScript: 'αἱ γυναῖκες ἐν ταῖς ἐκκλησίαις σιγάτωσαν· οὐ γὰρ ἐπιτρέπεται αὐταῖς λαλεῖν, ἀλλὰ ὑποτασσέσθωσαν, καθὼς καὶ ὁ νόμος λέγει.',
    keyOriginalTerm: {
      term: 'σιγάτωσαν',
      transliteration: 'Sigatosan',
      literalMeaning: 'Let them be silent / hold peace',
      linguisticDebate: 'Used earlier in 14:28 and 14:30 telling tongue-speakers and prophets to "be silent" when another speaks, indicating turn-taking order rather than absolute lifetime muteness.',
    },
    translation:
      'Women should remain silent in the churches. They are not allowed to speak, but must be in submission, as the law says. If they want to inquire about something, they should ask their own husbands at home; for it is shameful for a woman to speak in church.',
    coreControversy: {
      criticPosition:
        'Critics view this as an explicit silencing of female voices in worship gatherings and spiritual discourse.',
      theologicalDefense:
        'Scholars point out Corinthian services were in chaos with multiple participants interrupting prophecy (14:26–33). Furthermore, some textual critics argue verses 34–35 were a later scribal marginal note (interpolation).',
    },
    contextStatus: 'documented-occasion',
    contextStatusLabel: 'Congregational Order / Disputed Text',
    contextStatusDescription:
      'Addressed to severe disorder and shouting interruptions in Corinthian church meetings; prominent textual critics question its manuscript placement.',
    historicalExegesis: {
      setting:
        'Corinthian church gatherings suffered from uncontrolled speaking in tongues, overlapping prophecies, and members disputing revelations publicly.',
      classicalScholars:
        'Jamieson-Fausset-Brown: Aimed at preventing wives from challenging prophetic speakers in church assemblies. In 1 Cor 11:5, Paul already granted women the right to publicly pray and prophesy with covered heads.',
    },
    parallelScriptures: [
      { tradition: 'bible-nt', citation: '1 Corinthians 11:5', note: 'Every woman that prayeth or prophesieth with her head uncovered.' },
      { tradition: 'bible-nt', citation: 'Acts 21:9', note: 'Philip had four daughters, virgins, who prophesied.' },
    ],
    searchKeywords: ['1 corinthians 14:34', '1 cor 14:34', '1 corinthians 14:33b-35', 'silent in churches', 'shameful for woman to speak', 'ask husbands at home'],
  },
  {
    id: 'crit-bible-eph-5-22',
    citation: 'Ephesians 5:22–24',
    tradition: 'bible-nt',
    traditionName: 'New Testament',
    book: 'Ephesians',
    bookId: 'EPH',
    chapter: 5,
    verseNumber: 22,
    originalScript: 'Αἱ γυναῖκες, τοῖς ἰδίοις ἀνδράσιν ὡς τῷ Κυρίῳ, ὅτι ἀνήρ ἐστιν κεφαλὴ τῆς γυναικὸς ὡς καὶ ὁ Χριστὸς κεφαλὴ τῆς ἐκκλησίας...',
    keyOriginalTerm: {
      term: 'κεφαλὴ',
      transliteration: 'Kephale',
      literalMeaning: 'Head / source / origin / top',
      linguisticDebate: 'Scholars debate whether Kephale denotes hierarchical ruler (autocratic leader) or life-giving source/origin as Christ is the source of the church.',
    },
    translation:
      'Wives, submit yourselves to your own husbands as you do to the Lord. For the husband is the head of the wife as Christ is the head of the church... Now as the church submits to Christ, so also wives should submit to their husbands in everything.',
    coreControversy: {
      criticPosition:
        'Critics view this passage as establishing structural domestic patriarchy and demanding uncritical obedience from wives to husbands.',
      theologicalDefense:
        'Theologians note it is governed by verse 21 ("submitting to one another"). The husband’s headship is radically redefined in verses 25–28 as sacrificial self-giving love (dying for her), subverting Roman autocratic rule.',
    },
    contextStatus: 'documented-occasion',
    contextStatusLabel: 'Apostolic Household Code (*Haustafel*)',
    contextStatusDescription:
      'Addressed to early Christian converts living under Greco-Roman domestic law (patria potestas) where male householders held absolute legal control.',
    historicalExegesis: {
      setting:
        '1st-century Roman society where the paterfamilias possessed legal power of life and death over wives, children, and enslaved persons.',
      classicalScholars:
        'Jamieson-Fausset-Brown: Wifely submission is not servile, but voluntary in spiritual harmony. The husband’s authority is bound by the model of Christ sacrificing himself for the church.',
    },
    parallelScriptures: [
      { tradition: 'bible-nt', citation: 'Colossians 3:18-19', note: 'Wives submit; husbands love your wives and do not be harsh with them.' },
      { tradition: 'bible-nt', citation: '1 Peter 3:7', note: 'Husbands give honor to the wife as joint heirs of the grace of life.' },
      { tradition: 'quran', citation: 'Surah 30:21', note: 'He created mates that you may find tranquility in them, placing affection and mercy.' },
    ],
    searchKeywords: ['ephesians 5:22', 'eph 5:22', 'wives submit', 'husband head of wife', 'as christ loved the church', 'kephale'],
  },
  {
    id: 'crit-bible-1tim-2-15',
    citation: '1 Timothy 2:15',
    tradition: 'bible-nt',
    traditionName: 'New Testament',
    book: '1 Timothy',
    bookId: '1TI',
    chapter: 2,
    verseNumber: 15,
    originalScript: 'σωθήσεται δὲ διὰ τῆς τεκνογονίας, ἐὰν μείνωσιν ἐν πίστει καὶ ἀγάπῃ καὶ ἁγιασμῷ μετὰ σωφροσύνης.',
    keyOriginalTerm: {
      term: 'διὰ τῆς τεκνογονίας',
      transliteration: 'Dia tes teknogonias',
      literalMeaning: 'Through the childbearing',
      linguisticDebate: 'The presence of the definite article ("the" childbearing) is viewed by many Greek patristic commentators as an allusion to the Incarnation of Christ through Mary.',
    },
    translation:
      'But women will be saved through childbearing—if they continue in faith, love, and holiness with propriety.',
    coreControversy: {
      criticPosition:
        'Critics view this verse as reducing a woman’s spiritual salvation to biological reproduction, excluding barren, unmarried, or child-free women.',
      theologicalDefense:
        'Christian scholars explain it either refers to the physical preservation of mothers, faithful perseverance within maternal duties, or a messianic prophecy of the birth of the Savior reversing Eve’s transgression.',
    },
    contextStatus: 'split-consensus',
    contextStatusLabel: 'Debated Theologoumenon',
    contextStatusDescription:
      'Divergent classical and modern exegetical traditions on whether "the childbearing" refers to daily domestic perseverance or the Incarnation of Christ.',
    historicalExegesis: {
      setting:
        'Conclusion of Paul’s directives to Timothy in Ephesus after citing the deception of Eve (2:14).',
      classicalScholars:
        'Jamieson-Fausset-Brown: (1) Preservation amidst the trials of motherhood as her portion of the Genesis 3 curse; (2) Messianic allusion to "the childbearing" of the promised Seed (Gen 3:15) whereby the Savior was born.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Genesis 3:15', note: 'The seed of the woman shall bruise the serpent’s head.' },
      { tradition: 'torah', citation: 'Genesis 3:16', note: 'In pain you shall bring forth children.' },
    ],
    searchKeywords: ['1 timothy 2:15', '1 tim 2:15', 'saved through childbearing', 'teknogonia', 'childbearing faith love'],
  },

  // ===========================================================================
  // 4. THE VEDAS & VEDIC LITERATURE
  // ===========================================================================
  {
    id: 'crit-vedas-rv10-95-15',
    citation: 'Rigveda 10.95.15',
    tradition: 'vedas',
    traditionName: 'Rigveda',
    book: 'Rigveda Book 10',
    bookId: 'RV10',
    chapter: 95,
    verseNumber: 15,
    originalScript: 'मा स्म प्र पप्तो मा त्वा श्वा॑सो भक्षन्नव्यथासो न उ त्वा । न वै स्त्रैणानि सख्यानि सन्ति सालावृकाणां हृदयान्येता ॥',
    keyOriginalTerm: {
      term: 'सालावृकाणां हृदयान्येता',
      transliteration: 'Sālāvrkānām hrdayānyetā',
      literalMeaning: 'Hearts of hyenas / wild wolves are their hearts',
      linguisticDebate: 'Spoken by King Pururavas in the dramatic mythological dialogue hymn (Samvada Sukta) lamenting Urvashi leaving him, not a Vedic commandment.',
    },
    translation:
      '“Nay, do not die, Purūravas, nor perish: let not the evil-omened wolves devour thee. With women there can be no lasting friendship: hearts of hyenas are the hearts of women.”',
    coreControversy: {
      criticPosition:
        'Critics frequently cite this verse as proof of inherent, foundational misogyny in primary Vedic scripture.',
      theologicalDefense:
        'Vedic scholars point out this is a dramatic line of theatrical mythological dialogue spoken by a grief-stricken fictional king (Pururavas) whose celestial lover left him, not a spiritual law or ethical commandment.',
    },
    contextStatus: 'mythological-dialogue',
    contextStatusLabel: '🎭 Mythological Character Dialogue',
    contextStatusDescription:
      'A spoken line of dramatic poetic dialogue within the Samvada Sukta (dialogue hymn); NOT a religious law, moral mandate, or divine precept.',
    historicalExegesis: {
      setting:
        'The legend of King Pururavas and the celestial nymph (Apsara) Urvashi. Urvashi agreed to live with Pururavas on certain conditions; when he broke them, she vanished. Pururavas finds her at a lotus lake and laments his agony.',
      classicalScholars:
        'Sayana Bhashya: Explains this is an emotional exclamation of a mortal lover abandoned by a celestial nymph. Urvashi herself replies in verse 15 rebuking his despair.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Ecclesiastes 7:26', note: 'I find more bitter than death the woman whose heart is snares and nets.' },
      { tradition: 'vedas', citation: 'Rigveda 10.39.1', note: 'Hymn composed directly by female Vedic Rishi Ghosha.' },
    ],
    searchKeywords: ['rigveda 10.95.15', 'rv 10.95', 'hearts of hyenas', 'pururavas urvashi', 'hearts of women', 'wolves'],
  },
  {
    id: 'crit-vedas-rv08-33-17',
    citation: 'Rigveda 8.33.17',
    tradition: 'vedas',
    traditionName: 'Rigveda',
    book: 'Rigveda Book 8',
    bookId: 'RV08',
    chapter: 33,
    verseNumber: 17,
    originalScript: 'इन्द्रश्चिद्ध तदब्रवीत् स्त्रिया अशास्यं मनः । उतो अह क्रतुं रघूम् ॥',
    keyOriginalTerm: {
      term: 'स्त्रिया अशास्यं मनः',
      transliteration: 'Striyā aśāsyaṁ manaḥ',
      literalMeaning: 'The mind of woman is undisciplined / brooks not control',
      linguisticDebate: 'Spoken within a narrative hymn by sage Trasadasyu recording an aphorism attributed to Indra.',
    },
    translation:
      'Indra himself hath said: “The mind of woman brooks not discipline; her intellect hath little weight.”',
    coreControversy: {
      criticPosition:
        'Critics view this statement as an ancient scriptural dismissal of female cognitive capability and intellectual weight.',
      theologicalDefense:
        'Scholars explain it is a narrative mythological quote attributed to the deity Indra, rather than an injunction. It coexists with numerous hymns authored directly by female seers (Brahmavadinis).',
    },
    contextStatus: 'mythological-dialogue',
    contextStatusLabel: 'Narrative Mythological Aphorism',
    contextStatusDescription:
      'An aphoristic quote attributed in dialogue to Indra within a specific hymn; not a universal ritual or legal code.',
    historicalExegesis: {
      setting:
        'A hymn attributed to sage Medhyatithi or Trasadasyu celebrating Indra’s deeds.',
      classicalScholars:
        'Sayana Bhashya: Glosses as a folk observation regarding emotional volatility in specific historical contexts. Does not preclude women attaining Brahmavidya (supreme spiritual knowledge).',
    },
    parallelScriptures: [
      { tradition: 'vedas', citation: 'Rigveda 10.125.5', note: 'Goddess Vak declares she makes whom she loves a sage, a rishi, a thinker.' },
      { tradition: 'bible-nt', citation: '1 Peter 3:7', note: 'Giving honor to the woman as to the weaker vessel.' },
    ],
    searchKeywords: ['rigveda 8.33.17', 'rv 8.33', 'mind of woman', 'intellect hath little weight', 'indra said'],
  },
  {
    id: 'crit-vedas-sb-14-1-1-31',
    citation: 'Satapatha Brahmana 14.1.1.31',
    tradition: 'vedas',
    traditionName: 'Yajurveda (Brahmana)',
    book: 'Satapatha Brahmana',
    chapter: 14,
    verseNumber: 31,
    originalScript: 'तस्मात् स्त्रियं च शुद्रं च श्वानं च कृष्णं च शकुनं नेक्षेत...',
    keyOriginalTerm: {
      term: 'अनृतं हि',
      transliteration: 'Anrtam hi',
      literalMeaning: 'For these are untruth / outside the consecrated sacrificial enclosure',
      linguisticDebate: 'Anrta here designates non-sacrificial mundane reality, contrasted with Satya (the consecrated fire altar).',
    },
    translation:
      'He should not look at a woman, a Shudra, a dog, and a black bird, for these are untruth (anrta)...',
    coreControversy: {
      criticPosition:
        'Critics argue this passage ritually equates women and Shudras with dogs and birds, proving ancient spiritual marginalization.',
      theologicalDefense:
        'Traditional scholars explain this is a specialized esoteric manual for the Pravargya fire ritual. The officiating priest undergoes extreme solar containment; gazing at entities outside the consecrated rite breaks the ritual boundary.',
    },
    contextStatus: 'ritual-boundary-code',
    contextStatusLabel: '🕯️ Altar Fire Ritual Boundary Rule',
    contextStatusDescription:
      'An ascetic restriction for officiating priests during the esoteric Pravargya sacrificial rite; not a civil or moral law for everyday life.',
    historicalExegesis: {
      setting:
        'The Pravargya ritual in the Satapatha Brahmana, where the Mahavira pot represents the sun and the head of the cosmic sacrifice (Yajna).',
      classicalScholars:
        'Sayana Bhashya: The priest represents Satya (sacrificial truth) and must maintain unbroken meditative focus within the sacrificial circle. Looking outside at uninitiated mundane beings (anrta) breaks the rite.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Leviticus 15:19', note: 'Ritual boundaries regarding bodily emissions and touching holy things.' },
    ],
    searchKeywords: ['satapatha brahmana 14.1.1.31', 'shudra dog woman', 'not look at woman', 'untruth', 'pravargya'],
  },
  {
    id: 'crit-vedas-rv10-85-46',
    citation: 'Rigveda 10.85.46',
    tradition: 'vedas',
    traditionName: 'Rigveda',
    book: 'Rigveda Book 10',
    bookId: 'RV10',
    chapter: 85,
    verseNumber: 46,
    originalScript: 'सम्राज्ञी श्वशुरे भव सम्राज्ञी श्वश्र्वां भव । ननान्दरि सम्राज्ञी भव सम्राज्ञी अधि देवृषु ॥',
    keyOriginalTerm: {
      term: 'सम्राज्ञी',
      transliteration: 'Samrājñī',
      literalMeaning: 'Empress / Sovereign Queen / Supreme Ruler',
      linguisticDebate: 'The highest political and domestic title available in Sanskrit, applied to the bride entering her new household.',
    },
    translation:
      '“Be an empress (Samrājñī) over your father-in-law; be an empress over your mother-in-law; be an empress over the sister-in-law; be an empress over the brothers-in-law.”',
    coreControversy: {
      criticPosition:
        'Critics argue this highlights an ancient patrilocal structure where a woman’s entire social worth was tied to leaving her natal family to integrate into her husband’s clan.',
      theologicalDefense:
        'Vedic traditionalists point out that conferring the supreme title of "Samrajni" (Empress) granted the bride supreme domestic sovereignty and moral authority over the entire joint family.',
    },
    contextStatus: 'documented-occasion',
    contextStatusLabel: 'Vedic Wedding Liturgy (*Vivaha*)',
    contextStatusDescription:
      'The foundational nuptial blessing from the Surya-Savitri marriage hymn (Vivaha Sukta), chanted at Vedic weddings for millennia.',
    historicalExegesis: {
      setting:
        'Rigveda 10.85, the cosmic marriage of Surya (the daughter of the Sun) with Soma, providing the timeless liturgy for Hindu marriage rituals.',
      classicalScholars:
        'Sayana Bhashya: Samrajni signifies supreme domestic governance. The bride is not received as a subordinate servant, but installed as queen of the extended household.',
    },
    parallelScriptures: [
      { tradition: 'torah', citation: 'Proverbs 31:10-31', note: 'The woman of valor who oversees her household with wisdom and strength.' },
      { tradition: 'quran', citation: 'Surah 30:21', note: 'Affection and mercy placed between spouses.' },
    ],
    searchKeywords: ['rigveda 10.85.46', 'rv 10.85', 'samrajni', 'empress father in law', 'wedding hymn', 'vivaha sukta'],
  },
  {
    id: 'crit-vedas-av06-11-03',
    citation: 'Atharva Veda 6.11.3',
    tradition: 'vedas',
    traditionName: 'Atharva Veda',
    book: 'Atharva Veda Book 6',
    chapter: 11,
    verseNumber: 3,
    originalScript: 'प्रजापतिः संभरति सं नयति यथा वशम् । परा सुव स्त्रियम् अनु पुमांसम् आ गमय ॥',
    keyOriginalTerm: {
      term: 'परा सुव स्त्रियम्',
      transliteration: 'Parā suva striyam',
      literalMeaning: 'Send forth / put away elsewhere the female child; bring forth the male',
      linguisticDebate: 'Part of the ancient Pumsavana ritual hymn recited for obtaining male progeny in ancient pastoral societies.',
    },
    translation:
      '“The birth of a female child, grant it elsewhere; but here produce a male child.”',
    coreControversy: {
      criticPosition:
        'Critics argue this verse provided ancient religious legitimization for the cultural preference for sons and historical female neglect in South Asia.',
      theologicalDefense:
        'Historians state this reflected the economic and survival realities of ancient pastoral cattle-herding clans, where sons were needed for warfare, herd defense, and performing ancestral funeral rites (Pitr Yajna).',
    },
    contextStatus: 'no-narrative-occasion',
    contextStatusLabel: 'Pastoral Progeny Prayer (*Pumsavana*)',
    contextStatusDescription:
      'A domestic ritual prayer for male offspring in pastoral antiquity; reflects economic agrarian survival norms rather than an eternal moral hierarchy.',
    historicalExegesis: {
      setting:
        'Ancient domestic fertility rituals (Pumsavana) in the Atharvan tradition, where family continuity and military defense depended on male progeny.',
      classicalScholars:
        'Sayana Bhashya on Atharva Veda: Focuses on the ritual mechanics of prayer for male heirs to sustain the ancestral lineage (Kula) and funeral offerings.',
    },
    parallelScriptures: [
      { tradition: 'quran', citation: 'Surah 16:58-59', note: 'Quranic rebuke of pre-Islamic Arabian preference for sons.' },
      { tradition: 'torah', citation: 'Genesis 38:8', note: 'Levirate marriage duty to raise up sons for the deceased brother’s line.' },
    ],
    searchKeywords: ['atharva veda 6.11.3', 'av 6.11', 'birth of female child grant elsewhere', 'produce male child', 'pumsavana', 'son preference'],
  },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findCriticalControversy(query: string): CriticalControversyVerse | null {
  const clean = query
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-');
  if (!clean) return null;

  // 1. Exact match on normalized citation or keyword
  for (const item of CRITICAL_CONTROVERSIES) {
    const citNorm = item.citation.toLowerCase().replace(/[\u2013\u2014]/g, '-');
    if (clean === citNorm) return item;
    for (const kw of item.searchKeywords) {
      const kwNorm = kw.toLowerCase().replace(/[\u2013\u2014]/g, '-');
      if (clean === kwNorm) return item;
    }
  }

  // 2. Exact citation substring match (e.g. user typed "Tell me about Surah An-Nisa 4:34")
  for (const item of CRITICAL_CONTROVERSIES) {
    const citNorm = item.citation.toLowerCase().replace(/[\u2013\u2014]/g, '-');
    if (clean.includes(citNorm)) return item;
  }

  // 3. Keyword matching with numeric boundary protection (e.g. "4:34" must not match "14:34")
  for (const item of CRITICAL_CONTROVERSIES) {
    for (const kw of item.searchKeywords) {
      const kwNorm = kw.toLowerCase().replace(/[\u2013\u2014]/g, '-');
      if (/\d/.test(kwNorm)) {
        const pattern = new RegExp(`(?:^|[^0-9a-z])${escapeRegex(kwNorm)}(?:$|[^0-9a-z])`, 'i');
        if (pattern.test(clean)) {
          return item;
        }
      } else if (clean.includes(kwNorm)) {
        return item;
      }
    }
  }

  return null;
}

export function convertControversyToInquiryResult(
  item: CriticalControversyVerse
): ScriptureInquiryResult {
  // Check if item citation maps to one of our rich 4-tradition curated QA topics
  const CONTROVERSY_TO_QA_MAP: Record<string, string> = {
    'crit-quran-4-34': 'qa-marital-conduct',
    'crit-quran-2-282': 'qa-rape-and-witnesses',
    'crit-quran-4-11': 'qa-inheritance-equity',
    'crit-quran-4-24': 'qa-captives-concubinage',
    'crit-quran-65-4': 'qa-marital-conduct',
    'crit-bible-1tim-2-12': 'qa-women-leadership',
    'crit-bible-1cor-14-34': 'qa-women-leadership',
    'crit-bible-eph-5-22': 'qa-marital-conduct',
    'crit-bible-1pet-3-1': 'qa-marital-conduct',
    'crit-bible-gen-3-16': 'qa-marital-conduct',
    'crit-bible-deu-22-28': 'qa-forced-marriage',
    'crit-bible-lev-12-2': 'qa-ritual-impurity',
    'crit-bible-exo-21-7': 'qa-marital-conduct',
    'crit-bible-num-31-17': 'qa-captives-concubinage',
    'crit-vedas-rv08-33-17': 'qa-marital-conduct',
    'crit-vedas-rv10-95-15': 'qa-marital-conduct',
    'crit-vedas-rv10-85-46': 'qa-marital-conduct',
    'crit-bible-1tim-2-15': 'qa-salvation-childbearing',
    'crit-bible-1cor-11-3': 'qa-women-leadership',
  };

  const targetQaId = CONTROVERSY_TO_QA_MAP[item.id];
  const matchingCurated = CURATED_SCRIPTURE_QA.find((q) => {
    return (
      (targetQaId && q.id === targetQaId) ||
      q.searchKeywords.some((kw) => kw.toLowerCase() === item.citation.toLowerCase())
    );
  });

  if (matchingCurated) {
    return {
      id: item.id,
      question: item.citation,
      shortTitle: item.citation,
      topicBackground: `${item.contextStatusDescription}\n\nCore Dilemma: ${item.coreControversy.criticPosition}\n\nScholarly/Theological Perspective: ${item.coreControversy.theologicalDefense}`,
      traditions: matchingCurated.traditions,
      isCurated: true,
      initialTradition: item.tradition,
      criticalControversy: item,
    };
  }

  // Standalone Critical Controversy Dossier with Parallel Cross-Tradition Cards
  const primaryGroup: TraditionGroup = {
    tradition: item.tradition,
    traditionName: item.traditionName,
    subtitle: `${item.book} ${item.chapter}:${item.verseNumber}`,
    verses: [
      {
        id: item.id,
        tradition: item.tradition,
        book: item.book,
        bookId: item.bookId,
        chapter: item.chapter,
        verseNumber: item.verseNumber,
        originalText: item.originalScript,
        translation: item.translation,
        historicalContext: `${item.contextStatusLabel}\n${item.historicalExegesis.setting}`,
        classicalCommentary: `${item.historicalExegesis.classicalScholars}${
          item.historicalExegesis.modernReformView
            ? `\n\nContemporary / Reform Exegesis:\n${item.historicalExegesis.modernReformView}`
            : ''
        }`,
      },
    ],
  };

  const traditionsList: TraditionGroup[] = [primaryGroup];

  for (const p of item.parallelScriptures) {
    traditionsList.push({
      tradition: p.tradition,
      traditionName:
        p.tradition === 'quran'
          ? 'The Holy Quran'
          : p.tradition === 'bible-nt'
          ? 'New Testament'
          : p.tradition === 'torah'
          ? 'Torah & Old Testament'
          : 'Rigveda',
      subtitle: `Parallel passage: ${p.citation}`,
      verses: [
        {
          id: `par-${item.id}-${p.citation.replace(/[\s:.]/g, '-')}`,
          tradition: p.tradition,
          book: p.citation.split(/\s+\d/)[0] || p.citation,
          chapter: 1,
          verseNumber: 1,
          translation: `Cross-tradition parallel reference: ${p.citation}`,
          historicalContext: p.note,
        },
      ],
    });
  }

  return {
    id: item.id,
    question: item.citation,
    shortTitle: item.citation,
    topicBackground: `${item.contextStatusDescription}\n\nCore Dilemma: ${item.coreControversy.criticPosition}\n\nScholarly/Theological Perspective: ${item.coreControversy.theologicalDefense}`,
    traditions: traditionsList,
    isCurated: true,
    initialTradition: item.tradition,
    criticalControversy: item,
  };
}

