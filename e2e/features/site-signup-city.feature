@smoke @write
Feature: A site sign-up can ask for a city

  A page owner can turn on a City field for a sign-up form. The city a fan
  types is stored on the contact and shows up in Contacts, where it can be
  filtered.

  Scenario: A city from a sign-up shows in Contacts
    Given the test environment is safe to write
    And a page whose sign-up form asks for a city
    Then the sign-up section asks for a city and not a promo code
    When fans sign up from "Munich" and "Berlin"
    And I open that page's contacts
    Then I see a contact from "Munich"
    And I see a contact from "Berlin"
    When I filter contacts to the city "Munich"
    Then I see a contact from "Munich"
    And I do not see a contact from "Berlin"
