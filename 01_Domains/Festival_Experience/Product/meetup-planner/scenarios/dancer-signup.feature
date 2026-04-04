@epic-2 @mvp
Feature: Dancer sign-up
  As a Festival Dancer
  I want to sign up quickly with my dance profile
  so that I can start discovering dancers and joining activities.

  Background:
    Given a festival "Salsa Berlin 2026" exists with available styles "Salsa", "Bachata", "Kizomba"

  Rule: Swiping right on the first dancer card reveals the Dance Card onboarding step

    Scenario: First right-swipe advances to Dance Card
      Given I am not signed in
      And the swipe deck shows a dancer card with the Dance Card queued next
      When I swipe right on the first dancer card
      Then the dancer card flies away
      And the Dance Card appears with title "Your dance card"

    Scenario: Left-swipe on first dancer passes without triggering onboarding
      Given I am not signed in
      When I swipe left on the first dancer card
      Then the card is dismissed
      And the Dance Card appears next (it was at position 1)

  Rule: The Dance Card collects role and styles with levels using toggle buttons

    Scenario: Select role and styles on the Dance Card
      Given the Dance Card is showing
      And I see a Lead/Follow toggle and a style grid with level buttons
      When I tap "Follow" (it highlights in violet)
      And I tap the 🌶️🌶️ button next to "Salsa" (Intermediate)
      And I tap the 🌶️ button next to "Bachata" (Beginner)
      Then the Continue button shows "Continue · Follow · 2 styles"
      And the Continue button is enabled

    Scenario: Deselect a role by tapping it again
      Given I selected "Lead" on the Dance Card
      When I tap "Lead" again
      Then no role is selected
      And the Continue button is disabled

    Scenario: Deselect a style level by tapping it again
      Given I selected Intermediate for "Salsa"
      When I tap the 🌶️🌶️ button next to "Salsa" again
      Then "Salsa" is deselected
      And the style count decreases by 1

    Scenario: Continue is disabled without role and style
      Given the Dance Card is showing
      And I have not selected a role or any styles
      Then the Continue button shows "Continue · ... · 0 styles"
      And it is disabled

  Rule: After the Dance Card, the Profile Card appears with a live preview

    Scenario: Profile Card shows live preview as I type
      Given I completed the Dance Card as "Follow" with "Salsa 🌶️🌶️"
      And the Profile Card is now showing
      Then I see a card-sized live preview with a camera icon placeholder
      And the preview shows "Your name" and "Your city · Your bio" as placeholders
      And my selected role badge "Follow" appears on the preview
      And my style badge "Salsa 🌶️🌶️" appears on the preview

    Scenario: Fill in the profile form below the card
      Given the Profile Card is showing
      When I upload a photo
      And I type "Maria" in the Name field
      And I type "Berlin" in the City field
      And I type "Love dancing on weekends" in the Bio field
      Then the live preview updates to show my photo, "Maria", "Follow" badge, "Berlin · Love dancing on weekends"

    Scenario: Name and city are required for Save profile
      Given the Profile Card is showing
      And I have not entered name or city
      Then the "Save profile" button is disabled

  Rule: Tapping "Save profile" triggers the sign-up modal with "Almost there!" headline

    Scenario: Save profile opens sign-up modal
      Given I filled in name "Maria" and city "Berlin" on the Profile Card
      When I tap "Save profile"
      Then the sign-up modal appears with headline "Almost there! Sign up to start discovering"
      And I see "Join the festival community in seconds."
      And I see "Continue with Google" button (outline style)
      And I see "Sign up with Email" button

    Scenario: Sign in completes onboarding and resumes the swipe deck
      Given the sign-up modal is showing after Profile Card
      When I tap "Continue with Google"
      Then I am signed in
      And the modal closes
      And the onboarding cards are removed from the deck
      And normal dancer/dinner/activity cards resume

  Rule: Other actions trigger the sign-up modal with context-specific headlines

    Scenario Outline: Context-specific sign-up triggers
      Given I am not signed in
      When I <action>
      Then the sign-up modal appears with headline "<headline>"

      Examples:
        | action                              | headline                                     |
        | tap "Save" on my workshop plan      | Sign up to save your workshop plan             |
        | tap "Share" on my workshop plan     | Sign up to share your plan                     |
        | tap "Be their partner" on a workshop| Sign up to find a dance partner                |

  Rule: Freemium badge on the "Shall we dance?" header shows remaining free spots

    Scenario: Free spots remaining
      Given 7 of 10 free spots have been claimed
      When I view the "Shall we dance?" section header
      Then I see a green badge "3 free spots left"

    Scenario: All free spots taken
      Given all 10 free spots have been claimed
      When I view the "Shall we dance?" section header
      Then I see an amber badge "From €1"
