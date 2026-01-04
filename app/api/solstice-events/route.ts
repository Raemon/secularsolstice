import { NextResponse } from 'next/server';

export interface SolsticeEventFromLW {
  _id: string;
  title: string;
  startTime: string;
  endTime?: string;
  googleLocation?: {
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    formatted_address?: string;
  };
  location?: string;
  pageUrl?: string;
  contents?: {
    htmlHighlight?: string;
  };
}

async function fetchSolsticeEventsFromLessWrong(): Promise<SolsticeEventFromLW[]> {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    // Fetch both past and upcoming events to get all solstice events from the past year
    const query = `
      query GetSolsticeEvents {
        pastEvents: posts(input: { terms: { view: "pastEvents", limit: 200 } }) {
          results { _id title startTime endTime googleLocation location pageUrl }
        }
        upcomingEvents: posts(input: { terms: { view: "events", limit: 100 } }) {
          results { _id title startTime endTime googleLocation location pageUrl }
        }
      }
    `;
    const gqlResponse = await fetch('https://www.lesswrong.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 }
    });
    if (!gqlResponse.ok) throw new Error('Failed to fetch LessWrong events via GraphQL');
    const data = await gqlResponse.json();
    const pastEvents = data?.data?.pastEvents?.results || [];
    const upcomingEvents = data?.data?.upcomingEvents?.results || [];
    const allEvents = [...pastEvents, ...upcomingEvents];
    // Filter to only events that:
    // 1. Have "solstice" in the title (case insensitive)
    // 2. Have location coordinates
    // 3. Started within the past year or upcoming
    const now = new Date();
    const oneYearAgoTime = oneYearAgo.getTime();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return allEvents.filter((event: SolsticeEventFromLW) => {
      const titleMatch = event.title?.toLowerCase().includes('solstice');
      const hasCoords = event.googleLocation?.geometry?.location?.lat !== undefined;
      const eventTime = event.startTime ? new Date(event.startTime).getTime() : 0;
      const isWithinTimeRange = eventTime >= oneYearAgoTime && eventTime <= oneYearFromNow.getTime();
      return titleMatch && hasCoords && isWithinTimeRange;
    });
  } catch (error) {
    console.error('Error fetching LessWrong solstice events:', error);
    return [];
  }
}

export async function GET() {
  try {
    const events = await fetchSolsticeEventsFromLessWrong();
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Failed to fetch solstice events:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch solstice events', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}