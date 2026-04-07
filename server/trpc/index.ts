import { router } from './trpc'
import { authRouter } from './routers/auth'
import { dinnerRouter } from './routers/dinner'
import { festivalSignupRouter } from './routers/festivalSignup'
import { adminRouter } from './routers/admin'

export const appRouter = router({
  auth: authRouter,
  dinner: dinnerRouter,
  festivalSignup: festivalSignupRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
