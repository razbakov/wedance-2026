Feature: Artist song list, services and pricing

  An organizer planning a night can read a song list, the services an artist
  offers, and a price only when the artist wrote one (RAZ-1084).

  @write
  Scenario: An organizer reads an artist's song list, services and pricing
    Given the test environment is safe to write
    And an artist "los" offers "Live show" and "Wedding set", the song "Candela", and the price "On request"
    And an artist "quiet" has not stated a song list, services or a price
    When I open the artist page "los"
    Then I see "What they offer"
    And I see "Live show"
    And I see "Wedding set"
    And I see "Candela"
    And I see "On request"
    And the artist page does not list "Party set"
    When I open the artist page "quiet"
    Then I see "No offer yet"
    And the artist page states no offer

  @write
  Scenario: An artist states a song and a price
    Given the test environment is safe to write
    And an artist "los" offers "Live show" and "Wedding set", the song "Candela", and the price "On request"
    And I am signed in as the artist "los"
    When I open the editor for the artist "los"
    And I add the song "Chan Chan"
    And I set the pricing note to "Ask for a quote"
    And I save the artist page
    Then I see "Saved"
    When I open the artist page "los"
    Then I see "Chan Chan"
    And I see "Ask for a quote"
    And I see "Candela"
