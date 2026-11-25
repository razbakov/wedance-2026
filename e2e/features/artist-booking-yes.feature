Feature: An artist keeps a booking on WeDance

  A yes on Business → Bookings emails the asker and, when they have a page,
  drafts their event with the artist confirmed and the budget as the offer.

  Background:
    Given the test environment is safe to write
    And an organizer has sent a booking request to an artist page

  Scenario: Yes, book it saves the booking on the asker's draft
    Given I am signed in as the booked artist
    When I open the artist's bookings
    And I click "Yes, book it"
    Then I see "Booked"
    And the artist is on a draft of the organizer's event
