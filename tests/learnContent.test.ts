import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  loadCoursePackage,
  getCourseManifest,
  getCourseLesson,
  getCourseItemById,
} from '../src/features/learn/content';
import { validateCourse } from '../src/features/learn/validator';
import type { CourseManifest } from '../src/features/learn/types';

describe('Learn course content model & validation', () => {
  it('loads the bundled Japanese for Bangla speakers course package', () => {
    const pkg = loadCoursePackage('ja', 'bn');
    assert.ok(pkg, 'Expected course package to load');
    assert.equal(pkg.manifest.targetLang, 'ja');
    assert.ok(pkg.manifest.units.length >= 3);
    assert.ok(pkg.items.length > 0);
    assert.ok(pkg.sentences.length > 0);
    assert.ok(Object.keys(pkg.strings.meanings).length > 0);
  });

  it('validates bundled course with 0 integrity errors', () => {
    const pkg = loadCoursePackage('ja', 'bn');
    assert.ok(pkg);

    const result = validateCourse(
      pkg.manifest,
      pkg.items,
      pkg.sentences,
      pkg.strings,
    );

    if (!result.valid) {
      console.error('Validation errors:', result.errors);
    }
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('retrieves specific lesson and its unit by ID', () => {
    const found = getCourseLesson('ja', 'ja-u1-l1');
    assert.ok(found);
    assert.equal(found.lesson.title, 'Vowels: a, i, u, e, o');
    assert.equal(found.unit.number, 1);
  });

  it('retrieves course item by ID', () => {
    const neko = getCourseItemById('ja', 'word:neko');
    assert.ok(neko);
    assert.equal(neko.kind, 'word');
    if (neko.kind === 'word') {
      assert.equal(neko.text, 'ねこ');
      assert.equal(neko.roman, 'neko');
    }
  });

  it('validator flags missing items and translations', () => {
    const brokenManifest: CourseManifest = {
      targetLang: 'ja',
      title: 'Broken Course',
      units: [
        {
          id: 'u1',
          number: 1,
          title: 'Unit 1',
          lessons: [
            {
              id: 'l1',
              title: 'Lesson 1',
              type: 'vocab',
              itemIds: ['word:ghost'], // Non-existent item
            },
          ],
        },
      ],
    };

    const result = validateCourse(brokenManifest, [], [], {
      meanings: {},
      explanations: {},
      ui: {},
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('non-existent itemId')));
  });

  it('validator flags kanji without reading in sentences', () => {
    const pkg = loadCoursePackage('ja', 'bn')!;
    const brokenSentences = [
      {
        id: 's-bad',
        unit: 3,
        tokens: [
          { text: '猫', itemId: 'word:neko' }, // Kanji without reading field!
        ],
      },
    ];

    const result = validateCourse(
      pkg.manifest,
      pkg.items,
      brokenSentences,
      pkg.strings,
    );

    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('contains kanji but has no reading')));
  });
});
