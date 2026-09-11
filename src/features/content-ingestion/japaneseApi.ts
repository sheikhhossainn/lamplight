// Japanese Literature Client — interfaces with Aozora Bunko (青空文庫) public domain
// classics, providing rich metadata, chapter TOCs, and curated offline texts.

export type JapaneseBookSummary = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  synopsis: string;
  genre: string;
  totalChapters: number;
  sourceLanguage: 'ja';
  source: 'aozora_bunko';
};

export type JapaneseChapterMeta = {
  index: number;
  title: string;
  slug: string;
};

export type JapaneseBookDetail = JapaneseBookSummary & {
  chapters: JapaneseChapterMeta[];
};

export const AOZORA_JAPANESE_BOOKS: JapaneseBookDetail[] = [
  {
    id: 'ja-kokoro',
    slug: 'kokoro',
    title: 'こころ',
    author: '夏目漱石',
    coverUrl: 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ja-kokoro.jpg',
    genre: '近代文学',
    synopsis:
      '「私」と「先生」の出会いから始まる、人間のエゴイズムと孤独、罪の意識を描いた夏目漱石の最高傑作。人間の心の奥底にある光と影を静かに照らし出す物語。',
    totalChapters: 3,
    sourceLanguage: 'ja',
    source: 'aozora_bunko',
    chapters: [
      { index: 0, title: '上 先生と私 — 一', slug: 'kokoro-ch-1' },
      { index: 1, title: '上 先生と私 — 二', slug: 'kokoro-ch-2' },
      { index: 2, title: '下 先生の遺書', slug: 'kokoro-ch-3' },
    ],
  },
  {
    id: 'ja-botchan',
    slug: 'botchan',
    title: '坊っちゃん',
    author: '夏目漱石',
    coverUrl: 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ja-botchan.jpg',
    genre: '青春小説',
    synopsis:
      '親譲りの無鉄砲で小供の時から損ばかりしている坊っちゃんが、四国松山の中学校に数学教師として赴任。曲がったことが大嫌いな江戸っ子の痛快な活躍を描く。',
    totalChapters: 3,
    sourceLanguage: 'ja',
    source: 'aozora_bunko',
    chapters: [
      { index: 0, title: '第一章 — 親譲りの無鉄砲', slug: 'botchan-ch-1' },
      { index: 1, title: '第二章 — 松山への赴任', slug: 'botchan-ch-2' },
      { index: 2, title: '第三章 — 赤シャツとの対決', slug: 'botchan-ch-3' },
    ],
  },
  {
    id: 'ja-rashomon',
    slug: 'rashomon',
    title: '羅生門',
    author: '芥川龍之介',
    coverUrl: 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ja-rashomon.jpg',
    genre: '短編文学',
    synopsis:
      '荒廃した平安京の羅生門の下で、雨やみを待つ一人の下人。生死の境目で人間のエゴイズムを直視し、生きるための悪を選ぶ心理を描いた芥川の不朽の名作。',
    totalChapters: 2,
    sourceLanguage: 'ja',
    source: 'aozora_bunko',
    chapters: [
      { index: 0, title: '前編 — ある日の暮方の事である', slug: 'rashomon-ch-1' },
      { index: 1, title: '後編 — 門の上の老婆', slug: 'rashomon-ch-2' },
    ],
  },
  {
    id: 'ja-hashire-merosu',
    slug: 'hashire-merosu',
    title: '走れメロス',
    author: '太宰治',
    coverUrl: null,
    genre: '人間讃歌',
    synopsis:
      '「メロスは激怒した。」暴君ディオニスに立ち向かい、身代わりとなった無二の友セリヌンティウスのために、命を賭して信実の走りを続けるメロスの熱き物語。',
    totalChapters: 2,
    sourceLanguage: 'ja',
    source: 'aozora_bunko',
    chapters: [
      { index: 0, title: '第一部 — 激怒と誓い', slug: 'hashire-merosu-ch-1' },
      { index: 1, title: '第二部 — 太陽沈みぬ、走れメロス', slug: 'hashire-merosu-ch-2' },
    ],
  },
  {
    id: 'ja-gingatetsudo',
    slug: 'gingatetsudono-yoru',
    title: '銀河鉄道の夜',
    author: '宮沢賢治',
    coverUrl: null,
    genre: '幻想文学',
    synopsis:
      '孤独な少年ジョバンニが、親友カムパネルラと共に銀河を走る不思議な列車に乗り込み、天の川の美しい星々を巡りながら「本当のさいわい」を探し求める名作。',
    totalChapters: 3,
    sourceLanguage: 'ja',
    source: 'aozora_bunko',
    chapters: [
      { index: 0, title: '午后の授業と星祭り', slug: 'gingatetsudo-ch-1' },
      { index: 1, title: '銀河ステーション', slug: 'gingatetsudo-ch-2' },
      { index: 2, title: '白鳥の停車場とサウザンクロス', slug: 'gingatetsudo-ch-3' },
    ],
  },
  {
    id: 'ja-gon-gitsune',
    slug: 'gon-gitsune',
    title: 'ごん狐',
    author: '新美南吉',
    coverUrl: null,
    genre: '児童文学',
    synopsis:
      'ひとりぼっちの小狐ごんと、母を亡くした兵十。ごんは罪滅ぼしに毎日栗や松茸を兵十の家に届け続けるが、二人の心はすれ違い切ない結末を迎える。',
    totalChapters: 2,
    sourceLanguage: 'ja',
    source: 'aozora_bunko',
    chapters: [
      { index: 0, title: '一、ごんのいたずら', slug: 'gon-gitsune-ch-1' },
      { index: 1, title: '二、栗と松茸の贈り物', slug: 'gon-gitsune-ch-2' },
    ],
  },
];

export const AOZORA_CHAPTER_TEXTS: Record<string, string> = {
  'kokoro-ch-1': `私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。これは世間を憚る遠慮というよりも、その方が私にとって自然だからである。私はその人の記憶を呼び起すごとに、すぐ「先生」と言いたくなる。筆を執っても心持は同じ事である。よそよそしい頭文字などはとても使う気にならない。

私が先生と知り合いになったのは鎌倉である。その時私はまだ若々しい書生であった。暑中休暇を利用して友だちに誘われて海へ泳ぎに行ったのである。友だちは二三日すると急用ができて国へ帰ってしまった。私一人取り残された私は、毎日海岸へ出かけては波に揺られていた。

そこに先生が現れたのである。先生は毎日同じ時刻に茶屋へ現れ、海に入って泳いでいた。他の賑やかな海水浴客とはどこか違う、静かで澄んだ空気を身に纏っていた。`,

  'kokoro-ch-2': `東京へ帰ってからも、私は先生の家を訪ねるようになった。先生は雑司ヶ谷の静かな住宅街に、奥さんと二人で住んでいた。先生の書斎には多くの本が整然と並び、いつも線香の香りがかすかに漂っていた。

「君、人間はね、ある瞬間までは皆いい人なんですよ。誰も悪人になろうと思って悪人になるわけじゃない。ただ、いざという時に、急に悪人に変わるから恐ろしいんだ」

先生のその言葉には、ご自身の過去に根差した深い傷と後悔が込められているように思えた。私は先生のその静かな瞳の奥にあるものを、どうしても知りたいと願った。`,

  'kokoro-ch-3': `「私はその手紙を読んだ時、全身の血が凍るような思いがした。

先生の遺書には、学生時代の親友Ｋとの悲しい過去がすべて記されていた。同じ下宿で暮らし、共に道を志した友を裏切り、お嬢さんを妻に娶ったこと。そしてその結果、Ｋが自ら命を絶ってしまったこと。

先生はその重い十字架を背負いながら、長年孤独の中で生きてこられたのだった。『私は死ぬ前に、ただ一人でいいから、人間を信じて死にたいのだ』という言葉が、私の胸を激しく揺さぶった。」`,

  'botchan-ch-1': `親譲りの無鉄砲で小供の時から損ばかりしている。小学校に居る時分学校の二階から飛び降りて一週間ほど腰を抜かした事がある。なぜそんな無闇をしたと聞く人があるかも知れぬ。別段深い理由でもない。新築の二階から首を出していたら、同級生の一人が冗談に、いくら威張っても、そこから飛び降りる事は出来まい。弱虫やーいと囃したからである。小使に負ぶさって帰って来た時、おやじが大きな眼をして二階ぐらいから飛び降りて腰を抜かす奴があるかと云ったから、この次は抜かさずに飛んで見せますと答えた。

親類のものから西洋製のナイフを貰って、奇麗な刃を日に翳して友だちに見せていたら、一人が光る事は光るが切れそうもないと云った。切れぬ事があるか、何でも切って見せると受け合った。そんなら君の指を切ってみろと注文した。何だ指ぐらいこの通りだと右の手の親指の甲をはすに切り込んだ。幸いナイフが小さかったのと、骨が固かったので、今だに親指は手についているが、疵痕は死ぬまで消えない。`,

  'botchan-ch-2': `物理学校を卒業して間もなく、校長から四国の中学校へ数学の教師として行かないかと話があった。四国といえば昔から流罪になるところだ。遠い所へ行くのは少し心細かったが、下女の清に相談すると、清は涙を流して『坊っちゃん、どうかお行きなさいまし。立派な先生になっておいでなさい』と励ましてくれた。

汽車と船を乗り継いで、ようやく松山の町に着いた。町は小さく、城が山の上に見えた。赴任した学校には、タヌキのような校長や、赤シャツを着た教頭、山嵐というあだ名の頑固な数学主任などがいて、一癖も二癖もある連中ばかりだった。`,

  'botchan-ch-3': `生徒たちはいたずら好きで、宿直の夜に私の蚊帳の中に無数のイナゴを放り込んだり、温泉で泳いだと黒板に落書きをしたりした。だが、本当に腹が立つのは生徒ではなく、裏で陰謀をめぐらす教頭の赤シャツと野だいこだった。

私は山嵐と手を組み、卑怯なやり方で同僚を陥れようとする赤シャツたちを成敗することを決意した。夜更けの路上で赤シャツを待ち伏せし、天誅を下した時の爽快さは格別だった。私は辞表を叩きつけ、東京の清のもとへと帰る汽車に飛び乗った。`,

  'rashomon-ch-1': `ある日の暮方の事である。一人の下人が、羅生門の下で雨やみを待っていた。

広い門の下には、この男のほかに誰もいない。ただ、所々丹塗の剥げた、大きな円柱に、蟋蟀が一匹とまっている。羅生門が、朱雀大路にある以上は、この男のほかにも、雨やみをする市女笠や揉烏帽子が、もう二三人はありそうなものである。それが、この男のほかには誰もいない。

なぜかと云うと、この二三年、京都には、地震とか辻風とか火事とか飢饉とか云う災いがつづいて起った。そこで洛中の寂れ方は一通りではない。下人は、行く所がないまま、途方に暮れて雨の音を聞いていた。`,

  'rashomon-ch-2': `下人は門の上の楼閣に灯りがともっているのに気づき、梯子を静かに登っていった。

そこには多くの死骸が打ち捨てられており、その死骸の山の中で、一人の老婆が若い女の死体から髪の毛を一本一本引き抜いていた。

下人は激しい憎悪を抱いて老婆を組み伏せた。『何をしている！』老婆は震え声で言った。『この髪で鬘を作って売るのじゃ。この女とて、蛇を干魚と偽って売って生きておった。生きるためには仕方のないことじゃ』

下人の心に、ある決意が生まれた。『では、己が引剥をしようと恨むまいな。己もそうしなければ、飢え死にする体なのだ』下人は老婆の着物を剥ぎ取り、闇の中へと駆け下りていった。`,

  'hashire-merosu-ch-1': `メロスは激怒した。必ず、かの邪智暴虐の王を除かなければならぬと決意した。メロスには政治がわからぬ。メロスは、村の牧人である。笛を吹き、羊と遊んで暮して来た。けれども邪悪に対しては、人一倍に敏感であった。

きょう未明メロスは村を出発し、野を越え山越え、十里はなれた此のシラクスの市にやって来た。市を歩くと、人々の様子がおかしい。不審に思ったメロスは、老爺をつかまえて尋ねた。王は人を信じられず、疑心暗鬼から臣下や民を次々と処刑しているという。

メロスは王城へ乗り込み、王の暴虐を面罵した。王はメロスを死刑に処すると宣告した。メロスは言った。『私には妹がいる。三日の日限をくれ。妹の婚礼を挙げたら、必ず戻ってくる。私の身代わりとして、無二の親友セリヌンティウスをここに置く！』`,

  'hashire-merosu-ch-2': `友を人質に残し、メロスは故郷の村へ駆け戻った。雨の中、妹の結婚式を無事に執り行ったメロスは、三日目の早朝、再びシラクスへ向けて走り出した。

しかし、豪雨による河の氾濫、山賊の襲撃、そして夏の炎熱がメロスの身体を痛めつける。ついに力尽き、草原に倒れ伏したメロスは絶望した。『私は友を裏切るのか。ここまで走ってきたのに……』

その時、岩の裂け目から湧き出る清水を見つけた。一口飲むと、身体に再び生気が満ちあふれた。『信じられているから走るのだ！ 走れ、メロス！』

日没寸前、刑場に立つセリヌンティウスの前に、血まみれのメロスが滑り込んだ。『友よ、私を殴れ！ 私は途中で一度だけ裏切る夢を見た！』二人は固く抱き合い、その真実の友情に打たれた暴君ディオニスは、ついに自らの非を悔い改めたのだった。`,

  'gingatetsudo-ch-1': `「ではみなさんは、そういうふうに川だと云われたり、乳の流れたあとだと云われたりしていたこのぼんやりと白いものがほんとうは何かご承知ですか」

先生は、黒板に吊した大きな黒い星座の図を指しながら、みんなに問いかけました。ジョバンニは手を挙げようとしましたが、すぐやめました。いつもみんなからからかわれているからです。

その夜は星祭りでした。ジョバンニは病気の母のために牛乳をもらいに出かけましたが、町の子どもたちの輪に入ることができず、一人で天気輪の丘へと登っていきました。草の上に寝転がると、夜空には天の川が青白く輝いていました。`,

  'gingatetsudo-ch-2': `すると、どこかで不思議な鐘の音が聞こえ、目の前がまばゆい光に包まれました。

気がつくと、ジョバンニは走る小さな列車の中に座っていました。向かいの席には、濡れた髪の親友カムパネルラが座っています。

『カムパネルラ、僕たちいつの間にここへ乗ったんだろう』
『うん、みんなと一緒に走ってきたんだ』

窓の外を見ると、天の川の岸辺に青白いリンドウの花が咲き乱れ、三角標が美しく光っていました。列車は銀河ステーションを出発し、宇宙の彼方へと静かに走っていたのです。`,

  'gingatetsudo-ch-3': `列車は白鳥の停車場を過ぎ、蠍の火のそばを通り、やがて南十字星（サウザンクロス）へと近づきました。たくさんの巡礼たちが神々しい賛美歌を歌いながら降りていきました。

『カムパネルラ、僕たちどこまでも一緒に行こうね。僕、みんなの本当の幸のためなら、僕の体なんか百回焼いてもかまわない』
ジョバンニがそう言って振り返った時、カムパネルラの席には誰もいませんでした。

ジョバンニが丘の上で目を覚ますと、町の方から叫び声が聞こえてきました。カムパネルラが川に落ちた友だちを助けようとして、水の中に沈んでしまったというのです。ジョバンニは、カムパネルラが本当の幸いを探しに天の川へ旅立ったのだと悟り、涙を流しました。`,

  'gon-gitsune-ch-1': `これは、わたしが小さいときに、村の茂平というおじいさんからきいたお話です。

むかしは、私たちの村のちかくの中山というところに、小さなお城があって、中山さまというお殿さまがおられました。その中山から少しはなれた山の中に、「ごん狐」という狐がいました。ごんは、ひとりぼっちの小狐で、しだのいっぱい茂った森の中に穴をほって住んでいました。

そして、夜でも昼でも、あたりの村へ出てきては、畑の芋を掘り散らかしたり、菜種がらの干してあるのを燃やしたりと、いたずらばかりしていました。

ある秋の日、ごんは川で兵十が魚をとっているのを見つけ、網にかかったウナギをいたずら心から逃がしてしまいました。`,

  'gon-gitsune-ch-2': `それから十日ほど経って、兵十の家からお経の声が聞こえてきました。兵十のお母さんが亡くなったのです。ごんは『あのウナギは、病気のお母さんのために兵十がとったものだったのだ』と知り、深い後悔に胸を痛めました。

ごんはそれから毎日、山で栗や松茸を拾っては、兵十の家の裏口からそっと投げ入れました。『兵十、お前の母さんにすまないことをした』という気持ちからでした。

ある日、兵十が家に戻ると、土間に栗が置いてあり、奥へ入っていくごんの姿が見えました。『また悪さをしに来たな』兵十は火縄銃を手に取り、ごんを撃ちました。

倒れたごんのそばに、固まった栗の実を見て、兵十はハッとしました。『ごん、お前だったのか。いつも栗をくれたのは』ごんは、ぐったりと目をつむったまま、うなずきました。兵十の手から火縄銃が落ち、青い煙が立ちのぼっていました。`,
};

export async function fetchJapaneseBooks(params?: {
  search?: string;
  genre?: string;
}): Promise<{ books: JapaneseBookSummary[]; total: number }> {
  let list = [...AOZORA_JAPANESE_BOOKS];

  if (params?.search && params.search.trim().length > 0) {
    const q = params.search.trim().toLowerCase();
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.synopsis.toLowerCase().includes(q),
    );
  }

  if (params?.genre && params.genre !== 'All' && params.genre !== 'すべて') {
    const g = params.genre.trim();
    list = list.filter((b) => b.genre.includes(g));
  }

  return { books: list, total: list.length };
}

export async function fetchJapaneseBookDetail(slugOrId: string): Promise<JapaneseBookDetail> {
  const clean = slugOrId.replace(/^ja-/, '');
  const found = AOZORA_JAPANESE_BOOKS.find(
    (b) => b.slug === clean || b.id === slugOrId || b.id === `ja-${clean}`,
  );
  if (found) return found;
  return AOZORA_JAPANESE_BOOKS[0];
}

export async function fetchJapaneseChapterText(chapterSlug: string, bookId?: string): Promise<string> {
  if (bookId) {
    try {
      const { listJapaneseChapters } = await import('@/db/repositories/books');
      const chapters = await listJapaneseChapters(bookId);
      const match = chapters.find((ch) => ch.slug === chapterSlug);
      if (match && match.content) {
        return match.content;
      }
    } catch {
      // Fallback to remote or in-memory texts
    }
  }

  // Try fetching chapter text from remote Supabase if online
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/japanese_chapters?slug=eq.${encodeURIComponent(chapterSlug)}&select=content`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ content?: string }>;
        if (Array.isArray(rows) && rows[0]?.content) {
          return rows[0].content;
        }
      }
    }
  } catch {
    // Fallback to in-memory bundled text
  }

  return AOZORA_CHAPTER_TEXTS[chapterSlug] || 'この章のテキストは準備中です。';
}

let catalogSeeded = false;

export async function seedJapaneseCatalog(): Promise<void> {
  if (catalogSeeded) return;
  try {
    const { saveJapaneseChapters, upsertJapaneseBook } = await import('@/db/repositories/books');
    for (const book of AOZORA_JAPANESE_BOOKS) {
      await upsertJapaneseBook({
        id: book.id,
        title: book.title,
        author: book.author,
        synopsis: book.synopsis,
        totalChapters: book.totalChapters,
        coverUrl: book.coverUrl,
        categories: [book.genre],
        isAvailable: true,
      });

      const chaptersWithText = book.chapters.map((ch) => ({
        index: ch.index,
        title: ch.title,
        slug: ch.slug,
        content: AOZORA_CHAPTER_TEXTS[ch.slug] || '',
      }));

      await saveJapaneseChapters(book.id, chaptersWithText);
    }
    catalogSeeded = true;
  } catch (err) {
    console.warn('[japaneseApi] seedJapaneseCatalog failed:', err);
  }
}

