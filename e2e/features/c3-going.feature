@c3
Feature: C3 — Going: plan, share, discover

  Going is a planning action — not a ticket and not free admission. A new
  Going is hidden; a dancer appears to others only after explicitly choosing
  to be seen. Write scenarios run against the local test database only, with
  synthetic dancers signed in through a seeded session.

  # ── RAZ-714 — Keep Going through navigation, reload and undo ──

  @write
  Scenario: Going survives navigation, reload and undo
    Given the test environment is safe to write
    And Munich has a weekly practica and a one-off social this week
    And the browser clock is the day before them
    And I am signed in as "Ana"
    And I watch the console for hydration warnings
    When I open the "munich" city page
    And I tap "Going?" on the one-off social
    Then the one-off social shows "Going!"
    When I open the one-off social
    Then the event page shows "Going!" and 1 going
    When I scroll through the page and reload it
    Then the event page shows "Going!" and 1 going
    And the database has one Going for "Ana" on the one-off social
    When I tap "Going!" to undo
    And I reload the page
    Then the event page shows "Going?" and 0 going
    And the database has no Going for "Ana" on the one-off social
    And there were no hydration warnings

  # ── RAZ-974 / RAZ-995 — Who's coming under the sign-up ──
  # Ordinary events only: a festival keeps its "Shall we dance?" deck and its
  # verified-ticket rule (RAZ-314).

  @write
  Scenario: A signed-in dancer sees who signed up for the event; a visitor sees only the counts
    Given the test environment is safe to write
    And an ordinary event with no attendees
    And synthetic dancers "Ana" and "Ben" with public profiles and photos
    When "Ana" signs up "With my partner" for the event
    Then "Ben" sees "Ana" under "With my partner" in Who's coming
    And a signed-out visitor sees the counts but nobody's name in the event's poll
    And the event page has no "Shall we dance?" section

  # ── RAZ-687 — Going stays separate from ticket navigation ──

  @write
  Scenario Outline: Going is a planning action next to the ticket link — <case>
    Given the test environment is safe to write
    And an ordinary event <links>
    And I am signed in as "Ana"
    When I open that event
    Then the event hero <tickets>
    And the event page never promises free entry
    When I tap "Going?" in the event hero
    Then the event hero shows "Going!"
    And the event hero <tickets>
    And the database shows "Ana" Going on that event, not as a ticket holder

    Examples:
      | case         | links                                  | tickets                                                          |
      | website only | with a website but no ticket link      | offers no ticket button and links the website as "Event website" |
      | ticket link  | with a ticket link and a website       | offers "Get tickets" linking to the ticket page                  |

