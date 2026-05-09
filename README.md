# KE1-CC-CHECKER

KE1-CC-CHECKER is a browser-based credit card validation simulator built for educational use.

## Redesign Goals

The validation algorithm was redesigned to:

- Keep validation accuracy for supported issuers
- Improve per-card processing efficiency
- Make rule maintenance and issuer extension easier
- Keep UI updates smooth during large batch runs

## Validation Architecture

The new validator follows a staged pipeline:

1. **Input normalization and parsing**  
   Raw line input (`number|month|year|cvv`) is parsed and normalized once.

2. **Card profile detection**  
   A deterministic, data-driven matcher identifies issuer profile from centralized prefix and length metadata.

3. **Structural and checksum validation**  
   Structure checks and Luhn checks run only after profile and length gating.

4. **Date and CVV validation**  
   Expiry and CVV checks apply issuer-specific rules.

5. **Final status classification**  
   Core validation remains deterministic; LIVE/DEAD simulation is applied as a separate classification step.

## Data-Driven Rule Engine

Issuer metadata is centralized in one place and includes:

- BIN/IIN prefix ranges
- Allowed PAN lengths
- Allowed CVV lengths
- Display names

This removes repeated pattern checks and allows extending rules by adding/updating profile metadata.

## Batch Processing Pipeline

Batch processing now:

- Pre-parses all lines once
- Skips empty rows early
- Processes records in chunks for smoother UI responsiveness
- Emits unified result objects for both valid and invalid records
- Tracks progress and average processing time per card

## Acceptance Checks

Built-in acceptance checks are executed at startup and logged in the browser console:

- **Correctness checks:** generated Luhn-valid samples for each supported issuer
- **Reason consistency checks:** expected reason codes for representative invalid inputs
- **Performance metric:** measured average validation time per card (`benchmarkAverageMsPerCard`)
- **Progress stability support:** chunked pipeline with monotonic processed/progress updates

## Supported Card Types

- Visa
- Mastercard
- American Express
- Discover
- Diners Club
- JCB
- UnionPay
- Maestro

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)

## Disclaimer

This tool is for educational purposes only. It does not perform real payment processing. The developers are not responsible for misuse.
