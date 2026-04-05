@epic-4 @mvp
Feature: Share a Room
  As a Festival Dancer
  I want to signal that I'm looking for a roommate
  so that I can split accommodation costs with compatible dancers.

  Background:
    Given I am signed up for "Salsa Berlin 2026"

  # Note: The current UI has a simple "Looking for a roommate?" toggle in the
  # "Book stay" section of the cart sidebar. No listing or matching UI exists yet.
  # These scenarios reflect the current toggle + the planned roommate matching.

  Rule: The "Book stay" section in the cart sidebar has a "Looking for a roommate?" toggle

    Scenario: Toggle on roommate search
      When I expand "Book stay" in the cart sidebar
      Then I see a "Looking for a roommate?" label with a toggle switch
      When I turn on the toggle
      Then I see "Other attendees looking for roommates will be able to see you. Share your plan to connect!"

    Scenario: Toggle off roommate search
      Given the roommate toggle is on
      When I turn off the toggle
      Then the info message disappears

  Rule: Matched roommates receive a group chat link

    Scenario: Group chat after roommate matching
      Given I toggled "Looking for a roommate?" on
      And another dancer also toggled it on with compatible preferences
      When the organizer matches us
      Then we both receive a WhatsApp group link to coordinate booking
