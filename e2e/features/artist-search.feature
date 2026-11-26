Feature: Find an artist for a private event

  An organizer filters /artists by where the artist plays, including artists
  who travel, and by wedding, birthday or corporate.

  Scenario: A traveling artist shows up for a wedding in another city
    Given the test environment is safe to write
    And an artist in Barcelona travels to Munich for weddings
    And an artist in Munich plays birthdays
    When I open Artists from the home page
    And I filter artists to the area "Munich"
    Then I see the traveling artist marked as traveling
    And I see the Munich birthday artist
    When I filter artists to the event "Wedding"
    Then I see only the traveling artist
