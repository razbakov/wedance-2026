@write
Feature: Organiser shortlist

  An organiser saves an artist to a private booking list without following them.
  The artist is not told. Write-path: seeds a local artist and signs in.

  Scenario: Shortlist an artist without following them
    Given the test environment is safe to write
    And I am signed in as "Organiser"
    And a bookable artist is listed for shortlisting
    And I am on the home page
    When I open Artists
    And I open the bookable artist
    Then the artist can be followed and shortlisted
    When I shortlist the artist
    Then I am still not following the artist
    When I open my shortlist
    Then I see the artist on the shortlist board
    When I tag the shortlist as a wedding and note "Ask about travel"
    Then the shortlist shows the wedding tag
    When I remove the artist from the shortlist
    Then the shortlist is empty
