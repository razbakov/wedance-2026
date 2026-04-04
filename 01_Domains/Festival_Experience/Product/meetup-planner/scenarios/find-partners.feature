@epic-6 @mvp
Feature: Find Dance Partners
  As a Festival Dancer
  I want to discover and connect with compatible dance partners
  so that I can arrange to meet them at the festival.

  Background:
    Given I am signed up for "Salsa Berlin 2026" as "Follow" with "Bachata 🌶️🌶️"

  Rule: Dancer cards in the swipe deck show photo, name, role, styles with levels, bio, and mutual info

    Scenario: Dancer card content
      Given "Carlos" is in the deck as "Lead" with "Bachata 🌶️🌶️", bio "Festival regular from Spain", and 2 mutual friends
      When I see Carlos's card
      Then I see his photo with a bottom gradient overlay
      And I see "Carlos" with style badge "Bachata 🌶️🌶️"
      And I see his bio "Festival regular from Spain"
      And I see "2 mutual friends"

    Scenario: Professional dancer card shows booking badge
      Given "Elena" is a taxi dancer with hourly rate €10
      When I see Elena's card
      Then I see a badge "Bookable · €10/h"

  Rule: The swipe deck interleaves dancer cards with dinner and activity cards

    Scenario: Mixed deck ordering
      Given 8 dancers, 3 dinners, and 4 activities exist
      When I open the "Shall we dance?" section
      Then I see cards interleaved: after every 3 dancers, a dinner or activity card is inserted
      And I see "15 more to discover" below the swipe buttons

    Scenario: All cards swiped
      Given I have swiped through all cards
      Then I see a Sparkles icon and "You've seen everyone! Check back later for new dancers."

  Rule: Swiping right likes a dancer, swiping left passes

    Scenario: Like a dancer
      When I swipe right on Carlos's card
      Then Carlos is added to my liked list
      And the next card appears

    Scenario: Pass on a dancer
      When I swipe left on Carlos's card
      Then the card is dismissed
      And the Undo button appears

    Scenario: Undo a pass
      Given I just swiped left on "Carlos"
      When I tap the Undo button
      Then Carlos's card reappears

  Rule: Mutual matches appear in "My Dance List" with a danced/not-danced progress tracker

    Scenario: Mutual match appears in dance list
      Given I swiped right on "Carlos"
      And Carlos also swiped right on me
      When I scroll below the swipe deck
      Then I see "My Dance List" with a progress badge "0/1"
      And Carlos appears with his photo, name, role, and styles

    Scenario: Dance list only shows mutual matches
      Given I swiped right on "Carlos" but Carlos did not swipe right on me
      Then Carlos does not appear in My Dance List

  Rule: Pending likes banner shows when dancers have liked you

    Scenario: Dancers already liked you
      Given 3 dancers swiped right on me and I haven't seen their cards yet
      When I view the "Shall we dance?" section
      Then I see a pink banner "3 dancers already want to dance with you!"

  Rule: Anonymous users begin onboarding on first right-swipe

    Scenario: First right-swipe starts onboarding flow
      Given I am not signed in
      And the next card in the deck is the Dance Card
      When I swipe right on the first dancer card
      Then the Dance Card appears for role and style selection
