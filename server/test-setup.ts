import { neonConfig } from '@neondatabase/serverless'

// Route the Neon HTTP driver to the local proxy when running integration tests
// against a real Postgres (CI or local Docker). No-op when the env var is unset.
if (process.env.NEON_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT
}
