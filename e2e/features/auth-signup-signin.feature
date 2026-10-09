@smoke
Feature: Sign up, sign in, and sign out

  Users can create an account with email and password, sign out,
  and sign back in with the same credentials.

  Background:
    Given the test environment is safe to write

  Scenario: New user registers, signs out, then signs back in
    Given I am on the home page
    When I click "Sign in" in the header
    And I click "Create an account" in the modal
    And I fill in "Name" with "Smoke Tester"
    And I fill in "Email" with a unique test email
    And I fill in "Password" with "SmokeyPass88!"
    And I click "Create account"
    Then I should be signed in

    When I click "Sign out" in the header
    And I confirm sign out
    Then I should be signed out

    When I click "Sign in" in the header
    And I fill in "Email" with the same test email
    And I fill in "Password" with "SmokeyPass88!"
    And I click "Sign in" in the modal
    Then I should be signed in
