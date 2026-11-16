@smoke
Feature: Signed-out user clicking "Going" is sent to sign-in

  On an event page the hero has one button that opens the sign-up steps in
  place (RAZ-995): how you come, then your contact. A visitor who is not signed
  in gives a name and email; the sign-up counts unconfirmed and a magic link
  confirms it. Nothing is added to a plan until they confirm.

  Scenario: Signed-out visitor signs up for an event from the hero
    Given I am not signed in
    And I am on an event page
    When I sign up in the event hero as "Maria Lopez" with "smoke-signup@example.test"
    Then I am asked to open the link we sent
    And no Going is saved in the database for that event

  # RAZ-713 — the same gate from the city page (a modal, not a redirect).
  Scenario: Signed-out visitor taps Going on a city page event
    Given the test environment is safe to write
    And I am not signed in
    And Munich has a weekly practica and a one-off social this week
    And the browser clock is the day before them
    When I open the "munich" city page
    And I tap "+ My plan" on the one-off social
    Then the sign-up modal is visible
    And the one-off social shows "+ My plan"
    And no Going is saved in the database for the one-off social
