@epic-8 @mvp
Feature: Post-festival feedback
  As a Festival Dancer
  I want to endorse, rate, and give feedback on dances
  so that I can help improve future events and build my dance reputation.

  Background:
    Given I am signed in at "Salsa Berlin 2026"
    And "Carlos" and I are mutual matches in My Dance List

  # Note: Feedback is collected inline in the "My Dance List" section of the
  # swipe deck, not on a separate post-festival page. The dance list shows
  # mutual matches (both swiped right) with a danced/not-danced tracker.

  Rule: My Dance List shows mutual matches with a danced progress tracker

    Scenario: Dance list with progress
      Given I have 3 mutual matches and marked 1 as danced
      When I view "My Dance List" below the swipe deck
      Then I see the header "My Dance List" with a badge "1/3"
      And I see each match with their photo, name, role badge, and style badges

  Rule: Marking a dancer as "danced" unlocks endorsement, rating, and feedback

    Scenario: Mark a dance as completed
      When I tap the circle checkbox next to "Carlos"
      Then the checkbox fills green
      And the endorsement, rating, and feedback panel expands

  Rule: Endorsing a dance style confirms you danced together in that style

    Scenario: Endorse a style
      Given I marked "Carlos" as danced and the panel is expanded
      When I see "Endorse a dance style:" with buttons for each of Carlos's styles
      And I tap the heart button next to "Bachata"
      Then the heart fills pink and the button highlights
      And I see "Endorsement will be public once Carlos also confirms the dance."

    Scenario: Mutual endorsement
      Given I endorsed "Bachata" for Carlos
      And Carlos also endorsed "Bachata" for me
      Then I see "Both confirmed! Endorsements are public."

  Rule: Dancers can rate the dance with 1–5 stars

    Scenario: Rate a dance
      Given I marked "Carlos" as danced
      When I see "Rate the dance:" with 5 star buttons
      And I tap the 4th star
      Then stars 1–4 fill amber
      And star 5 remains gray

  Rule: Written feedback uses a mutual reveal — both must send to see each other's text

    Scenario: Send written feedback
      Given I marked "Carlos" as danced
      When I type "Great connection and musicality!" in the feedback textarea
      And I tap "Send Feedback"
      Then I see my feedback in a card: "Great connection and musicality!"
      And I see "Feedback sent! Will be revealed once Carlos also sends theirs."

    Scenario: Both sent — mutual reveal
      Given I sent feedback to Carlos
      And Carlos sent feedback to me: "Amazing follow, very comfortable!"
      Then I see two cards:
        | from   | text                                 |
        | Me     | Great connection and musicality!     |
        | Carlos | Amazing follow, very comfortable!    |
      And Carlos's card shows his star rating

    Scenario: Draft state — no feedback sent yet
      Given I marked "Carlos" as danced but haven't sent feedback
      Then I see a textarea with placeholder "What did you enjoy about dancing together?"
      And the "Send Feedback" button is disabled until I type something
