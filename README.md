# BioMap AI

AI-powered biodiversity mapping platform. Identify species from photos and visualize sightings on an interactive map.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS v3, Leaflet
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL (Supabase)
- **AI:** Pre-trained species identification model

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Shayan-Bhowmik/BioMapAI.git
cd BioMapAI

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## License

MIT