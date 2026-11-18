import { t } from "@/lib/i18n";
// /client/src/lib/geolocation.ts

export interface GeoData {
  location: string | null
  timeOfDay: string
}

export async function getGeoData(): Promise<GeoData> {
  const timeOfDay = getTimeOfDay()

  try {
    const res = await fetch('/api/location')
    const data = await res.json()

    const location = data.city
      ? `${data.city}${data.country ? `, ${data.country}` : ''}`
      : data.country || null

    return { location, timeOfDay }
  } catch {
    return { location: null, timeOfDay }
  }
}

export function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  if (hour >= 21 || hour < 1) return 'night'
  return 'latenight'
}

export function getTimeMessage(timeOfDay: string): string {
  const messages: Record<string, string> = {
    morning: t("The morning light carries your energy to me clearly..."),
    afternoon: t("In the afternoon hours, when the world is busy, you seek stillness..."),
    evening: t("As evening falls, the veil between worlds grows thin..."),
    night: t("The night hours... when truth reveals itself most easily..."),
    latenight: t("In these quiet hours before dawn, only the serious seekers come..."),
  }
  return messages[timeOfDay] || messages.evening
}
