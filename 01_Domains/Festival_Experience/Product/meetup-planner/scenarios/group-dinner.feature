@epic-5 @mvp
Feature: Group Dinner
  As a Festival Dancer
  I want to join a group dinner during the festival
  so that I can meet new people in a relaxed setting instead of eating alone.

  Background:
    Given I am signed up for "Salsa Berlin 2026"
    And group dinners exist:
      | day      | timeSlot       | restaurant | joined | maxSize |
      | Friday   | 19:00 – 21:00  | La Piazza  | 4      | 6       |
      | Saturday | 19:30 – 21:30  | El Toro    | 2      | 6       |
      | Saturday | 20:00 – 22:00  |            | 5      | 6       |

  Rule: Dinner cards appear in the swipe deck with an orange gradient, utensils icon, and spots progress bar

    Scenario: Dinner card in the swipe deck
      When I see the "Friday dinner" card in the swipe deck
      Then I see an orange gradient card with a utensils icon
      And I see "Friday dinner" and "19:00 – 21:00"
      And I see "La Piazza"
      And I see "Meet new friends over a meal. Limited spots per table."
      And I see a progress bar showing "4/6"
      And I see a badge "Swipe right to join"

    Scenario: Dinner card without restaurant name
      When I see the second "Saturday dinner" card
      Then I see "Saturday dinner" and "20:00 – 22:00"
      And no restaurant name is shown

  Rule: Swiping right on a dinner card joins that dinner

    Scenario: Join a dinner by swiping right
      When I swipe right on the "Friday dinner" card
      Then the counter updates to "5/6"
      And the card shows "You're in!"

  Rule: Dinners also appear in the "Share a meal" section of the cart sidebar

    Scenario: Cart sidebar dinner list
      When I expand "Share a meal" in the cart sidebar
      Then I see "Join a group dinner with fellow dancers — meet new friends over a meal."
      And I see each dinner with day, time slot, restaurant (if any), a progress bar, and a badge showing "X/6 joined"

    Scenario: Join a dinner from the cart sidebar
      When I tap "Join this dinner" on the "Friday" dinner in the cart
      Then the counter updates to "5/6 joined"
      And the button changes to a checkmark with "You're in!"

    Scenario: Full dinner
      Given the "Saturday 20:00" dinner has 6/6 joined
      When I view that dinner in the cart sidebar
      Then I see "Full" instead of a join button

  Rule: Joining a dinner is gated behind freemium paywall

    Scenario: No free spots left when joining dinner
      Given all 10 free spots have been claimed
      When I swipe right on a dinner card
      Then the paywall modal appears: "Unlock social activities" with "Unlock for €1"

  Rule: Dancers are assigned to groups of 4–6 by the organizer (manual)

    Scenario: Organizer assigns dinner groups
      Given 5 dancers signed up for "Friday" dinner
      When the organizer assigns groups
      Then a group of 4–6 is created
      And every signed-up dancer is assigned to a group

  Rule: Each group member receives a group chat link

    Scenario: Chat link sent after group assignment
      Given I am assigned to a dinner group with "Carlos" and "Anna"
      When the groups are finalized
      Then all group members receive a WhatsApp group link

  Rule: Restaurant is a surprise — revealed on the day of the dinner

    Scenario: Restaurant revealed on dinner day
      Given I am in the "Friday" dinner group
      And today is "Friday, June 12, 2026"
      When the dinner details are revealed
      Then I receive the restaurant name and address

    Scenario: Restaurant hidden before dinner day
      Given I am in the "Friday" dinner group
      And today is "Thursday, June 11, 2026"
      When I check my dinner details
      Then I see "Restaurant will be revealed on Friday"
