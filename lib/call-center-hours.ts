// Call center operating hours configuration
// Times are in PST/MST as specified

export interface CallCenterHours {
  id: string;
  name: string;
  did?: string;
  startHour?: number; // 24-hour format (optional - some centers don't have hours)
  endHour?: number; // 24-hour format (optional - some centers don't have hours)
  timezone?: "PST" | "MST"; // Optional for centers without hours
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday (optional)
}

export const callCenterHours: CallCenterHours[] = [
  {
    id: "CC1",
    name: "CC1",
    did: "18334411529",
    startHour: 8,
    endHour: 21, // 9pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
  },
  {
    id: "CC2",
    name: "CC2",
    did: "18334362190",
    startHour: 8,
    endHour: 21, // 9pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
  },
  {
    id: "CC3",
    name: "CC3",
    did: "18334310623",
    // No operating hours configured
  },
  {
    id: "CC4",
    name: "CC4",
    did: "18334410032",
    // No operating hours configured
  },
  {
    id: "CC5",
    name: "CC5",
    did: "18334310301",
    // No operating hours configured
  },
  {
    id: "CC6",
    name: "CC6",
    did: "18334320783",
    // No operating hours configured
  },
  {
    id: "CC7",
    name: "CC7",
    did: "18334370501",
    startHour: 8,
    endHour: 16, // 4pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC8",
    name: "CC8",
    did: "18334411630",
    // No operating hours configured
  },
  {
    id: "CC9",
    name: "CC9",
    did: "18334412492",
    startHour: 8,
    endHour: 17, // 5pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC10",
    name: "CC10",
    did: "18334412564",
    startHour: 7,
    endHour: 17, // 5pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC12",
    name: "CC12",
    did: "18334411593",
    startHour: 8,
    endHour: 18, // 6pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC13",
    name: "CC13",
    did: "18334411506",
    startHour: 9,
    endHour: 18, // 6pm
    timezone: "MST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC_14",
    name: "CC_14",
    did: "18334412568",
    startHour: 8,
    endHour: 18, // 6pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC14A",
    name: "CC14A",
    startHour: 8,
    endHour: 18, // 6pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC14B",
    name: "CC14B",
    did: "18334362221",
    startHour: 8,
    endHour: 18, // 6pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC14C",
    name: "CC14C",
    did: "18334950158",
    startHour: 8,
    endHour: 17, // 5pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC14D",
    name: "CC14D",
    did: "18557020153",
    startHour: 8,
    endHour: 17, // 5pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC14E",
    name: "CC14E",
    did: "18339913927",
    startHour: 8,
    endHour: 17, // 5pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC15",
    name: "CC15",
    did: "18334410027",
    startHour: 8,
    endHour: 17, // 5pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC16",
    name: "CC16",
    did: "18334412573",
    startHour: 9,
    endHour: 18, // 6pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC17",
    name: "CC17",
    did: "18334300436",
    startHour: 9,
    endHour: 17, // 5pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC18A",
    name: "CC18A",
    startHour: 8.5, // 8:30am
    endHour: 16, // 4pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC18B",
    name: "CC18B",
    startHour: 8.5, // 8:30am
    endHour: 16, // 4pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC19",
    name: "CC19",
    did: "18339951463",
    startHour: 8,
    endHour: 17, // 5pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC20",
    name: "CC20",
    did: "18339923833",
    startHour: 9,
    endHour: 19, // 7pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC21",
    name: "CC21",
    did: "18339923731",
    startHour: 9,
    endHour: 19, // 7pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC22",
    name: "CC22",
    did: "18337018811",
    startHour: 8,
    endHour: 16, // 4pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC23A",
    name: "CC23A",
    did: "18337731567",
    startHour: 9.5, // 9:30am
    endHour: 17.5, // 5:30pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC23B",
    name: "CC23B",
    did: "18338360164",
    startHour: 9.5, // 9:30am
    endHour: 17.5, // 5:30pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC24",
    name: "CC24",
    did: "18339403006",
    startHour: 9,
    endHour: 18, // 6pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CC25",
    name: "CC25",
    did: "18337564307",
    startHour: 9,
    endHour: 18, // 6pm
    timezone: "PST",
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  },
  {
    id: "CX",
    name: "CX",
    did: "18334412617",
    // No operating hours configured
  },
];

// Check if a call is after hours for a specific call center
export function isAfterHours(callDate: Date, callCenterId: string): boolean {
  // Normalize the ID by removing underscores for matching
  const normalizedId = callCenterId.replace(/_/g, "");

  const config = callCenterHours.find(
    (cc) =>
      cc.id.replace(/_/g, "") === normalizedId ||
      cc.name.replace(/_/g, "") === normalizedId ||
      cc.id === callCenterId ||
      cc.name === callCenterId
  );

  // If no config found or no hours configured, return false (assume it's during hours)
  if (!config || !config.startHour || !config.endHour || !config.daysOfWeek) {
    return false;
  }

  // Convert call date to appropriate timezone
  // Note: In production, use a proper timezone library like date-fns-tz
  const callDateInTimezone = new Date(callDate);

  const dayOfWeek = callDateInTimezone.getDay();
  const hour =
    callDateInTimezone.getHours() + callDateInTimezone.getMinutes() / 60;

  // Check if it's not an operating day
  if (!config.daysOfWeek.includes(dayOfWeek)) {
    return true; // After hours (not an operating day)
  }

  // Check if it's outside operating hours
  if (hour < config.startHour || hour >= config.endHour) {
    return true; // After hours
  }

  return false; // During hours
}

// Format operating hours for display
export function formatOperatingHours(callCenterId: string): string {
  // Normalize the ID by removing underscores for matching
  const normalizedId = callCenterId.replace(/_/g, "");

  const config = callCenterHours.find(
    (cc) =>
      cc.id.replace(/_/g, "") === normalizedId ||
      cc.name.replace(/_/g, "") === normalizedId ||
      cc.id === callCenterId ||
      cc.name === callCenterId
  );

  if (!config) {
    return "No hours configured";
  }

  // Check if hours are configured
  if (
    !config.startHour ||
    !config.endHour ||
    !config.daysOfWeek ||
    !config.timezone
  ) {
    return "No hours configured";
  }

  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour % 1) * 60);
    const period = h >= 12 ? "pm" : "am";
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return m > 0
      ? `${displayHour}:${m.toString().padStart(2, "0")}${period}`
      : `${displayHour}${period}`;
  };

  const days =
    config.daysOfWeek.length === 7
      ? "Every day"
      : config.daysOfWeek.length === 6
      ? "Mon-Sat"
      : config.daysOfWeek.length === 5
      ? "Mon-Fri"
      : "Custom";

  return `${formatTime(config.startHour)}-${formatTime(config.endHour)} ${
    config.timezone
  } (${days})`;
}

// Get call center name from ID
export function getCallCenterName(callCenterId: string): string {
  // Normalize the ID by removing underscores for matching
  const normalizedId = callCenterId.replace(/_/g, "");

  const config = callCenterHours.find(
    (cc) =>
      cc.id.replace(/_/g, "") === normalizedId ||
      cc.name.replace(/_/g, "") === normalizedId ||
      cc.id === callCenterId ||
      cc.name === callCenterId
  );

  if (!config) {
    return callCenterId; // Return the ID if no match found
  }

  return config.name;
}
