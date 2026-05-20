import { router } from './trpc'
import { authRouter } from './routers/auth'
import { dinnerRouter } from './routers/dinner'
import { festivalSignupRouter } from './routers/festivalSignup'
import { adminRouter } from './routers/admin'
import { claimRouter } from './routers/claim'
import { festivalRouter } from './routers/festival'

export const appRouter = router({
  auth: authRouter,
  dinner: dinnerRouter,
  festivalSignup: festivalSignupRouter,
  admin: adminRouter,
  claim: claimRouter,
  festival: festivalRouter,
})

export type AppRouter = typeof appRouter
