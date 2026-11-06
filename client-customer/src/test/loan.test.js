import { describe, expect, test } from 'vitest';
import { loanPlan } from '../components/LoanCalculator';

describe('loanPlan (reducing balance)', () => {
  const plan = loanPlan(600_000_000, 30, 60, 12);

  test('splits the price into down payment and loan', () => {
    expect(plan.down).toBe(180_000_000);
    expect(plan.loan).toBe(420_000_000);
  });

  test('first month pays interest on the whole loan, last month on one share', () => {
    expect(plan.first).toBeCloseTo(7_000_000 + 4_200_000);
    expect(plan.last).toBeCloseTo(7_000_000 + 70_000);
  });

  test('yearly schedule adds up to the totals and ends with nothing owed', () => {
    expect(plan.years).toHaveLength(5);
    const interest = plan.years.reduce((s, y) => s + y.interest, 0);
    const paid = plan.years.reduce((s, y) => s + y.paid, 0);
    expect(interest).toBeCloseTo(plan.totalInterest, 0);
    expect(paid).toBeCloseTo(plan.loan + plan.totalInterest, 0);
    expect(plan.years.at(-1).remaining).toBe(0);
    expect(plan.total).toBeCloseTo(600_000_000 + plan.totalInterest);
  });

  test('a 0% loan costs exactly the car price', () => {
    const free = loanPlan(500_000_000, 20, 12, 0);
    expect(free.totalInterest).toBe(0);
    expect(free.first).toBeCloseTo(free.last);
  });

  test('a term that is not whole years still ends at zero', () => {
    const odd = loanPlan(300_000_000, 50, 18, 9);
    expect(odd.years).toHaveLength(2);
    expect(odd.years[1].remaining).toBe(0);
  });
});
