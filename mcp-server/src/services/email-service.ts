// ============================================================================
// Procrastination Shame Engine - Email Service (Mom Email Threat System)
// The nuclear option: email your mom about your procrastination habits
// ============================================================================

import nodemailer from "nodemailer";
import type { MomEmailConfig, ProcrastinationScore, ProductivityReport } from "../types.js";
import { formatDuration, progressBar } from "../utils/helpers.js";

/** Email sending state */
interface EmailState {
  warningsSent: number;
  lastWarningAt: Date | null;
  lastSentAt: Date | null;
  countdownActive: boolean;
  countdownStartedAt: Date | null;
  countdownMinutes: number;
}

const emailState: EmailState = {
  warningsSent: 0,
  lastWarningAt: null,
  lastSentAt: null,
  countdownActive: false,
  countdownStartedAt: null,
  countdownMinutes: 5,
};

/** Create email transporter */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Check if mom email should be triggered based on score
 */
export function checkMomEmailTrigger(
  config: MomEmailConfig,
  score: ProcrastinationScore
): { shouldWarn: boolean; shouldSend: boolean; minutesRemaining: number } {
  if (!config.enabled) {
    return { shouldWarn: false, shouldSend: false, minutesRemaining: 0 };
  }

  // Check cooldown
  if (emailState.lastSentAt) {
    const cooldownMs = config.cooldownMinutes * 60000;
    if (Date.now() - emailState.lastSentAt.getTime() < cooldownMs) {
      return { shouldWarn: false, shouldSend: false, minutesRemaining: 0 };
    }
  }

  // Check if countdown is active
  if (emailState.countdownActive && emailState.countdownStartedAt) {
    const elapsedMinutes = (Date.now() - emailState.countdownStartedAt.getTime()) / 60000;
    const remaining = emailState.countdownMinutes - elapsedMinutes;

    if (remaining <= 0) {
      return { shouldWarn: false, shouldSend: true, minutesRemaining: 0 };
    }

    // Score dropped below threshold? Cancel countdown!
    if (score.score < config.warningThreshold) {
      emailState.countdownActive = false;
      emailState.countdownStartedAt = null;
      return { shouldWarn: false, shouldSend: false, minutesRemaining: 0 };
    }

    return { shouldWarn: false, shouldSend: false, minutesRemaining: Math.ceil(remaining) };
  }

  // Check warning threshold
  if (score.score >= config.warningThreshold && score.score < config.sendThreshold) {
    return { shouldWarn: true, shouldSend: false, minutesRemaining: 0 };
  }

  // Check send threshold - start countdown
  if (score.score >= config.sendThreshold) {
    emailState.countdownActive = true;
    emailState.countdownStartedAt = new Date();
    return { shouldWarn: true, shouldSend: false, minutesRemaining: emailState.countdownMinutes };
  }

  return { shouldWarn: false, shouldSend: false, minutesRemaining: 0 };
}

/**
 * Send a warning notification (not the actual email - just a local warning)
 */
export function sendWarning(): string {
  emailState.warningsSent++;
  emailState.lastWarningAt = new Date();

  const warningMessages = [
    `⚠️ WARNING ${emailState.warningsSent}: Your procrastination score is approaching Mom Email territory...`,
    `⚠️ WARNING ${emailState.warningsSent}: I have your mom's email loaded. Don't test me.`,
    `⚠️ WARNING ${emailState.warningsSent}: The Mom Email is being drafted. You still have time.`,
    `⚠️ FINAL WARNING: Mom email is ARMED. Get to work or she'll know EVERYTHING.`,
  ];

  return warningMessages[Math.min(emailState.warningsSent - 1, warningMessages.length - 1)];
}

/**
 * Send the first warning email to mom
 */
export async function sendMomEmailWarning(
  config: MomEmailConfig,
  score: ProcrastinationScore
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">⚠️ Gentle Heads Up About ${config.userName}</h2>
        <p>Dear Parent,</p>
        <p>This is an automated message from the <strong>Procrastination Shame Engine</strong> — 
        a productivity tool that ${config.userName} voluntarily installed.</p>
        <p>${config.userName} seems to be having some trouble with time management today.</p>
        <div style="background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 15px 0;">
          <p><strong>Current Procrastination Score:</strong> ${score.score}/100</p>
          <p>This is a preliminary warning. We're sure ${config.userName} will get back on track!</p>
        </div>
        <p style="color: #666; font-size: 12px;">
          This email was sent because ${config.userName} set up the Procrastination Shame Engine 
          and provided your email as their accountability partner. They can disable this at any time 
          (after completing their tasks, of course 😊).
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "shame-engine@productivity.ai",
      to: config.momEmail,
      subject: `Gentle reminder about ${config.userName}'s time management`,
      html,
    });

    emailState.lastWarningAt = new Date();
    emailState.warningsSent++;
    return true;
  } catch (error) {
    console.error("Failed to send mom warning email:", error);
    return false;
  }
}

/**
 * Send the NUCLEAR mom email with full procrastination stats
 */
export async function sendMomEmailNuclear(
  config: MomEmailConfig,
  score: ProcrastinationScore,
  report: ProductivityReport
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const topActivities = report.topProcrastinationActivities
      .slice(0, 5)
      .map((a) => `<li><strong>${a.activity}</strong> — ${formatDuration(a.totalMinutes)} (${a.occurrences} times)</li>`)
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">🚨 Urgent: ${config.userName}'s Productivity Report</h2>
        <p>Dear Parent,</p>
        <p>We regret to inform you that ${config.userName}'s procrastination has reached 
        <strong style="color: #ef4444;">critical levels</strong>.</p>
        
        <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #dc2626;">📊 Current Statistics</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #fca5a5;"><strong>Procrastination Score</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #fca5a5; color: #dc2626; font-weight: bold;">${score.score}/100</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #fca5a5;"><strong>Tasks Completed Today</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #fca5a5;">${report.totalTasksCompleted}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #fca5a5;"><strong>Tasks Overdue</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #fca5a5; color: #dc2626;">${report.totalTasksOverdue}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #fca5a5;"><strong>Time Productive</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #fca5a5;">${formatDuration(report.totalMinutesProductive)}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Time Wasted</strong></td>
              <td style="padding: 8px; color: #dc2626; font-weight: bold;">${formatDuration(report.totalMinutesWasted)}</td>
            </tr>
          </table>
        </div>

        ${topActivities ? `
        <div style="background: #fff7ed; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #d97706;">🎯 What ${config.userName} Was Doing Instead of Working</h3>
          <ol>${topActivities}</ol>
        </div>
        ` : ""}

        <p>We believe in ${config.userName}'s potential. Sometimes they just need a gentle nudge... 
        or a concerned phone call from a loved one. 😊</p>
        
        <p style="color: #666; font-size: 12px;">
          This email was sent by the Procrastination Shame Engine because ${config.userName}'s 
          procrastination score exceeded ${config.sendThreshold}/100 for an extended period. 
          ${config.userName} willingly set this up and can disable it (after completing pending tasks).
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "shame-engine@productivity.ai",
      to: config.momEmail,
      subject: `🚨 I'm concerned about ${config.userName}'s work ethic`,
      html,
    });

    emailState.lastSentAt = new Date();
    emailState.countdownActive = false;
    emailState.countdownStartedAt = null;
    return true;
  } catch (error) {
    console.error("Failed to send nuclear mom email:", error);
    return false;
  }
}

/** Get current email state */
export function getEmailState(): EmailState {
  return { ...emailState };
}

/** Reset email countdown (user started working!) */
export function cancelMomCountdown(): string {
  emailState.countdownActive = false;
  emailState.countdownStartedAt = null;
  return "🎉 Mom email countdown CANCELLED! Good choice. Now keep working.";
}

/** Get mom email countdown status */
export function getMomCountdownStatus(config?: MomEmailConfig): {
  isActive: boolean;
  minutesRemaining: number;
  warningsSent: number;
} {
  if (!emailState.countdownActive || !emailState.countdownStartedAt) {
    return { isActive: false, minutesRemaining: 0, warningsSent: emailState.warningsSent };
  }

  const elapsedMinutes = (Date.now() - emailState.countdownStartedAt.getTime()) / 60000;
  const remaining = Math.max(0, emailState.countdownMinutes - elapsedMinutes);

  return {
    isActive: true,
    minutesRemaining: Math.ceil(remaining),
    warningsSent: emailState.warningsSent,
  };
}
