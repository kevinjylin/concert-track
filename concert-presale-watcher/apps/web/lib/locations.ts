import type { LocationSuggestion } from "./types";

type ConcertMarket = {
  city: string;
  state: string;
};

type StateEntry = {
  name: string;
  code: string;
};

const toCitySuggestion = ({
  city,
  state,
}: ConcertMarket): LocationSuggestion => ({
  id: `city-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${state.toLowerCase()}`,
  kind: "city",
  city,
  state,
  country: "US",
  label: `${city}, ${state}`,
  description: "United States",
});

const toStateSuggestion = ({ name, code }: StateEntry): LocationSuggestion => ({
  id: `state-${code.toLowerCase()}`,
  kind: "state",
  city: "",
  state: code,
  country: "US",
  label: `${name}`,
  description: `All cities in ${name}`,
});

const CONCERT_MARKETS: ConcertMarket[] = [
  { city: "Albuquerque", state: "NM" },
  { city: "Anaheim", state: "CA" },
  { city: "Ann Arbor", state: "MI" },
  { city: "Asbury Park", state: "NJ" },
  { city: "Atlanta", state: "GA" },
  { city: "Austin", state: "TX" },
  { city: "Baltimore", state: "MD" },
  { city: "Berkeley", state: "CA" },
  { city: "Birmingham", state: "AL" },
  { city: "Boise", state: "ID" },
  { city: "Boston", state: "MA" },
  { city: "Boulder", state: "CO" },
  { city: "Brooklyn", state: "NY" },
  { city: "Buffalo", state: "NY" },
  { city: "Burlington", state: "VT" },
  { city: "Cambridge", state: "MA" },
  { city: "Chapel Hill", state: "NC" },
  { city: "Charleston", state: "SC" },
  { city: "Charlotte", state: "NC" },
  { city: "Chicago", state: "IL" },
  { city: "Cincinnati", state: "OH" },
  { city: "Cleveland", state: "OH" },
  { city: "Columbus", state: "OH" },
  { city: "Dallas", state: "TX" },
  { city: "Denver", state: "CO" },
  { city: "Detroit", state: "MI" },
  { city: "Eugene", state: "OR" },
  { city: "Fort Lauderdale", state: "FL" },
  { city: "Fort Worth", state: "TX" },
  { city: "Grand Rapids", state: "MI" },
  { city: "Houston", state: "TX" },
  { city: "Indianapolis", state: "IN" },
  { city: "Irvine", state: "CA" },
  { city: "Kansas City", state: "MO" },
  { city: "Las Vegas", state: "NV" },
  { city: "Long Beach", state: "CA" },
  { city: "Los Angeles", state: "CA" },
  { city: "Louisville", state: "KY" },
  { city: "Madison", state: "WI" },
  { city: "Memphis", state: "TN" },
  { city: "Miami", state: "FL" },
  { city: "Milwaukee", state: "WI" },
  { city: "Minneapolis", state: "MN" },
  { city: "Nashville", state: "TN" },
  { city: "New Haven", state: "CT" },
  { city: "New Orleans", state: "LA" },
  { city: "New York", state: "NY" },
  { city: "Oakland", state: "CA" },
  { city: "Oklahoma City", state: "OK" },
  { city: "Omaha", state: "NE" },
  { city: "Orlando", state: "FL" },
  { city: "Philadelphia", state: "PA" },
  { city: "Phoenix", state: "AZ" },
  { city: "Pittsburgh", state: "PA" },
  { city: "Portland", state: "OR" },
  { city: "Providence", state: "RI" },
  { city: "Raleigh", state: "NC" },
  { city: "Red Bank", state: "NJ" },
  { city: "Richmond", state: "VA" },
  { city: "Riverside", state: "CA" },
  { city: "Sacramento", state: "CA" },
  { city: "Salt Lake City", state: "UT" },
  { city: "San Antonio", state: "TX" },
  { city: "San Diego", state: "CA" },
  { city: "San Francisco", state: "CA" },
  { city: "San Jose", state: "CA" },
  { city: "Santa Ana", state: "CA" },
  { city: "Santa Barbara", state: "CA" },
  { city: "Santa Cruz", state: "CA" },
  { city: "Seattle", state: "WA" },
  { city: "Somerville", state: "MA" },
  { city: "St. Louis", state: "MO" },
  { city: "St. Paul", state: "MN" },
  { city: "Tampa", state: "FL" },
  { city: "Tempe", state: "AZ" },
  { city: "Washington", state: "DC" },
];

const US_STATES: StateEntry[] = [
  { name: "Alabama", code: "AL" },
  { name: "Alaska", code: "AK" },
  { name: "Arizona", code: "AZ" },
  { name: "Arkansas", code: "AR" },
  { name: "California", code: "CA" },
  { name: "Colorado", code: "CO" },
  { name: "Connecticut", code: "CT" },
  { name: "Delaware", code: "DE" },
  { name: "District of Columbia", code: "DC" },
  { name: "Florida", code: "FL" },
  { name: "Georgia", code: "GA" },
  { name: "Hawaii", code: "HI" },
  { name: "Idaho", code: "ID" },
  { name: "Illinois", code: "IL" },
  { name: "Indiana", code: "IN" },
  { name: "Iowa", code: "IA" },
  { name: "Kansas", code: "KS" },
  { name: "Kentucky", code: "KY" },
  { name: "Louisiana", code: "LA" },
  { name: "Maine", code: "ME" },
  { name: "Maryland", code: "MD" },
  { name: "Massachusetts", code: "MA" },
  { name: "Michigan", code: "MI" },
  { name: "Minnesota", code: "MN" },
  { name: "Mississippi", code: "MS" },
  { name: "Missouri", code: "MO" },
  { name: "Montana", code: "MT" },
  { name: "Nebraska", code: "NE" },
  { name: "Nevada", code: "NV" },
  { name: "New Hampshire", code: "NH" },
  { name: "New Jersey", code: "NJ" },
  { name: "New Mexico", code: "NM" },
  { name: "New York", code: "NY" },
  { name: "North Carolina", code: "NC" },
  { name: "North Dakota", code: "ND" },
  { name: "Ohio", code: "OH" },
  { name: "Oklahoma", code: "OK" },
  { name: "Oregon", code: "OR" },
  { name: "Pennsylvania", code: "PA" },
  { name: "Rhode Island", code: "RI" },
  { name: "South Carolina", code: "SC" },
  { name: "South Dakota", code: "SD" },
  { name: "Tennessee", code: "TN" },
  { name: "Texas", code: "TX" },
  { name: "Utah", code: "UT" },
  { name: "Vermont", code: "VT" },
  { name: "Virginia", code: "VA" },
  { name: "Washington", code: "WA" },
  { name: "West Virginia", code: "WV" },
  { name: "Wisconsin", code: "WI" },
  { name: "Wyoming", code: "WY" },
];

export const US_CONCERT_MARKETS: LocationSuggestion[] =
  CONCERT_MARKETS.map(toCitySuggestion);

export const US_STATE_SUGGESTIONS: LocationSuggestion[] =
  US_STATES.map(toStateSuggestion);

const normalizeSearch = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");

export const searchConcertMarkets = (
  query: string,
  limit = 8,
): LocationSuggestion[] => {
  const normalized = normalizeSearch(query);
  if (!normalized) {
    return [];
  }

  const cityMatches = US_CONCERT_MARKETS.filter((market) => {
    const city = normalizeSearch(market.city);
    const label = normalizeSearch(market.label);
    const state = market.state.toLowerCase();

    return (
      city.startsWith(normalized) ||
      label.startsWith(normalized) ||
      state.startsWith(normalized)
    );
  });

  const stateMatches = US_STATE_SUGGESTIONS.filter((entry) => {
    const stateName = normalizeSearch(entry.label.replace(/\(entire state\)/i, ""));
    const code = entry.state.toLowerCase();

    return stateName.startsWith(normalized) || code === normalized;
  });

  return [...stateMatches, ...cityMatches].slice(0, limit);
};
