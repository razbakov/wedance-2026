@follow
Feature: Followers are contacts the page can email (RAZ-1092)

  A click on Follow makes the dancer one of the page's contacts, with their
  name and email, and the page may email them. The button says so first.

  @write
  Scenario: A dancer follows an artist and shows up in the artist's Contacts
    Given the test environment is safe to write
    And an artist page run by its owner
    And I am signed in as the fan
    When I open the artist page
    Then I am told that following lets the artist email me
    When I tap Follow
    Then the button says "Following"
    When the owner opens the artist's Contacts
    Then the fan is listed with their email as "Followed your page"
    And the page can email 1 contact
