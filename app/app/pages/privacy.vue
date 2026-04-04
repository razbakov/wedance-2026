<script setup lang="ts">
useHead({
  title: 'Privacy Policy - WeDance',
  meta: [
    {
      name: 'description',
      content: 'WeDance Festival Schedule privacy policy. No account required, no personal data collected.',
    },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <NuxtLink
        to="/"
        class="mb-8 inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
      >
        &larr; Back to schedule
      </NuxtLink>

      <article class="prose prose-gray max-w-none">
        <h1>Privacy at WeDance</h1>

        <p class="text-lg text-gray-600">
          No account required. No login. No personal data collected.
        </p>

        <h2>What we collect</h2>
        <p>
          We use <strong>PostHog</strong> to collect anonymous usage analytics --
          page views, filter clicks, return visits -- so we can understand whether
          this schedule is useful to dancers. We use first-party cookies only.
          No advertising. No tracking pixels. No retargeting.
        </p>

        <h2>Cookies</h2>
        <table>
          <thead>
            <tr>
              <th>Cookie</th>
              <th>Purpose</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>PostHog anonymous ID</td>
              <td>Distinguish unique visitors and detect return visits</td>
              <td>1 year</td>
            </tr>
            <tr>
              <td>PostHog session ID</td>
              <td>Group events within a single browsing session</td>
              <td>30 min inactivity</td>
            </tr>
          </tbody>
        </table>

        <h2>We do not sell your data</h2>
        <p>
          We do not sell, rent, or share your data with any third parties.
          This is a binding commitment per our organizational data policy.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>
            <strong>Cookie consent:</strong> When you first visit, we ask whether
            you accept analytics cookies. If you decline, PostHog does not load.
          </li>
          <li>
            <strong>Do Not Track:</strong> If your browser sends the DNT signal,
            we treat it as a rejection -- no analytics cookies are set.
          </li>
          <li>
            <strong>Ad blockers:</strong> Extensions like uBlock Origin will block
            PostHog automatically.
          </li>
          <li>
            <strong>Clear cookies:</strong> Clearing your browser cookies resets
            your anonymous ID and your consent choice.
          </li>
        </ul>

        <h2>Data processing</h2>
        <p>
          Analytics data is processed by PostHog Inc. (US) under Standard
          Contractual Clauses. The app is hosted on Vercel Inc. (US), also
          under SCCs. Only the WeDance founders (Alex Razbakov and Kirill
          Korshikov) access analytics data for product evaluation.
        </p>

        <h2>Your rights (GDPR)</h2>
        <ul>
          <li>Right to access, deletion, and objection to processing</li>
          <li>Right to lodge a complaint with the Bavarian Data Protection Authority (BayLDA)</li>
        </ul>
        <p>
          To exercise your rights, email
          <a href="mailto:privacy@wedance.vip">privacy@wedance.vip</a>.
          We will respond within 30 days.
        </p>

        <h2>Data retention</h2>
        <p>
          Analytics events are retained for 12 months, then automatically deleted.
          Vercel server logs are retained for 30 days.
        </p>

        <h2>Contact</h2>
        <p>
          <strong>WeDance</strong><br>
          Alex Razbakov &amp; Kirill Korshikov GbR<br>
          Munich, Germany<br>
          <a href="mailto:privacy@wedance.vip">privacy@wedance.vip</a>
        </p>

        <p class="text-sm text-gray-400">
          Last updated: 2026-04-04
        </p>
      </article>
    </div>
  </div>
</template>
