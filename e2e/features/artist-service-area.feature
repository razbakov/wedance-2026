Feature: Artist service area

  An artist keeps one home city and is also listed in every city they play in.

  @write
  Scenario: A Barcelona artist who also plays Munich is listed in Munich
    Given the test environment is safe to write
    And an artist based in Barcelona also plays in Munich
    When I open that artist's page
    Then I see "Also in"
    And that artist links to Munich
    When I open the Munich artists directory
    Then I see that artist
    And I see "Based in Barcelona"
