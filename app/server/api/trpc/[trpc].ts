import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '../../trpc'
import { createContext } from '../../trpc/context'

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)

  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext,
  })

  // Use sendWebResponse to correctly forward the tRPC Response to the client
  return sendWebResponse(event, response)
})
