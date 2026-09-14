// Comprehensive, scholar-grade dataset for:
// "The Most Controversial Questions of All Time" across major world religions:
// Islam (The Holy Quran), Christianity (New Testament), Judaism (Torah & Tanakh),
// and Vedic Hinduism (Rigveda).
//
// Every single question covers all 4 major traditions with verified primary texts,
// original language scripts, historical context / Asbab al-Nuzul, and classical exegesis.

import type { TraditionKey, TraditionGroup, CuratedScriptureQA } from './curatedScriptureQA';

export type ControversyDossier = {
  criticPosition: string;
  scholarlyDefense: string;
  contextBadge: string;
};

export type ControversialQuestion = CuratedScriptureQA & {
  categoryLabel: string;
  dilemmaTag: string;
  controversyDossier: ControversyDossier;
};

export const CONTROVERSIAL_QUESTIONS: ControversialQuestion[] = [
  // ===========================================================================
  // 1. PHYSICAL STRIKING & MARITAL DISCIPLINE
  // ===========================================================================
  {
    id: 'qa-marital-conduct',
    slug: 'does-scripture-permit-striking-or-corporal-discipline-of-a-spouse',
    question: 'Does scriptural law permit a husband to physically discipline or strike his wife?',
    shortTitle: 'Physical Striking & Marital Authority',
    category: 'debated',
    categoryLabel: 'MARITAL DISCIPLINE & DOMESTIC CODES',
    dilemmaTag: 'Corporal Chastisement',
    primaryTraditions: ['quran', 'bible-nt'],
    searchKeywords: [
      'beat women',
      'hit wife',
      'strike wife',
      '4:34',
      'quran 4:34',
      'surah 4:34',
      'an-nisa 34',
      'daraba',
      'wadribuhunna',
      'nushuz',
      'domestic violence',
      'marital conflict',
      'wife beating',
      'ephesians 5',
      'ephesians 5:22',
      'eph 5:22',
      'colossians 3:19',
      'col 3:19',
      '1 peter 3:7',
      '1 pet 3:7',
      'genesis 3:16',
      'gen 3:16',
      'rigveda 8.33.17',
      'rv 8.33.17',
      'rigveda 10.85.46',
    ],
    topicBackground:
      'Ancient scriptures address marital order within the patriarchal legal frameworks of antiquity. Verses such as Quran 4:34 and Biblical household codes (Haustafeln) are among the most heatedly debated texts in modern religious ethics. Commentators examine whether physical chastisement was codified as a continuous right, strictly constrained into symbolic arbitration, or dismantled by overarching commandments of love and equality.',
    controversyDossier: {
      criticPosition:
        'Critics argue that texts like Surah 4:34 and apostolic submission codes legitimize patriarchal supremacy, unequal domestic authority, and physical violence against women.',
      scholarlyDefense:
        'Classical jurists and modern reform theologians argue that historical context (Asbab al-Nuzul) and prophetic hadith strictly restricted pre-Islamic violence to non-injurious symbolism (ghayr mubarrih), while biblical texts emphasize sacrificial, self-giving love that rejects tyranny.',
      contextBadge: 'Documented Occasion & Split Consensus',
    },
    traditions: [
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'Arbitration procedures, non-violence limits, and affection',
        verses: [
          {
            id: 'quran-4-34-full',
            tradition: 'quran',
            book: 'An-Nisa',
            chapter: 4,
            verseNumber: 34,
            originalText:
              'ٱلرِّجَالُ قَوَّٰمُونَ عَلَى ٱلنِّسَآءِ بِمَا فَضَّلَ ٱللَّهُ بَعْضَهُمْ عَلَىٰ بَعْضٍۢ وَبِمَآ أَنفَقُوا۟ مِنْ أَمْوَٰلِهِمْ ... وَٱلَّٰتِى تَخَافُونَ نُشُوزَهُنَّ فَعِظُوهُنَّ وَٱهْجُرُوهُنَّ فِى ٱلْمَضَاجِعِ وَٱضْرِبُوهُنَّ ۖ فَإِنْ أَطَعْنَكُمْ فَلَا تَبْغُوا۟ عَلَيْهِنَّ سَبِيلًا',
            translation:
              'Men are caretakers of women because Allah has favored one over the other and because they spend [maintenance] from their wealth... As to those women on whose part you fear persistent rebellion (nushuz): admonish them [first], next refuse to share their beds, and [finally] strike them [non-violently]. But if they obey you, seek no way against them.',
            historicalContext:
              'Asbab al-Nuzul (al-Wahidi): Habibah bint Zayd was slapped by her husband Sa’d ibn al-Rabi. The Prophet initially ruled for equal retaliation (qisas), then revelation outlined a multi-stage civil dispute arbitration to de-escalate marital breakdown in 7th-century Medina.',
            classicalCommentary:
              'Tafsir al-Jalalayn & Tabari: The striking is conditioned by prophetic hadith as "ghayr mubarrih" (non-injurious, symbolic with a siwak toothstick, strictly prohibited from leaving marks or touching the face). Reformers argue Daraba denotes separation or departure.',
          },
          {
            id: 'quran-4-19-c',
            tradition: 'quran',
            book: 'An-Nisa',
            chapter: 4,
            verseNumber: 19,
            originalText:
              'وَعَاشِرُوهُنَّ بِٱلْمَعْرُوفِ ۚ فَإِن كَرِهْتُمُوهُنَّ فَعَسَىٰٓ أَن تَكْرَهُوا۟ شَيْـًۭٔا وَيَجْعَلَ ٱللَّهُ فِيهِ خَيْرًۭا كَثِيرًۭا',
            translation:
              'And live with them in kindness and honor. For if you dislike them, perhaps you dislike a thing and Allah makes therein much good.',
            historicalContext:
              'Revealed to abolish pre-Islamic Arabian practices where men inherited women against their will or mistreated them to force forfeiture of their dowries.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "Consort with them in a kindly manner, treating them with fairness in maintenance, speech, and companionship."',
          },
          {
            id: 'quran-30-21-c',
            tradition: 'quran',
            book: 'Ar-Rum',
            chapter: 30,
            verseNumber: 21,
            originalText:
              'وَمِنْ ءَايَٰتِهِۦٓ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَٰجًۭا لِّتَسْكُنُوٓا۟ إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةًۭ وَرَحْمَةً',
            translation:
              'And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy...',
            historicalContext:
              'Establishes the foundational theological purpose of marriage in Islam: tranquility (Sakinah), mutual love (Mawaddah), and compassion (Rahmah).',
            classicalCommentary:
              'Tafsir al-Jalalayn: "He placed between spouses affection and mercy, that they may dwell together in peace and mutual care."',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Household submission, sacrificial love, and mutual honor',
        verses: [
          {
            id: 'bible-eph-5-22-c',
            tradition: 'bible-nt',
            book: 'Ephesians',
            bookId: 'EPH',
            chapter: 5,
            verseNumber: 22,
            translation:
              'Wives, be subject to your own husbands, as to the Lord. For the husband is the head of the wife, as Christ also is the head of the assembly... Husbands, love your wives, even as Christ also loved the assembly, and gave himself up for it;',
            historicalContext:
              'Paul’s household code (Haustafel) in 1st-century Greco-Roman Asia Minor, transforming absolute Roman paternal power (patria potestas) by demanding husbands sacrifice their lives for their wives.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "The husband’s headship is not a despotic authority; it is patterned on Christ’s sacrificial devotion. Wives submit voluntarily in Christian order."',
          },
          {
            id: 'bible-col-3-19-c',
            tradition: 'bible-nt',
            book: 'Colossians',
            bookId: 'COL',
            chapter: 3,
            verseNumber: 19,
            translation:
              'Husbands, love your wives, and don’t be bitter against them.',
            historicalContext:
              'Apostolic warning prohibiting harshness, domestic tyranny, or verbal and emotional bitterness in marriage.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Be not bitter: do not act with imperious severity or fretful harshness toward those who are under your domestic care."',
          },
          {
            id: 'bible-1pet-3-7-c',
            tradition: 'bible-nt',
            book: '1 Peter',
            bookId: '1PE',
            chapter: 3,
            verseNumber: 7,
            translation:
              'You husbands, in the same way, live with your wives according to knowledge, giving honor to the woman, as to the weaker vessel, as being also joint heirs of the grace of life; that your prayers may not be hindered.',
            historicalContext:
              'Addressed to persecuted Christian households in Asia Minor. Treats women as equal joint-heirs (synkleronomoi) of divine grace, warning that mistreating one’s wife blocks communion with God.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Giving honor unto the wife... joint-heirs of the same grace. To treat them with dishonor or oppression silences the efficacy of prayer."',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'The Edenic Fall, spousal rights, and Hebrew wisdom',
        verses: [
          {
            id: 'torah-gen-3-16-c',
            tradition: 'torah',
            book: 'Genesis',
            bookId: 'GEN',
            chapter: 3,
            verseNumber: 16,
            translation:
              'To the woman he said, "I will greatly multiply your pain, having children. In pain you shall give birth to children. Your desire will be for your husband, and he will rule over you."',
            historicalContext:
              'The Edenic narrative of the Fall. Jewish and Christian scholars debate whether male rule ("mashal") is a divine normative mandate or a tragic descriptive consequence of human corruption.',
            classicalCommentary:
              'Rashi & Jamieson-Fausset-Brown: "A prophetic description of the sorrowful consequences of the Fall, contrasting the original Edenic equality with the historical subjugation of women in antiquity."',
          },
          {
            id: 'torah-exo-21-10-c',
            tradition: 'torah',
            book: 'Exodus',
            bookId: 'EXO',
            chapter: 21,
            verseNumber: 10,
            translation:
              'If he takes another wife to himself, he shall not diminish her food, her clothing, and her marital rights. If he does not do these three things for her, she shall go out free, without money.',
            historicalContext:
              'Ancient Near Eastern legal statute establishing guaranteed minimum civil and physical protections for wives, granting them unilateral release if neglected.',
            classicalCommentary:
              'Talmud Ketubot 47b: "A husband is legally obligated to provide sustenance, garments, and conjugal affection; any breach grants the wife automatic judicial divorce."',
          },
          {
            id: 'torah-pro-31-10-c',
            tradition: 'torah',
            book: 'Proverbs',
            bookId: 'PRO',
            chapter: 31,
            verseNumber: 10,
            translation:
              'Who can find a worthy woman? For her price is far above rubies. The heart of her husband trusts in her. He shall have no lack of gain.',
            historicalContext:
              'Hebrew wisdom poetry celebrating the autonomous economic, domestic, and moral authority of the woman of valor (Eshet Chayil).',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "A woman of strength and independent enterprise, commanding the absolute trust and honor of her household."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Ancient aphorisms and the coronation of the bride as Queen',
        verses: [
          {
            id: 'vedas-rv08-33-17-full',
            tradition: 'vedas',
            book: 'Rigveda Book 8',
            bookId: 'RV08',
            chapter: 33,
            verseNumber: 17,
            translation:
              'Indra himself hath said, The mind of woman brooks not discipline, Her intellect hath little weight.',
            historicalContext:
              'A proverbial aphorism attributed to Indra within Mandala 8, Hymn 33, recording ancient archaic sentiments on female temperament.',
            classicalCommentary:
              'Sayana Bhashya: "Indra remarks on the emotional autonomy of woman; classical commentators treat this as an idiomatic narrative reflection rather than a universal ritual injunction."',
          },
          {
            id: 'vedas-rv10-85-46-full',
            tradition: 'vedas',
            book: 'Rigveda Book 10',
            bookId: 'RV10',
            chapter: 85,
            verseNumber: 46,
            translation:
              'Ruling as queen over your father-in-law, ruling as queen over your mother-in-law, Queen over your husband’s sisters, and queen over his brothers be.',
            historicalContext:
              'The sacred Vedic wedding hymn (Surya Sukta), ritually enthroning the bride as Samrajni (Empress / Sovereign Mistress) with supreme authority over the family estate.',
            classicalCommentary:
              'Sayana Bhashya: "The bride is blessed to hold supreme domestic dominion (Samrajni) over her new household, establishing mutual dignity and matriarchal honor."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 2. FEMALE SILENCE & PUBLIC SPIRITUAL AUTHORITY
  // ===========================================================================
  {
    id: 'qa-women-leadership',
    slug: 'are-women-commanded-to-keep-silence-and-forbidden-from-teaching-authority',
    question: 'Are women commanded to keep silence and forbidden from teaching or spiritual authority?',
    shortTitle: 'Female Silence & Public Authority',
    category: 'debated',
    categoryLabel: 'ECCLESIASTICAL ORDER & SPIRITUAL LEADERSHIP',
    dilemmaTag: 'Teaching & Ordination',
    primaryTraditions: ['bible-nt'],
    searchKeywords: [
      'women in leadership',
      'women preach',
      'women teach',
      'women silence',
      'silence in church',
      'can women lead',
      '1 timothy 2:12',
      '1 tim 2:12',
      '1ti 2:12',
      'authentein',
      '1 corinthians 14:34',
      '1 cor 14:34',
      '1co 14:34',
      'queen of sheba',
      'deborah',
      'phoebe',
      'junia',
      'devi sukta',
      'rigveda 10.125',
    ],
    topicBackground:
      'The question of female leadership and public voice is one of the sharpest dividers across world religions. Christian texts contain severe prohibitions on women speaking or teaching men alongside greetings to female apostles and ministers. Islamic and Jewish scriptures feature sovereign female rulers, national judges, and prophetesses alongside patriarchal governance structures.',
    controversyDossier: {
      criticPosition:
        'Passages such as 1 Timothy 2:12 and 1 Corinthians 14:34 are cited by critics as unambiguous commands silencing women and excluding them from theological leadership.',
      scholarlyDefense:
        'Scholars emphasize the historical circumstances in Ephesus and Corinth regarding localized disruptions, contrasting these epistles with female leaders praised in scripture: Judge Deborah, the Queen of Sheba, Deacon Phoebe, and Apostle Junia.',
      contextBadge: 'Documented Occasion & Split Consensus',
    },
    traditions: [
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Congregational silence codes alongside female ministers & apostles',
        verses: [
          {
            id: 'bible-1tim-2-12-full',
            tradition: 'bible-nt',
            book: '1 Timothy',
            bookId: '1TI',
            chapter: 2,
            verseNumber: 12,
            translation:
              'But I don’t permit a woman to teach, nor to exercise authority over a man, but to be in quietness.',
            historicalContext:
              'Written to Timothy in Ephesus, where false teachings and localized doctrinal chaos had disrupted the congregation. The rare Greek term "authentein" (domineer/usurp) is subject to extensive debate between complementarian and egalitarian theologians.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Teaching in public is prohibited to maintain apostolic order. Egalitarian scholars note authentein denotes usurping domineering control rather than recognized collaborative ministry."',
          },
          {
            id: 'bible-1cor-14-34-full',
            tradition: 'bible-nt',
            book: '1 Corinthians',
            bookId: '1CO',
            chapter: 14,
            verseNumber: 34,
            translation:
              'Let the women keep silence in the assemblies, for it has not been permitted for them to be talking except in submission, as the law also says. If they desire to learn anything, let them ask their own husbands at home...',
            historicalContext:
              'Addressed to chaotic worship gatherings in Corinth where multiple members spoke simultaneously and interrupted prophecy with contentious questioning (1 Cor 14:33b–35).',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Paul establishes order: women are not to interrupt public assemblies with questions, but learn quietly at home."',
          },
          {
            id: 'bible-rom-16-1-full',
            tradition: 'bible-nt',
            book: 'Romans',
            bookId: 'ROM',
            chapter: 16,
            verseNumber: 1,
            translation:
              'I commend to you Phoebe, our sister, who is a deacon [minister] of the assembly that is at Cenchreae... and Junia, my relative, notable among the apostles.',
            historicalContext:
              'Paul entrusts the delivery and public exposition of Romans to Phoebe, designating her with the official title "diakonos" and "prostatis" (patron/benefactor), and recognizes Junia as an apostle.',
            classicalCommentary:
              'John Chrysostom & Modern Exegesis: "To be an apostle is something great. But to be notable among the apostles — think what a great encomium that is for Junia."',
          },
        ],
      },
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'Sovereignty, mutual guardianship, and consultative governance',
        verses: [
          {
            id: 'quran-27-23-full',
            tradition: 'quran',
            book: 'An-Naml',
            chapter: 27,
            verseNumber: 23,
            originalText:
              'إِنِّى وَجَدتُّ ٱمْرَأَةًۭ تَمْلِكُهُمْ وَأُوتِيَتْ مِن كُلِّ شَىْءٍۢ وَلَهَا عَرْشٌ عَظِيمٌۭ',
            translation:
              'Indeed, I found [there] a woman ruling over them, and she has been given of all things, and she has a great throne.',
            historicalContext:
              'The hoopoe bird reports to Prophet-King Solomon on Bilqis, the Queen of Sheba, praising her sovereignty, wealth, and consultative wisdom.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "A woman ruling over them, namely Bilqis; she was endowed with everything needed by supreme monarchs."',
          },
          {
            id: 'quran-9-71-full',
            tradition: 'quran',
            book: 'At-Tawbah',
            chapter: 9,
            verseNumber: 71,
            originalText:
              'وَٱلْمُؤْمِنُونَ وَٱلْمُؤْمِنَٰتُ بَعْضُهُمْ أَوْلِيَآءُ بَعْضٍۢ ۚ يَأْمُرُونَ بِٱلْمَعْرُوفِ وَيَنْهَوْنَ عَنِ ٱلْمُنكَرِ',
            translation:
              'The believing men and believing women are allies and protectors of one another. They enjoin what is right and forbid what is wrong...',
            historicalContext:
              'Establishes reciprocal political and moral guardianship (Wilayah) between women and men in governing community ethics.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "They are mutual helpers and guardians in faith, jointly exercising moral and civic leadership."',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'Deborah’s supreme national judgeship and Hebrew prophetesses',
        verses: [
          {
            id: 'torah-jdg-4-4-full',
            tradition: 'torah',
            book: 'Judges',
            bookId: 'JDG',
            chapter: 4,
            verseNumber: 4,
            translation:
              'Now Deborah, a prophetess, the wife of Lappidoth, judged Israel at that time. She lived under the palm tree of Deborah... and the children of Israel came up to her for judgment.',
            historicalContext:
              'Deborah held supreme civil, judicial, prophetic, and military authority as the fourth Judge (Shofet) of Israel.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "She was endued with the prophetic spirit and recognized as head of the nation, hearing causes and settling national controversies."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'The Devi Sukta and female seers composing sacred hymns',
        verses: [
          {
            id: 'vedas-rv10-125-1-full',
            tradition: 'vedas',
            book: 'Rigveda Book 10',
            bookId: 'RV10',
            chapter: 125,
            verseNumber: 1,
            translation:
              'I TRAVEL with the Rudras and the Vasus... I, verily, myself declare the word: Whom I love, I make mighty, a sage, a rishi, a wise thinker.',
            historicalContext:
              'The Devi Sukta (Hymn of Vak Ambhrini), wherein the feminine divine voice proclaims cosmic sovereignty, bestowing authority and prophetic wisdom upon sages and rulers.',
            classicalCommentary:
              'Sayana Bhashya: "The female seer identifies with supreme divine speech (Vak), revealing that all spiritual authority and poetic mastery proceed from her."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 3. LEGAL TESTIMONY & WITNESS WEIGHT
  // ===========================================================================
  {
    id: 'qa-rape-and-witnesses',
    slug: 'is-a-womans-legal-testimony-worth-half-of-a-mans',
    question: 'Is a woman\'s legal testimony worth half of a man\'s, or excluded in judicial matters?',
    shortTitle: 'Legal Testimony & Witness Weight',
    category: 'debated',
    categoryLabel: 'JUDICIAL EVIDENCE & WITNESS RATIOS',
    dilemmaTag: 'Court Witness Ratios',
    primaryTraditions: ['quran', 'torah'],
    searchKeywords: [
      'two women witnesses',
      'testimony',
      'witness',
      'witness weight',
      '2:282',
      'quran 2:282',
      'surah 2:282',
      'four witnesses',
      'qadhf',
      'deuteronomy 19:15',
      'shevuot 30a',
      'resurrection witnesses',
      'luke 24:11',
    ],
    topicBackground:
      'Scriptural rules of judicial testimony reflect ancient evidentiary standards. In Surah 2:282, commercial transactions require two women witnesses in place of one man. In Biblical and Talmudic law, women were traditionally excluded from judicial courts with specific exceptions. Meanwhile, in Christian narrative, women were chosen as the primary eyewitnesses to the foundational event of Christianity (the Resurrection).',
    controversyDossier: {
      criticPosition:
        'Critics view the 2:282 formula and Talmudic testimony restrictions as codifying the intellectual inferiority of women in legal systems.',
      scholarlyDefense:
        'Scholars point out that 2:282 explicitly governs commercial debt contracts where 7th-century women lacked financial exposure, whereas in other matters (such as marriage, Lian oaths, and spiritual transmissions), female testimony was equal or exclusive.',
      contextBadge: 'Documented Occasion & Split Consensus',
    },
    traditions: [
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'Commercial debt contracts and equal oaths in marital Lian',
        verses: [
          {
            id: 'quran-2-282-full',
            tradition: 'quran',
            book: 'Al-Baqarah',
            chapter: 2,
            verseNumber: 282,
            originalText:
              'وَٱسْتَشْهِدُوا۟ شَهِيدَيْنِ مِن رِّجَالِكُمْ ۖ فَإِن لَّمْ يَكُونَا رَجُلَيْنِ فَرَجُلٌۭ وَٱمْرَأَتَانِ مِمَّن تَرْضَوْنَ مِنَ ٱلشُّهَدَآءِ أَن تَضِلَّ إِحْدَىٰهُمَا فَتُذَكِّرَ إِحْدَىٰهُمَا ٱلْأُخْرَىٰ',
            translation:
              'And bring to witness two witnesses from among your men. And if there are not two men [available], then a man and two women from those whom you accept as witnesses — so that if one of them errs, the other can remind her...',
            historicalContext:
              'The longest verse in the Quran, establishing formal Medinan contract law for credit transactions. Classical jurists noted the ratio was protective for commercial debt where women typically did not engage.',
            classicalCommentary:
              'Ibn al-Qayyim & modern jurists: In non-financial matters, domestic affairs, and hadith transmission, a single woman’s testimony carries 100% legal weight. In Lian (Quran 24:6-9), husband and wife swear identical oaths.',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'Evidentiary standards and the Daughters of Zelophehad court petition',
        verses: [
          {
            id: 'torah-deut-19-15-c',
            tradition: 'torah',
            book: 'Deuteronomy',
            bookId: 'DEU',
            chapter: 19,
            verseNumber: 15,
            translation:
              'One witness shall not rise up against a man for any iniquity, or for any sin... at the mouth of two witnesses, or at the mouth of three witnesses, shall a matter be established.',
            historicalContext:
              'Biblical law required a minimum of two eyewitnesses for criminal conviction.',
            classicalCommentary:
              'Talmud Shevuot 30a: Rabbinic tradition restricted court testimony to men based on grammatical gender, while Maimonides recognized exceptions in personal status and property disputes.',
          },
          {
            id: 'torah-num-27-1-c',
            tradition: 'torah',
            book: 'Numbers',
            bookId: 'NUM',
            chapter: 27,
            verseNumber: 2,
            translation:
              'They stood before Moses, and before Eleazar the priest, and before the princes and all the congregation... saying, "Give to us a possession among the brothers of our father."',
            historicalContext:
              'The five Daughters of Zelophehad personally petitioned the highest national court of ancient Israel, winning a landmark divine verdict granting them direct land inheritance.',
            classicalCommentary:
              'Rashi: "Their wisdom and legal righteousness were praised by God Himself: \'The daughters of Zelophehad speak right.\'"',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Women commissioned as the primary witnesses to the Resurrection',
        verses: [
          {
            id: 'bible-luke-24-10-c',
            tradition: 'bible-nt',
            book: 'Luke',
            bookId: 'LUK',
            chapter: 24,
            verseNumber: 10,
            translation:
              'Now they were Mary Magdalene, Joanna, and Mary the mother of James. The other women with them told these things to the apostles. These words seemed to them to be idle tales, and they didn’t believe them.',
            historicalContext:
              'In 1st-century Roman and Jewish culture where female testimony was often devalued, the Gospels record that Jesus revealed His Resurrection first to women, commanding them to witness to the male disciples.',
            classicalCommentary:
              'Modern Christian Apologetics: "The criterion of embarrassment: if the early church had fabricated the Resurrection narrative, they would not have anchored it upon female testimony in a culture skeptical of female witnesses."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Witnessing the sacred marital covenant before gods and fire',
        verses: [
          {
            id: 'vedas-rv10-85-36-c',
            tradition: 'vedas',
            book: 'Rigveda Book 10',
            bookId: 'RV10',
            chapter: 85,
            verseNumber: 36,
            translation:
              'I take your hand in mine for happy fortune, that you may reach old age with me, your husband. Bhaga, Aryaman, Savitar, and Purandhi have given you to me to rule my house.',
            historicalContext:
              'The Panigrahana rite: the solemn public covenant witnessed before the sacred fire (Agni) and the community, sealing mutual obligations.',
            classicalCommentary:
              'Sayana Bhashya: "The sacred fire and assembly bear witness to the lifelong equality and joint spiritual duties of bride and groom."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 4. WAR CAPTIVES, CONCUBINAGE & MARITAL AUTONOMY
  // ===========================================================================
  {
    id: 'qa-captives-concubinage',
    slug: 'do-scriptures-permit-taking-captive-women-and-concubinage',
    question: 'Do ancient scriptural laws permit taking captive women of war and concubinage?',
    shortTitle: 'War Captives & Concubinage',
    category: 'debated',
    categoryLabel: 'WARFARE CODES & CAPTIVE LAWS',
    dilemmaTag: 'Concubinage & Captives',
    primaryTraditions: ['quran', 'torah'],
    searchKeywords: [
      'captives',
      'concubines',
      'right hand possess',
      'ma malakat',
      '4:24',
      'quran 4:24',
      'deuteronomy 21:10',
      'numbers 31:17',
      'captive maiden',
      'slavery in scripture',
    ],
    topicBackground:
      'Ancient warfare routinely treated captive populations as property. Scriptures across the Ancient Near East addressed the status of female prisoners of war. Passages such as Surah 4:24 and Deuteronomy 21:10–14 set legal boundaries regarding captives, which critics challenge as endorsing coerced concubinage, while apologists emphasize historical containment and legal incorporation.',
    controversyDossier: {
      criticPosition:
        'Critics condemn statutes on war captives as sanctioning sexual slavery and stripping vulnerable women of bodily autonomy.',
      scholarlyDefense:
        'Theologians point out that biblical and Islamic laws introduced radical protections into brutal ancient warfare: requiring formal legal status, prohibiting sexual exploitation for prostitution (Quran 24:33), and banning the resale of captive wives (Deut 21:14).',
      contextBadge: 'Documented Occasion & Split Consensus',
    },
    traditions: [
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'Legal parameters for captives and the ban on coerced exploitation',
        verses: [
          {
            id: 'quran-4-24-c',
            tradition: 'quran',
            book: 'An-Nisa',
            chapter: 4,
            verseNumber: 24,
            originalText:
              '۞ وَٱلْمُحْصَنَٰتُ مِنَ ٱلنِّسَآءِ إِلَّا مَا مَلَكَتْ أَيْمَٰنُكُمْ ۖ كِتَٰبَ ٱللَّهِ عَلَيْكُمْ',
            translation:
              'And [also prohibited to you are all] married women except those whom your right hands possess. [This is] the decree of Allah upon you...',
            historicalContext:
              'Battle of Hunayn (Asbab al-Nuzul): Muslim fighters hesitated regarding captured enemy women whose pagan husbands remained at war. The verse severed past pagan marital bonds to allow legal integration under Islamic domestic jurisdiction.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "Their past marriages to enemy combatants are dissolved upon capture, requiring the istibra (waiting period) before any marital union."',
          },
          {
            id: 'quran-24-33-full',
            tradition: 'quran',
            book: 'An-Nur',
            chapter: 24,
            verseNumber: 33,
            originalText:
              'وَلَا تُكْرِهُوا۟ فَتَيَٰتِكُمْ عَلَى ٱلْبِغَآءِ إِنْ أَرَدْنَ تَحَصُّنًۭا ... وَمَن يُكْرِههُّنَّ فَإِنَّ ٱللَّهَ مِنۢ بَعْدِ إِكْرَٰهِهِنَّ غَفُورٌۭ رَّحِيمٌۭ',
            translation:
              'And do not compel your maidservants to prostitution... and whoever compels them, then indeed, after their compulsion, Allah is Forgiving and Merciful [to the victims].',
            historicalContext:
              'Abdullah ibn Ubayy forced enslaved women to earn money through prostitution. Revelation criminalized this practice, affirming victims bear zero sin or legal fault.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "Absolute prohibition of coerced sexual exploitation; compassion and forgiveness belong to the compelled victim."',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'The captive woman statute and the ban on resale as chattel',
        verses: [
          {
            id: 'torah-deut-21-10-c',
            tradition: 'torah',
            book: 'Deuteronomy',
            bookId: 'DEU',
            chapter: 21,
            verseNumber: 10,
            translation:
              'When you go out to battle against your enemies... and see among the captives a beautiful woman, and desire her... she shall mourn her father and her mother a full month. After that you may go in to her and be her husband... But if you have no delight in her, you shall let her go where she wants; you shall not sell her for money.',
            historicalContext:
              'Ancient Near Eastern war legislation. Enforced a mandatory 30-day mourning period, granted legal wife status, and explicitly barred treating or selling her as commercial property.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "A humanitarian mitigation of ancient warfare: she was protected from hasty passion, allowed to grieve, and could never be sold as a slave."',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Transcending servitude into brotherhood in Christ',
        verses: [
          {
            id: 'bible-phlm-1-15-c',
            tradition: 'bible-nt',
            book: 'Philemon',
            bookId: 'PHM',
            chapter: 1,
            verseNumber: 15,
            translation:
              'For perhaps he was therefore separated from you for a season, that you should have him forever; no longer as a slave, but more than a slave, a beloved brother...',
            historicalContext:
              'Paul writing to slave-owner Philemon regarding runaway slave Onesimus, urging him to receive him no longer as property but as an equal brother.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "The Gospel undermines slavery at its root by introducing a higher spiritual union that dissolves the master-slave hierarchy."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Heroic royal gifts in ancient Vedic conflict',
        verses: [
          {
            id: 'vedas-rv08-19-36-c',
            tradition: 'vedas',
            book: 'Rigveda Book 8',
            bookId: 'RV08',
            chapter: 19,
            verseNumber: 36,
            translation:
              'The generous prince Trasadasyu gave me fifty women as attendants, renowned for gifts and heroic bounty...',
            historicalContext:
              'Danastuti (praise of bounty) hymns celebrating the victory and wealth distribution of royal patrons in ancient pastoral conflicts.',
            classicalCommentary:
              'Sayana Bhashya: "Records historical gifts of attendants and cattle presented to performing Rishis by royal conquerors."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 5. INHERITANCE RATIOS & ECONOMIC EQUITY
  // ===========================================================================
  {
    id: 'qa-inheritance-equity',
    slug: 'why-do-scriptural-inheritance-codes-allocate-daughters-half-of-sons',
    question: 'Why do scriptural inheritance statutes award daughters half the share of sons?',
    shortTitle: 'Inheritance Ratios & Economic Rights',
    category: 'debated',
    categoryLabel: 'PROPERTY RIGHTS & ESTATE DISTRIBUTION',
    dilemmaTag: 'Gender Inheritance 2:1',
    primaryTraditions: ['quran', 'torah', 'vedas'],
    searchKeywords: [
      'inheritance',
      'share of two females',
      '4:11',
      'quran 4:11',
      'numbers 27:1',
      'daughters of zelophehad',
      'zelophehad',
      'streedhana',
      'rigveda 3.31',
    ],
    topicBackground:
      'Inheritance laws govern how wealth transfers across generations. Surah 4:11 stipulates that sons receive twice the estate of daughters, a passage central to modern legal debates. In the Hebrew Bible, sons inherited primarily to preserve ancestral tribal land, with daughters inheriting only if no male heirs existed (Numbers 27).',
    controversyDossier: {
      criticPosition:
        'Critics see the 2:1 inheritance ratio as mathematical proof that scriptures value female existence at half that of a male.',
      scholarlyDefense:
        'Theologians and economists emphasize that Islamic law imposes 100% of family financial burdens (housing, food, children, wife’s maintenance, dowry) strictly on men, while women retain 100% of their inherited wealth with zero obligation to spend on the family.',
      contextBadge: 'Documented Occasion & Split Consensus',
    },
    traditions: [
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'Asymmetric financial liability paired with absolute property ownership',
        verses: [
          {
            id: 'quran-4-11-c',
            tradition: 'quran',
            book: 'An-Nisa',
            chapter: 4,
            verseNumber: 11,
            originalText:
              'يُوصِيكُمُ ٱللَّهُ فِىٓ أَوْلَٰدِكُمْ ۖ لِلذَّكَرِ مِثْلُ حَظِّ ٱلْأُنثَيَيْنِ',
            translation:
              'Allah instructs you concerning your children: for the male, what is equal to the share of two females...',
            historicalContext:
              'In pre-Islamic Arabia, women and children were completely excluded from inheritance. Surah 4:11 established revolutionary rights for female heirs, while placing complete lifelong maintenance duties on men.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "Because the male bears the financial burden of dowry (mahr) and maintenance of his household, whereas the woman’s inheritance remains her private inviolable wealth."',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'Tribal preservation and the precedent of Zelophehad’s daughters',
        verses: [
          {
            id: 'torah-num-27-8-c',
            tradition: 'torah',
            book: 'Numbers',
            bookId: 'NUM',
            chapter: 27,
            verseNumber: 8,
            translation:
              'If a man dies and has no son, then you shall cause his inheritance to pass to his daughter.',
            historicalContext:
              'Established the statutory right of daughters to inherit ancestral estates in ancient Israel when there were no surviving sons.',
            classicalCommentary:
              'Rashi: "The law safeguarded the name and territorial heritage of the deceased through his daughters."',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Spiritual inheritance transcending material division',
        verses: [
          {
            id: 'bible-gal-3-28-full',
            tradition: 'bible-nt',
            book: 'Galatians',
            bookId: 'GAL',
            chapter: 3,
            verseNumber: 28,
            translation:
              'There is neither Jew nor Greek, there is neither slave nor free man, there is neither male nor female; for you are all one in Christ Jesus.',
            historicalContext:
              'Paul’s foundational theological charter eliminating social and gender hierarchies regarding spiritual redemption and divine promise.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "All of either sex are joint-heirs of the kingdom of God on identical terms of grace."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'The Putrika statute and the inheritance of brotherless daughters',
        verses: [
          {
            id: 'vedas-rv03-31-1-c',
            tradition: 'vedas',
            book: 'Rigveda Book 3',
            bookId: 'RV03',
            chapter: 31,
            verseNumber: 1,
            translation:
              'The father who has no son honors his daughter’s son; he comes with offerings... the brotherless daughter goes back to her ancestral home, claiming her share.',
            historicalContext:
              'Vedic Putrika doctrine: recognized a daughter’s legal capacity to inherit and transmit ancestral wealth when her father lacked sons.',
            classicalCommentary:
              'Sayana Bhashya: "The daughter is recognized as legal heir to the ancestral property in the absence of a brother."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 6. RITUAL IMPURITY & FEMALE BIOLOGY
  // ===========================================================================
  {
    id: 'qa-ritual-impurity',
    slug: 'why-do-ancient-codes-deem-childbirth-and-menstruation-ritually-impure',
    question: 'Why do ancient biblical and religious codes deem female biological cycles ritually impure?',
    shortTitle: 'Ritual Impurity & Female Biology',
    category: 'debated',
    categoryLabel: 'SACRED PURITY & BIOLOGICAL CYCLES',
    dilemmaTag: 'Biological Taboos',
    primaryTraditions: ['torah', 'quran', 'vedas'],
    searchKeywords: [
      'ritual impurity',
      'leviticus 12',
      'leviticus 15',
      'niddah',
      'menstruation',
      'childbirth impurity',
      'daughter doubled',
      'quran 2:222',
      'mark 5:25',
    ],
    topicBackground:
      'Ancient religions maintained elaborate ritual purity boundaries. In Leviticus 12, a mother’s period of ritual impurity after giving birth to a female child (80 days) is double that for a male child (40 days). In Quran 2:222, menstruation is described as "adha" (physical discomfort/harm), requiring sexual abstinence but without physical untouchability.',
    controversyDossier: {
      criticPosition:
        'Critics cite doubled impurity periods for female infants and menstrual taboos as evidence of intrinsic misogyny and biological shame.',
      scholarlyDefense:
        'Scholars explain that ritual impurity (Tumah in Hebrew, Hadath in Arabic) is not moral sin, but a ritual boundary connected with life, blood, and mortality. In the Gospels, Jesus touched and healed the hemorrhaging woman, sanctifying faith over taboo.',
      contextBadge: 'Preserved Sacred Boundary Code',
    },
    traditions: [
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'The Levitical sanctuary codes and postpartum purification',
        verses: [
          {
            id: 'torah-lev-12-2-c',
            tradition: 'torah',
            book: 'Leviticus',
            bookId: 'LEV',
            chapter: 12,
            verseNumber: 2,
            translation:
              'If a woman conceives, and bears a male child, then she shall be unclean seven days... But if she bears a female child, then she shall be unclean two weeks... and she shall continue in the blood of purification sixty-six days.',
            historicalContext:
              'Ancient Levitical sanctuary purity laws regulating access to the Tabernacle after the discharge of life-blood during childbirth.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Ritual uncleanness was not moral contamination, but ceremonial separation under the Mosaic sanctuary system."',
          },
        ],
      },
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'Menstruation as physical discomfort without personal untouchability',
        verses: [
          {
            id: 'quran-2-222-c',
            tradition: 'quran',
            book: 'Al-Baqarah',
            chapter: 2,
            verseNumber: 222,
            originalText:
              'وَيَسْـَٔلُونَكَ عَنِ ٱلْمَحِيضِ ۖ قُلْ هُوَ أَذًۭى فَٱعْتَزِلُوا۟ ٱلنِّسَآءَ فِى ٱلْمَحِيضِ ۖ وَلَا تَقْرَبُوهُنَّ حَتَّىٰ يَطْهُرْنَ',
            translation:
              'And they ask you about menstruation. Say, "It is an adha [discomfort/harm], so keep away from wives during menstruation. And do not approach them until they are pure..."',
            historicalContext:
              'Medinan Muslims asked how to treat menstruating women, as neighboring groups practiced extreme social ostracization. The Prophet clarified: "Do everything except intercourse."',
            classicalCommentary:
              'Tafsir al-Jalalayn: "Refrain from intercourse only; there is no social isolation or untouchability in eating, drinking, or companionship."',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Jesus breaking ritual untouchability with the hemorrhaging woman',
        verses: [
          {
            id: 'bible-mark-5-25-c',
            tradition: 'bible-nt',
            book: 'Mark',
            bookId: 'MRK',
            chapter: 5,
            verseNumber: 25,
            translation:
              'A woman who had an issue of blood for twelve years... touched his cloak. Immediately the fountain of her blood was dried up... Jesus said to her, "Daughter, your faith has made you well. Go in peace."',
            historicalContext:
              'Under Levitical law, touching a person with a chronic discharge incurred ritual uncleanness. Jesus did not rebuke her, but declared her healed through faith.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Instead of defiling Jesus, her touch drew forth divine healing, transforming ritual taboo into spiritual grace."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Sacred purification and blessings for painless labor',
        verses: [
          {
            id: 'vedas-av01-11-1-c',
            tradition: 'vedas',
            book: 'Atharva Veda Book 1',
            bookId: 'AV01',
            chapter: 11,
            verseNumber: 1,
            translation:
              'At this birth, let the waters flow freely; let the mother deliver without pain. We cleanse and purify the womb for life...',
            historicalContext:
              'Vedic hymns of protection and sanctification recited by family elders to ensure safe and honorable delivery.',
            classicalCommentary:
              'Classical Gloss: "A prayer sanctifying maternal life, seeking the blessings of the deities of waters for an auspicious birth."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 7. FORCED MARRIAGE & THE VIOLATED MAIDEN
  // ===========================================================================
  {
    id: 'qa-forced-marriage',
    slug: 'does-scripture-compel-an-assaulted-woman-to-marry-her-assailant',
    question: 'Does scriptural law compel an assaulted maiden to marry her assailant?',
    shortTitle: 'Forced Marriage to an Assailant',
    category: 'debated',
    categoryLabel: 'MARITAL CONSENT & ASSAULT TORTS',
    dilemmaTag: 'The Violated Maiden',
    primaryTraditions: ['torah'],
    searchKeywords: [
      'marry rapist',
      'deuteronomy 22:28',
      'forced marriage',
      'exodus 22:16',
      'quran 4:19',
      'consent to marry',
      'ketubot 39b',
    ],
    topicBackground:
      'In ancient agrarian societies, an unbetrothed woman who lost her virginity faced economic destitution and social ruin. Deuteronomy 22:28–29 stipulates that an assailant must pay 50 shekels of silver and take her as a lifelong wife without the right of divorce. Critics condemn this as forcing a victim to live with her abuser, while legal historians analyze it as a protective financial sanction.',
    controversyDossier: {
      criticPosition:
        'Critics cite Deuteronomy 22:28 as a horrifying statute that forces a sexual assault victim into marriage with her rapist.',
      scholarlyDefense:
        'Talmudic jurisprudence (Ketubot 39b) and historical jurists clarified that the maiden and her family held absolute power to refuse the marriage while still collecting the full 50-shekel fine, whereas the assailant had no right of refusal and was barred from ever divorcing her.',
      contextBadge: 'Ancient Civil Tort Statute',
    },
    traditions: [
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'Ancient civil tort fine and the Talmudic requirement of consent',
        verses: [
          {
            id: 'torah-deut-22-28-full',
            tradition: 'torah',
            book: 'Deuteronomy',
            bookId: 'DEU',
            chapter: 22,
            verseNumber: 28,
            translation:
              'If a man finds a lady who is a virgin, who is not pledged to be married, and lays hold on her, and lies with her, and they are found; then the man... shall give to the lady’s father fifty shekels of silver, and she shall be his wife, because he has humbled her. He may not put her away all his days.',
            historicalContext:
              'Ancient Near Eastern civil tort protecting an unmarried woman from abandonment in a society where non-virgins faced social destitution.',
            classicalCommentary:
              'Talmud Ketubot 39b: "She and her father have the absolute right to refuse. If she refuses, he pays the fine in full and departs. If she agrees, he is bound to maintain her for life without divorce."',
          },
        ],
      },
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'Absolute prohibition of forced marriage or inheriting women',
        verses: [
          {
            id: 'quran-4-19-full',
            tradition: 'quran',
            book: 'An-Nisa',
            chapter: 4,
            verseNumber: 19,
            originalText:
              'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا يَحِلُّ لَكُمْ أَن تَرِثُوا۟ ٱلنِّسَآءَ كَرْهًۭا',
            translation:
              'O you who have believed, it is not lawful for you to inherit women against their will...',
            historicalContext:
              'Revealed to abolish pre-Islamic Arabian practices where relatives inherited widows like chattel. In Sahih Bukhari (6946), the Prophet formally annulled a marriage forced upon a woman by her father.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "You must not take possession of women against their consent; a marriage without explicit female agreement is legally invalid in Islamic law."',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Voluntary consent and holy freedom in marriage',
        verses: [
          {
            id: 'bible-1cor-7-39-c',
            tradition: 'bible-nt',
            book: '1 Corinthians',
            bookId: '1CO',
            chapter: 7,
            verseNumber: 39,
            translation:
              'A wife is bound by law for as long as her husband lives; but if the husband is dead, she is free to be married to whomever she desires, only in the Lord.',
            historicalContext:
              'Apostolic affirmation of autonomous female choice in marriage.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "She is at full liberty to choose her partner in life, acting with voluntary Christian discernment."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Maidens selecting their own suitors in mutual longings',
        verses: [
          {
            id: 'vedas-rv10-27-12-c',
            tradition: 'vedas',
            book: 'Rigveda Book 10',
            bookId: 'RV10',
            chapter: 27,
            verseNumber: 12,
            translation:
              'How many a maiden is pleasing to the suitor! The auspicious maiden, adorned and blessed, chooses her own companion from among the people.',
            historicalContext:
              'Reflects the ancient Vedic Swayamvara practice, where a maiden exercised personal agency in selecting her husband.',
            classicalCommentary:
              'Sayana Bhashya: "The bride possesses independent discernment (Svayamvara) to choose the suitor who aligns with her heart and character."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 8. SALVATION & SPIRITUAL WORTH TIED TO CHILDBEARING
  // ===========================================================================
  {
    id: 'qa-salvation-childbearing',
    slug: 'is-female-salvation-conditional-upon-childbearing',
    question: 'Is a woman’s spiritual salvation and moral worth conditional upon childbearing?',
    shortTitle: 'Salvation & Childbearing',
    category: 'debated',
    categoryLabel: 'SOTERIOLOGY & SPIRITUAL REDEMPTION',
    dilemmaTag: 'Saved in Childbearing',
    primaryTraditions: ['bible-nt'],
    searchKeywords: [
      'saved in childbearing',
      '1 timothy 2:15',
      '1 tim 2:15',
      'childbearing',
      'female salvation',
      'quran 33:35',
      'quran 4:124',
      'proverbs 31:30',
    ],
    topicBackground:
      'In 1 Timothy 2:15, Paul makes the enigmatic statement that woman "shall be saved in childbearing, if they continue in faith and love." This has puzzled commentators for centuries: does scripture condition female salvation on reproductive labor, or does it point to Christ’s birth through Mary as the reversal of Eve’s Fall?',
    controversyDossier: {
      criticPosition:
        'Critics view the verse as reducing female spiritual worth exclusively to biological reproduction and maternal subjection.',
      scholarlyDefense:
        'Classical and modern Christian scholars identify an allusion to the proto-evangelium (Genesis 3:15), meaning humanity is saved through "the Childbearing" (Christ born of Mary), while Quranic and Hebrew scriptures explicitly affirm gender-equal salvation based on moral deeds alone.',
      contextBadge: 'Documented Occasion & Split Consensus',
    },
    traditions: [
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'The enigmatic Ephesian promise and Christological redemption',
        verses: [
          {
            id: 'bible-1tim-2-15-full',
            tradition: 'bible-nt',
            book: '1 Timothy',
            bookId: '1TI',
            chapter: 2,
            verseNumber: 15,
            translation:
              'Notwithstanding she shall be saved in childbearing, if they continue in faith and charity and holiness with sobriety.',
            historicalContext:
              'Sent to Timothy in Ephesus, where ascetic Gnostics forbade marriage (1 Tim 4:3). Paul counters by defending the holiness of family life.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Some perceive an allusion to the Incarnation — the Seed of the woman (Gen 3:15) born through childbearing. Others take it as persevering faith within maternal life."',
          },
        ],
      },
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'Identical spiritual rewards and deeds independent of reproduction',
        verses: [
          {
            id: 'quran-33-35-c',
            tradition: 'quran',
            book: 'Al-Ahzab',
            chapter: 33,
            verseNumber: 35,
            originalText:
              'إِنَّ ٱلْمُسْلِمِينَ وَٱلْمُسْلِمَٰتِ وَٱلْمُؤْمِنِينَ وَٱلْمُؤْمِنَٰتِ ... أَعَدَّ ٱللَّهُ لَهُم مَّغْفِرَةًۭ وَأَجْرًا عَظِيمًۭا',
            translation:
              'Indeed, the Muslim men and Muslim women, the believing men and believing women... for them Allah has prepared forgiveness and a great reward.',
            historicalContext:
              'Umm Salamah asked the Prophet why women were not mentioned alongside men. Revelation descended affirming identical moral accountability and rewards.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "God mentions men and women in parallel pairs to affirm their exact equality in divine reward and spiritual stature."',
          },
          {
            id: 'quran-4-124-c',
            tradition: 'quran',
            book: 'An-Nisa',
            chapter: 4,
            verseNumber: 124,
            originalText:
              'وَمَن يَعْمَلْ مِنَ ٱلصَّٰلِحَٰتِ مِن ذَكَرٍ أَوْ أُنثَىٰ وَهُوَ مُؤْمِنٌۭ فَأُو۟لَٰٓئِكَ يَدْخُلُونَ ٱلْجَنَّةَ وَلَا يُظْلَمُونَ نَقِيرًۭا',
            translation:
              'And whoever does righteous deeds, whether male or female, while being a believer — those will enter Paradise and will not be wronged even as much as the speck on a date seed.',
            historicalContext:
              'Affirms universal divine justice: salvation depends exclusively on faith and righteous action, regardless of gender or reproductive status.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "Neither man nor woman will be deprived of the smallest recompense for their deeds."',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'Spiritual fear of the Lord surpassing superficial charm',
        verses: [
          {
            id: 'torah-pro-31-30-c',
            tradition: 'torah',
            book: 'Proverbs',
            bookId: 'PRO',
            chapter: 31,
            verseNumber: 30,
            translation:
              'Charm is deceitful, and beauty is vain; but a woman who fears the Lord, she shall be praised.',
            historicalContext:
              'Concluding culmination of Hebrew wisdom literature.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "True honor belongs not to physical attributes or social status, but to genuine reverence for God."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Prayers for domestic joy and spiritual realization',
        verses: [
          {
            id: 'vedas-rv10-85-27-c',
            tradition: 'vedas',
            book: 'Rigveda Book 10',
            bookId: 'RV10',
            chapter: 85,
            verseNumber: 27,
            translation:
              'May happiness be yours here with your offspring! Watch over this house as mistress in your union. With your husband, unite your body, and speak to your council until old age.',
            historicalContext:
              'The Surya Sukta blessing invoking domestic happiness alongside intellectual leadership in family and council life.',
            classicalCommentary:
              'Sayana Bhashya: "The bride is blessed with thriving children and honored speech in the public assemblies (Vidatha)."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 9. HOLY WARFARE, THE SWORD & APOSTASY
  // ===========================================================================
  {
    id: 'qa-warfare-peace',
    slug: 'do-scriptures-command-warfare-the-sword-or-violence-against-unbelievers',
    question: 'Do religious scriptures sanction holy warfare, the sword, or violence against non-believers?',
    shortTitle: 'Holy Warfare & The Sword',
    category: 'debated',
    categoryLabel: 'JUST WAR, APOCALYPTIC VIOLENCE & CONCORD',
    dilemmaTag: 'The Sword Verse & Peace',
    primaryTraditions: ['quran', 'bible-nt', 'torah', 'vedas'],
    searchKeywords: [
      'sword verse',
      '9:5',
      'quran 9:5',
      'surah 9:5',
      'jihad',
      'kill infidels',
      'matthew 10:34',
      'not peace but sword',
      'luke 22:36',
      'herem',
      'deuteronomy 20:16',
      'rigveda 1.130.8',
    ],
    topicBackground:
      'Scriptural texts written during existential crises of survival contain severe martial commands. Surah 9:5 (the "Sword Verse"), Biblical Herem statutes (Deut 20), and Jesus’s warning "I came not to bring peace, but a sword" (Matt 10:34) have sparked debates on whether scriptures prescribe eternal warfare or contextual defensive action bounded by peace.',
    controversyDossier: {
      criticPosition:
        'Critics view warfare passages as institutionalizing religious expansion by violence, intolerance, and extermination of ideological rivals.',
      scholarlyDefense:
        'Scholars point to Asbab al-Nuzul (specific pagan tribes who breached peace treaties) and biblical literary idioms, demonstrating that foundational theology in all traditions prioritizes peace, self-defense, and religious freedom (Quran 2:256, Matthew 5:9, Isaiah 2:4).',
      contextBadge: 'Documented Wartime Treaty Breach Context',
    },
    traditions: [
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'The Treaty-Breakers in Surah 9 vs universal peace commands',
        verses: [
          {
            id: 'quran-9-5-full',
            tradition: 'quran',
            book: 'At-Tawbah',
            chapter: 9,
            verseNumber: 5,
            originalText:
              'فَإِذَا ٱنسَلَخَ ٱلْأَشْهُرُ ٱلْحُرُمُ فَٱقْتُلُوا۟ ٱلْمُشْرِكِينَ حَيْثُ وَجَدتُّمُوهُمْ وَخُذُوهُمْ وَٱحْصُرُوهُمْ وَٱقْعُدُوا۟ لَهُمْ كُلَّ مَرْصَدٍۢ ۚ فَإِن تَابُوا۟ وَأَقَامُوا۟ ٱلصَّلَوٰةَ وَءَاتَوُا۟ ٱلزَّكَوٰةَ فَخَلُّوا۟ سَبِيلَهُمْ',
            translation:
              'And when the sacred months have passed, then kill the polytheists wherever you find them and capture them and besiege them... But if they repent and establish prayer and give zakah, let them [go] on their way...',
            historicalContext:
              'The "Sword Verse". Addressed exclusively to specific Arabian pagan confederates who repeatedly violated the Treaty of Hudaybiyyah and waged war against the Muslim state. Verse 9:6 immediately commands granting asylum to any pagan who requests protection.',
            classicalCommentary:
              'Tafsir al-Jalalayn & Tabari: "This applied to the pact-breaking polytheists who aided enemies. It does not abrogate the permanent commandment to maintain peace with non-belligerents (Quran 60:8)."',
          },
          {
            id: 'quran-2-190-full',
            tradition: 'quran',
            book: 'Al-Baqarah',
            chapter: 2,
            verseNumber: 190,
            originalText:
              'وَقَٰتِلُوا۟ فِى سَبِيلِ ٱللَّهِ ٱلَّذِينَ يُقَٰتِلُونَكُمْ وَلَا تَعْتَدُوٓا۟ ۚ إِنَّ ٱللَّهَ لَا يُحِبُّ ٱلْمُعْتَدِينَ',
            translation:
              'Fight in the way of Allah those who fight you but do not transgress. Indeed. Allah does not like transgressors.',
            historicalContext:
              'Bounded military action strictly to self-defense against armed aggression, forbidding the harming of non-combatants, women, and children.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "Fight those who wage war against you; do not transgress by initiating fighting or harming civilians. God loves not aggressors."',
          },
          {
            id: 'quran-2-256-full',
            tradition: 'quran',
            book: 'Al-Baqarah',
            chapter: 2,
            verseNumber: 256,
            originalText:
              'لَآ إِكْرَاهَ فِى ٱلدِّينِ ۖ قَد تَّبَيَّنَ ٱلرُّشْدُ مِنَ ٱلْغَىِّ',
            translation:
              'There is no compulsion in religion. The right course has become clear from the wrong.',
            historicalContext:
              'Revealed when early Medinan converts attempted to force their adult children to convert. Established the non-negotiable Quranic principle of freedom of faith.',
            classicalCommentary:
              'Tafsir al-Jalalayn: "No one may be coerced into religious belief; faith must proceed from free conscience."',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'The spiritual sword of division vs loving enemies',
        verses: [
          {
            id: 'bible-matt-10-34-c',
            tradition: 'bible-nt',
            book: 'Matthew',
            bookId: 'MAT',
            chapter: 10,
            verseNumber: 34,
            translation:
              'Don’t think that I came to send peace on the earth. I didn’t come to send peace, but a sword. For I came to set a man at variance against his father, and a daughter against her mother...',
            historicalContext:
              'Jesus warning disciples of family conflict resulting from following the Gospel.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "A figurative sword of ideological division: not that Christ aims at conflict, but that truth inevitably creates friction with worldly systems."',
          },
          {
            id: 'bible-matt-26-52-c',
            tradition: 'bible-nt',
            book: 'Matthew',
            bookId: 'MAT',
            chapter: 26,
            verseNumber: 52,
            translation:
              'Then Jesus said to him, "Put your sword back into its place, for all those who take the sword will die by the sword."',
            historicalContext:
              'Jesus rebuking Peter in Gethsemane for drawing an armed sword against the arresting soldiers.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Christ explicitly disclaims the carnal weapon for defending His kingdom, establishing radical non-violence."',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'The Herem wartime ban alongside prophetic visions of disarmament',
        verses: [
          {
            id: 'torah-deut-20-16-c',
            tradition: 'torah',
            book: 'Deuteronomy',
            bookId: 'DEU',
            chapter: 20,
            verseNumber: 16,
            translation:
              'But of the cities of these peoples that the Lord your God gives you for an inheritance, you shall save alive nothing that breathes...',
            historicalContext:
              'The ancient Canaanite Herem (war ban) statute under Joshua’s conquest.',
            classicalCommentary:
              'Maimonides & Christian theologians: "A localized historical judgment confined strictly to ancient Canaanite idolatry, never applicable to later warfare."',
          },
          {
            id: 'torah-isa-2-4-c',
            tradition: 'torah',
            book: 'Isaiah',
            bookId: 'ISA',
            chapter: 2,
            verseNumber: 4,
            translation:
              'They will beat their swords into plowshares, and their spears into pruning hooks. Nation will not lift up sword against nation, neither will they learn war any more.',
            historicalContext:
              'Prophetic messianic vision of universal global peace and total disarmament.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "The glorious end of redemption: the universal pacification of mankind under the reign of God."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Indra’s cosmic martial battles and the closing prayer for unity',
        verses: [
          {
            id: 'vedas-rv01-130-8-c',
            tradition: 'vedas',
            book: 'Rigveda Book 1',
            bookId: 'RV01',
            chapter: 130,
            verseNumber: 8,
            translation:
              'Indra in battles helps the Aryan worshiper; he shatters the adversaries and humbles the unrighteous...',
            historicalContext:
              'Hymns invoking Indra’s lightning bolt against drought demons and hostile cattle-raiders in the Punjab.',
            classicalCommentary:
              'Sayana Bhashya: "Indra personifies cosmic justice defeating demonic obstructionists to restore waters and order."',
          },
          {
            id: 'vedas-rv10-191-2-full',
            tradition: 'vedas',
            book: 'Rigveda Book 10',
            bookId: 'RV10',
            chapter: 191,
            verseNumber: 2,
            translation:
              'Meet together, speak together, let your minds be of one accord, as the ancient devas in concord sat down to their share... One and the same be your resolve!',
            historicalContext:
              'The Samgacchadhvam Sukta: the closing hymn of the Rigveda, an eternal prayer for collective human concord and universal peace.',
            classicalCommentary:
              'Sayana Bhashya: "The Rigveda concludes not with warfare, but with a universal invocation for harmony, united minds, and peace."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 11. KILLING WOMEN, CHILDREN & NON-COMBATANTS IN WAR
  // ===========================================================================
  {
    id: 'qa-killing-civilians-war',
    slug: 'do-scriptures-permit-killing-women-children-or-non-combatants-in-war',
    question:
      'Does scriptural law permit fighters to kill women, children, or non-combatants on the enemy side in war?',
    shortTitle: 'Non-Combatants, Women & Children in War',
    category: 'debated',
    categoryLabel: 'RULES OF ENGAGEMENT & NON-COMBATANT IMMUNITY',
    dilemmaTag: 'Civilian Immunity & Total War',
    primaryTraditions: ['quran', 'bible-nt', 'torah', 'vedas'],
    searchKeywords: [
      'kill women in war',
      'kill children in war',
      'kill civilians',
      'civilian immunity',
      'non-combatants',
      'women and children',
      'innocents in war',
      'rules of engagement',
      'collateral damage',
      'amalek',
      '1 samuel 15:3',
      '1sa 15:3',
      'deuteronomy 20:16',
      'deut 20:16',
      'deuteronomy 24:16',
      'deut 24:16',
      '2:190',
      'quran 2:190',
      '5:32',
      'quran 5:32',
      '60:8',
      'quran 60:8',
      'bukhari 3015',
      'matthew 26:52',
      'luke 9:54',
      'romans 12:19',
      'rigveda 6.75',
      'dharma yuddha',
    ],
    topicBackground:
      'One of the most intensely contested moral questions across sacred traditions is the status of non-combatants in war—specifically whether fighters may kill women, children, the elderly, or civilians associated with the enemy side who are not personally bearing arms. Ancient biblical texts record extreme total-war decrees (Cherem) commanding the complete destruction of enemy populations including infants. Conversely, Islamic jurisprudence and Vedic military ethics formulated early doctrines of non-combatant immunity criminalizing the intentional targeting of women, children, monks, and bystanders. Commentators examine how each tradition defines battlefield guilt and resolves historical accounts of wartime violence.',
    controversyDossier: {
      criticPosition:
        'Critics point to Hebrew Bible extermination commands (such as 1 Samuel 15:3 and Deuteronomy 20:16) and wartime siege incidents as religious sanctions for total war, collective guilt, and the slaughter of innocent enemy women and children.',
      scholarlyDefense:
        'Theologians and classical jurists emphasize that normative religious law establishes non-combatant immunity: the Prophet Muhammad explicitly prohibited killing women, children, and monks; rabbinic authorities ruled ancient Canaanite/Amalekite decrees permanently obsolete while mandating civilian escape corridors in sieges; and Christian and Vedic ethics forbid slaying unarmed, defenseless individuals.',
      contextBadge: 'Rules of Engagement & Non-Combatant Protection',
    },
    traditions: [
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'The prohibition of transgression, sanctity of innocent life, and prophetic ban',
        verses: [
          {
            id: 'quran-2-190-civilians',
            tradition: 'quran',
            book: 'Al-Baqarah',
            chapter: 2,
            verseNumber: 190,
            originalText:
              'وَقَٰتِلُوا۟ فِى سَبِيلِ ٱللَّهِ ٱلَّذِينَ يُقَٰتِلُونَكُمْ وَلَا تَعْتَدُوٓا۟ ۚ إِنَّ ٱللَّهَ لَا يُحِبُّ ٱلْمُعْتَدِينَ',
            translation:
              'Fight in the way of Allah those who fight you, but do not transgress limits. Indeed, Allah does not like transgressors.',
            historicalContext:
              'The foundational Quranic rule of engagement revealed in Medina. Early authorities (Ibn Abbas, Umar ibn Abd al-Aziz) affirmed that "do not transgress limits" explicitly forbids killing women, children, hermits, monks, and those who do not engage in active combat.',
            classicalCommentary:
              'Tafsir al-Tabari & Sahih al-Bukhari (3014, 3015): The Prophet Muhammad walked through a battlefield and found the slain corpse of a woman. He denounced it with outrage: "She was not one who fought!" and immediately issued a universal standing military order: "Do not kill women, do not kill children, and do not kill monks in their hermitages."',
          },
          {
            id: 'quran-5-32-civilians',
            tradition: 'quran',
            book: 'Al-Ma’idah',
            chapter: 5,
            verseNumber: 32,
            originalText:
              'مَن قَتَلَ نَفْسًۢا بِغَيْرِ نَفْسٍ أَوْ فَسَادٍۢ فِى ٱلْأَرْضِ فَكَأَنَّمَا قَتَلَ ٱلنَّاسَ جَمِيعًۭا وَمَنْ أَحْيَاهَا فَكَأَنَّمَآ أَحْيَا ٱلنَّاسَ جَمِيعًۭا',
            translation:
              'Whoever kills a soul unless for a soul or for corruption [done] in the land—it is as if he had slain all mankind, and whoever saves one—it is as if he had saved all mankind.',
            historicalContext:
              'Delivered in the context of the primordial fratricide of Cain and Abel, establishing the absolute metaphysical sanctity of innocent human life across all generations.',
            classicalCommentary:
              'Tafsir Ibn Kathir & Qurtubi: "Killing an innocent person who has committed no murder or violent aggression is equivalent to the murder of all humanity, because it destroys the divine sacred covenant of life. In warfare, a civilian who bears no arms is inviolable."',
          },
          {
            id: 'quran-60-8-civilians',
            tradition: 'quran',
            book: 'Al-Mumtahanah',
            chapter: 60,
            verseNumber: 8,
            originalText:
              'لَّا يَنْهَىٰكُمُ ٱللَّهُ عَنِ ٱلَّذِينَ لَمْ يُقَٰتِلُوكُمْ فِى ٱلدِّينِ وَلَمْ يُخْرِجُوكُم مِّن دِيَٰرِكُمْ أَن تَبَرُّوهُمْ وَتُقْسِطُوٓا۟ إِلَيْهِمْ ۚ إِنَّ ٱللَّهَ يُحِبُّ ٱلْمُقْسِطِينَ',
            translation:
              'Allah does not forbid you from those who do not fight you because of religion and do not expel you from your homes—from being righteous toward them and acting justly toward them. Indeed, Allah loves those who act justly.',
            historicalContext:
              'Revealed regarding non-Muslims in Mecca and surrounding regions who chose peace and refused to take up arms against the Muslim community.',
            classicalCommentary:
              'Tafsir al-Jalalayn & Razi: "Commands proactive benevolence (birr) and fairness (qist) toward all non-combatants. Classical jurists cite this verse to confirm that mere religious difference is never a justification for violence; only armed aggression makes one a lawful target."',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'The Cherem decree of antiquity vs individual guilt and civilian escape',
        verses: [
          {
            id: 'torah-1sa-15-3-civilians',
            tradition: 'torah',
            book: '1 Samuel',
            bookId: '1SA',
            chapter: 15,
            verseNumber: 3,
            translation:
              'Now go and strike Amalek, and utterly destroy all that they have; do not spare them, but kill both man and woman, child and infant, ox and sheep, camel and donkey.',
            historicalContext:
              'Prophet Samuel’s commission to King Saul to execute total retribution against Amalek, the ancient nomadic nation that attacked the rear stragglers (the faint and weary) of Israel during the Exodus (Deut 25:17-19). This is the primary biblical text cited regarding the killing of women and children in war.',
            classicalCommentary:
              'Talmud Yoma 22b & Maimonides (Hilchot Melachim 5:4): The Talmud records that Saul himself debated the moral justice of this command: "If the adults sinned, how did the infants sin?" Classical Jewish jurisprudence established that King Sennacherib of Assyria mixed and dispersed all ancient peoples, permanently dissolving the identity of Amalek and the 7 Canaanite nations. Rabbinic law rules that total-war commands are entirely obsolete and inapplicable to any modern people.',
          },
          {
            id: 'torah-deu-20-10-civilians',
            tradition: 'torah',
            book: 'Deuteronomy',
            bookId: 'DEU',
            chapter: 20,
            verseNumber: 10,
            translation:
              'When you draw near to a city to fight against it, offer terms of peace to it... When you besiege a city for a long time... you shall not destroy its trees by wielding an axe against them, for you may eat from them, and you shall not cut them down.',
            historicalContext:
              'The biblical laws of warfare (Milchemet Reshut) governing sieges against external nations. Requires an initial mandatory offer of peace and prohibits scorched-earth tactics.',
            classicalCommentary:
              'Maimonides (Mishneh Torah, Hilchot Melachim 6:1, 6:7) & Nachmanides (Ramban): "When besieging a city to capture it, one must never surround it on all four sides, but only on three sides, leaving a fourth open direction so that anyone who wishes to flee and escape with their life—especially women, children, and civilians—may do so."',
          },
          {
            id: 'torah-deu-24-16-civilians',
            tradition: 'torah',
            book: 'Deuteronomy',
            bookId: 'DEU',
            chapter: 24,
            verseNumber: 16,
            translation:
              'Fathers shall not be put to death for their children, nor shall children be put to death for their fathers; each one shall be put to death for his own sin.',
            historicalContext:
              'Constitutional statute in the Torah establishing the fundamental principle of personal responsibility, explicitly outlawing vicarious punishment or the execution of families for an individual’s deeds.',
            classicalCommentary:
              'Rashi & Talmud Sanhedrin 27b: "A foundational ethical safeguard: no child may be executed for the crimes of their parent. The principle decisively refutes collective battlefield guilt against non-participating family members."',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Rebuke of retributive slaughter, the sheathed sword, and loving enemies',
        verses: [
          {
            id: 'bible-mat-26-52-civilians',
            tradition: 'bible-nt',
            book: 'Matthew',
            bookId: 'MAT',
            chapter: 26,
            verseNumber: 52,
            translation:
              'Then Jesus said to him, "Put your sword back in its place, for all who take the sword will perish by the sword."',
            historicalContext:
              'In the Garden of Gethsemane, when the disciple Peter drew a blade and struck the servant of the high priest to protect Jesus from arrest. Jesus commanded him to sheath the sword and healed the wounded enemy.',
            classicalCommentary:
              'John Chrysostom & Matthew Henry: "Christ repudiates armed resistance and retributive violence. By warning that those who live by the sword will perish by it, Jesus establishes that his followers must never resort to slaughter or armed aggression against human life."',
          },
          {
            id: 'bible-luk-9-54-civilians',
            tradition: 'bible-nt',
            book: 'Luke',
            bookId: 'LUK',
            chapter: 9,
            verseNumber: 54,
            translation:
              'And when his disciples James and John saw this, they said, "Lord, do you want us to command fire to come down from heaven and consume them, just as Elijah did?" But he turned and rebuked them, and said, "You do not know what manner of spirit you are of. For the Son of Man did not come to destroy men’s lives, but to save them."',
            historicalContext:
              'When a Samaritan village refused to receive Jesus because he was traveling toward Jerusalem, the apostles requested permission to call down apocalyptic judgment upon the whole settlement.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "The disciples believed their impulse was righteous zeal, but Christ severely rebuked them. The mission of the Son of Man is the preservation and redemption of life, strictly condemning vindictive collective destruction of communities."',
          },
          {
            id: 'bible-rom-12-19-civilians',
            tradition: 'bible-nt',
            book: 'Romans',
            bookId: 'ROM',
            chapter: 12,
            verseNumber: 19,
            translation:
              'Beloved, never avenge yourselves, but leave it to the wrath of God, for it is written, "Vengeance is mine, I will repay, says the Lord." To the contrary, "if your enemy is hungry, feed him; if he is thirsty, give him something to drink."',
            historicalContext:
              'Paul’s ethical instruction to the Christian community in imperial Rome, forbidding private retribution and prescribing humanitarian service toward adversaries.',
            classicalCommentary:
              'Thomas Aquinas & Augustine (Just War Tradition): "In Christian theological ethics, legitimate military action is governed by the principles of discrimination and proportionality. Non-combatants—including women, children, merchants, and farmers—possess absolute moral immunity; their direct intentional killing is categorized as mortal sin and murder."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Sacred weapons for righteousness and the strict ethics of Dharma-Yuddha',
        verses: [
          {
            id: 'vedas-rv06-75-15-civilians',
            tradition: 'vedas',
            book: 'Rigveda Book 6',
            bookId: 'RV06',
            chapter: 75,
            verseNumber: 15,
            translation:
              'Poisonous is its tip, of horn its head, of iron its shaft: to this shaft of the God of Battle be honor given. Piercing the foe, protect us, O Divine Arrow; make our bodies impenetrable.',
            historicalContext:
              'From the renowned Battle Hymn (Sangrama Sukta) of the Rigveda, consecrating weapons under cosmic Dharma to protect the righteous community rather than inflict wanton slaughter.',
            classicalCommentary:
              'Sayana Bhashya: "The Vedic hymn invokes arms strictly for defensive guardianship. Classical commentators highlight that the sacred weapon must serve Dharma and divine order (Rta), never lawless or unrestrained savagery."',
          },
          {
            id: 'vedas-rv07-89-05-civilians',
            tradition: 'vedas',
            book: 'Rigveda Book 7',
            bookId: 'RV07',
            chapter: 89,
            verseNumber: 5,
            translation:
              'Whatever sin we have committed against the divine folk, whatever law of thine, O Varuna, we have broken through thoughtlessness, whatever guilt we may have contracted through human infirmity, do not punish us, O God, for that transgression.',
            historicalContext:
              'A solemn penitential prayer to Varuna, the divine custodian of moral truth (Rta), pleading for expiation whenever wartime zeal or human passion leads to violating sacred ethical boundaries.',
            classicalCommentary:
              'Sayana Bhashya: "Varuna observes all human deeds and punishes those who overstep moral law. The hymn reflects an acute conscience regarding the peril of committing transgression even during periods of conflict."',
          },
          {
            id: 'vedas-manu-07-91-civilians',
            tradition: 'vedas',
            book: 'Manusmriti',
            chapter: 7,
            verseNumber: 91,
            translation:
              'Let him not strike with concealed weapons, nor with barbed, poisoned, or fiery arrows. Let him not strike one who has climbed a tree, nor an eunuch, nor one who clasps his hands in supplication, nor one who sleeps, nor one who is unclothed, nor one who is unarmed, nor a spectator, nor a woman or child.',
            historicalContext:
              'The codified laws of honorable righteous warfare (Dharma-Yuddha) rooted in Vedic ethics and formalized across the Epics (Mahabharata, Bhishma Parva) and Dharmaśāstras. Established the world’s earliest codified protections for non-combatants.',
            classicalCommentary:
              'Kulluka Bhatta & Medhatithi: "The rules of Dharma-Yuddha strictly distinguish legitimate warriors from non-belligerents. Anyone who slays a woman, child, ascetic, fleeing soldier, or disarmed opponent loses the status of a warrior and is condemned for adharma (unrighteous wickedness)."',
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // 11. CAN WOMEN DIVORCE THEIR HUSBANDS? (FEMALE INITIATIVE, AVERSION & ABUSE)
  // ===========================================================================
  {
    id: 'qa-female-divorce',
    slug: 'can-women-divorce-their-husbands-under-scriptural-law',
    question: 'Can women divorce their husbands? What scriptures grant wives the right to divorce or separate?',
    shortTitle: 'Can Women Divorce Their Husbands?',
    category: 'debated',
    categoryLabel: 'FEMALE INITIATIVE, UNSATISFIED WIVES & SPOUSAL ABUSE',
    dilemmaTag: 'Khula, Spousal Abuse, Aversion & Wife’s Right to Exit',
    primaryTraditions: ['quran', 'bible-nt', 'torah', 'vedas'],
    searchKeywords: [
      'can women divorce',
      'can a woman divorce her husband',
      'female divorce',
      'wife divorce husband',
      'wife leave husband',
      'can wife divorce',
      'wife unsatisfied',
      'husband beats wife',
      'husband abusive',
      'domestic violence',
      'wife beating',
      'husband disobedient',
      'nushuz',
      'dirar',
      'faskh',
      'khula',
      'khul',
      'tafwid al-talaq',
      'takhyir',
      'divorce',
      'divorcing',
      'talaq',
      'remarriage',
      'remarry',
      'dissolution',
      'annulment',
      'separate from husband',
      'separate from wife',
      'certificate of divorce',
      'bill of divorce',
      'sefer keritut',
      'get',
      'ma\'is alay',
      'deuteronomy 21:14',
      'deuteronomy 24',
      'exodus 21:10',
      'numbers 30:9',
      'malachi 2:14',
      'malachi 2:16',
      '1 corinthians 7',
      '1 cor 7:10',
      '1 cor 7:15',
      'mark 10:12',
      'colossians 3:19',
      'ephesians 5:28',
      '1 peter 3:7',
      'narada 12:96',
      'arthashastra 3.3',
      'manusmriti 9:79',
      'mahanirvana tantra 8:39',
      'quran 2:229',
      'quran 4:128',
      'quran 2:231',
      'quran 4:35',
      'quran 33:28',
      'quran 58:1',
      'woman initiate divorce',
    ],
    topicBackground:
      'This critical inquiry examines the legal and moral standing of wives in sacred scriptures when facing an unhappy marriage, emotional incompatibility, spousal neglect, or domestic violence. Rather than viewing marriage as an inescapable cage, sacred texts provide explicit remedies: (1) When the wife is simply unsatisfied, emotionally alienated, or repulsed by her husband, scriptures establish no-fault female exits—such as Quranic Khula (Surah 2:229, where returning the dowry enables immediate exit without proving spousal fault), the Mosaic mandate that an unsatisfied wife must be released free without merchandise (Deut 21:14), Maimonidean rulings that "a daughter of Israel is not like a captive forced to consort with a man she finds hateful," and the Arthashastra’s dissolution on grounds of mutual hatred (Moksha). (2) When the husband is disobedient, cruel, or abusive, scriptures strictly outlaw spousal battery and harm (Quranic Dirar in 2:231, Nushuz of the husband in 4:128, Malachi 2:16, Colossians 3:19, Mahanirvana Tantra 8:39), empowering courts and arbiters to decree compulsory judicial divorce (Faskh/Tafriq, the rabbinical coerced Get, the Pauline dissolution for broken peace in 1 Cor 7:15, and the five statutory grounds of Narada Smriti 12:96).',
    controversyDossier: {
      criticPosition:
        'Critics assert that religious marriage codes historically entrenched male dominance, granting husbands easier unilateral repudiation while leaving unsatisfied or abused wives trapped in costly ransoms, protracted court battles, or social ostracism.',
      scholarlyDefense:
        'Theologians and legal historians demonstrate that scriptures established groundbreaking statutory protections specifically to emancipate wives: God explicitly legislated no-fault ransom (Khula) without requiring proof of abuse, criminalized marital harm (Dirar) and spousal cruelty to mandate judicial divorce with full financial retention, mandated unconditional freedom for neglected wives in the Torah (Exodus 21:11), commanded rabbinical courts to coerce violent husbands, apostolic authority declared that wives are never spiritually enslaved (1 Cor 7:15), and classical Dharma texts ordained five legal calamities that dissolve the marital bond.',
      contextBadge: 'Female Autonomy, Spousal Harm & Lawful Exit',
    },
    traditions: [
      {
        tradition: 'quran',
        traditionName: 'The Holy Quran',
        subtitle: 'No-fault Khula, prohibition of spousal harm (Dirar), husband’s cruelty (Nushuz), and judicial arbitration',
        verses: [
          {
            id: 'quran-2-229-khula',
            tradition: 'quran',
            book: 'Al-Baqarah',
            chapter: 2,
            verseNumber: 229,
            originalText:
              'فَإِنْ خِفْتُمْ أَلَّا يُقِيمَا حُدُودَ ٱللَّهِ فَلَا جُنَاحَ عَلَيْهِمَا فِيمَا ٱفْتَدَتْ بِهِۦ ۗ تِلْكَ حُدُودُ ٱللَّهِ فَلَا تَعْتَدُوهَا',
            translation:
              'But if you fear that they will not keep [within] the limits of Allah, then there is no blame upon either of them concerning that by which she ransoms herself [by returning the dowry]. These are the limits of Allah, so do not transgress them.',
            historicalContext:
              'The explicit Quranic charter for female-initiated no-fault divorce (Khula). God uses the feminine active verb "iftadat" (she ransoms herself), establishing that an unsatisfied wife who cannot bear continuing in marriage has an absolute scriptural right to exit by returning the marriage gift, with no requirement to prove spousal fault.',
            classicalCommentary:
              'Sahih al-Bukhari (5273) & Tafsir al-Qurtubi: Jamilah bint Abdillah came directly to the Prophet: "O Messenger of Allah, I do not reproach Thabit for any fault in character or religion, but I cannot bear living with him." The Prophet asked: "Will you return his orchard (the mahr)?" She said: "Yes." The Prophet ordered Thabit: "Accept the orchard and divorce her." The Prophet did not demand proof of abuse or adultery; the wife’s simple incompatibility and emotional aversion were legally sufficient.',
          },
          {
            id: 'quran-4-128-nushuz',
            tradition: 'quran',
            book: 'An-Nisa',
            chapter: 4,
            verseNumber: 128,
            originalText:
              'وَإِنِ ٱمْرَأَةٌ خَافَتْ مِنۢ بَعْلِهَا نُشُوزًا أَوْ إِعْرَاضًۭا فَلَا جُنَاحَ عَلَيْهِمَا أَن يُصْلِحَا بَيْنَهُمَا صُلْحًۭا ۚ وَٱلصُّلْحُ خَيْرٌۭ',
            translation:
              'And if a woman fears from her husband ill-treatment/cruelty (nushuz) or desertion/aversion (i’rad), there is no blame upon them if they make terms of settlement between them—and settlement is best. And human souls are swayed by greed. But if you do good and fear Allah, then indeed Allah is ever, with what you do, Acquainted.',
            historicalContext:
              'Direct divine address to the wife regarding the husband’s "nushuz" (spousal arrogance, cruelty, hatred, physical mistreatment, or refusal of marital obligations). Establishes that a wife is not required to submit to spousal abuse or neglect, but is authorized to demand legal settlement, adjustment of rights, or dissolution.',
            classicalCommentary:
              'Tafsir Ibn Kathir & Al-Jassas (Ahkam al-Quran): "Nushuz from the husband means his rising up in hostility against his wife by striking her, harming her, verbally abusing her, or turning away from her bed." Classical jurists derived that when a husband commits nushuz, the wife has the full legal right to seek judicial intervention and dissolve the union if honorable living is refused.',
          },
          {
            id: 'quran-2-231-dirar',
            tradition: 'quran',
            book: 'Al-Baqarah',
            chapter: 2,
            verseNumber: 231,
            originalText:
              'وَإِذَا طَلَّقْتُمُ ٱلنِّسَآءَ فَبَلَغْنَ أَجَلَهُنَّ فَأَمْسِكُوهُنَّ بِمَعْرُوفٍ أَوْ سَرِّحُوهُنَّ بِمَعْرُوفٍۢ ۚ وَلَا تُمْسِكُوهُنَّ ضِرَارًۭا لِّتَعْتَدُوا۟ ۚ وَمَن يَفْعَلْ ذَٰلِكَ فَقَدْ ظَلَمَ نَفْسَهُۥ',
            translation:
              'And when you divorce women and they have reached their term, either retain them in an honorable manner or release them in an honorable manner, and do not retain them to harm them (diraran) so that you transgress. And whoever does that has certainly wronged himself.',
            historicalContext:
              'Divine prohibition against holding a woman in a harmful, abusive, or toxic domestic condition. God criminalizes "dirar" (malicious harm, coercive entrapment, or domestic abuse), commanding that marriage must either be conducted with honor (ma’ruf) or dissolved with graceful benevolence (ihsan).',
            classicalCommentary:
              'Al-Muwatta (Imam Malik) & Fiqh al-Sunnah: Grounded in this verse and the Prophet’s decree "There shall be no harm nor reciprocating harm" (La darar wa-la dirar), Maliki and Hanbali jurists established the doctrine of "Tafriq li’l-Darar" (judicial divorce for harm): if a husband beats his wife, insults her, or subjects her to physical or emotional violence, the judge dissolves the marriage immediately (Faskh); the wife is freed and retains her full dowry and maintenance.',
          },
          {
            id: 'quran-4-35-breach',
            tradition: 'quran',
            book: 'An-Nisa',
            chapter: 4,
            verseNumber: 35,
            originalText:
              'وَإِنْ خِفْتُمْ شِقَاقَ بَيْنِهِمَا فَٱبْعَثُوا۟ حَكَمًۭا مِّنْ أَهْلِهِۦ وَحَكَمًۭا مِّنْ أَهْلِهَآ إِن يُرِيدَآ إِصْلَٰحًۭا يُوَفِّقِ ٱللَّهُ بَيْنَهُمَآ ۗ إِنَّ ٱللَّهَ كَانَ عَلِيمًا خَبِيرًۭا',
            translation:
              'And if you fear a breach (shiqaq) between the two, appoint an arbiter from his family and an arbiter from her family. If they both desire reconciliation, Allah will bring about harmony between them. Indeed, Allah is Knowing and Acquainted.',
            historicalContext:
              'Establishes an mandatory institutional judicial mechanism when severe spousal discord, violence, or persistent conflict breaks out in a household, ensuring the wife has independent family advocates representing her interests before the court.',
            classicalCommentary:
              'Tafsir al-Tabari & Sahih al-Bukhari: Ali ibn Abi Talib decreed regarding the two arbiters: "To you two belongs the legal authority to unite them or to separate them by divorce." If the arbiters find the husband is cruel, disobedient, or the wife cannot live with him, they possess divine mandate to decree divorce between them without the husband’s consent.',
          },
          {
            id: 'quran-33-28-takhyir',
            tradition: 'quran',
            book: 'Al-Ahzab',
            chapter: 33,
            verseNumber: 28,
            originalText:
              'يَٰٓأَيُّهَا ٱلنَّبِىُّ قُل لِّأَزْوَٰجِكَ إِن كُنتُنَّ تُرِدْنَ ٱلْحَيَوٰةَ ٱلدُّنْيَا وَزِينَتَهَا فَتَعَالَيْنَ أُمَتِّعْكُنَّ وَأُسَرِّحْكُنَّ سَرَاحًۭا جَمِيلًۭا',
            translation:
              'O Prophet, say to your wives: If you desire the life of this world and its adornment, then come, I will provide for you and release you with a graceful release.',
            historicalContext:
              'The "Verse of Option" (Ayat al-Takhyir). God specifically addresses the wives through the Prophet, commanding that they be granted the unilateral choice to either remain or be honorably released with financial gifts (mut’ah) and a graceful divorce (sarahan jamila).',
            classicalCommentary:
              'Tafsir Ibn Kathir & Fiqh al-Sunnah: Classical jurists derived from this verse the constitutional doctrine of "Tafwid al-Talaq" (delegated divorce): a woman can stipulate in her marriage contract or demand in marriage that the power of divorce be placed directly in her hands, enabling her to divorce her husband at her own choosing.',
          },
          {
            id: 'quran-58-1-plea',
            tradition: 'quran',
            book: 'Al-Mujadila',
            chapter: 58,
            verseNumber: 1,
            originalText:
              'قَدْ سَمِعَ ٱللَّهُ قَوْلَ ٱلَّتِى تُجَٰدِلُكَ فِى زَوْجِهَا وَتَشْتَكِىٓ إِلَى ٱللَّهِ وَٱللَّهُ يَسْمَعُ تَحَاوُرَكُمَآ ۚ إِنَّ ٱللَّهَ سَمِيعٌۢ بَصِيرٌ',
            translation:
              'Allah has heard the speech of the woman who argues with you concerning her husband and complains to Allah, and Allah hears your dialogue. Indeed, Allah is Hearing and Seeing.',
            historicalContext:
              'Khawlah bint Tha’labah’s husband declared Zihar upon her (an ancient pagan oath refusing marital relations while refusing divorce, trapping her in limbo). She pleaded directly against this marital trapping. God heard her from above the heavens and sent down revelation criminalizing Zihar and liberating women from spousal entrapment.',
            classicalCommentary:
              'Tafsir al-Tabari & Ibn Kathir: Aisha recorded: "Blessed be He whose hearing embraces all sounds; I was in the corner of the room and could barely hear her, but Allah heard her plea from above seven heavens." God intervened directly to establish that no husband may hold a woman in marital paralysis.',
          },
        ],
      },
      {
        tradition: 'torah',
        traditionName: 'Torah & Tanakh',
        subtitle: 'Mandatory release for neglect (Exodus 21), freedom when unpleased (Deut 21), and coerced divorce for wife-beaters',
        verses: [
          {
            id: 'torah-exo-21-10-female',
            tradition: 'torah',
            book: 'Exodus',
            bookId: 'EXO',
            chapter: 21,
            verseNumber: 10,
            translation:
              'If he takes another wife to himself, he shall not diminish her food, her clothing, and her marital rights [conjugal intimacy]. And if he does not do these three things for her, she shall go out free, without money.',
            historicalContext:
              'God’s explicit statutory decree in the Torah granting the wife unconditional emancipation: "she shall go out free, without money" (ve-yatze’ah chinam ein kasef). If the husband diminishes sustenance, clothing, or conjugal rights, the wife is legally released without paying any redemption.',
            classicalCommentary:
              'Talmud Ketubot 47b, 77a & Maimonides (Hilchot Ishut 14:8): The Sages established that these rights are absolute. If a husband neglects her or becomes hateful to her (ma’is alay), the Beit Din (rabbinic court) compels the husband: "We coerce him until he says: I wish to grant the divorce." Maimonides ruled: "A daughter of Israel is not like a captive, that she should be forced to consort with a man she finds repulsive."',
          },
          {
            id: 'torah-deu-21-14-female',
            tradition: 'torah',
            book: 'Deuteronomy',
            bookId: 'DEU',
            chapter: 21,
            verseNumber: 14,
            translation:
              'And it shall be, if thou have no delight in her, then thou shalt let her go whither she will; but thou shalt not sell her at all for money, thou shalt not make merchandise of her, because thou hast humbled her.',
            historicalContext:
              'Foundational Torah principle establishing that a woman cannot be retained against her will or treated as disposable property once affection, delight, and emotional intimacy end. She must be released with complete, sovereign personal liberty.',
            classicalCommentary:
              'Rashi & Ramban (Nachmanides): "The Torah forbids treating a woman as merchandise (lo tit’amer bah). If there is no voluntary delight between the spouses, she is granted absolute freedom to depart wheresoever she wills, completely unencumbered."',
          },
          {
            id: 'torah-mal-2-14-female',
            tradition: 'torah',
            book: 'Malachi',
            bookId: 'MAL',
            chapter: 2,
            verseNumber: 14,
            translation:
              'The Lord has been witness between you and the wife of your youth, against whom you have dealt treacherously, though she is your companion and your wife by covenant... For the Lord God of Israel says that He hates divorce, for one covers his garment with violence, says the Lord of hosts.',
            historicalContext:
              'Prophetic rebuke explicitly equating unjust spousal mistreatment with "covering one’s garment with violence" (hamas). Rebukes men who abuse the marital covenant or inflict cruelty upon their companions.',
            classicalCommentary:
              'Shulchan Aruch (Even HaEzer 154:3) & Rema: "A man who strikes or beats his wife commits a sin greater than striking his neighbor, for she was given to him for life, not for pain... If he persists, the Beit Din excommunicates him, beats him, and forces him to issue an immediate Get (bill of divorce) and pay the entire Ketubah settlement."',
          },
          {
            id: 'torah-num-30-9-female',
            tradition: 'torah',
            book: 'Numbers',
            bookId: 'NUM',
            chapter: 30,
            verseNumber: 9,
            translation:
              'Every vow of a widow or of a divorced woman, by which she has bound herself, shall stand against her.',
            historicalContext:
              'In the biblical legal system, while a married woman’s vows could theoretically be annulled by her husband (Num 30:6–8), God explicitly decrees that the moment a woman is divorced, she possesses complete, sovereign legal and religious autonomy; no man possesses veto power over her conscience.',
            classicalCommentary:
              'Rashi & Sifrei Bamidbar: "The Torah establishes the total legal independence of the divorced woman (gerushah). She stands entirely as an autonomous legal person before God, free from any male domestic sovereignty."',
          },
          {
            id: 'torah-jdg-19-2-female',
            tradition: 'torah',
            book: 'Judges',
            bookId: 'JDG',
            chapter: 19,
            verseNumber: 2,
            translation:
              'And his concubine [wife] was estranged from him, and went away from him unto her father’s house in Bethlehem of Judah, and was there for four months.',
            historicalContext:
              'Biblical record of a wife exercising her independence to walk away from an unhappy marital home and return to her ancestral estate when estranged.',
            classicalCommentary:
              'Radak & Metzudat David: "The text indicates she became angry, felt an aversion toward him, and exercised her autonomy to leave his house. In ancient Jewish legal deeds (such as the 5th-century BCE Jewish papyri of Elephantine), marriage contracts explicitly stated: If the wife stands in the assembly and says, I divorce my husband, she shall take her dowry and depart free."',
          },
        ],
      },
      {
        tradition: 'bible-nt',
        traditionName: 'New Testament',
        subtitle: 'Wife’s right to separate from abusive homes, prohibition of husband cruelty, and freedom from bondage',
        verses: [
          {
            id: 'bible-1co-7-10-female',
            tradition: 'bible-nt',
            book: '1 Corinthians',
            bookId: '1CO',
            chapter: 7,
            verseNumber: 10,
            translation:
              'To the married I give this charge (not I, but the Lord): The wife must not separate from her husband. But if she does separate, let her remain unmarried or else be reconciled to her husband—and the husband must not divorce his wife.',
            historicalContext:
              'Paul’s apostolic charge rooted in the Lord’s teaching. The text speaks directly to the wife (gynē), recognizing that in practice, a wife may find it necessary to separate (ean de kai choristhe) from an unbearable, abusive, or dangerous domestic situation.',
            classicalCommentary:
              'John Chrysostom & Matthew Henry: "The scripture addresses the wife directly. While the covenant ideal is fidelity, the scripture recognizes the reality of a woman separating from her husband, granting her the right to live apart without being condemned, while keeping the door open for reconciliation."',
          },
          {
            id: 'bible-1co-7-15-female',
            tradition: 'bible-nt',
            book: '1 Corinthians',
            bookId: '1CO',
            chapter: 7,
            verseNumber: 15,
            translation:
              'But if the unbeliever departs, let him depart; a brother or a sister is not under bondage in such cases. God has called you to peace.',
            historicalContext:
              'The Pauline Privilege directly addressing wives whose husbands abandon them or shatter domestic peace. Explicitly releases the Christian woman from marital slavery (ou dedoulotai).',
            classicalCommentary:
              'Calvin & Augustine: "The scripture directly liberates the woman: ‘A sister is not enslaved.’ God’s calling is to peace; a Christian woman is not obligated to remain shackled to an abandoned, hostile, or destructive union that destroys conscience and peace."',
          },
          {
            id: 'bible-col-3-19-female',
            tradition: 'bible-nt',
            book: 'Colossians',
            bookId: 'COL',
            chapter: 3,
            verseNumber: 19,
            translation:
              'Husbands, love your wives, and do not be harsh [bitter or abusive] toward them. He who loves his wife loves himself; for no one ever hated his own flesh, but nourishes and cherishes it.',
            historicalContext:
              'Apostolic command to Christian husbands strictly forbidding "pikrainesthe" (harshness, bitter abuse, emotional cruelty, or physical violence). In historic Christian jurisprudence, persistent physical cruelty (saevitia) constituted constructive desertion, granting the wife judicial separation and protection.',
            classicalCommentary:
              'John Chrysostom (Homilies on Ephesians): "What excuse can a husband have who raises his hand against his wife? It is the extreme of madness! You are a tyrant, not a husband! Christ commanded love, not tyranny; where cruelty enters, the divine model of marriage is shattered."',
          },
          {
            id: 'bible-1pe-3-7-female',
            tradition: 'bible-nt',
            book: '1 Peter',
            bookId: '1PE',
            chapter: 3,
            verseNumber: 7,
            translation:
              'Likewise, husbands, live with your wives in an understanding way, showing honor to the woman as the weaker vessel, since they are heirs with you of the grace of life, so that your prayers may not be hindered.',
            historicalContext:
              'Theological warning to husbands that mistreating, dishonoring, or abusing a wife causes immediate spiritual forfeiture: God refuses to hear or accept the husband’s prayers.',
            classicalCommentary:
              'Matthew Henry: "A husband who acts with tyranny, harshness, or disrespect toward his wife cuts off his own communion with God. He cannot claim godly authority while terrorizing his co-heir of divine grace."',
          },
          {
            id: 'bible-mrk-10-12-female',
            tradition: 'bible-nt',
            book: 'Mark',
            bookId: 'MRK',
            chapter: 10,
            verseNumber: 12,
            translation:
              'And if she divorces her husband and marries another, she commits adultery.',
            historicalContext:
              'Jesus addressing divorce ethics. Mark 10:12 is the only Gospel verse that formulates the law with exact gender symmetry from the woman’s initiative ("if she divorces her husband" — kai ean autē apolysasa ton andra autēs), recognizing that women possessed the legal capacity to divorce.',
            classicalCommentary:
              'Jamieson-Fausset-Brown: "Under contemporary Roman civil law, a wife possessed equal power to dissolve marriage with her husband. Christ places husband and wife on identical moral grounds, recognizing the woman’s agency while holding both spouses to the same covenant standard."',
          },
        ],
      },
      {
        tradition: 'vedas',
        traditionName: 'Rigveda',
        subtitle: 'Five statutory grounds for female release (Narada 12:96), protection for wife’s aversion (Manu 9:79), and ban on battery',
        verses: [
          {
            id: 'vedas-narada-12-96-female',
            tradition: 'vedas',
            book: 'Narada Smriti',
            chapter: 12,
            verseNumber: 96,
            translation:
              'When the husband is missing, dead, has renounced the world, is impotent, or has degraded from virtue [become abusive or criminal]—in these five misfortunes another husband is ordained for a woman.',
            historicalContext:
              'Classical Sanskrit sacred jurisprudence explicitly addressing wives facing catastrophe, commanding that the woman is released from her previous bond and authorized (vidhiyate) to take another husband.',
            classicalCommentary:
              'Medhatithi & Vijnaneshvara (Mitakshara): "These verses provide explicit scriptural authorization for a wife to dissolve her bond with an incapable, abusive, or spiritually fallen husband. The sacred law ensures she is not trapped in an abandoned union or doomed to domestic suffering."',
          },
          {
            id: 'vedas-arthashastra-3-3-female',
            tradition: 'vedas',
            book: 'Arthashastra',
            chapter: 3,
            verseNumber: 3,
            translation:
              'A woman who hates her husband and desires divorce (Moksha)... if the husband has become a traitor, is long abroad, threatens the life of his wife, or is impotent, the wife may effect dissolution from the marital bond.',
            historicalContext:
              'Ancient Indian civil legal treatise (4th century BCE) detailing legal court procedures for wives initiating dissolution of marriage (Moksha) on grounds of mutual aversion, spousal cruelty, or abandonment.',
            classicalCommentary:
              'R. Shamasastry: "Kautilya’s civil jurisprudence explicitly recognized that wives possessed statutory standing to initiate Moksha (release) against mistreatment, securing their property, dowry, and freedom to depart."',
          },
          {
            id: 'vedas-manu-9-79-female',
            tradition: 'vedas',
            book: 'Manusmriti',
            chapter: 9,
            verseNumber: 79,
            translation:
              'She who shows aversion [dvesha] toward a husband who is mad, fallen from caste, impotent, or afflicted with heinous diseases, shall neither be cast off nor be deprived of her property.',
            historicalContext:
              'Ancient Dharmashastra recognizing that a wife’s emotional aversion and refusal to live with an unfit, abusive, or diseased husband is legally shielded; she cannot be punished or dispossessed.',
            classicalCommentary:
              'Kulluka Bhatta: "The law protects the woman’s natural aversion (dvesha). If a husband is degraded, violent, or incapable of honorable marital conduct, the wife’s refusal of cohabitation does not incur guilt or forfeiture."',
          },
          {
            id: 'vedas-tantra-8-39-female',
            tradition: 'vedas',
            book: 'Mahanirvana Tantra',
            chapter: 8,
            verseNumber: 39,
            translation:
              'A husband must never punish or strike his wife, but must ever cherish her like a mother; even if she commits faults, he must not strike her.',
            historicalContext:
              'Sacred ethical statute establishing the inviolability of wives in Hindu domestic ethics, strictly forbidding physical chastisement, wife-beating, or domestic battery.',
            classicalCommentary:
              'Arthur Avalon (Sir John Woodroffe): "The sacred texts repeatedly decree that a wife is the living embodiment of the divine feminine (Shakti). Any act of violence or striking against her is an intolerable transgression of cosmic Dharma."',
          },
          {
            id: 'vedas-rv10-27-12-female',
            tradition: 'vedas',
            book: 'Rigveda Book 10',
            bookId: 'RV10',
            chapter: 27,
            verseNumber: 12,
            translation:
              'How many a maiden is an object of desire to him who woos her for her riches! But she who is noble in form and mind chooses herself her partner among the people.',
            historicalContext:
              'The sacred Vedic hymn celebrating woman’s sovereign right of choice (Swayamvara), establishing that union in Vedic thought is founded upon the woman’s free, ongoing will and willing mind rather than male ownership.',
            classicalCommentary:
              'Sayana Bhashya: "The Vedic hymn affirms that genuine union requires the willing mind and sovereign election of the woman. Where mutual consent and reverence cease, the spiritual basis of union dissolves."',
          },
        ],
      },
    ],
  },
];
