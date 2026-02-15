// ============================================================================
// Procrastination Shame Engine - Escalating Message Generator
// Generates shame messages that escalate based on procrastination score
// ============================================================================

import { ShameLevel, type ShameMessage, type ProcrastinationScore, type TrackedTask, type UserActivity, ActivityCategory } from "../types.js";
import { getShameLevelEmoji, randomChoice, formatWastedTime, formatDuration } from "../utils/helpers.js";

/** Message templates for each shame level */
const MESSAGE_TEMPLATES: Record<ShameLevel, string[]> = {
  [ShameLevel.GENTLE_NUDGE]: [
    "Hey, just a friendly reminder about that deadline... 😊",
    "You've got this! Maybe time to focus?",
    "Psst... your task list is feeling a little lonely.",
    "Just a gentle tap on the shoulder - how's that task going?",
    "Remember that thing you said you'd do? Still waiting... no pressure though!",
    "Your future self would really appreciate some productivity right about now.",
    "Not to interrupt, but... you DID have plans to be productive, right?",
    "Quick check-in! How's the work going? (Please say it's going well.)",
  ],
  [ShameLevel.PASSIVE_AGGRESSIVE]: [
    "Interesting choice spending {time} on {activity} instead of the {task}...",
    "I'm sure that {activity} session was very educational. 🙄",
    "Oh, you're still on {activity}? I thought that was just a 'quick break.'",
    "No judgement, but {activity} doesn't seem to be on your task list. Just saying.",
    "Your task was due {due}. But sure, {activity} looks important too.",
    "I notice you've been 'researching' on {activity} for {time}. Must be a deep topic.",
    "Cool, cool, cool. Just casually watching your deadline approach while you're on {activity}.",
    "That's a bold strategy, Cotton. Let's see if {activity} instead of working pays off.",
  ],
  [ShameLevel.DIRECT_CALLOUT]: [
    "You're literally scrolling {activity} while your deadline is in {due}.",
    "At this rate, you'll finish that task sometime next quarter.",
    "Let me get this straight: {task} is due in {due}, and you're on {activity}? Really?",
    "I've been watching you procrastinate for {time}. It's... impressive, actually.",
    "Your task list is crying. I can hear it from here.",
    "BREAKING NEWS: Local developer discovers {activity} while deadline burns.",
    "Plot twist: the work isn't going to do itself. I checked.",
    "You've context-switched {switches} times in the last hour. That's not multitasking, that's panic.",
  ],
  [ShameLevel.AGGRESSIVE_SHAME]: [
    "STOP. Just stop. Close {activity}. Do the thing. NOW.",
    "Your future self is screaming. LISTEN TO THEM.",
    "You have {tasks} overdue tasks and you're on {activity}. What is wrong with you?!",
    "I'm not angry, I'm disappointed. Actually no, I'm angry too. GET TO WORK.",
    "The deadline was {due}. THE DEADLINE. WAS. {due}.",
    "Every second you spend on {activity} is a second your career dies a little.",
    "Your procrastination score is {score}. That's not a high score you want.",
    "If procrastination was an Olympic sport, you'd have the gold. But it's NOT. WORK.",
  ],
  [ShameLevel.NUCLEAR_OPTION]: [
    "☢️ NUCLEAR OPTION ACTIVATED. Preparing mom email in 5 minutes unless you START WORKING.",
    "☢️ I'm posting your procrastination stats to team Discord. You have 60 seconds.",
    "☢️ DEFCON 1. Score: {score}/100. Mom email: ARMED. Discord shame: IMMINENT.",
    "☢️ This is your FINAL warning. {task} is due in {due}. Mom gets an email in 5 min.",
    "☢️ I have composed a detailed email to your mother about your {time} on {activity}. Send in 5 min.",
    "☢️ YOUR PROCRASTINATION SCORE HIT {score}. The shame protocols have been activated.",
    "☢️ SHAME LEVEL: MAXIMUM. All channels will be notified. Your legacy of laziness ends NOW.",
    "☢️ I have screenshots. I have timestamps. I have your mom's email. Choose wisely.",
  ],
};

/** Positive reinforcement messages */
const POSITIVE_MESSAGES = [
  "🎉 Incredible! You completed a task! The legends were true - you CAN actually work!",
  "⭐ Look at you being all productive! Who IS this person?!",
  "🏆 Task done! Your procrastination score just dropped. Keep it up!",
  "🔥 Focus streak activated! You're on fire (the good kind)!",
  "💪 Another task crushed. Your future self just sent a thank you card.",
  "🌟 Wait, is that... PRODUCTIVITY?! I thought I'd never see the day!",
  "🎯 Direct hit on that task! Your score is actually going DOWN for once!",
  "🦸 The hero we didn't think we had. Task completed. Respect.",
  "✅ Task complete! See? That wasn't so hard. (Don't let it go to your head.)",
  "🎊 REDEMPTION ARC! From procrastinator to producer. Beautiful.",
];

/** Focus streak messages */
const STREAK_MESSAGES = [
  "🔥 {minutes} minutes of focus! Don't you dare touch that phone.",
  "⚡ {minutes} minute focus streak! This is the longest I've seen you work!",
  "💎 {minutes} minutes! You're in the zone. I'll keep quiet... for now.",
  "🏄 Riding the productivity wave! {minutes} minutes and counting!",
  "🎵 {minutes} minutes of pure flow. *chef's kiss*",
];

/**
 * Generate an appropriate shame message based on current score and context
 */
export function generateShameMessage(
  score: ProcrastinationScore,
  tasks: TrackedTask[],
  activities: UserActivity[],
  contextSwitches: number = 0
): ShameMessage {
  const templates = MESSAGE_TEMPLATES[score.shameLevel];
  let template = randomChoice(templates);

  // Fill in template variables
  template = fillTemplate(template, score, tasks, activities, contextSwitches);

  return {
    level: score.shameLevel,
    message: template,
    emoji: getShameLevelEmoji(score.shameLevel),
    action: determineAction(score.shameLevel),
    urgency: determineUrgency(score.shameLevel),
    generatedAt: new Date(),
  };
}

/** Generate a positive reinforcement message */
export function generatePositiveMessage(context?: string): ShameMessage {
  const message = context
    ? `${randomChoice(POSITIVE_MESSAGES)} (${context})`
    : randomChoice(POSITIVE_MESSAGES);

  return {
    level: ShameLevel.GENTLE_NUDGE,
    message,
    emoji: "🎉",
    action: "dashboard_update",
    urgency: "low",
    generatedAt: new Date(),
  };
}

/** Generate a focus streak message */
export function generateStreakMessage(minutes: number): ShameMessage {
  const template = randomChoice(STREAK_MESSAGES);
  const message = template.replace(/\{minutes\}/g, String(Math.round(minutes)));

  return {
    level: ShameLevel.GENTLE_NUDGE,
    message,
    emoji: "🔥",
    action: "dashboard_update",
    urgency: "low",
    generatedAt: new Date(),
  };
}

/** Fill in template variables with real data */
function fillTemplate(
  template: string,
  score: ProcrastinationScore,
  tasks: TrackedTask[],
  activities: UserActivity[],
  contextSwitches: number
): string {
  // Find the most procrastinated-on activity
  const wastedActivities = activities
    .filter((a) => a.category === ActivityCategory.BLATANT_PROCRASTINATION || a.category === ActivityCategory.QUESTIONABLE)
    .sort((a, b) => b.durationMinutes - a.durationMinutes);

  const topWaste = wastedActivities[0];
  const totalWastedMinutes = wastedActivities.reduce((s, a) => s + a.durationMinutes, 0);

  // Find the most urgent overdue task
  const overdueTasks = tasks
    .filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== "done")
    .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));

  const urgentTask = overdueTasks[0] || tasks.find((t) => t.status !== "done");

  // Find nearest deadline
  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.dueDate > new Date() && t.status !== "done")
    .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));

  const nearestDeadline = upcomingDeadlines[0];

  // Calculate time until deadline
  let dueText = "soon";
  if (nearestDeadline?.dueDate) {
    const hoursUntil = (nearestDeadline.dueDate.getTime() - Date.now()) / 3600000;
    if (hoursUntil < 0) dueText = `${Math.abs(Math.round(hoursUntil))} hours AGO`;
    else if (hoursUntil < 1) dueText = `${Math.round(hoursUntil * 60)} minutes`;
    else if (hoursUntil < 24) dueText = `${Math.round(hoursUntil)} hours`;
    else dueText = `${Math.round(hoursUntil / 24)} days`;
  } else if (overdueTasks.length > 0 && overdueTasks[0].dueDate) {
    const hoursAgo = (Date.now() - overdueTasks[0].dueDate.getTime()) / 3600000;
    dueText = `${Math.round(hoursAgo)} hours AGO`;
  }

  return template
    .replace(/\{activity\}/g, topWaste?.title || "the internet")
    .replace(/\{time\}/g, formatWastedTime(totalWastedMinutes || 30))
    .replace(/\{task\}/g, urgentTask?.title || "your work")
    .replace(/\{due\}/g, dueText)
    .replace(/\{tasks\}/g, String(overdueTasks.length || tasks.filter((t) => t.status !== "done").length))
    .replace(/\{score\}/g, String(score.score))
    .replace(/\{switches\}/g, String(contextSwitches))
    .replace(/\{duration\}/g, formatDuration(totalWastedMinutes));
}

/** Determine what action to take based on shame level */
function determineAction(level: ShameLevel): ShameMessage["action"] {
  switch (level) {
    case ShameLevel.GENTLE_NUDGE:
      return "dashboard_update";
    case ShameLevel.PASSIVE_AGGRESSIVE:
      return "desktop_notification";
    case ShameLevel.DIRECT_CALLOUT:
      return "discord_post";
    case ShameLevel.AGGRESSIVE_SHAME:
      return "discord_post";
    case ShameLevel.NUCLEAR_OPTION:
      return "mom_email";
  }
}

/** Determine urgency level */
function determineUrgency(level: ShameLevel): ShameMessage["urgency"] {
  switch (level) {
    case ShameLevel.GENTLE_NUDGE:
      return "low";
    case ShameLevel.PASSIVE_AGGRESSIVE:
      return "medium";
    case ShameLevel.DIRECT_CALLOUT:
      return "high";
    case ShameLevel.AGGRESSIVE_SHAME:
      return "critical";
    case ShameLevel.NUCLEAR_OPTION:
      return "nuclear";
  }
}

/**
 * Generate a "redemption arc" narrative when user recovers from procrastination
 */
export function generateRedemptionArc(
  previousScore: number,
  currentScore: number,
  tasksCompleted: number
): string {
  const drop = previousScore - currentScore;

  if (drop >= 50) {
    return `🦸 EPIC REDEMPTION ARC: Score dropped ${drop} points! From ${previousScore} to ${currentScore}! ${tasksCompleted} tasks crushed! The comeback of the century!`;
  } else if (drop >= 30) {
    return `⭐ REDEMPTION ARC: Score dropped ${drop} points! Going from ${previousScore} to ${currentScore}. ${tasksCompleted} tasks done. The prodigal worker returns!`;
  } else if (drop >= 15) {
    return `📈 Mini redemption: Score improved by ${drop} points. ${tasksCompleted} tasks completed. Baby steps, but we'll take it.`;
  }

  return `🌱 Small improvement detected. Score: ${currentScore}. Keep going, don't stop now!`;
}

/**
 * Generate an AI-style creative excuse for procrastination (for humor)
 */
export function generateCreativeExcuse(): string {
  const excuses = [
    "I was doing competitive research on how competitors procrastinate.",
    "The YouTube algorithm was showing me content that could be tangentially related to work.",
    "I was testing my ability to context-switch rapidly. It's a skill!",
    "Reddit's r/programming was practically a standup meeting.",
    "I was letting my subconscious solve the problem while I browsed Twitter.",
    "I was waiting for the code to compile. (There is no code to compile.)",
    "I was in a deep-work preparation phase. Very deep. Like, Mariana Trench deep.",
    "I was stress-testing my ability to work under extreme deadline pressure.",
    "The memes were too good. You can't blame me for algorithmic excellence.",
    "I was building mental models. On Reddit. About cats.",
    "My rubber duck told me to take a break. I don't question the duck.",
    "I was practicing mindful avoidance - it's a legitimate technique I just invented.",
  ];

  return randomChoice(excuses);
}
