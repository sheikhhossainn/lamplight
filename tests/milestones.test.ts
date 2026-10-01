import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MILESTONES,
  evaluateMilestoneTrigger,
  evaluateReadingStatsMilestonesPure,
  type MilestoneType,
} from '../src/features/milestones/milestoneService';

describe('RET-04 Milestones and account protection', () => {
  it('defines all six required milestones with correct properties', () => {
    const requiredMilestones: MilestoneType[] = [
      'first_saved_word',
      'first_imported_book',
      'first_completed_review',
      'first_completed_book',
      'seven_reading_days',
      'first_thirty_reading_minutes',
    ];

    for (const type of requiredMilestones) {
      const config = MILESTONES[type];
      assert.ok(config, `Milestone ${type} must be defined`);
      assert.equal(config.type, type);
      assert.ok(config.title.length > 0);
      assert.ok(config.description.length > 0);
      assert.ok(config.icon.length > 0);
    }
  });

  it('marks ownership milestones that should prompt account protection', () => {
    assert.equal(MILESTONES.first_saved_word.isOwnershipMilestone, true);
    assert.equal(MILESTONES.first_imported_book.isOwnershipMilestone, true);
    assert.equal(MILESTONES.first_completed_book.isOwnershipMilestone, true);

    assert.equal(MILESTONES.first_completed_review.isOwnershipMilestone, false);
    assert.equal(MILESTONES.seven_reading_days.isOwnershipMilestone, false);
    assert.equal(MILESTONES.first_thirty_reading_minutes.isOwnershipMilestone, false);
  });

  it('marks milestones eligible for quiet store review feedback', () => {
    assert.equal(MILESTONES.first_completed_book.offersFeedbackPrompt, true);
    assert.equal(MILESTONES.seven_reading_days.offersFeedbackPrompt, true);

    assert.equal(MILESTONES.first_saved_word.offersFeedbackPrompt, false);
    assert.equal(MILESTONES.first_imported_book.offersFeedbackPrompt, false);
  });

  it('enforces idempotency and returns null if milestone was already achieved', () => {
    const fresh = evaluateMilestoneTrigger({
      candidateType: 'first_saved_word',
      alreadyAchieved: false,
    });
    assert.ok(fresh);
    assert.equal(fresh.type, 'first_saved_word');

    const already = evaluateMilestoneTrigger({
      candidateType: 'first_saved_word',
      alreadyAchieved: true,
    });
    assert.equal(already, null);
  });

  it('accurately evaluates stats milestones and respects previous achievements', () => {
    const achieved = new Set<MilestoneType>();

    // 15 minutes, 2 days: no stats milestone reached yet
    const step1 = evaluateReadingStatsMilestonesPure({
      cumulativeReadingMinutes: 15,
      distinctReadingDays: 2,
      isBookCompleted: false,
      achievedMilestones: achieved,
    });
    assert.equal(step1, null);

    // 35 minutes, 3 days: triggers 30 minutes milestone
    const step2 = evaluateReadingStatsMilestonesPure({
      cumulativeReadingMinutes: 35,
      distinctReadingDays: 3,
      isBookCompleted: false,
      achievedMilestones: achieved,
    });
    assert.ok(step2);
    assert.equal(step2.type, 'first_thirty_reading_minutes');

    // After recording 30 minutes milestone:
    achieved.add('first_thirty_reading_minutes');

    // Finishes a book: triggers book completion
    const step3 = evaluateReadingStatsMilestonesPure({
      cumulativeReadingMinutes: 45,
      distinctReadingDays: 4,
      isBookCompleted: true,
      achievedMilestones: achieved,
    });
    assert.ok(step3);
    assert.equal(step3.type, 'first_completed_book');

    achieved.add('first_completed_book');

    // 7 reading days: triggers seven days milestone
    const step4 = evaluateReadingStatsMilestonesPure({
      cumulativeReadingMinutes: 90,
      distinctReadingDays: 7,
      isBookCompleted: false,
      achievedMilestones: achieved,
    });
    assert.ok(step4);
    assert.equal(step4.type, 'seven_reading_days');

    achieved.add('seven_reading_days');

    // Further sessions with all achieved milestones returns null
    const step5 = evaluateReadingStatsMilestonesPure({
      cumulativeReadingMinutes: 120,
      distinctReadingDays: 8,
      isBookCompleted: true,
      achievedMilestones: achieved,
    });
    assert.equal(step5, null);
  });
});
