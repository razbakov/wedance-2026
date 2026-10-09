@smoke
Feature: Forgot password and reset

  A user who forgot their password can request a reset link,
  set a new password, and sign in with it.

  Background:
    Given the test environment is safe to write
    And a test user exists with a known password

  Scenario: User resets forgotten password and signs in with the new one
    Given I am on the home page
    When I click "Sign in" in the header
    And I click "Forgot password?"
    And I fill in the recovery email with the test user email
    And I click "Send me a reset link"
    Then I see "Check your email"

    When I visit the password reset link from the database
    And I fill in "New password" with "BrandNew99!"
    And I fill in "Confirm password" with "BrandNew99!"
    And I click "Save new password"
    Then I should be signed in

    When I click "Sign out" in the header
    And I confirm sign out
    Then I should be signed out

    When I click "Sign in" in the header
    And I fill in "Email" with the test user email
    And I fill in "Password" with "BrandNew99!"
    And I click "Sign in" in the modal
    Then I should be signed in
