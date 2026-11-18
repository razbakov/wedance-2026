@c3
Feature: Meet a dancer on the same night

  A dancer with a public profile, a photo and a city sees someone else who
  put the same upcoming social on their plan. The event page counts those
  plan entries as going.

  @write
  Scenario: Two dancers with a city and a photo see each other on Meet
    Given the test environment is safe to write
    And "Anna" and "Ben" both have a photo, a city and the same social on their plan
    When I am signed in as "Ben"
    And I open Meet
    Then the Meet deck shows "Anna"
    When I open the shared social
    Then the event page shows 2 going
