import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    let requestData: any = {}
    try {
        requestData = await req.json()
        const { destination, startingPoint, startDate, endDate, peopleCount, budgetTier } = requestData

        const nights = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
        const days = nights + 1

        const prompt = `You are an expert Indian travel budget planner with deep knowledge of travel costs across India as of 2025-2026.

Trip Details:
- From: ${startingPoint || 'Delhi'}
- To: ${destination}  
- Dates: ${startDate} to ${endDate} (${days} days, ${nights} nights)
- Group size: ${peopleCount} people
- Budget tier: ${budgetTier} (Budget / Mid-range / Luxury)

Pricing Intelligence Rules:

TRANSPORT (one way, total for group):
- Under 300km: Bus or train preferred. Total ₹500-₹3,000 for group.
- 300-700km: Train (Sleeper/3AC) or bus. Total ₹2,000-₹8,000 for group.
- Over 700km: Flight preferred. Per person ₹3,000-₹8,000 depending on advance booking and route.
- Popular routes (Mumbai-Goa, Delhi-Manali, Bangalore-Coorg): use road/bus costs, NOT flights.
- Always calculate ROUND TRIP total for the whole group.
- For hilly/remote destinations (Manali, Spiti, Coorg, Munnar): use cab/bus, never train.

ACCOMMODATION (per night, total for group):
- Assume 1 room per 2 people (round up for odd numbers).
- Budget: ₹800-₹1,500 per room/night
- Mid-range: ₹2,000-₹5,000 per room/night  
- Luxury: ₹7,000-₹20,000 per room/night
- Beach/hill stations add 20-40% premium in peak season.
- Calculate: rooms × nights × price_per_room

FOOD (per day, total for group):
- Budget: ₹300-₹500 per person/day (dhabas, local restaurants)
- Mid-range: ₹600-₹1,200 per person/day (decent restaurants, some cafes)
- Luxury: ₹1,500-₹3,000 per person/day (fine dining, hotels)
- Tourist destinations (Goa, Manali, Coorg) add 30% premium.
- Calculate: people × days × price_per_person

ACTIVITIES (total for group, entire trip):
- Budget: ₹500-₹2,000 per person total
- Mid-range: ₹2,000-₹6,000 per person total
- Luxury: ₹6,000-₹15,000 per person total
- Research actual activities for ${destination}: treks, water sports, sightseeing, adventure sports etc.
- Be specific — mention 2-3 actual activities typical for this destination.

LOCAL TRANSPORT (within destination, total for trip):
- Auto/cab for budget: ₹200-₹500/day for group
- Mid-range: ₹500-₹1,500/day for group (hired cab)
- Luxury: ₹2,000-₹4,000/day for group (private vehicle)
- Calculate: daily_cost × days

RESPOND ONLY WITH THIS EXACT JSON FORMAT — no explanation, no markdown, just raw JSON:
{
  "transport": {
    "amount": 0,
    "description": "mode of transport, return travel for group",
    "per_person": 0
  },
  "accommodation": {
    "amount": 0,
    "description": "type and number of rooms for nights",
    "per_person": 0
  },
  "food": {
    "amount": 0,
    "description": "dining style for days",
    "per_person": 0
  },
  "activities": {
    "amount": 0,
    "description": "specific activities for destination",
    "per_person": 0
  },
  "local_transport": {
    "amount": 0,
    "description": "mode within destination",
    "per_person": 0
  },
  "total": 0,
  "per_person_total": 0,
  "trip_summary": "2 sentence summary of this trip budget in plain English",
  "money_saving_tip": "one specific tip to save money on this trip"
}`

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
            console.error('Missing ANTHROPIC_API_KEY')
            return NextResponse.json({
                transport: { amount: 4000, description: "Bus/Train Round Trip", per_person: 1000 },
                accommodation: { amount: 8000, description: "Budget Hotel Rooms", per_person: 2000 },
                food: { amount: 5000, description: "Local Eateries", per_person: 1250 },
                activities: { amount: 3000, description: "Sightseeing", per_person: 750 },
                local_transport: { amount: 2000, description: "Auto/Cab", per_person: 500 },
                total: 22000,
                per_person_total: 5500,
                trip_summary: "Budget trip to " + destination,
                money_saving_tip: "Book tickets in advance"
            })
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        })

        if (!response.ok) {
            const errBody = await response.text()
            console.error('Claude API Response Error:', response.status, errBody)
            throw new Error(`AI Service Error (${response.status})`)
        }

        const rawData = await response.json()
        const text = rawData.content[0]?.text || ''
        
        // Robust JSON extraction
        const startIdx = text.indexOf('{')
        const endIdx = text.lastIndexOf('}')
        
        if (startIdx === -1 || endIdx === -1) {
            console.error('Invalid AI response text:', text)
            throw new Error('AI returned invalid format')
        }

        const jsonStr = text.substring(startIdx, endIdx + 1)
        const budget = JSON.parse(jsonStr)

        return NextResponse.json(budget)

    } catch (error: any) {
        console.error('Budget Generation Error:', error)
        const isShort = (requestData.destination || '').toLowerCase().includes('rishikesh') || (requestData.destination || '').toLowerCase().includes('manali')
        return NextResponse.json({
            transport: { amount: isShort ? 8000 : 25000, description: "Round trip estimate", per_person: isShort ? 2000 : 6250 },
            accommodation: { amount: isShort ? 12000 : 25000, description: "Hotel/Stay estimate", per_person: isShort ? 3000 : 6250 },
            food: { amount: isShort ? 10000 : 15000, description: "Average dining cost", per_person: isShort ? 2500 : 3750 },
            activities: { amount: isShort ? 6000 : 10000, description: "Tours and entry fees", per_person: isShort ? 1500 : 2500 },
            local_transport: { amount: isShort ? 4000 : 8000, description: "Local travel", per_person: isShort ? 1000 : 2000 },
            total: isShort ? 40000 : 83000,
            per_person_total: isShort ? 10000 : 20750,
            _is_fallback: true,
            trip_summary: "Estimated budget based on destination.",
            money_saving_tip: "Try tracking group expenses daily."
        })
    }
}
