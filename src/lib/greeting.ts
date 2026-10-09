// The dashboard greeting: "<salutation> <first name>", different each visit, a bit like a new chat opening.
// Pure functions (the time and the randomness are passed in) so the choice is easy to check.
//
// To add or change greetings, edit the lists below. {name} is replaced by the person's first name.
// A greeting that ends in "?" or "!" keeps its own punctuation; the page adds a full stop after the others.

const ANYTIME = [
  "Hey {name}",
  "Hi {name}",
  "Hello, {name}",
  "Hey there, {name}",
  "Welcome back, {name}",
  "Good to see you, {name}",
  "Nice to see you, {name}",
  "Glad you’re here, {name}",
  "What’s up, {name}",
  "Namaste, {name}",
  "Howdy, {name}",
  "Ready to code, {name}?",
  "Back at it, {name}?",
  "Let’s get coding, {name}",
];

// Added to the list above, so the right one for the time of day turns up often but not every time.
const BY_TIME_OF_DAY = {
  morning: ["Good morning, {name}", "Morning, {name}", "Rise and shine, {name}", "Early start, {name}?"], // 05:00-11:59
  afternoon: ["Good afternoon, {name}", "Afternoon, {name}", "Hope your day’s going well, {name}"], // 12:00-16:59
  evening: ["Good evening, {name}", "Evening, {name}", "Hope you had a good day, {name}"], // 17:00-21:59
  night: ["Burning the midnight oil, {name}?", "Late-night coding, {name}?", "Still up, {name}?"], // 22:00-04:59
} as const;

export type TimeOfDay = keyof typeof BY_TIME_OF_DAY;

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

// "Shreyansh Srivastava" -> "Shreyansh"
export function firstNameOf(displayName: string | null | undefined): string {
  return (displayName ?? "").trim().split(/\s+/)[0] || "there";
}

// `seed` is a number from 0 up to (not including) 1, e.g. Math.random(). The same seed always gives the same greeting,
// so the page can keep it steady while it re-renders.
export function pickGreeting(displayName: string | null | undefined, now: Date, seed: number): string {
  const pool = [...ANYTIME, ...BY_TIME_OF_DAY[timeOfDay(now.getHours())]];
  const template = pool[Math.min(pool.length - 1, Math.floor(seed * pool.length))];
  return template.replace("{name}", firstNameOf(displayName));
}

// Greetings that end in a question or exclamation mark are left as they are; the others get a full stop in the accent colour.
export const hasOwnPunctuation = (greeting: string) => /[?!]$/.test(greeting);
