@smoke
Feature: Homepage audience tabs

  The signed-out homepage has Everyone, Artists, Organizers and Venues.
  Everyone is /. The others are ?tab=, and a shared link opens on that tab.

  Scenario: Open the Artists tab from the homepage
    Given I am on the home page
    Then the landing headline is "Your plan, ready for Instagram."
    When I choose the "Artists" audience
    Then the landing headline is "Your year, told in one place."
    And the landing address is "/?tab=artists"

  Scenario: A venues link opens on Venues
    When I open the landing address "/?tab=venues"
    Then the landing headline is "Fill your space with dancers."
