@c3
Feature: A match tells both dancers, in the app

  The yes that completes a match is a notice for both people. It shows as a
  toast and stays under the bell until they open it. No email and no push.
  Every step is a click.

  @write
  Scenario: Both dancers see the match, and the bell opens the meetup
    Given the test environment is safe to write
    And "Anna" and "Ben" have matched over a shared night
    When I am signed in as "Anna"
    And I open Meet
    Then Meet shows the match with "Ben"
    And I see a match toast for "Ben"
    And the notification bell shows 1
    When I dismiss the match toast
    And I open the notification bell
    Then the notification history lists "Ben"
    When I tap the notification for "Ben"
    Then the meetup page offers to book the night
    When I am signed in as "Ben"
    And I open the home page
    Then I see a match toast for "Anna"
    And the notification bell shows 1
