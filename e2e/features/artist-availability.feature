@write
Feature: Artist availability

  An organiser can see the weekly times an artist published for a private
  event, a wedding or a corporate booking (RAZ-1087).

  Scenario: An organiser sees when an artist is free
    Given the test environment is safe to write
    And a test artist "qa-artist-1087" is free on Monday from "18:00" to "23:00"
    When I open the artist page "qa-artist-1087"
    Then I see the artist is free on "Monday" from "18:00–23:00"
    When I open the booking page for "qa-artist-1087"
    Then I see the artist is free on "Monday" from "18:00–23:00"
