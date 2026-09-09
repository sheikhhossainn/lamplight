// Bangla Book API Client — interfaces with the remote Render/Turso Bangla API
// to fetch catalog books, chapter breakdowns, plain-text chapter content, and taxonomies.

export type BanglaApiChapter = {
  id?: string | number;
  slug: string;
  title: string;
  order_index?: number;
  orderIndex?: number;
  order?: number;
};

export type BanglaApiBookSummary = {
  id?: string | number;
  slug: string;
  title: string;
  author: string;
  cover_url?: string | null;
  coverUrl?: string | null;
  synopsis?: string;
  genre?: string;
  category?: string;
  total_chapters?: number;
  totalChapters?: number;
  chapters_count?: number;
};

export type BanglaApiBookDetail = BanglaApiBookSummary & {
  chapters: BanglaApiChapter[];
};

export type BanglaBookSummary = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  synopsis: string;
  genre: string;
  totalChapters: number;
  sourceLanguage: 'bn';
  source: 'bangla_api';
};

export type BanglaChapterMeta = {
  index: number;
  title: string;
  slug: string;
};

export type BanglaBookDetail = BanglaBookSummary & {
  chapters: BanglaChapterMeta[];
};

const BASE_URL = (process.env.EXPO_PUBLIC_BANGLA_API_URL || '').replace(/\/+$/, '');

export const TURSO_URL =
  process.env.EXPO_PUBLIC_BANGLA_TURSO_URL ||
  'https://banglabooks-nightwingg.aws-ap-south-1.turso.io/v2/pipeline';

export const TURSO_TOKEN =
  process.env.EXPO_PUBLIC_BANGLA_TURSO_TOKEN ||
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg5NjgyNjgsImlkIjoiMDFhMDg2YjUtYmUwMS03ZDgwLWI0N2UtMDM4YWNlNjdiMDE5Iiwia2lkIjoia2dzOG5jTmtTSUdGcVp4TGVRTzEtSHRPWHVtZkllZGNmM0VnRmN4YXh0cyIsInJpZCI6IjQwYzRiNDg4LWI3OWYtNDVlMy1iMzAxLWFjMGIxY2Y2ZTUwMCJ9.3eM_pMW9yvra3L4i28EZe0jEsBYYL72AtU3Wy-s7hKNZjpE59FtoW8OaMg3vmrDA_UddhpjcQ0hpxHH4_ZxTBQ';

// Curated fallback classics for offline development and instant discovery
export const FALLBACK_BANGLA_BOOKS: BanglaBookDetail[] = [
  {
    id: 'bn-kapalkundala',
    slug: 'kapalkundala',
    title: 'কপালকুণ্ডলা',
    author: 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়',
    coverUrl: null,
    genre: 'ঐতিহাসিক উপন্যাস',
    synopsis:
      'বঙ্কিমচন্দ্র চট্টোপাধ্যায়ের বিখ্যাত রোমান্টিক ও ট্র্যাজিক উপন্যাস। জনহীন সাগরতীরে কপালকুণ্ডলা ও নবকুমারের অপ্রত্যাশিত মিলন এবং তাদের পরিণতি নিয়ে রচিত এক ধ্রুপদী সাহিত্য।',
    totalChapters: 4,
    sourceLanguage: 'bn',
    source: 'bangla_api',
    chapters: [
      { index: 0, title: 'প্রথম খণ্ড — সাগরতীরে', slug: 'kapalkundala-ch-1' },
      { index: 1, title: 'দ্বিতীয় খণ্ড — নবকুমার ও কপালকুণ্ডলা', slug: 'kapalkundala-ch-2' },
      { index: 2, title: 'তৃতীয় খণ্ড — গৃহপ্রবেশ', slug: 'kapalkundala-ch-3' },
      { index: 3, title: 'চতুর্থ খণ্ড — ভবানী মন্দিরে', slug: 'kapalkundala-ch-4' },
    ],
  },
  {
    id: 'bn-gora',
    slug: 'gora',
    title: 'গোরা',
    author: 'রবীন্দ্রনাথ ঠাকুর',
    coverUrl: null,
    genre: 'সামাজিক উপন্যাস',
    synopsis:
      'রবীন্দ্রনাথ ঠাকুরের এক মহাকাব্যিক উপন্যাস। ঊনবিংশ শতাব্দীর শেষভাগে ভারতবর্ষের সনাতন ভাবধারা ও আধুনিক উদারপন্থী চিন্তার দ্বন্দ্ব নিয়ে রচিত অনন্য সৃষ্টি।',
    totalChapters: 3,
    sourceLanguage: 'bn',
    source: 'bangla_api',
    chapters: [
      { index: 0, title: 'প্রথম অধ্যায় — গোরার আবির্ভাব', slug: 'gora-ch-1' },
      { index: 1, title: 'দ্বিতীয় অধ্যায় — আনন্দময়ী ও বিনয়', slug: 'gora-ch-2' },
      { index: 2, title: 'তৃতীয় অধ্যায় — পরেশবাবুর পরিবার', slug: 'gora-ch-3' },
    ],
  },
  {
    id: 'bn-devdas',
    slug: 'devdas',
    title: 'দেবদাস',
    author: 'শরৎচন্দ্র চট্টোপাধ্যায়',
    coverUrl: null,
    genre: 'প্রেম ও বেদনা',
    synopsis:
      'শরৎচন্দ্র চট্টোপাধ্যায়ের কালজয়ী উপন্যাস। দেবদাস ও পার্বতীর অমলিন প্রেম, সামাজিক ব্যবধান এবং চন্দ্রমুখীর আত্মত্যাগের বেদনাঘন কাহিনী।',
    totalChapters: 3,
    sourceLanguage: 'bn',
    source: 'bangla_api',
    chapters: [
      { index: 0, title: 'প্রথম পরিচ্ছেদ — শৈশবের সখ্য', slug: 'devdas-ch-1' },
      { index: 1, title: 'দ্বিতীয় পরিচ্ছেদ — বিচ্ছেদ', slug: 'devdas-ch-2' },
      { index: 2, title: 'তৃতীয় পরিচ্ছেদ — কলকাতায় দেবদাস', slug: 'devdas-ch-3' },
    ],
  },
  {
    id: 'bn-pather-panchali',
    slug: 'pather-panchali',
    title: 'পথের পাঁচালী',
    author: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
    coverUrl: null,
    genre: 'পল্লীসাহিত্য',
    synopsis:
      'নিশ্চিন্দিপুরের পল্লী প্রকৃতির স্নিগ্ধ রূপ এবং অপু-দুর্গার শৈশবের আনন্দ ও বেদনার অনবদ্য মহাকাব্যিক রূপায়ণ।',
    totalChapters: 3,
    sourceLanguage: 'bn',
    source: 'bangla_api',
    chapters: [
      { index: 0, title: 'প্রথম পরিচ্ছেদ — বল্লালী বালাই', slug: 'pather-panchali-ch-1' },
      { index: 1, title: 'দ্বিতীয় পরিচ্ছেদ — অপুর শৈশব', slug: 'pather-panchali-ch-2' },
      { index: 2, title: 'তৃতীয় পরিচ্ছেদ — দুর্গার সাথে বনে', slug: 'pather-panchali-ch-3' },
    ],
  },
];

const FALLBACK_CHAPTER_TEXTS: Record<string, string> = {
  'kapalkundala-ch-1': `যাত্রীরা গঙ্গাসাগরে স্নান করিয়া ফিরিয়া আসিতেছিল। তখন মাঘ মাস। বেলা প্রায় দুই প্রহর। পৌষ সংক্রান্তির মেলা সমাপ্ত হইয়াছে। যাত্রিগণ ক্ষুদ্র ক্ষুদ্র তরণীতে আরোহণ করিয়া স্ব স্ব আবাসে প্রত্যাবর্তন করিতেছিল।

তরণীসমূহ সমুদ্রের তরঙ্গমালা অতিক্রম করিয়া ক্রমে নদীর মোহনায় প্রবেশ করিল। কিন্তু কুয়াশা চতুর্দিক আচ্ছন্ন করিয়া ফেলিল। দিকভ্রম উপস্থিত হইল। মাঝিগণ তরণী চালনা করিতে অপারগ হইয়া দিক নির্ণয়ের চেষ্টা করিতে লাগিল।

যাত্রীদিগের মধ্যে নবকুমার নামক এক যুবক ছিলেন। তিনি সপ্তগ্রামের অধিবাসী। যুবক নির্ভীক ও বলিষ্ঠ। কুয়াশার অন্ধকার ভেদ করিয়া যখন তরী চরে আসিয়া ঠেকিল, নবকুমার তখন একাকী অবতরণ করিলেন। চকমকি ঠুকিয়া অগ্নুৎপাদন করিবার কাষ্ঠ আহরণ তাহার উদ্দেশ্য ছিল।

সৈকতভূমি বালুকাময় ও জনশূন্য। দূরে কেবল সমুদ্রের গম্ভীর গর্জন শ্রুত হইতেছিল। নবকুমার কাষ্ঠের সন্ধানে কিছু দূর অগ্রসর হইলেন, কিন্তু ফিরিবার পথ আর খুঁজিয়া পাইলেন না। ঘন অরণ্য ও সমুদ্রের নির্জনতা তাঁহাকে গ্রাস করিল।`,
  'kapalkundala-ch-2': `নবকুমার সমুদ্রতীরে বালিয়াড়ির উপর দাঁড়াইয়া ইতস্তত নিরীক্ষণ করিতে লাগিলেন। সন্ধ্যা নামিয়া আসিয়াছে। আকাশে দুই-একটি নক্ষত্র ফুটিয়া উঠিতেছে।

এমন সময় অকস্মাৎ পশ্চাৎ হইতে কোমল ও গভীর কন্ঠস্বর শ্রুত হইল — "পথিক, তুমি কি পথ হারাইয়াছ?"

নবকুমার চমকিত হইয়া পশ্চাতে ফিরিয়া চাহিলেন। দেখিলেন, এক অপূর্ব রূপবতী কিশোরী তাঁহার সম্মুখে দণ্ডায়মানা। তাহার কেশভার আজানুলম্বিত, দেহে আভরণ নাই, পরিধানে কেবল শুভ্র বসন। নেত্রে অপার্থিব শান্ত জ্যোতি।

নবকুমার স্তম্ভিত হইয়া রহিলেন। এই নিবিড় নির্জন অরণ্যপ্রান্তে এমন রূপসী মানবী কোথা হইতে আসিল? তিনি কোনো উত্তর দিতে পারিলেন না। কিশোরী পুনরায় জিজ্ঞাসা করিল, "পথিক, কোথায় যাইবে?"`,
  'kapalkundala-ch-3': `কপালকুণ্ডলা নবকুমারকে সঙ্গে লইয়া এক ক্ষুদ্র কুটীরের সম্মুখে উপস্থিত হইল। এই কুটীরে কাপালিক বাস করিতেন। কাপালিক তন্ত্রসাধক, দারুণ কঠোর তাঁহার রূপ।

নবকুমার কাপালিককে দেখিয়া কিছুটা শঙ্কিত হইলেন। কিন্তু ক্ষুধার্ত ও পরিশ্রান্ত শরীরে তিনি কুটীরে প্রবেশ করিয়া বিশ্রাম প্রার্থনা করিলেন। কপালকুণ্ডলা তাঁহাকে ফলমূল ও পানীয় প্রদান করিল।

রাত্রির অন্ধকার ঘনাইয়া আসিল। সমুদ্রের তরঙ্গমালা আছড়াইয়া পড়িতেছিল তটভূমিতে। নবকুমারের হৃদয়ে একদিকে আশঙ্কা, অন্যদিকে সেই বনবাসিনী রূপসীর প্রতি এক অনির্বচনীয় বিস্ময় জাগ্রত হইতে লাগিল।`,
  'kapalkundala-ch-4': `প্রভাতে যখন সূর্যোদয় হইল, কপালকুণ্ডলা চুপিচুপি নবকুমারকে জানাইল যে কাপালিক তাঁহাকে বলি দিবার সংকল্প করিয়াছে। সে অবিলম্বে নবকুমারকে পলায়ন করিবার পরামর্শ দিল।

নবকুমার বলিলেন, "তুমি আমার প্রাণরক্ষা করিতেছ, কিন্তু তোমাকে ফেলিয়া আমি কিরূপে যাইব? তুমি কি আমার সহিত আসিবে?"

কপালকুণ্ডলা নীরব রহিল। তাহার এই অরণ্য ও সমুদ্রই চিরদিনের আবাস। তথাপি সে নবকুমারের হাত ধরিয়া সমুদ্রতীরের লুক্কায়িত পথ প্রদর্শন করিল। ভবানী মন্দিরে অধিকারীর সম্মুখে তাঁহাদের শুভদৃষ্টি ও বিবাহ সম্পন্ন হইল।`,
  'gora-ch-1': `শ্রাবণের মেঘ কাটিয়া গিয়া সকালবেলাকার রৌদ্রে আকাশ উজ্জ্বল হইয়া উঠিয়াছে। কলিকাতার রাস্তায় গাড়ির চাকার শব্দ ও পথিকদের কোলাহল আরম্ভ হইয়াছে।

বিনয় তাহার ঘরের বারান্দায় বসিয়া একখানি মাসিক পত্রিকা পড়িতেছিল। এমন সময় রাজপথ হইতে গোরার বজ্রগম্ভীর কণ্ঠের ধ্বনি শোনা গেল। গোরা দীর্ঘকায়, গৌরবর্ণ, তাহার ললাট প্রশস্ত ও নেত্রে দীপ্ত তেজ।

গোরা ঘরে প্রবেশ করিয়াই বলিল, "বিনয়, সময় নষ্ট করিতেছ কেন? দেশের বর্তমান অবস্থা দেখিলে স্থির হইয়া বসিয়া থাকা যায় না। আমাদিগকে সত্যের সন্ধান করিতে হইবে।"`,
  'gora-ch-2': `আনন্দময়ী গোরার পালিতা মাতা, কিন্তু গোরার প্রতি তাঁহার স্নেহ মাতার স্নেহের চেয়েও গভীর। তিনি গোরার আচারনিষ্ঠা ও গোঁড়ামির মধ্যে জড়াইয়া না পড়িয়াও তাহাকে প্রাণের চেয়ে ভালোবাসেন।

আনন্দময়ী ঘরে আসিয়া দাঁড়াইলেন। গোরা তাঁহাকে প্রণাম করিয়া বলিল, "মা, তোমার আশীর্বাদই আমার একমাত্র ভরসা।"

আনন্দময়ী স্নিগ্ধ হাস্যে বলিলেন, "গোরা, আচারবিচার লইয়া মানুষের সাথে ব্যবধান তৈরি করিস নে। মানুষই সব চেয়ে বড় সত্য।"`,
  'gora-ch-3': `পরেশবাবুর গৃহে ব্রাহ্মসমাজের আবহাওয়া। পরেশবাবু শান্ত, ধীর ও পরম ধার্মিক পুরুষ। তাঁহার কন্যা সুচরিতা ও ললিতা আধুনিক শিক্ষায় শিক্ষিতা ও মননশীল।

বিনয় পরেশবাবুর পরিবারের সংস্পর্শে আসিয়া এক নতুন জগতের সন্ধান পাইল। সুচরিতার নির্মল বুদ্ধি ও চারিত্রিক দৃঢ়তা তাহাকে মুগ্ধ করিল। কিন্তু গোরা এই সম্পর্ককে সহজে গ্রহণ করিতে পারিল না।`,
  'devdas-ch-1': `তালসোনাপুর গ্রামের মুখুয্যে পরিবার ও চক্রবর্তী পরিবার পাশাপাশি বাস করিত। দেবদাস মুখুয্যেদের একমাত্র পুত্র এবং পার্বতী ওরফে পারু চক্রবর্তীদের কনিষ্ঠা কন্যা।

শৈশব হইতেই দেবদাস ও পার্বতীর সখ্য ছিল নিবিড়। দেবদাস চঞ্চল ও উদ্ধত, পারু শান্ত কিন্তু আত্মাভিমানিনী। গ্রামের দিঘির পাড়ে, আমবাগানে তাহাদের সারাদিনের খেলাধুলা ও খুনসুটি চলিত।

দেবদাস যখন শহরে পড়াশোনা করিতে যাইবার জন্য প্রস্তুত হইল, পারু কাঁদিয়া আকুল হইল। দেবদাস বলিল, "পারু, আমি ফিরিয়া আসিব। তুই কাঁদিস নে।"`,
  'devdas-ch-2': `কয়েক বৎসর পর দেবদাস কলিকাতা হইতে গ্রামে ফিরিয়া আসিল। পারু এখন কিশোরী হইতে পূর্ণ তরুণীতে রূপান্তরিত হইয়াছে। তাহার রূপের খ্যাতি গ্রামে ছড়াইয়া পড়িয়াছে।

পার্বতীর বিবাহ স্থির হইল এক সম্পন্ন জমিদারের সাথে। কিন্তু পার্বতীর হৃদয়ে কেবল দেবদাসের স্থান ছিল। এক নিশীথ রাত্রে পারু একাকী দেবদাসের কক্ষে গিয়া উপস্থিত হইল।

দেবদাস সামাজিক ভয় ও দ্বিধায় পারুর হাত ধরিতে পারিল না। পরে সে কলিকাতায় পলায়ন করিয়া পারুকে এক নিষ্ঠুর পত্র লিখিল — "আমি তোমাকে ভালোবাসিতে পারি না।"`,
  'devdas-ch-3': `কলিকাতার কোলাহলে দেবদাস অনুশোচনায় দগ্ধ হইতে লাগিল। সে তাহার বন্ধু চুনিলালের সাহচর্যে চন্দ্রমুখীর কাছে গেল।

চন্দ্রমুখী দেবদাসের গভীর দুঃখ ও নিষ্কলঙ্ক বেদনা দেখিয়া তাহাকে ভালোবাসিয়া ফেলিল। কিন্তু দেবদাসের চিত্ত কেবল পার্বতীর স্মৃতিতেই নিমগ্ন রহিল। সে সুরাপানে নিজকে ধীরে ধীরে ধ্বংসের দিকে ঠেলিয়া দিল।`,
  'pather-panchali-ch-1': `নিশ্চিন্দিপুর গ্রামের এক প্রান্তে হরিহর রায়ের পৈতৃক ভিটা। হরিহর সামান্য আয়ের গৃহস্থ, তাহার পত্নী সর্বজয়া ও দুই সন্তান — দুর্গা ও অপু।

দুর্গা চপলমতি কিশোরী, সারাদিন বনে-বাদাড়ে ফল কুড়াইয়া ও ঘুরিয়া বেড়ায়। তাহার সাথে থাকে বৃদ্ধা পিসি ইন্দির ঠাকরুণ। ইন্দির ঠাকরুণের দুঃখময় জীবনের ছায়া নিশ্চিন্দিপুরের মাটির সাথে মিশিয়া ছিল।`,
  'pather-panchali-ch-2': `অপু ছোটবেলা হইতেই স্বপ্নাতুর বালক। তাহার আঁখি দুইটি ছিল উজ্জ্বল ও অনুসন্ধিৎসু। পিতার সাথে কাশীদাসী মহাভারত পাঠ শুনিবার সময় তাহার মন দূর অতীতে চলিয়া যাইত।

একবার গ্রামের মাঠে বৈশাখী ঝড়ের দিনে অপু ও দুর্গা আম কুড়াইতে ছুটিয়া গেল। ঘন মেঘে আকাশ কালো হইয়া আসিল, বৃষ্টির ধারাপাতে মেদিনী সিক্ত হইল। অপুর হৃদয়ে প্রকৃতির এই রূপ চিরকালের জন্য অঙ্কিত হইয়া গেল।`,
  'pather-panchali-ch-3': `দুর্গা অপুকে ডাকিয়া বলিল, "অপু, রেলগাড়ি দেখবি?"

দুই ভাইবোন গ্রাম ছাড়িয়া কাশবনের মধ্য দিয়া বহুদূর রেললাইনের ধারে গেল। বাতাসে কাশবনের সাদা ফুল দুলিতেছিল। হঠাৎ দূর হইতে রেলগাড়ির বাঁশি বাজিয়া উঠিল এবং ধোঁয়া উড়াইয়া বিশাল লৌহদানব চলিয়া গেল। অপু স্তব্ধ হইয়া চাহিয়া রহিল।`,
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/\s+/g, '-');
}

export function cleanCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Filter out web placeholders and generic site logos
  if (
    trimmed.includes('egb_logo') ||
    trimmed.includes('placeholder') ||
    trimmed.toLowerCase().endsWith('.gif')
  ) {
    return null;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }
  return trimmed;
}

export function cleanBookTitle(rawTitle: string): string {
  if (!rawTitle) return 'শিরোনামহীন';
  // Strip redundant author suffix like " – বেগম রোকেয়া" or " - বিভূতিভূষণ বন্দ্যোপাধ্যায়"
  const cleaned = rawTitle.replace(/\s*[–—\-]\s*[^–—\-]+$/, '').trim();
  return cleaned.length > 0 ? cleaned : rawTitle.trim();
}

export function cleanSynopsis(
  rawSynopsis: string | null | undefined,
  title: string,
  author: string,
  genre?: string,
): string {
  const cleanTitle = cleanBookTitle(title);
  const cleanAuth = author || 'অজ্ঞাত লেখক';

  const formatFallback = () => {
    const validGenre =
      genre &&
      genre !== 'All' &&
      genre !== 'সব' &&
      genre !== 'সাধারণ' &&
      genre !== 'অসম্পূর্ণ বই' &&
      genre !== "Editor's Choice"
        ? genre
        : null;

    if (validGenre) {
      return `'${cleanTitle}' — ${cleanAuth}-এর এক ধ্রুপদী ${validGenre}। গভীর জীবনবোধ, মননশীলতা ও চমৎকার ভাষাভঙ্গির সম্মিলনে বাংলা সাহিত্যের এক কালজয়ী সৃষ্টি।`;
    }
    return `'${cleanTitle}' — ${cleanAuth}-এর এক অনন্য সৃষ্টি। বাংলা সাহিত্যের অমূল্য সম্পদ হিসেবে যা যুগে যুগে পাঠকমনে চিরভাস্বর।`;
  };

  if (!rawSynopsis || typeof rawSynopsis !== 'string') {
    return formatFallback();
  }

  let text = rawSynopsis
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip web/scrape garbage (e.g. course enrol, bookmark, OCR badges)
  text = text.replace(/Current Status Not Enrolled Price Free Get Started Log In to Enroll/gi, '').trim();
  text = text.replace(/\[\s*ওসিআর ভার্সন[^\n\]]*\]/gi, '').trim();
  text = text.replace(/(Bookmark|বুকমার্ক|\bBookmark\b|\bPDF\b|ডাউনলোড).*$/i, '').trim();

  // Repeatedly strip title and author prefixes at the beginning
  const titleVariants = [
    title,
    cleanTitle,
    `${cleanTitle} – ${cleanAuth}`,
    `${cleanTitle} - ${cleanAuth}`,
    `${cleanTitle} — ${cleanAuth}`,
    `${cleanTitle}–${cleanAuth}`,
    cleanAuth,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const v of titleVariants) {
      if (!v) continue;
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^\\s*${escaped}\\s*[:–—\\-.]*\\s*`, 'i');
      if (regex.test(text)) {
        text = text.replace(regex, '').trim();
        changed = true;
      }
    }
  }

  // Strip common preface / index markers
  text = text.replace(/^(প্রথম\s*সংস্করণের\s*ভূমিকা|দ্বিতীয়\s*সংস্করণের\s*ভূমিকা|ভূমিকা|প্রস্তাবনা|মুখবন্ধ|উপক্রম|সূচনা|নিবেদন|লেখকের\s*কথা|কথামুখ|সূচিপত্র)\s*[:–—\-.]*\s*/i, '').trim();

  // Strip publication metadata clutter at the start
  text = text.replace(/^(১ম|প্রথম|২য়|দ্বিতীয়)?\s*প্রকাশ[^\n.।!?]+(প্রকাশক|উৎসর্গ)[^\n.।!?]+[।!?.]\s*/i, '').trim();
  text = text.replace(/^(উৎসর্গ|প্রকাশনা)[^\n.।!?]+[।!?.]\s*/i, '').trim();
  text = text.replace(/^(প্রথম\s*প্রকাশ\s*[–—\-]\s*[^\n.।!?]+[।!?.]?)\s*/i, '').trim();

  // Check if remaining text is just genre and author like "কিশোর উপন্যাস – বিভূতিভূষণ বন্দ্যোপাধ্যায়"
  if (
    text.length < 30 ||
    text === cleanTitle ||
    text === title ||
    /^(কিশোর\s*উপন্যাস|উপন্যাস|ছোটগল্প|গল্পগ্রন্থ|কাব্যগ্রন্থ|নাটক|প্রবন্ধ)\s*[–—\-]/i.test(text)
  ) {
    return formatFallback();
  }

  // Cap at ~480 chars with sentence boundary
  if (text.length > 500) {
    const truncated = text.slice(0, 480);
    const lastPunc = Math.max(truncated.lastIndexOf('।'), truncated.lastIndexOf('.'), truncated.lastIndexOf('!'));
    if (lastPunc > 200) {
      text = text.slice(0, lastPunc + 1);
    } else {
      text = truncated + '…';
    }
  }

  return text.trim() || formatFallback();
}

// Execute queries directly against the Turso database pipeline
export async function executeTurso<T = Record<string, any>>(
  sql: string,
  args: (string | number | null)[] = [],
): Promise<T[]> {
  const body = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: args.map((a) => {
            if (typeof a === 'number') return { type: 'integer', value: String(a) };
            if (a === null) return { type: 'null' };
            return { type: 'text', value: String(a) };
          }),
        },
      },
      { type: 'close' },
    ],
  };

  const res = await fetch(TURSO_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Turso HTTP error ${res.status}`);
  }

  const json = await res.json();
  const execResult = json.results?.[0]?.response?.result;
  if (!execResult || !Array.isArray(execResult.rows)) {
    return [];
  }

  const cols: string[] = execResult.cols.map((c: any) => c.name);
  return execResult.rows.map((row: any[]) => {
    const obj: Record<string, any> = {};
    row.forEach((cell: any, i: number) => {
      obj[cols[i]] = cell?.value ?? null;
    });
    return obj as T;
  });
}

export function normalizeBanglaBook(raw: any): BanglaBookSummary {
  const slug = raw.slug || raw.book_slug || String(raw.id || 'book');
  const id = `bn-${normalizeSlug(slug)}`;
  const totalChapters =
    Number(
      raw.total_chapters ||
        raw.totalChapters ||
        raw.chapters_count ||
        (Array.isArray(raw.chapters) ? raw.chapters.length : 0),
    ) || 0;

  const coverUrl = cleanCoverUrl(raw.cover_url || raw.coverUrl);
  const title = cleanBookTitle(raw.title || raw.name || 'শিরোনামহীন');
  const author = raw.author || raw.author_name || raw.writer || 'অজ্ঞাত লেখক';
  const genre = raw.genre || raw.genre_name || raw.category || 'সাধারণ';
  const synopsis = cleanSynopsis(
    raw.synopsis || raw.description || raw.summary,
    title,
    author,
    genre,
  );

  return {
    id,
    slug,
    title,
    author,
    coverUrl,
    synopsis,
    genre,
    totalChapters,
    sourceLanguage: 'bn',
    source: 'bangla_api',
  };
}

export async function fetchBanglaBooks(params?: {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  author?: string;
}): Promise<{ books: BanglaBookSummary[]; total: number }> {
  // If remote REST API is configured, attempt it first
  if (BASE_URL) {
    try {
      const url = new URL(`${BASE_URL}/api/books`);
      if (params?.page) url.searchParams.set('page', String(params.page));
      if (params?.limit) url.searchParams.set('limit', String(params.limit));
      if (params?.search) url.searchParams.set('search', params.search);
      if (params?.genre) url.searchParams.set('genre', params.genre);
      if (params?.author) url.searchParams.set('author', params.author);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = Array.isArray(data) ? data : data.books || data.data || [];
        const books = rawList.map(normalizeBanglaBook);
        const total = data.total || data.count || books.length;
        return { books, total };
      }
    } catch (err) {
      console.warn('[banglaApi] REST failed, falling back to direct Turso pipeline:', err);
    }
  }

  // Direct Turso query with real covers and chapters prioritized
  try {
    const limit = params?.limit ?? 30;
    const offset = ((params?.page ?? 1) - 1) * limit;
    const whereClauses: string[] = [];
    const sqlArgs: (string | number | null)[] = [];

    if (params?.search && params.search.trim().length > 0) {
      const q = `%${params.search.trim()}%`;
      whereClauses.push('(b.title LIKE ? OR a.name LIKE ? OR b.synopsis LIKE ?)');
      sqlArgs.push(q, q, q);
    }

    if (params?.genre && params.genre !== 'All' && params.genre !== 'সব') {
      const g = params.genre.trim();
      const isHistory =
        g.toLowerCase() === 'history' ||
        g === 'ইতিহাস' ||
        g.includes('ইতিহাস') ||
        g.includes('মুক্তিযুদ্ধ');

      if (isHistory) {
        whereClauses.push(
          "b.id IN (SELECT bg.book_id FROM book_genres bg JOIN genres g ON g.id = bg.genre_id WHERE g.name LIKE '%ইতিহাস%' OR g.name LIKE '%মুক্তিযুদ্ধ%' OR g.slug LIKE '%history%')",
        );
      } else {
        whereClauses.push(
          'b.id IN (SELECT bg.book_id FROM book_genres bg JOIN genres g ON g.id = bg.genre_id WHERE g.name = ? OR g.slug = ? OR g.name LIKE ?)',
        );
        sqlArgs.push(g, g, `%${g}%`);
      }
    }

    if (params?.author) {
      whereClauses.push('a.name LIKE ?');
      sqlArgs.push(`%${params.author}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total matching count
    const countSql = `SELECT count(*) as total FROM books b LEFT JOIN authors a ON a.id = b.author_id ${whereSql}`;
    const countRows = await executeTurso<{ total: string }>(countSql, sqlArgs);
    const total = Number(countRows[0]?.total ?? 0);

    // Prioritize books with real covers first, then books with non-empty chapters
    const querySql = `
      SELECT b.id, b.slug, b.title, b.cover_url, b.synopsis,
             a.name AS author_name,
             (SELECT count(*) FROM chapters c WHERE c.book_id = b.id) AS total_chapters,
             (SELECT g.name FROM book_genres bg JOIN genres g ON g.id = bg.genre_id WHERE bg.book_id = b.id LIMIT 1) AS genre_name
      FROM books b
      LEFT JOIN authors a ON a.id = b.author_id
      ${whereSql}
      ORDER BY
        (CASE WHEN b.cover_url NOT LIKE '%egb_logo%' AND b.cover_url IS NOT NULL THEN 0 ELSE 1 END),
        (CASE WHEN (SELECT count(*) FROM chapters c WHERE c.book_id = b.id) > 0 THEN 0 ELSE 1 END),
        b.id ASC
      LIMIT ? OFFSET ?
    `;

    const rows = await executeTurso(querySql, [...sqlArgs, limit, offset]);

    const books: BanglaBookSummary[] = rows.map((r) => {
      const coverUrl = cleanCoverUrl(r.cover_url);
      const title = cleanBookTitle(r.title);
      const author = r.author_name || 'অজ্ঞাত লেখক';
      const genre = r.genre_name || 'সাধারণ';
      const synopsis = cleanSynopsis(r.synopsis, title, author, genre);
      return {
        id: `bn-${normalizeSlug(r.slug)}`,
        slug: r.slug,
        title,
        author,
        coverUrl,
        synopsis,
        genre,
        totalChapters: Number(r.total_chapters) || 0,
        sourceLanguage: 'bn',
        source: 'bangla_api',
      };
    });

    return { books, total };
  } catch (err) {
    console.warn('[banglaApi] Turso query failed, falling back to local classics:', err);
    let list = [...FALLBACK_BANGLA_BOOKS];
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    if (params?.genre && params.genre !== 'All' && params.genre !== 'সব') {
      const g = params.genre.trim();
      const isHistory =
        g.toLowerCase() === 'history' ||
        g === 'ইতিহাস' ||
        g.includes('ইতিহাস') ||
        g.includes('মুক্তিযুদ্ধ');
      if (isHistory) {
        list = list.filter(
          (b) =>
            b.genre.includes('ইতিহাস') ||
            b.genre.includes('ঐতিহাসিক') ||
            b.genre.includes('মুক্তিযুদ্ধ'),
        );
      } else {
        list = list.filter((b) => b.genre === g || b.genre.includes(g));
      }
    }
    return { books: list, total: list.length };
  }
}

export async function fetchBanglaBookDetail(slugOrId: string): Promise<BanglaBookDetail> {
  const cleanSlug = slugOrId.replace(/^bn-/, '');

  if (BASE_URL) {
    try {
      const res = await fetch(`${BASE_URL}/api/books/${encodeURIComponent(cleanSlug)}`);
      if (res.ok) {
        const data = await res.json();
        const summary = normalizeBanglaBook(data);
        const rawChapters: any[] = Array.isArray(data.chapters) ? data.chapters : [];

        const chapters: BanglaChapterMeta[] = rawChapters.map((ch, idx) => ({
          index: Number(ch.order_index ?? ch.orderIndex ?? ch.order ?? idx),
          title: ch.title || `অধ্যায় ${idx + 1}`,
          slug: ch.slug || `${summary.slug}-ch-${idx + 1}`,
        }));

        return {
          ...summary,
          totalChapters: chapters.length || summary.totalChapters,
          chapters,
        };
      }
    } catch (err) {
      console.warn('[banglaApi] REST book detail failed, falling back to Turso:', err);
    }
  }

  try {
    const bookSql = `
      SELECT b.id, b.slug, b.title, b.cover_url, b.synopsis,
             a.name AS author_name,
             (SELECT g.name FROM book_genres bg JOIN genres g ON g.id = bg.genre_id WHERE bg.book_id = b.id LIMIT 1) AS genre_name
      FROM books b
      LEFT JOIN authors a ON a.id = b.author_id
      WHERE b.slug = ? OR b.id = ?
      LIMIT 1
    `;
    const bookRows = await executeTurso(bookSql, [cleanSlug, Number(cleanSlug) || -1]);
    if (bookRows.length === 0) {
      const found = FALLBACK_BANGLA_BOOKS.find(
        (b) => normalizeSlug(b.slug) === normalizeSlug(cleanSlug) || b.id === slugOrId,
      );
      if (found) return found;
      throw new Error(`Book "${cleanSlug}" not found in catalog`);
    }

    const b = bookRows[0];
    const bookDbId = Number(b.id);

    const chapterSql = `
      SELECT c.id, c.slug, c.title, c.order_index
      FROM chapters c
      WHERE c.book_id = ?
      ORDER BY c.order_index ASC, c.id ASC
    `;
    const chapterRows = await executeTurso(chapterSql, [bookDbId]);

    const chapters: BanglaChapterMeta[] = chapterRows.map((ch, idx) => ({
      index: Number(ch.order_index ?? idx),
      title: ch.title || `অধ্যায় ${idx + 1}`,
      slug: ch.slug,
    }));

    const coverUrl = cleanCoverUrl(b.cover_url);
    const title = cleanBookTitle(b.title);
    const author = b.author_name || 'অজ্ঞাত লেখক';
    const genre = b.genre_name || 'সাধারণ';
    const synopsis = cleanSynopsis(b.synopsis, title, author, genre);

    return {
      id: `bn-${normalizeSlug(b.slug)}`,
      slug: b.slug,
      title,
      author,
      coverUrl,
      synopsis,
      genre,
      totalChapters: chapters.length,
      sourceLanguage: 'bn',
      source: 'bangla_api',
      chapters,
    };
  } catch (err) {
    console.warn('[banglaApi] Turso book detail failed, searching fallback:', err);
    const found = FALLBACK_BANGLA_BOOKS.find(
      (b) => normalizeSlug(b.slug) === normalizeSlug(cleanSlug) || b.id === slugOrId,
    );
    if (found) return found;
    throw err;
  }
}

export async function fetchBanglaChapterText(chapterSlug: string): Promise<string> {
  if (BASE_URL) {
    try {
      const res = await fetch(`${BASE_URL}/api/chapters/${encodeURIComponent(chapterSlug)}?format=text`);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          return data.content || data.text || data.body || '';
        }
        return await res.text();
      }
    } catch (err) {
      console.warn('[banglaApi] REST fetch chapter failed, falling back to Turso:', err);
    }
  }

  try {
    const chapterSql = `SELECT c.content_text, c.content_html FROM chapters c WHERE c.slug = ? LIMIT 1`;
    const rows = await executeTurso<{ content_text?: string; content_html?: string }>(chapterSql, [chapterSlug]);
    if (rows.length > 0 && rows[0].content_text) {
      return rows[0].content_text.trim();
    }
    if (rows.length > 0 && rows[0].content_html) {
      return rows[0].content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (FALLBACK_CHAPTER_TEXTS[chapterSlug]) {
      return FALLBACK_CHAPTER_TEXTS[chapterSlug];
    }
    return 'অধ্যায়টির বিষয়বস্তু উপলব্ধ নেই।';
  } catch (err) {
    console.warn('[banglaApi] Turso fetch chapter failed:', err);
    if (FALLBACK_CHAPTER_TEXTS[chapterSlug]) {
      return FALLBACK_CHAPTER_TEXTS[chapterSlug];
    }
    throw err;
  }
}

export async function fetchBanglaTaxonomies(): Promise<{ authors: string[]; genres: string[] }> {
  const EXCLUDED_GENRES = new Set([
    'English Books',
    'প্রাপ্তবয়স্কদের বই ১৮+',
    'অসম্পূর্ণ বই',
    'পত্রিকা',
    "Editor's Choice",
  ]);

  try {
    const [genreRows, authorRows] = await Promise.all([
      executeTurso<{ name: string }>(`
        SELECT g.name FROM genres g
        JOIN book_genres bg ON bg.genre_id = g.id
        GROUP BY g.id
        ORDER BY count(bg.book_id) DESC
        LIMIT 30
      `),
      executeTurso<{ name: string }>(`
        SELECT a.name FROM authors a
        JOIN books b ON b.author_id = a.id
        GROUP BY a.id
        ORDER BY count(b.id) DESC
        LIMIT 40
      `),
    ]);

    const rawGenres = genreRows
      .map((r) => r.name)
      .filter((name) => Boolean(name) && !EXCLUDED_GENRES.has(name));

    const cleanGenreMap: Record<string, string> = {
      'ইতিহাস ও সংস্কৃতি': 'ইতিহাস',
      'বাংলাদেশ ও মুক্তিযুদ্ধ বিষয়ক': 'মুক্তিযুদ্ধ',
      'থ্রিলার রহস্য রোমাঞ্চ অ্যাডভেঞ্চার': 'থ্রিলার ও রহস্য',
      'গোয়েন্দা (ডিটেকটিভ)': 'গোয়েন্দা',
      'কাব্যগ্রন্থ / কবিতা': 'কবিতা',
      'গল্পগ্রন্থ / গল্পের বই': 'গল্পগ্রন্থ',
      'ভৌতিক, হরর, ভূতের বই': 'ভৌতিক',
      'সায়েন্স ফিকশন / বৈজ্ঞানিক কল্পকাহিনী': 'সায়েন্স ফিকশন',
      'গান / গানের বই': 'গান ও সংগীত',
      'গণিত, বিজ্ঞান ও প্রযুক্তি': 'বিজ্ঞান ও প্রযুক্তি',
    };

    const mapped = new Set<string>();
    // Priority literary categories first
    mapped.add('উপন্যাস');
    mapped.add('ইতিহাস');
    mapped.add('গোয়েন্দা');
    mapped.add('গল্পগ্রন্থ');
    mapped.add('কবিতা');
    mapped.add('কিশোর সাহিত্য');
    mapped.add('মুক্তিযুদ্ধ');
    mapped.add('প্রবন্ধ ও গবেষণা');

    for (const g of rawGenres) {
      const clean = cleanGenreMap[g] || g;
      mapped.add(clean);
    }

    const genres = Array.from(mapped);
    const authors = authorRows.map((r) => r.name).filter(Boolean);

    return {
      genres: genres.length > 0 ? genres : ['উপন্যাস', 'ইতিহাস', 'গল্পগ্রন্থ', 'কবিতা', 'গোয়েন্দা'],
      authors: authors.length > 0 ? authors : Array.from(new Set(FALLBACK_BANGLA_BOOKS.map((b) => b.author))),
    };
  } catch (err) {
    console.warn('[banglaApi] Turso taxonomy fetch failed, falling back:', err);
    return {
      genres: ['উপন্যাস', 'ইতিহাস', 'গল্পগ্রন্থ', 'কবিতা', 'গোয়েন্দা'],
      authors: Array.from(new Set(FALLBACK_BANGLA_BOOKS.map((b) => b.author))),
    };
  }
}
