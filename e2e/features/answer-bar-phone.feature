@smoke
Feature: The answer buttons on a venue ask and an artist invite stay above the phone tab bar

  Venues and artists open their link (/ask/<token>, /confirm/<token>) from
  WhatsApp or Instagram, so on a phone. The answer bar at the bottom must sit
  above the site's tab bar, or a tap on "Yes" lands on the tab bar (RAZ-924).
  The invite is mocked at the tRPC layer: nothing is read from or written to
  the database.

  Scenario: A venue answers its ask on a phone
    Given I am on a phone, signed out
    And a venue ask link is waiting for an answer
    When I open the venue ask link
    Then every answer button is fully visible above the tab bar
    And tapping "Yes, we can" does not open the sign-in dialog

  Scenario: An artist answers their invite on a phone
    Given I am on a phone, signed out
    And an artist invite link is waiting for an answer
    When I open the artist invite link
    Then every answer button is fully visible above the tab bar
    And tapping "Yes, I’m in" does not open the sign-in dialog
