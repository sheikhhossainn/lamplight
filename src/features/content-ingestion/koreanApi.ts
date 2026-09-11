// Korean Literature Client — interfaces with Gongu Madang (공유마당) public domain
// Korean classics (Korea Copyright Commission), providing rich metadata,
// chapter TOCs, and curated offline texts.

export type KoreanBookSummary = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  synopsis: string;
  genre: string;
  totalChapters: number;
  sourceLanguage: 'ko';
  source: 'gongu_korea';
};

export type KoreanChapterMeta = {
  index: number;
  title: string;
  slug: string;
};

export type KoreanBookDetail = KoreanBookSummary & {
  chapters: KoreanChapterMeta[];
};

export const GONGU_KOREAN_BOOKS: KoreanBookDetail[] = [
  {
    id: 'ko-nalgae',
    slug: 'nalgae',
    title: '날개',
    author: '이상',
    coverUrl: null,
    genre: '모더니즘 심리소설',
    synopsis:
      '“박제가 되어버린 천재를 아시오?” 1930년대 식민지 지식인의 분열된 내면과 사회적 소외, 그리고 자아를 되찾고자 하는 갈망을 실험적 언어로 풀어낸 이상의 불후의 명작.',
    totalChapters: 3,
    sourceLanguage: 'ko',
    source: 'gongu_korea',
    chapters: [
      { index: 0, title: '제1부 — 박제가 되어버린 천재', slug: 'nalgae-ch-1' },
      { index: 1, title: '제2부 — 아내와 은화', slug: 'nalgae-ch-2' },
      { index: 2, title: '제3부 — 날개야 다시 돋아라', slug: 'nalgae-ch-3' },
    ],
  },
  {
    id: 'ko-jindallae',
    slug: 'jindallae-kkot',
    title: '진달래꽃',
    author: '김소월',
    coverUrl: 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ko-jindallae.jpg',
    genre: '서정시선집',
    synopsis:
      '“나 보기가 역겨워 가실 때에는 말없이 고이 보내 드리우리다.” 한국인의 마음속에 깊이 흐르는 한(恨)의 정서와 애절한 사랑, 이별의 슬픔을 노래한 대표 서정 시집.',
    totalChapters: 3,
    sourceLanguage: 'ko',
    source: 'gongu_korea',
    chapters: [
      { index: 0, title: '진달래꽃 (영변에 약산)', slug: 'jindallae-ch-1' },
      { index: 1, title: '산유화 · 엄마야 누나야', slug: 'jindallae-ch-2' },
      { index: 2, title: '초혼 (招魂)', slug: 'jindallae-ch-3' },
    ],
  },
  {
    id: 'ko-yun-dong-ju',
    slug: 'sky-wind-stars-poetry',
    title: '하늘과 바람과 별과 시',
    author: '윤동주',
    coverUrl: 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ko-yun-dong-ju.jpg',
    genre: '민족 서정시',
    synopsis:
      '“죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를.” 어두운 식민지 현실 속에서도 순결한 양심과 꺼지지 않는 별을 향해 걸어간 청년 시인 윤동주의 유고 시집.',
    totalChapters: 3,
    sourceLanguage: 'ko',
    source: 'gongu_korea',
    chapters: [
      { index: 0, title: '서시 (序詩)', slug: 'yun-ch-1' },
      { index: 1, title: '별 헤는 밤', slug: 'yun-ch-2' },
      { index: 2, title: '자화상 (自画像)', slug: 'yun-ch-3' },
    ],
  },
  {
    id: 'ko-unsu-joeun-nal',
    slug: 'unsu-joeun-nal',
    title: '운수 좋은 날',
    author: '현진건',
    coverUrl: null,
    genre: '사실주의 단편',
    synopsis:
      '경성 거리의 인력거꾼 김첨지. 비가 쏟아지는 날 유난히 손님이 많아 큰돈을 벌지만, 아내가 기다리는 초라한 집으로 돌아가는 그의 발걸음엔 불길한 침묵이 드리운다.',
    totalChapters: 3,
    sourceLanguage: 'ko',
    source: 'gongu_korea',
    chapters: [
      { index: 0, title: '제1부 — 뜻밖의 횡재', slug: 'unsu-ch-1' },
      { index: 1, title: '제2부 — 선술집의 설렁탕', slug: 'unsu-ch-2' },
      { index: 2, title: '제3부 — 괴상한 정적', slug: 'unsu-ch-3' },
    ],
  },
  {
    id: 'ko-bom-bom',
    slug: 'bom-bom',
    title: '봄·봄',
    author: '김유정',
    coverUrl: null,
    genre: '해학소설',
    synopsis:
      '점순이와 혼인시켜 주겠다는 약속만 믿고 삼 년 칠 개월 동안 머슴처럼 일하는 ‘나’. 점순이의 키가 언제 크냐며 혼인을 미루는 능청스러운 봉필 영감과의 유쾌한 실랑이.',
    totalChapters: 2,
    sourceLanguage: 'ko',
    source: 'gongu_korea',
    chapters: [
      { index: 0, title: '키 안 크는 점순이', slug: 'bom-ch-1' },
      { index: 1, title: '장인과의 담판', slug: 'bom-ch-2' },
    ],
  },
];

export const GONGU_CHAPTER_TEXTS: Record<string, string> = {
  'nalgae-ch-1': `“박제가 되어버린 천재”를 아시오? 나는 유쾌하오. 이런 때 연애까지가 유쾌하오.

육신이 흐느적흐느적하도록 피로했을 때만 정신이 은화처럼 맑소. 니코틴이 내 횟배 앓는 뱃속으로 스며들 때, 머릿속에는 백지가 한 장 준비되는 법이오. 그 위에 나는 위트와 파라독스를 바둑 포석처럼 늘어놓소. 가증할 상식의 병이오.

나는 또 여인과 생활을 설계하오. 연애기법에마저 서먹서먹하게 입술을 대어본 일도 없는 지극히 어리숙한 지식인의 흉내를 내어보오. 사실은 꽤나 능수능란한 연애자였던 것처럼.

나의 객실은 햇빛이 잘 들지 않는 음침한 방이오. 장지문으로 격리된 아내의 방에는 햇빛이 따스하게 비쳐 들지만, 내 방은 장지문 저편의 그늘일 뿐이오.`,

  'nalgae-ch-2': `아내에게 손님이 찾아오는 날이면, 나는 장롱 속에 웅크리고 숨거나 이불을 뒤집어쓰고 잠든 척해야 했소. 손님이 돌아가고 나면 아내는 내게 은화 한 닢을 쥐여주었소.

나는 그 은화를 손에 쥐고 방바닥에 굴리며 놀았소. 은화의 서늘한 촉감만이 내 생명의 유일한 증거인 양. 언젠가 나는 아내가 없는 틈을 타 거리로 뛰쳐나갔소. 손에 쥔 수많은 은화를 경성 거리의 거지에게 몽땅 털어 던져주고 빈손으로 돌아왔을 때, 내 가슴속에는 알 수 없는 환희가 차올랐소.

그러나 아내가 내게 먹이던 하얀 알약이 아스피린이 아니라 최면제 아달린이었다는 사실을 알게 되었을 때, 나의 나른한 평화는 산산조각이 나고 말았소.`,

  'nalgae-ch-3': `나는 무작정 미쓰코시 백화점 옥상으로 올라갔소.

정오를 알리는 사이렌 소리가 묵직하게 울려 퍼졌소. 거리는 온통 피로와 활기가 뒤엉킨 군중들의 행렬이었소. 문득 발밑을 내려다보았을 때, 회중시계 바늘처럼 뱅뱅 돌던 나의 청춘이 한눈에 들어왔소.

‘날개야 다시 돋아라.
날자. 날자. 한 번만 더 날자꾸나.
한 번만 더 날아보자꾸나.’

내 가슴 깊은 곳에서 솟구치는 절규와 함께, 잃어버렸던 깃털이 푸드덕거리는 것을 느꼈소.`,

  'jindallae-ch-1': `나 보기가 역겨워
가실 때에는
말없이 고이 보내 드리우리다

영변에 약산
진달래꽃
아름 따다 가실 길에 뿌리우리다

가시는 걸음 걸음
놓인 그 꽃을
사뿐히 즈려밟고 가시옵소서

나 보기가 역겨워
가실 때에는
죽어도 아니 눈물 흘리우리다`,

  'jindallae-ch-2': `산에는 꽃 피네
꽃이 피네
갈 봄 여름 없이
꽃이 피네

산에
산에
피는 꽃은
저만치 혼자서 피어 있네

산에서 우는 작은 새여
꽃이 좋아
산에서
사노라네

산에는 꽃 지네
꽃이 지네
갈 봄 여름 없이
꽃이 지네

---

엄마야 누나야 강변 살자
뜰에는 반짝이는 금모래 빛
뒷문 밖에는 갈잎의 노래
엄마야 누나야 강변 살자`,

  'jindallae-ch-3': `산산이 부서진 이름이여!
허공중에 헤어진 이름이여!
불러도 주인 없는 이름이여!
부르다가 내가 죽을 이름이여!

심중에 남아 있는 말 한마디는
끝끝내 마저 하지 못하였구나.
사랑하던 그 사람이여!
사랑하던 그 사람이여!

붉은 해는 서산마루에 걸리었다.
사슴의 무리도 슬피 운다.
떨어져 나가 앉은 산 위에서
나는 그대의 이름을 부르노라.

설움에 겹도록 부르노라.
설움에 겹도록 부르노라.
부르는 소리는 비껴가지만
하늘과 땅 사이가 너무 넓구나.

선 채로 이 자리에 돌이 되어도
부르다가 내가 죽을 이름이여!
사랑하던 그 사람이여!
사랑하던 그 사람이여!`,

  'yun-ch-1': `죽는 날까지 하늘을 우러러
한 점 부끄럼이 없기를,
잎새에 이는 바람에도
나는 괴로워했다.

별을 노래하는 마음으로
모든 죽어가는 것을 사랑해야지.
그리고 나한테 주어진 길을
걸어가야겠다.

오늘 밤에도 별이 바람에 스치운다.`,

  'yun-ch-2': `계절이 지나가는 하늘에는
가을로 가득 차 있습니다.

나는 아무 걱정도 없이
가을 속의 별들을 다 헤일 듯합니다.

가슴 속에 하나 둘 새겨지는 별을
이제 다 못 헤는 것은
쉬이 아침이 오는 까닭이요,
내일 밤이 남은 까닭이요,
아직 나의 청춘이 다하지 않은 까닭입니다.

별 하나에 추억과
별 하나에 사랑과
별 하나에 쓸쓸함과
별 하나에 동경과
별 하나에 시와
별 하나에 어머니, 어머니,

어머님, 나는 별 하나에 아름다운 말 한마디씩 불러 봅니다. 소학교 때 책상을 같이했던 아이들의 이름과, 패, 경, 옥 이런 이국 소녀들의 이름과, 벌써 아기 어머니 된 계집애들의 이름과, 가난한 이웃 사람들의 이름과, 비둘기, 강아지, 토끼, 노새, 노루, ‘프랑시스 잠’, ‘라이너 마리아 릴케’ 이런 시인의 이름을 불러 봅니다.

이네들은 너무나 멀리 있습니다.
별이 아스라이 멀듯이,

어머님,
그리고 당신은 멀리 북간도에 계십니다.

나는 무엇인지 그리워
이 많은 별빛이 내린 언덕 위에
내 이름자를 써 보고,
흙으로 덮어 버리었습니다.

딴은 밤을 새워 우는 벌레는
부끄러운 이름을 슬퍼하는 까닭입니다.

그러나 겨울이 지나고 나의 별에도 봄이 오면
무덤 위에 파란 잔디가 피어나듯이
내 이름자 묻힌 언덕 위에도
자랑처럼 풀이 무성할 거외다.`,

  'yun-ch-3': `산모퉁이를 돌아 논가 외딴 우물을 홀로 찾아가선 가만히 들여다봅니다.

우물 속에는 달이 밝고 구름이 흐르고 하늘이 펼치고 파아란 바람이 불고 가을이 있습니다.

그리고 한 사나이가 있습니다.
어쩐지 그 사나이가 미워져 돌아갑니다.

돌아가다 생각하니 그 사나이가 가엾어집니다.
도로 가 들여다보니 사나이는 그대로 있습니다.

다시 그 사나이가 미워져 돌아갑니다.
돌아가다 생각하니 그 사나이가 그리워집니다.

우물 속에는 달이 밝고 구름이 흐르고 하늘이 펼치고 파아란 바람이 불고 가을이 있고 추억처럼 사나이가 있습니다.`,

  'unsu-ch-1': `새침하게 흐린 품이 눈이 올 듯하더니, 눈은 아니 오고 얼다가 만 비가 추적추적 내리는 날이었다.

이날이야말로 동소문 안에서 인력거꾼 노릇을 하는 김첨지에게는 오래간만에 닥친 운수 좋은 날이었다. 첫 번에 삼십 전, 둘째 번에 오십 전 — 아침 댓바람에 벌써 팔십 전을 번 것이었다. 며칠 동안 구경도 못 해본 돈이었다.

김첨지는 빗물에 젖은 얼굴을 소매로 훔치며 낄낄 웃었다. 석 달 전부터 기침을 쿨럭거리며 누워 있는 아내에게 그렇게도 먹고 싶다던 설렁탕 한 그릇을 사다 줄 수 있게 된 까닭이었다.`,

  'unsu-ch-2': `비는 그치지 않고 더욱 굵어졌다. 남대문 정거장까지 데려다 달라는 손님을 태우고 내달린 김첨지는 다리가 부들부들 떨리고 숨이 턱까지 차올랐지만, 손에 쥐어지는 일 원 오십 전이라는 거금에 입이 찢어지는 듯했다.

돌아오는 길에 김첨지는 친구 치삼이를 만나 선술집으로 들어갔다. 빈속에 막걸리를 연거푸 들이켜며 김첨지는 취흥에 겨워 소리쳤다.

“이놈의 돈! 빌어먹을 돈! 오늘 내가 돈을 긁었어!”
그러나 한참을 껄껄 웃던 김첨지는 돌연 털썩 주저앉아 엉엉 울기 시작했다.
“우리 마누라가 죽었어…… 집에서 죽어가고 있단 말이야……”
치삼이가 어이없어하자, 김첨지는 다시 히죽 웃으며 술주정을 부렸다.
“농담이다, 자식아! 설렁탕을 사 들고 어서 들어가야지!”`,

  'unsu-ch-3': `김첨지는 취한 걸음으로 설렁탕을 사 들고 골목길을 돌아 자신의 오막살이집으로 들어섰다.

집 안은 쥐죽은 듯 고요했다. 평소 같으면 들리던 콜록콜록하는 기침 소리조차 들리지 않았다. 불길한 적막이 목덜미를 휘감았다.

방문을 거칠게 열어젖히자, 악취와 함께 어린 개똥이가 마른 젖을 빨다 지쳐 쿨쩍거리고 있었다. 이불을 걷어 올린 김첨지의 손이 사시나무 떨듯 떨렸다. 아내의 눈은 이미 하얗게 뒤집혀 있었고, 온몸은 얼음장처럼 차가웠다.

“설렁탕을 사다 놓았는데 왜 먹지를 못하니, 왜 먹지를 못하니…… 괴상하게도 오늘은 운수가 좋더니만…….”

김첨지는 아내의 차가운 얼굴을 비비며 목놓아 통곡했다. 비는 지붕 위로 여전히 스산하게 쏟아져 내리고 있었다.`,

  'bom-ch-1': `오늘도 또 우리 수탉이 짓밟혔다. 내가 점심을 먹고 나무를 하러 가려는데, 대사리 바깥마당에서 닭의 횃소리가 요란하게 났다. 얼른 달려가 보니, 점순이네 큰 수탉이 우리 작은 수탉을 올라타고 쪼아대는 것이 아닌가.

점순이는 참으로 얄미운 계집애다. 봄이 시작될 무렵, 나한테 감자를 구워와서는 “느 집엔 이거 없지?” 하며 불쑥 내밀었을 때, 내가 무심코 “난 감자 안 먹는다. 너나 먹어라” 하고 밀쳐낸 것이 화근이었다.

그때부터 점순이는 나만 보면 눈을 흘기고, 제 집 큰 수탉을 끌고 나와 우리 닭을 쪼아 피를 흘리게 만들며 약을 올리는 것이었다.`,

  'bom-ch-2': `하지만 내가 정말 애가 타는 것은 닭싸움 때문만이 아니었다. 장인님은 점순이의 키가 안 컸다는 핑계로 삼 년 칠 개월이 넘도록 혼인을 시켜주지 않고 나를 머슴처럼 부려먹고 있었다.

참다못한 나는 오늘 배참봉 댁 밭을 갈다 말고 장인님에게 대들었다.
“장인님! 저 성례 언제 시켜줍니까? 일만 부려먹고 이게 뭡니까!”
“이 자식이, 키가 자라야 혼인을 시켜주지! 암팡지게 일이나 해!”

마침내 화가 머리끝까지 난 나와 장인님 사이에 한바탕 육탄전이 벌어졌다. 장인님의 수염을 잡아당기며 실랑이를 벌이고 있을 때, 구경하던 점순이가 “이 망할 게, 우리 아버지 죽이네!” 하며 내 옆구리를 사정없이 쥐어박았다.

장인 편을 드는 점순이의 매운 손길에 서러움이 북받쳤지만, 나중에 장인님이 “올가을엔 꼭 성례를 시켜주마” 하고 달래는 바람에, 나는 또 바보처럼 코를 훌쩍이며 지게를 지고 일터로 나설 수밖에 없었다.`,
};

export async function fetchKoreanBooks(params?: {
  search?: string;
  genre?: string;
}): Promise<{ books: KoreanBookSummary[]; total: number }> {
  let list = [...GONGU_KOREAN_BOOKS];

  if (params?.search && params.search.trim().length > 0) {
    const q = params.search.trim().toLowerCase();
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.synopsis.toLowerCase().includes(q),
    );
  }

  if (params?.genre && params.genre !== 'All' && params.genre !== '전체') {
    const g = params.genre.trim();
    list = list.filter((b) => b.genre.includes(g));
  }

  return { books: list, total: list.length };
}

export async function fetchKoreanBookDetail(slugOrId: string): Promise<KoreanBookDetail> {
  const clean = slugOrId.replace(/^ko-/, '');
  const found = GONGU_KOREAN_BOOKS.find(
    (b) => b.slug === clean || b.id === slugOrId || b.id === `ko-${clean}`,
  );
  if (found) return found;

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/books?or=(id.eq.${encodeURIComponent(slugOrId)},id.eq.ko-${encodeURIComponent(clean)})&select=*`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            slug: r.id.replace(/^ko-/, ''),
            title: r.title,
            author: r.author,
            coverUrl: r.cover_url,
            synopsis: r.synopsis || '',
            genre: Array.isArray(r.categories) && r.categories[0] ? r.categories[0] : '한국문학',
            totalChapters: r.total_chapters || 1,
            sourceLanguage: 'ko',
            source: 'gongu_korea',
            chapters: [
              { index: 0, title: r.title, slug: `${r.id}-full` },
            ],
          };
        }
      }
    }
  } catch {
    // fallback
  }

  return GONGU_KOREAN_BOOKS[0];
}

export async function fetchKoreanChapterText(chapterSlug: string, bookId?: string): Promise<string> {
  if (bookId) {
    try {
      const { listKoreanChapters } = await import('@/db/repositories/books');
      const chapters = await listKoreanChapters(bookId);
      const match = chapters.find((ch) => ch.slug === chapterSlug);
      if (match && match.content) {
        return match.content;
      }
    } catch {
      // Fallback to remote or in-memory
    }
  }

  // Try fetching chapter text from remote Supabase if online
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/korean_chapters?slug=eq.${encodeURIComponent(chapterSlug)}&select=content`,
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

  return GONGU_CHAPTER_TEXTS[chapterSlug] || '이 장의 본문은 준비 중입니다.';
}

let koreanCatalogSeeded = false;

export async function seedKoreanCatalog(): Promise<void> {
  if (koreanCatalogSeeded) return;
  try {
    const { saveKoreanChapters, upsertKoreanBook } = await import('@/db/repositories/books');
    for (const book of GONGU_KOREAN_BOOKS) {
      await upsertKoreanBook({
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
        content: GONGU_CHAPTER_TEXTS[ch.slug] || '',
      }));

      await saveKoreanChapters(book.id, chaptersWithText);
    }
    koreanCatalogSeeded = true;
  } catch (err) {
    console.warn('[koreanApi] seedKoreanCatalog failed:', err);
  }
}
