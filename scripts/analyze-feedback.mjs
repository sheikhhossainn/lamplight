#!/usr/bin/env node

/**
 * Feedback & Rating Analysis Tool for Lamplight
 * 
 * Fetches user reviews, ratings, bug reports, and feature ideas from Supabase,
 * computes CSAT, rating distribution, trend tags, device diagnostics, and
 * prints a rich terminal summary report.
 * 
 * Usage:
 *   node scripts/analyze-feedback.mjs
 *   node scripts/analyze-feedback.mjs --category=bug
 *   node scripts/analyze-feedback.mjs --limit=20
 *   node scripts/analyze-feedback.mjs --json
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

// 1. Environment Variable Loading (.env / .env.local fallback)
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const rootDir = process.cwd();
loadEnvFile(path.join(rootDir, '.env.local'));
loadEnvFile(path.join(rootDir, '.env'));

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\x1b[31m[Error]\x1b[0m Missing Supabase credentials.');
  console.error('Please ensure SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) are set in .env or your environment.');
  process.exit(1);
}

// 2. Parse CLI flags
const args = process.argv.slice(2);
const options = {
  json: args.includes('--json'),
  limit: 15,
  category: null,
  bookId: null,
};

for (const arg of args) {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1], 10) || 15;
  } else if (arg.startsWith('--category=')) {
    options.category = arg.split('=')[1].toLowerCase();
  } else if (arg.startsWith('--book=')) {
    options.bookId = arg.split('=')[1];
  }
}

// 3. Setup client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ANSI formatting helpers
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const AMBER = '\x1b[38;2;245;166;35m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const GRAY = '\x1b[90m';

function renderBar(ratio, width = 24) {
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return `${AMBER}${'█'.repeat(filled)}${GRAY}${'░'.repeat(empty)}${RESET}`;
}

async function run() {
  let query = supabase
    .from('feedback')
    .select('id, owner_id, rating, category, target_type, target_id, message, tags, client_metadata, status, created_at')
    .order('created_at', { ascending: false });

  if (options.category) {
    query = query.eq('category', options.category);
  }
  if (options.bookId) {
    query = query.eq('target_id', options.bookId);
  }

  const { data: feedbackList, error } = await query;

  if (error) {
    console.error(`${RED}[Error fetching feedback]${RESET}`, error.message);
    process.exit(1);
  }

  const rows = feedbackList || [];

  // Metrics computation
  const total = rows.length;
  const withRating = rows.filter((r) => typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5);
  const totalRatings = withRating.length;
  const avgRating = totalRatings > 0
    ? (withRating.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(2)
    : 'N/A';

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of withRating) {
    ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
  }

  const categoryCounts = { general: 0, bug: 0, feature: 0, translation: 0 };
  const tagCounts = {};
  const platformCounts = {};
  const bookRatings = {};

  for (const r of rows) {
    const cat = r.category || 'general';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Tags
    if (Array.isArray(r.tags)) {
      for (const t of r.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    // Platform
    const meta = r.client_metadata;
    if (meta && typeof meta === 'object') {
      const p = meta.platform || 'unknown';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }

    // Book-level
    if (r.target_type === 'book' && r.target_id) {
      if (!bookRatings[r.target_id]) {
        bookRatings[r.target_id] = { count: 0, ratingSum: 0, ratingsCount: 0 };
      }
      bookRatings[r.target_id].count += 1;
      if (typeof r.rating === 'number') {
        bookRatings[r.target_id].ratingSum += r.rating;
        bookRatings[r.target_id].ratingsCount += 1;
      }
    }
  }

  // Sorted tag frequencies
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          summary: {
            totalSubmissions: total,
            totalRatings,
            averageRating: avgRating === 'N/A' ? null : parseFloat(avgRating),
            ratingDistribution: ratingCounts,
            categoryDistribution: categoryCounts,
            topTags: sortedTags.map(([tag, count]) => ({ tag, count })),
            platforms: platformCounts,
            bookRatings,
          },
          recentFeedback: rows.slice(0, options.limit),
        },
        null,
        2
      )
    );
    return;
  }

  // CLI Dashboard Output
  console.log('\n' + AMBER + BOLD + '  ═══════════════════════════════════════════════════════════════' + RESET);
  console.log(AMBER + BOLD + '            LAMPLIGHT · READER FEEDBACK & REVIEWS' + RESET);
  console.log(AMBER + BOLD + '  ═══════════════════════════════════════════════════════════════' + RESET + '\n');

  console.log(`  ${BOLD}Total Submissions:${RESET}  ${CYAN}${total}${RESET}`);
  console.log(`  ${BOLD}Average Rating:${RESET}     ${AMBER}${BOLD}${avgRating}${RESET} ${totalRatings > 0 ? `(${totalRatings} ratings)` : '(no ratings yet)'}`);

  // Rating Distribution Bar Chart
  console.log('\n  ' + BOLD + '★ Rating Distribution' + RESET);
  for (let stars = 5; stars >= 1; stars--) {
    const cnt = ratingCounts[stars] || 0;
    const pct = totalRatings > 0 ? cnt / totalRatings : 0;
    const pctFormatted = `${Math.round(pct * 100)}%`.padStart(4, ' ');
    const bar = renderBar(pct, 20);
    console.log(`    ${stars} ★  ${bar}  ${pctFormatted}  ${DIM}(${cnt})${RESET}`);
  }

  // Category Breakdown
  console.log('\n  ' + BOLD + 'Categories' + RESET);
  const catKeys = [
    { key: 'general', label: 'General Thoughts' },
    { key: 'feature', label: 'Ideas & Requests' },
    { key: 'bug', label: 'Bug Reports' },
    { key: 'translation', label: 'Translation Notes' },
  ];
  for (const { key, label } of catKeys) {
    const count = categoryCounts[key] || 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    console.log(`    ${label.padEnd(20, ' ')} : ${BOLD}${count}${RESET} ${DIM}(${pct}%)${RESET}`);
  }

  // Top Tags
  if (sortedTags.length > 0) {
    console.log('\n  ' + BOLD + 'Top Highlighted Tags' + RESET);
    for (const [tag, count] of sortedTags) {
      console.log(`    • ${tag.padEnd(24, ' ')} : ${CYAN}${count}${RESET}`);
    }
  }

  // Platform Breakdown
  if (Object.keys(platformCounts).length > 0) {
    console.log('\n  ' + BOLD + 'Platforms' + RESET);
    for (const [p, c] of Object.entries(platformCounts)) {
      console.log(`    • ${p.toUpperCase().padEnd(10, ' ')} : ${c}`);
    }
  }

  // Book-level summary
  const bookEntries = Object.entries(bookRatings);
  if (bookEntries.length > 0) {
    console.log('\n  ' + BOLD + 'Book-Level Reviews' + RESET);
    console.log(`    ${'Book ID'.padEnd(28, ' ')} | Reviews | Avg Rating`);
    console.log(`    ${'-'.repeat(28)}-+---------+-----------`);
    for (const [bId, stats] of bookEntries) {
      const avg = stats.ratingsCount > 0 ? (stats.ratingSum / stats.ratingsCount).toFixed(1) : '—';
      console.log(`    ${bId.slice(0, 26).padEnd(28, ' ')} | ${String(stats.count).padStart(7, ' ')} | ${AMBER}${avg} ★${RESET}`);
    }
  }

  // Recent Feedback Items
  const recentSlice = rows.slice(0, options.limit);
  console.log('\n  ' + BOLD + `Recent Submissions (Showing ${recentSlice.length} of ${total})` + RESET);
  console.log('  ' + '─'.repeat(63));

  if (recentSlice.length === 0) {
    console.log(`    ${DIM}No submissions recorded yet.${RESET}\n`);
  } else {
    for (const item of recentSlice) {
      const dateStr = item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown date';
      const ratingStr = item.rating ? `${AMBER}${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}${RESET}` : `${DIM}No rating${RESET}`;
      const catBadge = `[${item.category.toUpperCase()}]`;
      const targetStr = item.target_type === 'book' ? `(Book: ${item.target_id || 'unknown'})` : '';

      console.log(`\n    ${BOLD}${catBadge}${RESET} ${ratingStr}  ${DIM}${dateStr}${RESET} ${targetStr}`);
      if (item.tags && item.tags.length > 0) {
        console.log(`    ${CYAN}Tags:${RESET} ${item.tags.join(', ')}`);
      }
      if (item.message) {
        console.log(`    ${GREEN}"${item.message}"${RESET}`);
      }
      if (item.client_metadata) {
        const { platform, app_version, os_version, target_language } = item.client_metadata;
        console.log(`    ${DIM}Device: ${platform || 'unknown'} ${os_version || ''} · App v${app_version || '1.0.0'} · Lang: ${target_language || 'bn'}${RESET}`);
      }
    }
    console.log('\n  ' + '─'.repeat(63) + '\n');
  }
}

run().catch((err) => {
  console.error(RED + '[Fatal Error]' + RESET, err);
  process.exit(1);
});
