import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectScript,
  getScriptFont,
  getLineHeightMultiplier,
  calculateQuoteStyles,
  getQuoteCardExportResolution,
  buildQuoteCardDeepLink,
  TEMPLATES,
  VARIANTS,
  MAX_RECOMMENDED_QUOTE_LENGTH,
  MAX_EXCESSIVE_QUOTE_LENGTH,
} from '../src/features/reader/components/quoteTemplates';
import { FontFamily } from '../src/theme/typography';

test('SHARE-01: Multi-script typography and script detection', async (t) => {
  await t.test('detects Bengali script and assigns Atma typography', () => {
    const text = 'আলো আমার, আলো ওগো, আলো ভুবন-ভরা';
    const script = detectScript(text);
    assert.equal(script, 'bangla');
    assert.equal(getScriptFont(script, true), FontFamily.atmaSemiBold);
    assert.equal(getScriptFont(script, false), FontFamily.atmaMedium);
    assert.equal(getLineHeightMultiplier(script), 1.68);
  });

  await t.test('detects Arabic script and assigns Amiri typography with RTL flag', () => {
    const text = 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ';
    const script = detectScript(text);
    assert.equal(script, 'arabic');
    assert.equal(getScriptFont(script, true), FontFamily.amiriBold);
    assert.equal(getScriptFont(script, false), FontFamily.amiriRegular);
    assert.equal(getLineHeightMultiplier(script), 1.76);

    const metrics = calculateQuoteStyles(text);
    assert.equal(metrics.quote.isRtl, true);
    assert.equal(metrics.quote.script, 'arabic');
  });

  await t.test('detects Devanagari script and assigns Kalam typography', () => {
    const text = 'सत्यमेव जयते नानृतम्';
    const script = detectScript(text);
    assert.equal(script, 'devanagari');
    assert.equal(getScriptFont(script, true), FontFamily.kalamBold);
    assert.equal(getScriptFont(script, false), FontFamily.kalamRegular);
    assert.equal(getLineHeightMultiplier(script), 1.68);
  });

  await t.test('detects Japanese script and uses native CJK platform font fallback', () => {
    const kanaText = 'こんにちは世界';
    const kanjiKanaText = '国境の長いトンネルを抜けると雪国であった。夜の底が白くなった。';
    assert.equal(detectScript(kanaText), 'japanese');
    assert.equal(detectScript(kanjiKanaText), 'japanese');

    // System CJK sans font prevents glyph clipping and font mismatch
    assert.equal(getScriptFont('japanese', true), undefined);
    assert.equal(getScriptFont('japanese', false), undefined);
    assert.equal(getLineHeightMultiplier('japanese'), 1.62);

    const metrics = calculateQuoteStyles(kanjiKanaText);
    assert.equal(metrics.quote.isRtl, false);
    assert.equal(metrics.quote.fontFamily, undefined);
    assert.equal(metrics.quote.script, 'japanese');
  });

  await t.test('detects Korean script and uses native CJK platform font fallback', () => {
    const hangulText = '별 헤는 밤: 계절이 지나가는 하늘에는 가을로 가득 차 있습니다.';
    assert.equal(detectScript(hangulText), 'korean');

    assert.equal(getScriptFont('korean', true), undefined);
    assert.equal(getScriptFont('korean', false), undefined);
    assert.equal(getLineHeightMultiplier('korean'), 1.62);

    const metrics = calculateQuoteStyles(hangulText);
    assert.equal(metrics.quote.isRtl, false);
    assert.equal(metrics.quote.fontFamily, undefined);
    assert.equal(metrics.quote.script, 'korean');
  });

  await t.test('detects Latin script and assigns literary Lora serif font', () => {
    const englishText = 'All that we see or seem is but a dream within a dream.';
    const script = detectScript(englishText);
    assert.equal(script, 'latin');
    assert.equal(getScriptFont(script, true), FontFamily.loraItalicMedium);
    assert.equal(getScriptFont(script, false), FontFamily.loraRegular);
    assert.equal(getLineHeightMultiplier(script), 1.48);

    const metrics = calculateQuoteStyles(englishText);
    assert.equal(metrics.quote.isRtl, false);
    assert.equal(metrics.quote.fontFamily, FontFamily.loraItalicMedium);
  });

  await t.test('handles empty or blank text gracefully', () => {
    assert.equal(detectScript(''), 'latin');
    assert.equal(detectScript('   '), 'latin');
  });
});

test('SHARE-01: Long quote graceful handling and alternate condensed layout', async (t) => {
  await t.test('standard short quotes fit comfortable baseline sizing without warning', () => {
    const shortQuote = 'A short classic sentence for inspiration.';
    const metrics = calculateQuoteStyles(shortQuote);

    assert.equal(metrics.isLongQuote, false);
    assert.equal(metrics.isExcessive, false);
    assert.equal(metrics.lengthExplanation, undefined);
    assert.equal(metrics.maxQuoteLines, 12);
    assert.equal(metrics.quote.fontSize >= 17, true);
  });

  await t.test('long quotes (>340 chars) trigger length notice and condensed typography', () => {
    const longQuote =
      'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.';
    assert.ok(longQuote.length > MAX_RECOMMENDED_QUOTE_LENGTH);

    const standardMetrics = calculateQuoteStyles(longQuote, undefined, false);
    assert.equal(standardMetrics.isLongQuote, true);
    assert.equal(standardMetrics.isExcessive, false);
    assert.ok(standardMetrics.lengthExplanation?.includes('Long passage'));

    // Condensed layout expands available lines and scales type down gracefully
    const condensedMetrics = calculateQuoteStyles(longQuote, undefined, true);
    assert.equal(condensedMetrics.condensed, true);
    assert.equal(condensedMetrics.maxQuoteLines, 16);
    assert.ok(condensedMetrics.quote.fontSize < standardMetrics.quote.fontSize);
  });

  await t.test('excessive quotes (>550 chars) provide clear explanation with guidance', () => {
    const excessiveQuote = 'A'.repeat(MAX_EXCESSIVE_QUOTE_LENGTH + 50);
    const metrics = calculateQuoteStyles(excessiveQuote);

    assert.equal(metrics.isLongQuote, true);
    assert.equal(metrics.isExcessive, true);
    assert.ok(metrics.lengthExplanation?.includes('Excerpt is 600 characters'));
    assert.ok(metrics.lengthExplanation?.includes('1-3 sentences (<350 chars) are recommended'));
  });

  await t.test('calculates translation metrics and line allocation when translation is present', () => {
    const quote = 'To be, or not to be, that is the question.';
    const translation = 'হওয়া, নাকি না-হওয়া—এটাই প্রশ্ন।';
    const metrics = calculateQuoteStyles(quote, translation, false);

    assert.equal(metrics.hasTranslation, true);
    assert.equal(metrics.quote.script, 'latin');
    assert.equal(metrics.translation.script, 'bangla');
    assert.equal(metrics.maxQuoteLines, 7);
    assert.equal(metrics.maxTranslationLines, 5);

    const condensed = calculateQuoteStyles(quote, translation, true);
    assert.equal(condensed.maxQuoteLines, 10);
    assert.equal(condensed.maxTranslationLines, 6);
  });
});

test('SHARE-01: Template registry and category boundaries', async (t) => {
  await t.test('includes exactly 3 classic curated themes for free tier', () => {
    const classic = TEMPLATES.filter((t) => t.category === 'classic');
    assert.equal(classic.length, 3);
    assert.deepEqual(
      classic.map((t) => t.id),
      ['parchment', 'gradient', 'foldSplit'],
    );
  });

  await t.test('includes 6 culturally aligned premium artisan themes', () => {
    const premium = TEMPLATES.filter((t) => t.category === 'premium');
    assert.equal(premium.length, 6);
    assert.deepEqual(
      premium.map((t) => t.id),
      ['editorial', 'midnightGold', 'washi', 'cyanotype', 'broadside', 'tanzaku'],
    );
  });

  await t.test('VARIANTS contains all 9 unique template identifiers', () => {
    assert.equal(VARIANTS.length, 9);
    assert.equal(new Set(VARIANTS).size, 9);
  });
});

test('SHARE-01: High-resolution export scaling and deep linking', async (t) => {
  await t.test('standard resolution for free users exports at 720w maintaining exact aspect ratio', () => {
    const cardWidth = 320;
    const cardHeight = Math.round((320 * 16) / 9); // ~569
    const res = getQuoteCardExportResolution(false, cardWidth, cardHeight);

    assert.equal(res.width, 720);
    assert.equal(res.height, Math.round(720 * (cardHeight / cardWidth)));
    assert.equal(res.isHighResolution, false);
    assert.equal(res.quality, 0.85);

    // Aspect ratio matches exactly
    const previewRatio = cardHeight / cardWidth;
    const exportRatio = res.height / res.width;
    assert.ok(Math.abs(previewRatio - exportRatio) < 0.005);
  });

  await t.test('high resolution for premium users exports at 1080w full HD maintaining aspect ratio', () => {
    const cardWidth = 320;
    const cardHeight = Math.round((320 * 16) / 9);
    const res = getQuoteCardExportResolution(true, cardWidth, cardHeight);

    assert.equal(res.width, 1080);
    assert.equal(res.height, Math.round(1080 * (cardHeight / cardWidth)));
    assert.equal(res.isHighResolution, true);
    assert.equal(res.quality, 1.0);

    const previewRatio = cardHeight / cardWidth;
    const exportRatio = res.height / res.width;
    assert.ok(Math.abs(previewRatio - exportRatio) < 0.005);
  });

  await t.test('generates valid deep links when bookId is available', () => {
    assert.equal(buildQuoteCardDeepLink('gutenberg-1342'), 'lamplight://book/gutenberg-1342');
    assert.equal(buildQuoteCardDeepLink('quran-2-255'), 'lamplight://book/quran-2-255');
    assert.equal(buildQuoteCardDeepLink(undefined), undefined);
  });
});
