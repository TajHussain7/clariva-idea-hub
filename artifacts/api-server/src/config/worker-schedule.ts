/**
 * Worker Schedule Configuration
 * 
 * This file contains the schedule configuration for the challenge automation worker.
 * Modify these values to change when challenges are created and how often monitoring occurs.
 */

export const WORKER_SCHEDULE_CONFIG = {
  /**
   * Cron schedule for weekly challenge creation
   * Format: "minute hour day-of-month month day-of-week"
   * 
   * Current: "0 23 * * 1" = Every Monday at 11:00 PM
   * 
   * Examples:
   * - "0 9 * * 1"    = Every Monday at 9:00 AM
   * - "30 20 * * 5"  = Every Friday at 8:30 PM
   * - "0 12 * * 0"   = Every Sunday at 12:00 PM (noon)
   * - "15 14 * * 3"  = Every Wednesday at 2:15 PM
   * 
   * Cron syntax guide:
   * ┌────────── minute (0 - 59)
   * │ ┌──────── hour (0 - 23)
   * │ │ ┌────── day of month (1 - 31)
   * │ │ │ ┌──── month (1 - 12)
   * │ │ │ │ ┌── day of week (0 - 7, where 0 and 7 are Sunday)
   * │ │ │ │ │
   * * * * * *
   */
  challengeCreationSchedule: "0 23 * * 1",

  /**
   * Human-readable description of the schedule
   */
  scheduleDescription: "Every Monday at 11:00 PM",

  /**
   * Timezone for the cron schedule
   * 
   * Common timezones:
   * - "America/New_York"     (EST/EDT)
   * - "America/Chicago"      (CST/CDT)
   * - "America/Los_Angeles"  (PST/PDT)
   * - "America/Denver"       (MST/MDT)
   * - "Europe/London"        (GMT/BST)
   * - "Europe/Paris"         (CET/CEST)
   * - "Asia/Tokyo"           (JST)
   * - "Asia/Karachi"         (PKT - Pakistan Time)
   * - "UTC"                  (Coordinated Universal Time)
   * 
   * See full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   */
  timezone: "Asia/Karachi",

  /**
   * Monitoring interval in hours
   * This checks for:
   * - Challenge extensions (if no submissions within 24h of end)
   * - Winner calculations (when challenge expires)
   * 
   * Default: 1 hour
   * Recommended: 0.5 to 2 hours
   */
  monitoringIntervalHours: 1,

  /**
   * Challenge duration in days
   * How long each challenge runs from start to end
   * 
   * Default: 7 days (one week)
   */
  challengeDurationDays: 7,
} as const;

/**
 * Get the monitoring interval in milliseconds
 */
export function getMonitoringIntervalMs(): number {
  return WORKER_SCHEDULE_CONFIG.monitoringIntervalHours * 60 * 60 * 1000;
}

/**
 * Validate the cron schedule format
 */
export function validateCronSchedule(schedule: string): boolean {
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-7])|\*\/([0-7]))$/;
  return cronRegex.test(schedule);
}
