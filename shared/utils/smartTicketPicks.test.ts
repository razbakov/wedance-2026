import { describe, it, expect } from 'vitest'
import { suggestSmartTicket, getPricePerWorkshop } from './smartTicketPicks'
import type { TicketOption, Workshop } from '~/types/festival'

describe('suggestSmartTicket', () => {
  // Sample data
  const mockWorkshops: Workshop[] = [
    {
      id: 'w1',
      title: 'Salsa 101',
      time: '14:00',
      duration: 60,
      day: 'Friday',
      room: 'Main Hall',
      style: 'Salsa',
      level: 'Beginner',
      teacherId: 't1',
      goingCount: 45,
    },
    {
      id: 'w2',
      title: 'Bachata Basics',
      time: '14:00',
      duration: 60,
      day: 'Friday',
      room: 'Studio B',
      style: 'Bachata',
      level: 'Beginner',
      teacherId: 't2',
      goingCount: 38,
    },
    {
      id: 'w3',
      title: 'Salsa Advanced',
      time: '15:30',
      duration: 90,
      day: 'Saturday',
      room: 'Main Hall',
      style: 'Salsa',
      level: 'Advanced',
      teacherId: 't1',
      goingCount: 32,
    },
    {
      id: 'w4',
      title: 'Sunday Bootcamp',
      time: '13:00',
      duration: 120,
      day: 'Sunday',
      room: 'Main Hall',
      style: 'Salsa',
      level: 'Intermediate',
      teacherId: 't1',
      goingCount: 56,
    },
  ]

  const mockTickets: TicketOption[] = [
    { name: 'Full Pass', price: 250, days: [] },
    { name: 'Friday Pass', price: 60, days: ['Friday'] },
    { name: 'Saturday Pass', price: 80, days: ['Saturday'] },
    { name: 'Sunday Pass', price: 70, days: ['Sunday'] },
    { name: 'Fri-Sat Pass', price: 130, days: ['Friday', 'Saturday'] },
  ]

  it('should return null if no workshops selected', () => {
    const result = suggestSmartTicket([], mockTickets)
    expect(result).toBeNull()
  })

  it('should return null if no tickets available', () => {
    const result = suggestSmartTicket([mockWorkshops[0]], [])
    expect(result).toBeNull()
  })

  it('should suggest Full Pass when spanning all days', () => {
    // Selected: Fri, Sat, Sun (w1, w3, w4)
    const selected = [mockWorkshops[0], mockWorkshops[2], mockWorkshops[3]]
    const result = suggestSmartTicket(selected, mockTickets)

    expect(result).not.toBeNull()
    expect(result!.ticket.name).toBe('Full Pass')
    expect(result!.workshopsItCovers).toBe(3)
  })

  it('should suggest Friday Pass for Friday-only workshops', () => {
    const selected = [mockWorkshops[0], mockWorkshops[1]]
    const result = suggestSmartTicket(selected, mockTickets)

    expect(result).not.toBeNull()
    expect(result!.ticket.name).toBe('Friday Pass')
  })

  it('should skip sold out tickets', () => {
    const ticketsWithSoldOut: TicketOption[] = [
      { name: 'Full Pass', price: 250, days: [], soldOut: true },
      { name: 'Friday Pass', price: 60, days: ['Friday'] },
    ]

    const selected = [mockWorkshops[0]]
    const result = suggestSmartTicket(selected, ticketsWithSoldOut)

    expect(result).not.toBeNull()
    expect(result!.ticket.name).toBe('Friday Pass')
  })

  it('should prefer best-value ticket by price per workshop', () => {
    const tickets: TicketOption[] = [
      { name: 'Expensive Single Day', price: 100, days: ['Friday'] },
      { name: 'Cheap Single Day', price: 40, days: ['Friday'] },
    ]

    const selected = [mockWorkshops[0]]
    const result = suggestSmartTicket(selected, tickets)

    expect(result!.ticket.name).toBe('Cheap Single Day')
  })

  it('should respect workshop count limits', () => {
    const tickets: TicketOption[] = [
      { name: 'Limited 2-Workshop', price: 50, days: ['Friday'], workshopCount: 2 },
      { name: 'Unlimited', price: 120, days: ['Friday'] },
    ]

    const selected = [mockWorkshops[0], mockWorkshops[1]]
    const result = suggestSmartTicket(selected, tickets)

    expect(result).not.toBeNull()
    // Limited ticket covers 2 workshops at €50 = €25/workshop
    // Unlimited covers 2 workshops at €120 = €60/workshop
    expect(result!.ticket.name).toBe('Limited 2-Workshop')
  })

  it('should calculate correct value scores', () => {
    const selected = [mockWorkshops[0]]
    const result = suggestSmartTicket(selected, mockTickets)

    expect(result!.valueScore).toBeLessThan(0) // Negative (inverted) for higher score = better value
    expect(result!.workshopsItCovers).toBe(1)
  })

  it('should include reason string in result', () => {
    const selected = [mockWorkshops[0]]
    const result = suggestSmartTicket(selected, mockTickets)

    expect(result!.reason).toBeTruthy()
    expect(result!.reason).toContain('€')
  })

  it('should handle multi-day selection requiring Full Pass', () => {
    // Select workshops from Fri, Sat, Sun - no partial pass covers all
    const selected = [mockWorkshops[0], mockWorkshops[2], mockWorkshops[3]]
    const result = suggestSmartTicket(selected, mockTickets)

    expect(result!.ticket.name).toBe('Full Pass')
  })

  it('should prefer Fri-Sat pass over Full Pass when only Fri-Sat selected', () => {
    const selected = [mockWorkshops[0], mockWorkshops[2]]
    const result = suggestSmartTicket(selected, mockTickets)

    // Fri-Sat Pass: €130 for 2 workshops = €65/workshop
    // Full Pass: €250 for 2 workshops = €125/workshop
    expect(result!.ticket.name).toBe('Fri-Sat Pass')
  })

  it('should handle single workshop selection', () => {
    const selected = [mockWorkshops[3]]
    const result = suggestSmartTicket(selected, mockTickets)

    expect(result).not.toBeNull()
    expect(result!.ticket.name).toBe('Sunday Pass')
    expect(result!.workshopsItCovers).toBe(1)
  })

  it('should filter to viable tickets only', () => {
    // Select Saturday + Sunday, no pass covers both
    const selected = [mockWorkshops[2], mockWorkshops[3]]
    const result = suggestSmartTicket(selected, mockTickets)

    // Should fall back to Full Pass
    expect(result!.ticket.name).toBe('Full Pass')
  })
})

describe('getPricePerWorkshop', () => {
  it('should calculate price per workshop without limit', () => {
    const ticket: TicketOption = { name: 'Pass', price: 100, days: [] }
    const pricePerWorkshop = getPricePerWorkshop(ticket, 2)

    expect(pricePerWorkshop).toBe(50)
  })

  it('should respect workshop count limit', () => {
    const ticket: TicketOption = { name: 'Limited', price: 100, days: [], workshopCount: 2 }
    const pricePerWorkshop = getPricePerWorkshop(ticket, 4)

    // Only covers 2 workshops
    expect(pricePerWorkshop).toBe(50)
  })

  it('should handle zero workshops gracefully', () => {
    const ticket: TicketOption = { name: 'Pass', price: 100, days: [] }
    const pricePerWorkshop = getPricePerWorkshop(ticket, 0)

    expect(pricePerWorkshop).toBeFinite()
  })
})
