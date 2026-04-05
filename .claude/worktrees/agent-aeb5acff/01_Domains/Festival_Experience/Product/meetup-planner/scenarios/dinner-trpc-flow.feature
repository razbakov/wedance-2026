@epic-5 @mvp @trpc
Feature: Dinner Join/Leave via tRPC
  As a Festival Dancer
  I want dinner join and leave actions to persist to the backend
  so that my dinner choices are saved and visible across sessions.

  Background:
    Given I am signed up for "Salsa Berlin 2026"

  Rule: Dinners are loaded from the backend on page mount

    Scenario: Dinner list fetched from tRPC on page load
      When the festival page loads
      Then dinners are fetched from the tRPC dinner.list endpoint
      And each dinner shows day, time slot, joined count, and max size

    Scenario: Empty dinner list for unknown festival
      Given I navigate to an unknown festival slug
      When the festival page loads
      Then the dinner list is empty
      And no error is shown to the user

  Rule: Joining a dinner calls tRPC dinner.join and updates UI optimistically

    Scenario: Authenticated user joins a dinner
      Given I am signed in
      And the "Friday 19:00" dinner has available spots
      When I join the "Friday" dinner
      Then the UI immediately shows "You're in!" (optimistic)
      And the joined count increments by 1
      And a tRPC dinner.join mutation is sent to the backend
      And the backend creates a dinner_signups record

    Scenario: Join rolls back on network failure
      Given I am signed in
      And the backend is unreachable
      When I join the "Friday" dinner
      Then the UI briefly shows "You're in!"
      But after the network error, the UI reverts
      And the joined count returns to its original value

    Scenario: Duplicate join returns alreadyJoined
      Given I am signed in
      And I have already joined the "Friday" dinner
      When I attempt to join the "Friday" dinner again
      Then the backend returns alreadyJoined: true
      And the UI count should not double-increment

    Scenario: Unauthenticated user cannot join
      Given I am not signed in
      When I attempt to join the "Friday" dinner
      Then the backend returns UNAUTHORIZED error
      And the dinner state remains unchanged

    Scenario: Full dinner cannot be joined
      Given the "Saturday 20:00" dinner has 6/6 joined
      When I attempt to join the "Saturday 20:00" dinner
      Then the backend returns "Dinner is full" error
      And the UI shows "Full" badge

  Rule: Leaving a dinner calls tRPC dinner.leave and updates UI optimistically

    Scenario: Authenticated user leaves a dinner
      Given I am signed in
      And I have joined the "Friday" dinner
      When I leave the "Friday" dinner
      Then the UI immediately removes "You're in!" (optimistic)
      And the joined count decrements by 1
      And a tRPC dinner.leave mutation is sent to the backend
      And the backend deletes the dinner_signups record
      And any dinner_group_members record is also removed

    Scenario: Leave rolls back on network failure
      Given I am signed in
      And I have joined the "Friday" dinner
      And the backend is unreachable
      When I leave the "Friday" dinner
      Then the UI briefly shows the leave
      But after the network error, the UI reverts to "You're in!"
      And the joined count returns to its original value

  Rule: Auth token is sent via Bearer header

    Scenario: tRPC client includes Bearer token from session cookie
      Given I have a valid session cookie "wedance-session"
      When any tRPC request is made
      Then the Authorization header contains "Bearer <token>"
      And the backend resolves the dancer identity from the session
