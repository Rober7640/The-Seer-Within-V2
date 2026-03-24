/**
 * "Help is available" disclaimer banner shown at the bottom of the chat
 * when crisis/suicidal content is detected. Modeled after ChatGPT's pattern.
 */

interface CrisisDisclaimerProps {
  hotlineName: string;
  hotlineNumber: string;
  country: string;
}

export default function CrisisDisclaimer({ hotlineName, hotlineNumber, country }: CrisisDisclaimerProps) {
  return (
    <div className="mx-4 mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
      <div className="flex items-start gap-2">
        <svg
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div>
          <p className="font-semibold text-gray-800">Help is available</p>
          <p className="mt-1">
            If you're having thoughts of self-harm or suicide: call{' '}
            <span className="font-semibold text-blue-700">{hotlineNumber}</span>{' '}
            to connect with <span className="font-semibold">{hotlineName}</span>.
            It's free and confidential. You'll reach someone who is trained to listen and support you.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Services unaffiliated with The Seer Within
          </p>
        </div>
      </div>
    </div>
  );
}
