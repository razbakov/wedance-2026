@epic-3 @mvp
Feature: Share a Ride
  As a Festival Dancer
  I want to post or find rides to the festival
  so that I can split costs and not travel alone.

  Background:
    Given I am signed up for "Salsa Berlin 2026"

  Rule: The "Share a ride" section is in the cart sidebar with an Offering/Looking toggle

    Scenario: Collapsed state shows rider count
      Given 3 dancers have posted rides
      When I see the cart sidebar
      Then I see "Share a ride" with a Car icon and "3 sharing" label

    Scenario: Expanded state shows toggle and rider list
      When I expand "Share a ride" in the cart sidebar
      Then I see "Offering a ride" and "Looking for a ride" toggle buttons
      And I see "Others sharing rides" with their avatars, names, origin cities, and seats

  Rule: A dancer can post a ride offer by selecting "Offering a ride"

    Scenario: Post a ride offer
      When I expand "Share a ride" and select "Offering a ride"
      Then I see form fields: "From city", "Departure date", and "Seats available"
      When I fill in:
        | field          | value      |
        | From city      | Munich     |
        | Departure date | 2026-06-11 |
        | Seats available| 3          |
      And I tap "Post my ride"
      Then my ride appears in the "Others sharing rides" list
      And the "Share a ride" checklist item is marked complete

  Rule: A dancer can express interest by selecting "Looking for a ride"

    Scenario: Post a ride request
      When I expand "Share a ride" and select "Looking for a ride"
      Then I see form fields: "From city" and "Preferred date"
      When I fill in:
        | field          | value      |
        | From city      | Munich     |
        | Preferred date | 2026-06-11 |
      And I tap "Post my ride"
      Then my request appears as "looking from Munich"

  Rule: Others' ride posts show avatar, name, type, origin, and seats

    Scenario: View other riders
      Given these rides are posted:
        | name     | type     | origin | seats |
        | Maria G. | offering | Munich | 3     |
        | Carlos R.| looking  | Berlin |       |
      When I expand "Share a ride"
      Then I see "Maria G." with "from Munich · 3 seats"
      And I see "Carlos R." with "looking from Berlin"

  Rule: Posting a ride is gated behind freemium paywall

    Scenario: Free spot available
      Given free spots are still available
      When I tap "Post my ride"
      Then my ride is posted and I claim a free spot

    Scenario: No free spots left
      Given all 10 free spots have been claimed
      When I tap "Post my ride"
      Then the paywall modal appears with "Unlock social activities"
      And I see "All 10 free spots have been claimed. Unlock rides, dinners, and activities for just €1."
      And I see an "Unlock for €1" button linking to Stripe

  Rule: Matched riders receive a group chat link

    Scenario: Group chat after matching
      Given I offered a ride from "Munich" and a rider requested from "Munich"
      When the ride group is finalized
      Then both riders receive a WhatsApp group link
