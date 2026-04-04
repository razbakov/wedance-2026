@epic-1 @mvp
Feature: Festival landing page
  As a Festival Dancer
  I want to see a festival page with activities and signed-up dancers
  so that I can decide whether to join and feel confident real people are involved.

  Background:
    Given a festival "Salsa Open Berlin 2026" exists with dates "2026-06-19" to "2026-06-21" at venue "Alte Münze" in "Berlin, Germany"

  Rule: Festival hero shows logo, name, date range, venue, attendee count, and social links

    Scenario: Dancer views festival hero
      Given the festival has 487 attendees and social links for Instagram and Facebook
      When I open the festival page
      Then I see the festival logo as a circular image
      And I see the name "Salsa Open Berlin 2026"
      And I see "Jun 19 – Jun 21, 2026 · Alte Münze"
      And I see "487 dancers planning"
      And I see Instagram and Facebook icons

  Rule: The festival page has sections navigable via sticky tabs

    Scenario: Navigate between sections
      When I open the festival page
      Then I see a sticky navigation bar with tabs: About, Shall we dance?, Lineup, Schedule, Venue
      And tapping a tab scrolls to that section

  Rule: The "Shall we dance?" section shows the swipe deck with a freemium badge

    Scenario: Freemium badge when free spots available
      Given 7 of 10 free spots have been claimed
      When I scroll to "Shall we dance?"
      Then I see the section header with a green badge "3 free spots left"
      And below it: "Swipe to discover dancers, group dinners, and activities happening around the festival."

    Scenario: Freemium badge when free spots full
      Given all 10 free spots have been claimed
      When I scroll to "Shall we dance?"
      Then I see the section header with an amber badge "From €1"

  Rule: Dancer cards in the swipe deck show name, photo, role, styles with chili levels, and bio

    @wip
    Scenario: Dancer card with styles and endorsements
      Given a dancer "Carlos" is signed up as "Lead" with:
        | style   | level        | endorsements |
        | Bachata | Intermediate | 3            |
      When I see Carlos's card in the swipe deck
      Then I see Carlos's photo with a gradient overlay
      And I see "Carlos" with style badge "Bachata 🌶️🌶️" and a heart icon showing "3"
      And I see his bio text

    @wip
    Scenario: Dancer card shows mutual workshops
      Given I have "Fri 10:00 · Bachata Basics" in my plan
      And "Carlos" also has that workshop
      When I see Carlos's card
      Then I see "1 workshop in common:" with the workshop listed

  Rule: The "My Space" section only appears when signed in

    Scenario: Signed-in user sees My Space
      Given I am signed in
      When I scroll down the festival page
      Then I see a "My Space" section between "Shall we dance?" and "Lineup"

    Scenario: Anonymous user does not see My Space
      Given I am not signed in
      Then the "My Space" section is not visible

  Rule: After matching, dancer receives a "Your festival plan is ready" message

    @wip
    Scenario: Plan summary after matches
      Given I have been matched to a ride from "Munich" and a dinner on "Friday"
      When my festival plan is generated
      Then I receive a "Your festival plan is ready" message with my ride and dinner details
