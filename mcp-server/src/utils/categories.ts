// ============================================================================
// Procrastination Shame Engine - Activity Categorization Utilities
// ============================================================================

import { ActivityCategory } from "../types.js";

/** Well-known productive domains & apps */
const PRODUCTIVE_PATTERNS: RegExp[] = [
  /github\.com/i,
  /gitlab\.com/i,
  /bitbucket\.org/i,
  /stackoverflow\.com/i,
  /docs\.google\.com/i,
  /notion\.so/i,
  /linear\.app/i,
  /jira/i,
  /confluence/i,
  /figma\.com/i,
  /vercel\.com/i,
  /netlify\.com/i,
  /aws\.amazon\.com/i,
  /console\.cloud\.google/i,
  /portal\.azure\.com/i,
  /localhost/i,
  /127\.0\.0\.1/i,
  /slack\.com/i,
  /teams\.microsoft\.com/i,
];

const PRODUCTIVE_APPS: RegExp[] = [
  /vscode|vs code|visual studio/i,
  /intellij|webstorm|pycharm/i,
  /terminal|iterm|warp|kitty/i,
  /sublime text/i,
  /vim|neovim/i,
  /docker/i,
  /postman|insomnia/i,
  /xcode/i,
  /android studio/i,
];

/** Questionable - could be productive, probably not */
const QUESTIONABLE_PATTERNS: RegExp[] = [
  /reddit\.com/i,
  /twitter\.com|x\.com/i,
  /news\.ycombinator\.com/i,
  /medium\.com/i,
  /dev\.to/i,
  /hashnode/i,
  /quora\.com/i,
  /linkedin\.com/i,
  /discord\.com/i,
  /producthunt\.com/i,
];

/** Productive-adjacent - learning/research */
const PRODUCTIVE_ADJACENT_PATTERNS: RegExp[] = [
  /udemy\.com/i,
  /coursera\.org/i,
  /pluralsight\.com/i,
  /egghead\.io/i,
  /frontendmasters\.com/i,
  /freecodecamp\.org/i,
  /mdn|developer\.mozilla/i,
  /w3schools\.com/i,
  /arxiv\.org/i,
  /wikipedia\.org/i,
  /docs\./i,
  /documentation/i,
  /tutorial/i,
  /learn/i,
];

/** Blatant procrastination */
const PROCRASTINATION_PATTERNS: RegExp[] = [
  /youtube\.com/i,
  /netflix\.com/i,
  /twitch\.tv/i,
  /tiktok\.com/i,
  /instagram\.com/i,
  /facebook\.com/i,
  /amazon\.com(?!.*aws)/i,
  /ebay\.com/i,
  /etsy\.com/i,
  /pinterest\.com/i,
  /9gag\.com/i,
  /buzzfeed\.com/i,
  /imgur\.com/i,
  /tumblr\.com/i,
  /spotify\.com/i,
  /steam/i,
  /gaming/i,
  /miniclip/i,
  /coolmath/i,
  /wordle/i,
];

const PROCRASTINATION_APPS: RegExp[] = [
  /spotify/i,
  /netflix/i,
  /youtube/i,
  /discord/i,
  /steam/i,
  /epic games/i,
  /minecraft/i,
  /photobooth/i,
];

/**
 * Categorize a URL or application name into an activity category
 */
export function categorizeActivity(input: string): ActivityCategory {
  // Check blatant procrastination first (highest priority)
  for (const pattern of PROCRASTINATION_PATTERNS) {
    if (pattern.test(input)) return ActivityCategory.BLATANT_PROCRASTINATION;
  }
  for (const pattern of PROCRASTINATION_APPS) {
    if (pattern.test(input)) return ActivityCategory.BLATANT_PROCRASTINATION;
  }

  // Check productive patterns
  for (const pattern of PRODUCTIVE_PATTERNS) {
    if (pattern.test(input)) return ActivityCategory.PRODUCTIVE;
  }
  for (const pattern of PRODUCTIVE_APPS) {
    if (pattern.test(input)) return ActivityCategory.PRODUCTIVE;
  }

  // Check productive-adjacent
  for (const pattern of PRODUCTIVE_ADJACENT_PATTERNS) {
    if (pattern.test(input)) return ActivityCategory.PRODUCTIVE_ADJACENT;
  }

  // Check questionable
  for (const pattern of QUESTIONABLE_PATTERNS) {
    if (pattern.test(input)) return ActivityCategory.QUESTIONABLE;
  }

  // Default to questionable for unknown activities
  return ActivityCategory.QUESTIONABLE;
}

/**
 * Get a snarky description for the activity category
 */
export function getCategorySnarkyLabel(category: ActivityCategory): string {
  switch (category) {
    case ActivityCategory.PRODUCTIVE:
      return "Actually working (suspicious 🤔)";
    case ActivityCategory.PRODUCTIVE_ADJACENT:
      return "\"Research\" (sure, buddy)";
    case ActivityCategory.QUESTIONABLE:
      return "Hmm, debatable... 🧐";
    case ActivityCategory.BLATANT_PROCRASTINATION:
      return "Caught red-handed! 🚨";
  }
}

/**
 * Get category weight for score calculation (0 = productive, 1 = pure procrastination)
 */
export function getCategoryWeight(category: ActivityCategory): number {
  switch (category) {
    case ActivityCategory.PRODUCTIVE:
      return 0.0;
    case ActivityCategory.PRODUCTIVE_ADJACENT:
      return 0.2;
    case ActivityCategory.QUESTIONABLE:
      return 0.6;
    case ActivityCategory.BLATANT_PROCRASTINATION:
      return 1.0;
  }
}

/**
 * Get a color hex code for the category
 */
export function getCategoryColor(category: ActivityCategory): string {
  switch (category) {
    case ActivityCategory.PRODUCTIVE:
      return "#22c55e"; // green
    case ActivityCategory.PRODUCTIVE_ADJACENT:
      return "#84cc16"; // lime
    case ActivityCategory.QUESTIONABLE:
      return "#f59e0b"; // amber
    case ActivityCategory.BLATANT_PROCRASTINATION:
      return "#ef4444"; // red
  }
}
