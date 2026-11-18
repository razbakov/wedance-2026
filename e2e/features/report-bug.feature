@smoke
Feature: Report a bug from the site

  A visitor can report a problem from the footer, and can email the team,
  without looking for an icon.

  Scenario: Footer opens the report and shows the support email
    Given I am on the home page
    Then the footer offers hello@wedance.vip
    When I click "Report a problem" in the footer
    Then I see the talk-to-us choices
