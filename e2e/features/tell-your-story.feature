@smoke
Feature: Tell your story after booking

  Sharing a night waits until the spot is booked, then opens the story
  already on My plan. Going together stays a lift, a room or a dinner.

  Scenario: Tell your story after booking a night this week
    Given I am on the tell-your-story sketch
    Then Going together does not offer to share a plan
    When I choose "Booked · this week"
    Then Tell your story opens the week on My plan
    When I choose "Booked · festival later"
    Then Tell your story opens the year on My plan
    When I choose "Booked · a class"
    Then there is no story button
