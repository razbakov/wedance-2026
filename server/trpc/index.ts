import { router } from './trpc'
import { authRouter } from './routers/auth'
import { dinnerRouter } from './routers/dinner'
import { festivalSignupRouter } from './routers/festivalSignup'
import { adminRouter } from './routers/admin'
import { claimRouter } from './routers/claim'
import { festivalRouter } from './routers/festival'
import { cityVideoRouter } from './routers/cityVideo'
import { giveawayRouter } from './routers/giveaway'
import { profileRouter } from './routers/profile'
import { reviewRouter } from './routers/review'
import { communityGroupRouter } from './routers/communityGroup'
import { askLocalsRouter } from './routers/askLocals'
import { entityRouter } from './routers/entity'
import { bookingRouter } from './routers/booking'
import { electionRouter } from './routers/election'

export const appRouter = router({
  auth: authRouter,
  dinner: dinnerRouter,
  festivalSignup: festivalSignupRouter,
  admin: adminRouter,
  claim: claimRouter,
  festival: festivalRouter,
  cityVideo: cityVideoRouter,
  giveaway: giveawayRouter,
  profile: profileRouter,
  review: reviewRouter,
  communityGroup: communityGroupRouter,
  askLocals: askLocalsRouter,
  entity: entityRouter,
  booking: bookingRouter,
  election: electionRouter,
})

export type AppRouter = typeof appRouter
