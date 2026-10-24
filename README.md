# FindBack AI

**AI-Powered Lost & Found Platform**

FindBack AI is a web application designed to help people recover lost belongings by connecting lost item reports with found item reports through AI-assisted matching.

## Key Features

* Lost and Found item reporting
* AI-powered potential matching using Google Gemini
* Match scores and explanations
* In-app notifications
* Centralized Admin claim review
* Handover scheduling
* Private ownership checks
* OTP-based handover confirmation

## Workflow

1. A user submits a Lost Item Report.
2. Another user submits a Found Item Report.
3. Gemini AI analyzes relevant reports and identifies potential matches.
4. The owner reviews the match and submits a claim request.
5. The Global Admin reviews and decides the claim.
6. The finder provides handover details.
7. The finder enters the handover OTP.
8. A successful OTP verification closes the case as `RETURNED`.

## Technology

* Frontend: See the project source files.
* Backend and database: See the exported project configuration.
* AI integration: Google Gemini API, if configured.

## Security

API keys, passwords, authentication tokens, and private ownership details must not be committed to the public repository.

## Setup

Refer to the project configuration and the applicable platform documentation for installation, environment variables, and external service setup.

**Note:** Features and setup requirements depend on the exported source code and configured backend services.
