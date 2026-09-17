-- Migration: Japanese Aozora Bunko Books & Chapters for PostgreSQL (Supabase)
-- Enables remote hosting of Japanese public domain literature in Supabase.

-- 1. Ensure public.books has source column and nullable gutenberg_id
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'catalog';
ALTER TABLE public.books ALTER COLUMN gutenberg_id DROP NOT NULL;

-- 2. Create table for Japanese chapters in Supabase
CREATE TABLE IF NOT EXISTS public.japanese_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_japanese_chapters_book_idx UNIQUE (book_id, chapter_index)
);

CREATE INDEX IF NOT EXISTS japanese_chapters_book_id_idx ON public.japanese_chapters (book_id);

-- Enable Row Level Security (read-only for all clients)
ALTER TABLE public.japanese_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to japanese_chapters" ON public.japanese_chapters;
CREATE POLICY "Allow public read access to japanese_chapters"
  ON public.japanese_chapters FOR SELECT
  USING (true);

-- 3. Seed Japanese Books into public.books
INSERT INTO public.books (
  id, title, author, source_language, synopsis, total_chapters, gutenberg_id, source_format, text_url, cover_url, categories, source, is_active, is_featured
) VALUES
(
  'ja-kokoro',
  'こころ',
  '夏目漱石',
  'ja',
  '「私」と「先生」の出会いから始まる、人間のエゴイズムと孤独、罪の意識を描いた夏目漱石の最高傑作。人間の心の奥底にある光と影を静かに照らし出す物語。',
  3,
  null,
  'aozora-bunko',
  'internal://aozora/ja-kokoro',
  'https://covers.openlibrary.org/b/id/1254199-M.jpg',
  ARRAY['近代文学', '小説'],
  'aozora_bunko',
  true,
  true
),
(
  'ja-botchan',
  '坊っちゃん',
  '夏目漱石',
  'ja',
  '親譲りの無鉄砲で小供の時から損ばかりしている坊っちゃんが、四国松山の中学校に数学教師として赴任。曲がったことが大嫌いな江戸っ子の痛快な活躍を描く。',
  3,
  null,
  'aozora-bunko',
  'internal://aozora/ja-botchan',
  'https://covers.openlibrary.org/b/id/4788315-M.jpg',
  ARRAY['青春小説', 'ユーモア'],
  'aozora_bunko',
  true,
  false
),
(
  'ja-rashomon',
  '羅生門',
  '芥川龍之介',
  'ja',
  '荒廃した平安京の羅生門の下で、雨やみを待つ一人の下人。生死の境目で人間のエゴイズムを直視し、生きるための悪を選ぶ心理を描いた芥川の不朽の名作。',
  2,
  null,
  'aozora-bunko',
  'internal://aozora/ja-rashomon',
  'https://covers.openlibrary.org/b/id/661413-M.jpg',
  ARRAY['短編文学', '古典'],
  'aozora_bunko',
  true,
  false
),
(
  'ja-hashire-merosu',
  '走れメロス',
  '太宰治',
  'ja',
  '「メロスは激怒した。」暴君ディオニスに立ち向かい、身代わりとなった無二の友セリヌンティウスのために、命を賭して信実の走りを続けるメロスの熱き物語。',
  2,
  null,
  'aozora-bunko',
  'internal://aozora/ja-hashire-merosu',
  'https://covers.openlibrary.org/b/id/6910633-M.jpg',
  ARRAY['人間讃歌', '名作'],
  'aozora_bunko',
  true,
  false
),
(
  'ja-gingatetsudo',
  '銀河鉄道の夜',
  '宮沢賢治',
  'ja',
  '孤独な少年ジョバンニが、親友カムパネルラと共に銀河を走る不思議な列車に乗り込み、天の川の美しい星々を巡りながら「本当のさいわい」を探し求める名作。',
  3,
  null,
  'aozora-bunko',
  'internal://aozora/ja-gingatetsudo',
  'https://covers.openlibrary.org/b/id/6913539-M.jpg',
  ARRAY['幻想文学', '童話'],
  'aozora_bunko',
  true,
  false
),
(
  'ja-gon-gitsune',
  'ごん狐',
  '新美南吉',
  'ja',
  'ひとりぼっちの小狐ごんと、母を亡くした兵十。ごんは罪滅ぼしに毎日栗や松茸を兵十の家に届け続けるが、二人の心はすれ違い切ない結末を迎える。',
  2,
  null,
  'aozora-bunko',
  'internal://aozora/ja-gon-gitsune',
  'https://covers.openlibrary.org/b/id/6910092-M.jpg',
  ARRAY['児童文学', '名作'],
  'aozora_bunko',
  true,
  false
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  synopsis = EXCLUDED.synopsis,
  total_chapters = EXCLUDED.total_chapters,
  cover_url = EXCLUDED.cover_url,
  categories = EXCLUDED.categories,
  source = EXCLUDED.source,
  is_active = true;

-- 4. Seed Japanese Chapter Texts into public.japanese_chapters
INSERT INTO public.japanese_chapters (book_id, chapter_index, title, slug, content) VALUES
('ja-kokoro', 0, '上 先生と私 — 一', 'kokoro-ch-1', '私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。これは世間を憚る遠慮というよりも、その方が私にとって自然だからである。私はその人の記憶を呼び起すごとに、すぐ「先生」と言いたくなる。筆を執っても心持は同じ事である。よそよそしい頭文字などはとても使う気にならない。

私が先生と知り合いになったのは鎌倉である。その時私はまだ若々しい書生であった。暑中休暇を利用して友だちに誘われて海へ泳ぎに行ったのである。友だちは二三日すると急用ができて国へ帰ってしまった。私一人取り残された私は、毎日海岸へ出かけては波に揺られていた。

そこに先生が現れたのである。先生は毎日同じ時刻に茶屋へ現れ、海に入って泳いでいた。他の賑やかな海水浴客とはどこか違う、静かで澄んだ空気を身に纏っていた。'),
('ja-kokoro', 1, '上 先生と私 — 二', 'kokoro-ch-2', '東京へ帰ってからも、私は先生の家を訪ねるようになった。先生は雑司ヶ谷の静かな住宅街に、奥さんと二人で住んでいた。先生の書斎には多くの本が整然と並び、いつも線香の香りがかすかに漂っていた。

「君、人間はね、ある瞬間までは皆いい人なんですよ。誰も悪人になろうと思って悪人になるわけじゃない。ただ、いざという時に、急に悪人に変わるから恐ろしいんだ」

先生のその言葉には、ご自身の過去に根差した深い傷と後悔が込められているように思えた。私は先生のその静かな瞳の奥にあるものを、どうしても知りたいと願った。'),
('ja-kokoro', 2, '下 先生の遺書', 'kokoro-ch-3', '「私はその手紙を読んだ時、全身の血が凍るような思いがした。

先生の遺書には、学生時代の親友Ｋとの悲しい過去がすべて記されていた。同じ下宿で暮らし、共に道を志した友を裏切り、お嬢さんを妻に娶ったこと。そしてその結果、Ｋが自ら命を絶ってしまったこと。

先生はその重い十字架を背負いながら、長年孤独の中で生きてこられたのだった。『私は死ぬ前に、ただ一人でいいから、人間を信じて死にたいのだ』という言葉が、私の胸を激しく揺さぶった。」'),

('ja-botchan', 0, '第一章 — 親譲りの無鉄砲', 'botchan-ch-1', '親譲りの無鉄砲で小供の時から損ばかりしている。小学校に居る時分学校の二階から飛び降りて一週間ほど腰を抜かした事がある。なぜそんな無闇をしたと聞く人があるかも知れぬ。別段深い理由でもない。新築の二階から首を出していたら、同級生の一人が冗談に、いくら威張っても、そこから飛び降りる事は出来まい。弱虫やーいと囃したからである。小使に負ぶさって帰って来た時、おやじが大きな眼をして二階ぐらいから飛び降りて腰を抜かす奴があるかと云ったから、この次は抜かさずに飛んで見せますと答えた。

親類のものから西洋製のナイフを貰って、奇麗な刃を日に翳して友だちに見せていたら、一人が光る事は光るが切れそうもないと云った。切れぬ事があるか、何でも切って見せると受け合った。そんなら君の指を切ってみろと注文した。何だ指ぐらいこの通りだと右の手の親指の甲をはすに切り込んだ。幸いナイフが小さかったのと、骨が固かったので、今だに親指は手についているが、疵痕は死ぬまで消えない。'),
('ja-botchan', 1, '第二章 — 松山への赴任', 'botchan-ch-2', '物理学校を卒業して間もなく、校長から四国の中学校へ数学の教師として行かないかと話があった。四国といえば昔から流罪になるところだ。遠い所へ行くのは少し心細かったが、下女の清に相談すると、清は涙を流して『坊っちゃん、どうかお行きなさいまし。立派な先生になっておいでなさい』と励ましてくれた。

汽車と船を乗り継いで、ようやく松山の町に着いた。町は小さく、城が山の上に見えた。赴任した学校には、タヌキのような校長や、赤シャツを着た教頭、山嵐というあだ名の頑固な数学主任などがいて、一癖も二癖もある連中ばかりだった。'),
('ja-botchan', 2, '第三章 — 赤シャツとの対決', 'botchan-ch-3', '生徒たちはいたずら好きで、宿直の夜に私の蚊帳の中に無数のイナゴを放り込んだり、温泉で泳いだと黒板に落書きをしたりした。だが、本当に腹が立つのは生徒ではなく、裏で陰謀をめぐらす教頭の赤シャツと野だいこだった。

私は山嵐と手を組み、卑怯なやり方で同僚を陥れようとする赤シャツたちを成敗することを決意した。夜更けの路上で赤シャツを待ち伏せし、天誅を下した時の爽快さは格別だった。私は辞表を叩きつけ、東京の清のもとへと帰る汽車に飛び乗った。'),

('ja-rashomon', 0, '前編 — ある日の暮方の事である', 'rashomon-ch-1', 'ある日の暮方の事である。一人の下人が、羅生門の下で雨やみを待っていた。

広い門の下には、この男のほかに誰もいない。ただ、所々丹塗の剥げた、大きな円柱に、蟋蟀が一匹とまっている。羅生門が、朱雀大路にある以上は、この男のほかにも、雨やみをする市女笠や揉烏帽子が、もう二三人はありそうなものである。それが、この男のほかには誰もいない。

なぜかと云うと、この二三年、京都には、地震とか辻風とか火事とか飢饉とか云う災いがつづいて起った。そこで洛中の寂れ方は一通りではない。下人は、行く所がないまま、途方に暮れて雨の音を聞いていた。'),
('ja-rashomon', 1, '後編 — 門の上の老婆', 'rashomon-ch-2', '下人は門の上の楼閣に灯りがともっているのに気づき、梯子を静かに登っていった。

そこには多くの死骸が打ち捨てられており、その死骸の山の中で、一人の老婆が若い女の死体から髪の毛を一本一本引き抜いていた。

下人は激しい憎悪を抱いて老婆を組み伏せた。『何をしている！』老婆は震え声で言った。『この髪で鬘を作って売るのじゃ。この女とて、蛇を干魚と偽って売って生きておった。生きるためには仕方のないことじゃ』

下人の心に、ある決意が生まれた。『では、己が引剥をしようと恨むまいな。己もそうしなければ、飢え死にする体なのだ』下人は老婆の着物を剥ぎ取り、闇の中へと駆け下りていった。'),

('ja-hashire-merosu', 0, '第一部 — 激怒と誓い', 'hashire-merosu-ch-1', 'メロスは激怒した。必ず、かの邪智暴虐の王を除かなければならぬと決意した。メロスには政治がわからぬ。メロスは、村の牧人である。笛を吹き、羊と遊んで暮して来た。けれども邪悪に対しては、人一倍に敏感であった。

きょう未明メロスは村を出発し、野を越え山越え、十里はなれた此のシラクスの市にやって来た。メロスには父も、母も無い。女房も無い。十六の、内気な妹と二人暮しだ。この妹は、村の或る律気な一牧人を、近々、花婿として迎える事になっていた。結婚式も間近かなのである。メロスは、それゆえ、花嫁の衣裳やら祝宴の御馳走やらを買いに、はるばる市にやって来たのだ。

ところが、市の様子がどこかおかしい。人通りも少なく、町全体が薄暗く沈んでいる。メロスは若い衆を捕まえて尋ねた。『なぜ町がこんなに静かなのだ』『王様が人を殺すのです』『なぜ殺すのだ』『悪心を抱いている、というのでございます』

メロスは激怒し、王城へと乗り込んだ。'),
('ja-hashire-merosu', 1, '第二部 — 太陽沈みぬ、走れメロス', 'hashire-merosu-ch-2', '捕らえられたメロスは、ディオニス王に言い放った。『人の心を疑うのは恥ずべき悪徳だ！』王は嘲笑した。『ならばお前を処刑する』メロスは頼んだ。『妹の結婚式を挙げてやりたい。三日間の日限をくれ。代わりに無二の友セリヌンティウスを人質として置いていく』

約束の三日目。濁流を泳ぎ渡り、山賊を打ち倒し、激しい疲労で倒れそうになりながらも、メロスは走り続けた。『友を救うため、信実を守るため、私は走らねばならぬ！』

日没寸前、処刑台の露と消えようとしていたセリヌンティウスのもとに、メロスは飛び込んだ。『セリヌンティウス！私を殴れ！私は一度だけ夢の中で君を裏切りかけた！』セリヌンティウスは微笑んでメロスを抱きしめた。

暴君ディオニスはその姿を見て涙を流し、言った。『お前たちの勝ちだ。どうか私をも仲間に入れてくれ』城内は歓歓の声に包まれた。'),

('ja-gingatetsudo', 0, '午后の授業と星祭り', 'gingatetsudo-ch-1', '「ではみなさんは、そういうふうに川だと云われたり、乳の流れたあとだと云われたりしていたこのぼんやりと白いものがほんとうは何かご承知ですか」

先生は、黒板に吊した大きな黒い星座の図を指しながら、みんなに問いかけました。カムパネルラが手をあげました。それからジョバンニも手をあげようとして、やめました。ジョバンニは知っていたのですが、毎日午後に活版所で働いて疲れているため、学校ではいつも元気がありませんでした。

その夜は星祭りでした。町中の子供たちが川へ烏瓜の灯りを流しに行く中、ジョバンニは一人寂しく町外れの丘へと向かいました。'),
('ja-gingatetsudo', 1, '銀河ステーション', 'gingatetsudo-ch-2', 'ジョバンニが草の上に寝転がって夜空を見上げていると、突然、耳の奥で不思議な音が鳴り響きました。

「銀河ステーション、銀河ステーション――」

気がつくと、ジョバンニはごとごとと音を立てて走る小さな列車の中に座っていました。向かいの席を見ると、びしょぬれになった親友のカムパネルラが、黒い上着を着て座っていました。

窓の外には、天の川のりんどうの花が咲き乱れ、銀色のすすきが風に揺れ、息をのむほど美しい光の野原が広がっていました。二人の不思議な銀河の旅が始まったのです。'),
('ja-gingatetsudo', 2, '白鳥の停車場とサウザンクロス', 'gingatetsudo-ch-3', '列車は天の川の岸を走っていきました。白鳥の停車場では、水晶の砂をすくう人たちがいて、サウザンクロスの十字架の前では、沈没船から乗ってきたという子供たちが静かに祈りを捧げていました。

『カムパネルラ、僕たちどこまでも一緒に行こうね。僕、みんなの本当の幸のためなら、僕の体なんか百回焼いてもかまわない』
ジョバンニがそう言って振り返った時、カムパネルラの席には誰もいませんでした。

ジョバンニが丘の上で目を覚ますと、町の方から叫び声が聞こえてきました。カムパネルラが川に落ちた友だちを助けようとして、水の中に沈んでしまったというのです。ジョバンニは、カムパネルラが本当の幸いを探しに天の川へ旅立ったのだと悟り、涙を流しました。'),

('ja-gon-gitsune', 0, '一、ごんのいたずら', 'gon-gitsune-ch-1', 'これは、わたしが小さいときに、村の茂平というおじいさんからきいたお話です。

むかしは、私たちの村のちかくの中山というところに、小さなお城があって、中山さまというお殿さまがおられました。その中山から少しはなれた山の中に、「ごん狐」という狐がいました。ごんは、ひとりぼっちの小狐で、しだのいっぱい茂った森の中に穴をほって住んでいました。

そして、夜でも昼でも、あたりの村へ出てきては、畑の芋を掘り散らかしたり、菜種がらの干してあるのを燃やしたりと、いたずらばかりしていました。

ある秋の日、ごんは川で兵十が魚をとっているのを見つけ、網にかかったウナギをいたずら心から逃がしてしまいました。'),
('ja-gon-gitsune', 1, '二、栗と松茸の贈り物', 'gon-gitsune-ch-2', 'それから十日ほど経って、兵十の家からお経の声が聞こえてきました。兵十のお母さんが亡くなったのです。ごんは『あのウナギは、病気のお母さんのために兵十がとったものだったのだ』と知り、深い後悔に胸を痛めました。

ごんはそれから毎日、山で栗や松茸を拾っては、兵十の家の裏口からそっと投げ入れました。『兵十、お前の母さんにすまないことをした』という気持ちからでした。

ある日、兵十が家に戻ると、土間に栗が置いてあり、奥へ入っていくごんの姿が見えました。『また悪さをしに来たな』兵十は火縄銃を手に取り、ごんを撃ちました。

倒れたごんのそばに、固まった栗の実を見て、兵十はハッとしました。『ごん、お前だったのか。いつも栗をくれたのは』ごんは、ぐったりと目をつむったまま、うなずきました。兵十の手から火縄銃が落ち、青い煙が立ちのぼっていました。')
ON CONFLICT (book_id, chapter_index) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  content = EXCLUDED.content;
