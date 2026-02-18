/**
 * Centralized activity color mapping.
 * 
 * Provides consistent, deterministic colors for activities across all pages
 * and all days. Colors are assigned based on activity ID (not name or order),
 * so the same activity always gets the same color.
 */

// Curated palette of 20 visually distinct colors
export const ACTIVITY_PALETTE = [
    '#10b981', // emerald
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#14b8a6', // teal
    '#a855f7', // purple
    '#e879f9', // fuchsia
    '#22d3ee', // sky
    '#facc15', // yellow
    '#fb923c', // light orange
    '#4ade80', // light green
    '#818cf8', // indigo
    '#f472b6', // light pink
    '#2dd4bf', // mint
    '#c084fc', // light purple
];

/**
 * Fixed color overrides by activity name (case-insensitive).
 * Activities matching these names will always get the specified color,
 * regardless of their ID or hash.
 */
const NAME_COLOR_OVERRIDES = {
    'tidur': '#ef4444',          // red
    'tidur siang': '#ef4444',    // red
    'tidur malam': '#ef4444',    // red
};

/** Color for idle/no-activity gaps */
export const IDLE_COLOR = '#4b5563'; // gray-600

/**
 * Deterministic hash function for a string → palette index.
 * Uses djb2 algorithm for good distribution.
 */
function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Check if an activity name has a fixed color override.
 * @param {string} name - Activity name
 * @returns {string|null} Override color or null
 */
function getNameOverride(name) {
    if (!name) return null;
    const lower = name.toLowerCase().trim().replace(/\s*\(lanjutan\)$/, '');
    return NAME_COLOR_OVERRIDES[lower] || null;
}

/**
 * Get a consistent color for an activity by its ID and/or name.
 * If the activity name matches a fixed override, that color is used.
 * Otherwise, the color is determined by hashing the ID.
 * 
 * @param {string} activityId - The activity ID (e.g., 'subuh', 'custom_1', etc.)
 * @param {string} [activityName] - Optional activity name for override matching
 * @returns {string} A hex color string
 */
export function getActivityColor(activityId, activityName) {
    // Check name override first
    const override = getNameOverride(activityName);
    if (override) return override;

    if (!activityId) return '#6b7280'; // fallback gray
    // Strip __spillover suffix so spillover activities get the same color as their parent
    const baseId = String(activityId).replace('__spillover', '');
    const index = hashString(baseId) % ACTIVITY_PALETTE.length;
    return ACTIVITY_PALETTE[index];
}

/**
 * Build a color map for a list of activity IDs, resolving hash collisions.
 * Use this when you need unique colors for a set of activities displayed together.
 * 
 * Activities are first assigned their deterministic hash color.
 * If two activities hash to the same color, the second one gets bumped
 * to the next available color. This ensures no two activities in the same
 * view share a color (up to palette size).
 * 
 * @param {string[]} activityIds - Array of activity IDs
 * @returns {Object} Map of activityId → color
 */
export function buildActivityColorMap(activityIds, activityNames = {}) {
    const colorMap = {};
    const usedIndices = new Set();

    activityIds.forEach(id => {
        // Check name override first
        const name = activityNames[id];
        const override = getNameOverride(name);
        if (override) {
            colorMap[id] = override;
            return;
        }

        let index = hashString(String(id).replace('__spillover', '')) % ACTIVITY_PALETTE.length;

        // Resolve collisions: find next unused index
        let tries = 0;
        while (usedIndices.has(index) && tries < ACTIVITY_PALETTE.length) {
            index = (index + 1) % ACTIVITY_PALETTE.length;
            tries++;
        }

        usedIndices.add(index);
        colorMap[id] = ACTIVITY_PALETTE[index];
    });

    return colorMap;
}

/**
 * Build a color map keyed by activity name (for charts that group by name).
 * Same logic as buildActivityColorMap but uses names as keys.
 * 
 * @param {Array<{id: string, name: string}>} activities - Activity objects with id and name
 * @returns {Object} Map of activityName → color
 */
export function buildNameColorMap(activities) {
    const colorMap = {};
    const usedIndices = new Set();

    activities.forEach(act => {
        const id = (act.id || act.name).replace('__spillover', '');
        let index = hashString(String(id)) % ACTIVITY_PALETTE.length;

        // Resolve collisions
        let tries = 0;
        while (usedIndices.has(index) && tries < ACTIVITY_PALETTE.length) {
            index = (index + 1) % ACTIVITY_PALETTE.length;
            tries++;
        }

        usedIndices.add(index);
        colorMap[act.name] = ACTIVITY_PALETTE[index];
    });

    return colorMap;
}
