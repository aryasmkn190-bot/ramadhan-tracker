/**
 * Activity session counting helpers.
 * 
 * When an activity has multi-session data (end_time === '__multi__'),
 * each session is counted as a separate completion.
 * This applies across: homepage, rekap page, admin leaderboard.
 */

/**
 * Get the number of sessions for an activity data object.
 * For multi-session activities (endTime === '__multi__'), returns the number
 * of sessions in the JSON array. For single-session activities, returns 1.
 * 
 * Accepts either:
 *   - Client-side format: { startTime, endTime, completed }
 *   - Database format: { start_time, end_time, completed }
 * 
 * @param {Object} data - Activity data object
 * @returns {number} Number of sessions (minimum 1 if completed)
 */
export function getSessionCount(data) {
    if (!data) return 0;

    const endTime = data.endTime ?? data.end_time;
    const startTime = data.startTime ?? data.start_time;

    if (endTime === '__multi__' && startTime) {
        try {
            const sessions = JSON.parse(startTime);
            if (Array.isArray(sessions) && sessions.length > 0) {
                return sessions.length;
            }
        } catch {
            // fallback to 1
        }
    }

    return 1;
}
