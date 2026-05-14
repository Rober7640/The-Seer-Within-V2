export interface QuizOption {
  value: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'topic',
    prompt: "Every number tells a story.\nWhat part of yours do you want to decode?",
    options: [
      { value: 'life_direction', label: "My life direction \u2014 am I on the right path?" },
      { value: 'love_relationships', label: "Love & relationships \u2014 what do my numbers say?" },
      { value: 'career_money', label: "Career & money \u2014 is this my year to move?" },
      { value: 'something_specific', label: "Something specific \u2014 I need answers about a situation" },
    ],
  },
  {
    id: 'feeling',
    prompt: "Got it. And right now \u2014 how does this area of your life feel?",
    options: [
      { value: 'stuck', label: "Stuck \u2014 like nothing\u2019s moving" },
      { value: 'crossroads', label: "At a crossroads \u2014 too many options" },
      { value: 'anxious', label: "Anxious \u2014 something feels off" },
      { value: 'hopeful', label: "Hopeful \u2014 but I want confirmation" },
    ],
  },
  {
    id: 'outcome',
    prompt: "Last one. What would it mean to you to get clarity on this?",
    options: [
      { value: 'make_decision', label: "I\u2019d finally feel like I can make a decision" },
      { value: 'stop_second_guessing', label: "I\u2019d stop second-guessing myself" },
      { value: 'right_track', label: "I\u2019d know if I\u2019m on the right track or wasting my time" },
      { value: 'tell_me_what_you_see', label: "I just need someone to tell me what they see" },
    ],
  },
];

/** Map email domain to deep link URL and label */
export function getEmailAppLink(email: string): { label: string; url: string } | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { label: 'Open Gmail', url: 'https://mail.google.com' };
  }
  if (domain === 'yahoo.com' || domain === 'yahoo.co.uk' || domain === 'ymail.com') {
    return { label: 'Open Yahoo Mail', url: 'https://mail.yahoo.com' };
  }
  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com' || domain === 'msn.com') {
    return { label: 'Open Outlook', url: 'https://outlook.live.com' };
  }
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return { label: 'Open iCloud Mail', url: 'https://www.icloud.com/mail' };
  }
  return null;
}
