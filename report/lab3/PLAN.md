# Laboratory 3 implementation plan

Source of truth: `/Users/mila/Downloads/Лабораторна 3_Практикум TDD.docx`, read in full on 2026-10-26.
Baseline: branch `feature/lab2-vitest-installment`, commit `3219dc2`; clean working tree; 145 passing tests.

The user's current request explicitly authorizes implementation, commits, a push and a pull request. The global knowledge base also provides autonomous local development for UNIK projects.

1. Implement parking requirements in their exact order, recording separate Red, Green and Refactor commits with captured process output and source snapshots.
2. Implement insurance with seven cycles: validation; initial base; age categories; inexperienced-driver surcharge; accident-free discount; discount cap; final monetary rounding and interactions.
3. Preserve Labs 1/2. Keep their coverage thresholds and add an insurance-specific branch threshold of 90%.
4. Use Playwright screenshots of original process-output viewers and actual HTML coverage. Retain exact stdout and stderr, command, timestamps, exit status and source snapshots.
5. Generate Ukrainian academic DOCX/PDF, include complete listings and actual measurements, and inspect every PDF page.
6. Inspect authenticated GitHub access, push this feature branch and create a PR if available. Peer review remains explicitly pending unless a real peer repository is identified.

## Explicit requirements versus chosen policy

The methodology specifies age-based prices, a surcharge below 3 years' driving experience, and an accident-free discount capped at 30%. It supplies no base prices, age buckets, surcharge amount, or discount accrual formula.

Chosen educational policy (not supplied by the methodology):

- Vehicle age is a nonnegative safe integer in completed years. Ages 0–3 cost 3,000 UAH, 4–10 cost 4,000 UAH, 11+ cost 5,000 UAH.
- Driver experience is a finite nonnegative number of years; fractional years are accepted. Experience <3 attracts a 25% surcharge.
- `accidentFreeDiscountPercent` is an optional finite nonnegative percentage, default 0. It represents the driver's established accident-free entitlement; eligibility/accrual is outside this calculator. Fractional percentages and values above 30 are accepted; the effective percentage is capped at 30.
- Apply the surcharge to the base, then the discount to the increased amount, and round only the final result to two decimals (positive half-up). No intermediate rounding.
- Invalid numeric fields throw `RangeError` with field-specific codes. No external API, database or UI changes.

Parking follows the methodology's single capped calculation, including durations greater than one day: no unspecified multi-day billing rule is invented. Decimal rounding has a directly tested helper because all fixed public parking tariffs produce integer results.
