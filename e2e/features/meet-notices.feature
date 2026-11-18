@c3
Feature: A match tells both dancers, in the app

  The yes that completes a match is a notice for both people. On Meet it is a
  card: their photo, name and dances, and the night (title, when, venue, how
  many are going). A small toast sits at the bottom right and the header bell
  is the only count. My plan shows no number. No email and no push. Every
  step is a click.

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
    And I reload the page
    Then the match toast stays dismissed
    When I open the notification bell
    Then the notification history lists "Ben"
    When I tap the notification for "Ben"
    Then the meetup page offers to book the night
    When I am signed in as "Ben"
    And I open the home page
    Then I see a match toast for "Anna"
    And the notification bell shows 1

  @write
  Scenario: After booking, the meeting stays reachable and the reveal has no name
    Given the test environment is safe to write
    And "Anna" and "Ben" have matched over a shared night
    When I am signed in as "Anna"
    And I open Meet
    And I open the match with "Ben"
    Then the meetup page offers to book the night
    When I book the night
    Then the meeting explains the time and shows the night
    And the reassurances are in the first person
    And opening the screen is guidance, not a call to action
    When I open the meeting screen
    Then the reveal asks me to match the symbol and does not name me
    And I can say I couldn't meet
    When I open Meet
    Then Meet still shows the booked match with "Ben"
    When I open the notification bell
    Then the notification history lists "Ben"
