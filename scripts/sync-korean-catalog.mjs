// Ingests public domain Korean literature catalog (공유마당 / Korean classics) into Supabase public.books.
// Includes core classics from Yi Sang, Kim Sowol, Yun Dong-ju, Hyun Jin-geon,
// Kim Yu-jeong, Na Do-hyang, Lee Hyo-seok, Chae Man-sik, Kim Dong-in, Han Yong-un,
// Baek Seok, Heo Gyun, Kim Man-jung, and traditional pansori novels.
//
// RUN: `node scripts/sync-korean-catalog.mjs`
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Curated high-resolution covers from Open Library for canonical works
const KOREAN_COVERS = {
  'ko-jindallae': 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ko-jindallae.jpg', // 진달래꽃
  'ko-yun-dong-ju': 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ko-yun-dong-ju.jpg', // 하늘과 바람과 별과 시
};

// Canonical public domain Korean classics catalog
const KOREAN_CATALOG = [
  // 1. Hero Works
  {
    id: 'ko-nalgae',
    title: '날개',
    author: '이상',
    genre: '모더니즘 심리소설',
    synopsis: '“박제가 되어버린 천재를 아시오?” 1930년대 식민지 지식인의 분열된 내면과 자아를 향한 갈망을 그린 이상의 대표작.',
    textUrl: 'internal://korean/ko-nalgae',
    totalChapters: 3,
    isFeatured: true,
  },
  {
    id: 'ko-jindallae',
    title: '진달래꽃',
    author: '김소월',
    genre: '서정시선집',
    synopsis: '“나 보기가 역겨워 가실 때에는 말없이 고이 보내 드리우리다.” 한국인의 마음속에 깊이 흐르는 한과 이별의 애환을 노래한 서정 시집.',
    textUrl: 'internal://korean/ko-jindallae',
    totalChapters: 3,
    isFeatured: true,
  },
  {
    id: 'ko-yun-dong-ju',
    title: '하늘과 바람과 별과 시',
    author: '윤동주',
    genre: '민족 서정시',
    synopsis: '“죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를.” 순결한 양심과 시대적 아픔을 노래한 청년 시인 윤동주의 유고 시집.',
    textUrl: 'internal://korean/ko-yun-dong-ju',
    totalChapters: 3,
    isFeatured: true,
  },
  {
    id: 'ko-unsu-joeun-nal',
    title: '운수 좋은 날',
    author: '현진건',
    genre: '사실주의 단편',
    synopsis: '경성 인력거꾼 김첨지의 기막힌 횡재와 그 뒤에 숨겨진 참담한 비극을 그린 한국 사실주의 문학의 걸작.',
    textUrl: 'internal://korean/ko-unsu-joeun-nal',
    totalChapters: 3,
    isFeatured: true,
  },
  {
    id: 'ko-bom-bom',
    title: '봄·봄',
    author: '김유정',
    genre: '해학소설',
    synopsis: '점순이의 키가 크면 성례를 시켜주겠다는 능청스러운 장인과 순박한 머슴 데릴사위의 익살맞은 실랑이.',
    textUrl: 'internal://korean/ko-bom-bom',
    totalChapters: 2,
    isFeatured: true,
  },

  // 2. Kim Yu-jeong (김유정) Classics
  {
    id: 'ko-dongbaek',
    title: '동백꽃',
    author: '김유정',
    genre: '단편소설',
    synopsis: '노란 동백꽃 속에서 펼쳐지는 순박한 소년과 당돌한 점순이의 풋풋하고 알싸한 사랑 이야기.',
    textUrl: 'wikisource://동백꽃',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-sonakbi',
    title: '소낙비',
    author: '김유정',
    genre: '단편소설',
    synopsis: '농촌 산골의 찌든 가난과 물질적 탐욕 앞에 무너지는 인간 군상을 사실적으로 포착한 수작.',
    textUrl: 'wikisource://소낙비',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-manmubang',
    title: '만무방',
    author: '김유정',
    genre: '단편소설',
    synopsis: '추수철 자신의 논에서 벼를 훔쳐야만 살아남을 수 있었던 소작농 형제의 절박한 삶과 비애.',
    textUrl: 'wikisource://만무방',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-geum-ttaneun-kongbat',
    title: '금 따는 콩밭',
    author: '김유정',
    genre: '단편소설',
    synopsis: '멀쩡한 콩밭을 갈아엎고 일확천금의 금줄을 찾아 헤매는 소작농의 허황된 욕망과 몰락.',
    textUrl: 'wikisource://금_따는_콩밭',
    totalChapters: 0,
    isFeatured: false,
  },

  // 3. Hyun Jin-geon (현진건) Classics
  {
    id: 'ko-b-sagam',
    title: 'B사감과 러브레터',
    author: '현진건',
    genre: '단편소설',
    synopsis: '엄격하고 표독한 여학교 기숙사 사감 B여사의 이면에 숨겨진 인간적 고독과 애정의 결핍.',
    textUrl: 'wikisource://B사감과_러브레터',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-bincheo',
    title: '빈처 (貧妻)',
    author: '현진건',
    genre: '단편소설',
    synopsis: '가난한 무명작가를 묵묵히 내조하며 헌신하는 아내의 눈물겨운 사랑과 지식인의 자조.',
    textUrl: 'wikisource://빈처',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-sul-gwonhaneun-sahoe',
    title: '술 권하는 사회',
    author: '현진건',
    genre: '단편소설',
    synopsis: '조선의 부조리한 현실 앞에서 절망한 지식인이 매일 밤 술로 울분을 달래는 비극적 사회상.',
    textUrl: 'wikisource://술_권하는_사회',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-gohyang-hyun',
    title: '고향',
    author: '현진건',
    genre: '단편소설',
    synopsis: '기차 안에서 만난 한 조선인 청년의 기구한 삶을 통해 일제 강점기 유랑민의 고통을 증언한 명작.',
    textUrl: 'wikisource://고향_(현진건)',
    totalChapters: 0,
    isFeatured: false,
  },

  // 4. Yi Sang (이상) Classics
  {
    id: 'ko-ogando',
    title: '오감도 (烏瞰圖)',
    author: '이상',
    genre: '실험시선집',
    synopsis: '“13인의 아해가 도로로 질주하오.” 현대인의 실존적 불안과 공포를 파격적 언어로 표현한 연작시.',
    textUrl: 'wikisource://오감도',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-jongsaenggi',
    title: '종생기 (終生記)',
    author: '이상',
    genre: '심리단편',
    synopsis: '자신의 생애 마지막을 기록하듯 써 내려간 지식인의 환멸과 자기 연민, 파멸의 드라마.',
    textUrl: 'wikisource://종생기',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-bongbyeolgi',
    title: '봉별기 (逢別記)',
    author: '이상',
    genre: '자전소설',
    synopsis: '배천온천에서 만난 기생 금홍과의 만남과 동거, 그리고 씁쓸한 이별을 고백한 자전적 소설.',
    textUrl: 'wikisource://봉별기',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-gwontae',
    title: '권태 (倦怠)',
    author: '이상',
    genre: '수필',
    synopsis: '지루하고 단조로운 농촌의 여름날 속에서 마주하는 지독한 무료함과 권태에 대한 철학적 성찰.',
    textUrl: 'wikisource://권태',
    totalChapters: 0,
    isFeatured: false,
  },

  // 5. Lee Hyo-seok (이효석) Classics
  {
    id: 'ko-memilkkot',
    title: '메밀꽃 필 무렵',
    author: '이효석',
    genre: '서정단편',
    synopsis: '달빛 아래 하얗게 흐드러진 메밀꽃 산길을 걸으며 옛 사랑을 회상하는 장돌뱅이 허생원의 서정적 여정.',
    textUrl: 'wikisource://메밀꽃_필_무렵',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-san-lee',
    title: '산 (山)',
    author: '이효석',
    genre: '서정단편',
    synopsis: '문명의 속박을 벗어나 대자연의 품으로 귀의한 중실의 원초적 생명력과 자유를 노래한 소설.',
    textUrl: 'wikisource://산_(이효석)',
    totalChapters: 0,
    isFeatured: false,
  },

  // 6. Na Do-hyang (나도향) Classics
  {
    id: 'ko-samryongi',
    title: '벙어리 삼룡이',
    author: '나도향',
    genre: '단편소설',
    synopsis: '주인집 며느리를 향한 벙어리 하인 삼룡이의 순수하고 숭고한 사랑과 불길 속의 비극적 희생.',
    textUrl: 'wikisource://벙어리_삼룡이',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-mullebanga',
    title: '물레방아',
    author: '나도향',
    genre: '단편소설',
    synopsis: '물레방앗간을 배경으로 얽힌 욕망과 배신, 가난한 소작농 이방원의 처절한 파멸을 그린 작품.',
    textUrl: 'wikisource://물레방아',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-ppong',
    title: '뽕',
    author: '나도향',
    genre: '단편소설',
    synopsis: '생계를 위해 뽕잎을 따러 가며 벌어지는 농촌 여인 안협집의 삶과 당시 하층민의 도덕적 궁핍.',
    textUrl: 'wikisource://뽕',
    totalChapters: 0,
    isFeatured: false,
  },

  // 7. Kim Dong-in (김동인) Classics
  {
    id: 'ko-gamja',
    title: '감자',
    author: '김동인',
    genre: '자연주의 소설',
    synopsis: '평양 칠성문 밖 빈민굴에서 가난으로 인해 서서히 타락해 가는 복녀의 비극적 운명.',
    textUrl: 'wikisource://감자_(소설)',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-baettaragi',
    title: '배따라기',
    author: '김동인',
    genre: '액자소설',
    synopsis: '사소한 오해와 의처증으로 아내와 동생을 잃고 한평생 영변가를 떠돌며 노래하는 한 남자의 한(恨).',
    textUrl: 'wikisource://배따라기',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-gwanghwasan',
    title: '광화사 (狂畵師)',
    author: '김동인',
    genre: '탐미주의 소설',
    synopsis: '절대적인 미의 그림을 완성하기 위해 광기에 사로잡힌 천재 화가 솔거의 예술혼과 파국.',
    textUrl: 'wikisource://광화사',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-gwangyeom',
    title: '광염 소나타',
    author: '김동인',
    genre: '예술소설',
    synopsis: '범죄와 광기 속에서만 악마적 예술 영감을 얻는 천재 피아니스트 백성수의 전율적인 비극.',
    textUrl: 'wikisource://광염_소나타',
    totalChapters: 0,
    isFeatured: false,
  },

  // 8. Chae Man-sik (채만식) Classics
  {
    id: 'ko-ready-made',
    title: '레디메이드 인생',
    author: '채만식',
    genre: '풍자소설',
    synopsis: '고등교육을 받고도 일자리를 찾지 못해 지식인 실업자로 전락한 1930년대 청년들의 풍자적 자화상.',
    textUrl: 'wikisource://레디메이드_인생',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-chisuk',
    title: '치숙 (痴叔)',
    author: '채만식',
    genre: '풍자소설',
    synopsis: '일제 체제에 순응하려는 철없는 조카의 시선을 통해 사회주의 운동가 삼촌의 삶을 역설적으로 풍자한 수작.',
    textUrl: 'wikisource://치숙',
    totalChapters: 0,
    isFeatured: false,
  },

  // 9. Han Yong-un & Baek Seok & Classic Poetry
  {
    id: 'ko-nime-chimmuk',
    title: '님의 침묵',
    author: '한용운',
    genre: '명상시선집',
    synopsis: '“님은 갔지마는 나는 님을 보내지 아니하였습니다.” 조국과 영원한 진리를 향한 만해 한용운의 절창.',
    textUrl: 'wikisource://님의_침묵',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-naseum',
    title: '사슴',
    author: '백석',
    genre: '향토서정시',
    synopsis: '평안도 방언과 토속적인 풍물로 잃어버린 공동체의 따스한 기억과 유랑의 슬픔을 빚어낸 백석의 유일한 시집.',
    textUrl: 'wikisource://사슴_(시집)',
    totalChapters: 0,
    isFeatured: false,
  },

  // 10. Traditional Korean Classics (고전문학)
  {
    id: 'ko-hong-gildong',
    title: '홍길동전',
    author: '허균',
    genre: '고전소설',
    synopsis: '서얼 차별의 굴레를 박차고 활빈당을 결성하여 탐관오리를 징벌하고 율도국을 세운 영웅 홍길동의 일대기.',
    textUrl: 'wikisource://홍길동전',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-guunmong',
    title: '구운몽 (九雲夢)',
    author: '김만중',
    genre: '고전소설',
    synopsis: '육관대사의 제자 성진이 인간 세상의 부귀영화를 꿈꾸다 깨달음을 얻는 조선 몽자류 소설의 최고봉.',
    textUrl: 'wikisource://구운몽',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-chunhyang',
    title: '춘향전',
    author: '작자미상',
    genre: '판소리계 소설',
    synopsis: '신분의 벽을 뛰어넘은 성춘향과 이몽룡의 지고지순한 사랑과 변학도의 폭정에 맞선 신념의 승리.',
    textUrl: 'wikisource://춘향전',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-simcheong',
    title: '심청전',
    author: '작자미상',
    genre: '판소리계 소설',
    synopsis: '눈먼 아버지를 위해 인당수 제물로 뛰어든 효녀 심청의 숭고한 효심과 환생의 기적.',
    textUrl: 'wikisource://심청전',
    totalChapters: 0,
    isFeatured: false,
  },
  {
    id: 'ko-heungbu',
    title: '흥부전',
    author: '작자미상',
    genre: '판소리계 소설',
    synopsis: '욕심 많은 형 놀부와 착한 아우 흥부의 박타기 이야기를 통해 권선징악과 형제애를 해학적으로 그린 고전.',
    textUrl: 'wikisource://흥부전',
    totalChapters: 0,
    isFeatured: false,
  },
];

async function run() {
  console.log('--- Korean Literature Catalog Sync ---');
  console.log(`Syncing ${KOREAN_CATALOG.length} Korean classic titles into Supabase...`);

  const rows = KOREAN_CATALOG.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    source_language: 'ko',
    synopsis: b.synopsis,
    total_chapters: b.totalChapters,
    gutenberg_id: null,
    source_format: 'korean-text',
    text_url: b.textUrl,
    cover_url: KOREAN_COVERS[b.id] ?? null,
    categories: [b.genre, b.author],
    source: 'gongu_korea',
    is_active: true,
    is_featured: !!b.isFeatured,
  }));

  const { error } = await supabase.from('books').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Supabase upsert failed:', error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully synced ${rows.length} Korean books into Supabase public.books!`);
}

run().catch((err) => {
  console.error('Fatal error in sync-korean-catalog:', err);
  process.exit(1);
});
