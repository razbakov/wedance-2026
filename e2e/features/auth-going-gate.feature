@smoke
Feature: Signed-out user clicking "Going" is sent to sign-in

  When a visitor who is not signed in clicks the "Going?" button
  on an event page, they see the sign-up modal instead of the
  event being added to their plan.

  Scenario: Signed-out visitor clicks Going and sees sign-up modal
    Given I am not signed in
    And I am on an event page
    When I click the "Going?" button
    Then the sign-up modal is visible
    And no event is saved to my week plan
