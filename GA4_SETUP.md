# WiserShifts GA4 measurement plan

## What the code now tracks

The app uses one Measurement ID: `G-20LSFMFPL1`. Updating your existing GA4 web
stream's name and URL to WiserShifts does not require a new ID or erase history.
You can override the ID using the Netlify build variable `VITE_GA_MEASUREMENT_ID`.
Do not reinstall the old inline script alongside this implementation, or add a
second pageview implementation through Google Tag Manager.

| Event                                 | Trigger                                                                 | Recommended key event?                     |
| ------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| `page_view`                           | Initial route and changes between public pages or known workspace areas | No                                         |
| `book_demo_click`                     | Calendly link click, or enterprise quote button                         | No: intent only                            |
| `signup_click`                        | Link to organization signup                                             | No                                         |
| `sign_up`                             | Organization signup API succeeds                                        | Yes                                        |
| `login_click`                         | Link to login/workspace finder                                          | No                                         |
| `login`                               | Staff login API succeeds and auth state is updated                      | No: customer usage                         |
| `workspace_selected`                  | Workspace finder successfully resolves a workspace, before redirect     | No                                         |
| `calculator_summary_requested`        | Calculator email-summary API accepts the request                        | Optional secondary lead signal, not a demo |
| `file_download`                       | Calculator PDF or payroll CSV download is initiated                     | No                                         |
| `begin_checkout`                      | Backend returns a checkout URL, before navigating to Stripe             | No: not payment                            |
| `subscription_change_requested`       | Backend accepts a plan-change request                                   | No: not payment                            |
| `subscription_cancellation_requested` | Backend accepts a cancellation request                                  | No                                         |
| `facility_settings_saved`             | Facility-preferences save API succeeds                                  | No: product adoption                       |
| `workspace_branding_saved`            | Workspace-branding save API succeeds                                    | No: product adoption                       |
| `coverage_requirements_saved`         | All coverage-creation requests in a submission succeed                  | No: product adoption                       |
| `schedule_created`                    | Manual schedule creation API succeeds                                   | No: product adoption                       |
| `schedule_updated`                    | Manager's schedule-edit API succeeds                                    | No: product adoption                       |
| `schedule_draft_generated`            | Draft-generation API succeeds from coverage creation or draft board     | No: product adoption                       |
| `schedule_published`                  | All requests in selected/all publishing batch succeed                   | No: product adoption                       |

`calculator_summary_requested` covers call-out cost, overtime cost, time-clock
accuracy, cost leak, and turnover ROI. PDF tracking covers the three calculators
using the shared PDF exporter; the other calculators do not currently expose that
download. Request acceptance is not verified email delivery. Likewise, a download
event means the browser download was initiated, not proof a file was saved or read.
Legacy calculators may not be reachable through the current public routes.

## Subdomains and product usage

The same deployed app initializes the tag on both business domains and their
subdomains. Every event includes `site_area` (`main_site` or `workspace`) and
`page_area` (such as `schedule`, `coverage`, `billing`, or `payroll_exports`).
GA4's built-in **Hostname** distinguishes the specific tenant host. No separate
tag is required per workspace. This is coverage, not proof cookies/sessions are
shared correctly; verify cookie behavior on a production test workspace.

Known private areas emit separate pageviews even though `page_location` remains
the sanitized `/portal` URL. Use **Page area**, not page path alone, to compare
product usage. Unknown private routes remain a generic `portal` area; repeated
navigation within the same sanitized area is deliberately deduplicated.
Password reset is still generic and its token is excluded.

Build an adoption funnel for `sign_up` > `facility_settings_saved` >
`coverage_requirements_saved` > `schedule_published`, but only when those events
can be linked to the same observed user. This is not account-level retention or
an exact onboarding sequence; settings may be saved repeatedly, different admins
may perform different steps, and browser/cookie restrictions can break continuity.
Use backend data for authoritative organization activation and retention.

No staff-level attendance, message content, time-off reasons, payroll amounts,
shift times, roster IDs, employee names, or calculator inputs are added to GA4.
Page-area reporting shows feature visits, not successful clock-ins or approvals.
Review consent and tenant privacy obligations before collecting workspace usage.
Confirmed demo bookings, verified payments, detailed error reporting, and other
unlisted actions are not implemented by this expansion.

Events cover all visitors, not just first-time users. Failed validation, rejected
signup/login requests, and merely opening the workspace finder are not successful
signup/login events. No email, password, phone number, form value, user ID, or
organization name is added to these custom event payloads.

Calendly opens outside the app. This code cannot confirm a booking there. Configure
Calendly's GA integration, if available on your plan, with the same ID and make an
actual test booking to discover/verify the completion event (commonly
`invitee_meeting_scheduled`). Mark that verified completion event as a key event.
Do not count both a click and a completed booking as separate acquired leads.
Check attribution too: using the same ID on Calendly does not by itself guarantee
the booking is attributed to the original LinkedIn/email session. A supported
embedded booking flow or verified webhook/server integration is an alternative.

Do not emit `purchase` just because `/billing/success` loads. A reliable paid SaaS
conversion requires a verified Stripe/backend outcome, transaction deduplication,
and an agreed rule for trials, initial payments, and renewals. That is not
implemented in this frontend change. `qualify_lead` and `close_convert_lead`
should represent actual qualification and sales outcomes, not arbitrary clicks.

## Required GA4 settings before deploying

1. Open Admin > Data streams > your existing web stream. Rename it to
   **WiserShifts Website**, with your canonical WiserShifts website URL.
2. Turn **Enhanced measurement off** for this stream initially. This implementation
   sends pageviews itself, including SPA navigation, and disables the automatic
   initial pageview. Enhanced history-based pageviews can otherwise duplicate
   views; automatic form/search/click tracking can send unsanitized URLs or values.
   This also disables automatic scroll and outbound click events. Re-enable
   individual features only after reviewing their payloads and duplication risk.
3. Under Admin > Data display > Key events, add `sign_up` (or mark it as a key
   event from Events after it appears). Add the verified Calendly completion
   event when that integration is tested. Interface labels may vary.
4. For business outcome events, start with **once per event**. Use once per session
   only when that matches your metric. Repeated visits to a page are not new sales.
5. If people really navigate between `wisershifts.com` and `easishift.com`, configure
   cross-domain measurement under the Google tag's domain settings and verify the
   linker survives navigation. The same tag alone is not sufficient. Same-root
   subdomains normally share GA cookies with the default cookie-domain behavior;
   verify this in your browser rather than assuming all deployments behave alike.
6. Register `site_area`, `page_area`, `cta_path`, `cta_location`, `account_type`,
   `calculator_type`, `asset_type`, and `publish_mode` as event-scoped custom
   dimensions if you need them in standard reports/explorations. Useful display
   names include **Site area** and **Page area**. `method` is sent as `password`.
   Custom dimension registration does not backfill old data.

GA4 key events measure important actions in Analytics. Google Ads conversions
are a separate advertising configuration. Creating a key event does not create
the underlying website action or magically send its event. A multi-step sequence
belongs in a funnel exploration unless you explicitly implement a completion event.

## Data hygiene and privacy

- Production builds collect only on `wisershifts.com`, `easishift.com`, and their
  subdomains. Localhost, local tenant hosts, and Netlify preview hosts are excluded.
- Public page URLs retain only `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`, `utm_term`, and `utm_id`. Other queries and fragments, including
  reset tokens and `_kx`, are removed from the URLs this helper sends.
- Private routes and password-reset routes are grouped into `/portal` with a
  generic page title. Known product areas are distinguished by the allowlisted
  `page_area` parameter, not raw URLs or record identifiers. Hostnames remain
  available to separate root/tenant traffic.
- Google Signals and ad personalization are disabled in this tag configuration.
- Sanitizing our payloads is not a complete privacy guarantee for Google's SDK or
  other tags. Review actual network requests. Never place personal or health data
  in UTMs, URLs, or event parameters. Review tenant analytics permissions separately.
- There is no consent manager in this change. Collection still starts immediately
  on eligible production hosts, as the old tag did. Where analytics consent is
  required, gate initialization on consent and implement withdrawal before rollout;
  do not treat a privacy-policy link as consent.
- Historical local traffic and historical attribution are not corrected by this
  code. Configure internal/developer traffic filters carefully; active filters
  permanently exclude future matching data.

## Track LinkedIn, Reddit, and email campaigns

Use tagged links for external campaigns, with consistent lowercase labels:

```text
https://wisershifts.com/?utm_source=linkedin&utm_medium=social&utm_campaign=staffing_october&utm_content=post_01
https://wisershifts.com/calculators?utm_source=reddit&utm_medium=social&utm_campaign=staffing_october&utm_content=discussion_01
https://wisershifts.com/?utm_source=klaviyo&utm_medium=email&utm_campaign=staffing_october&utm_content=email_01
```

Do not use UTMs on internal links. Campaign values are public metadata, not a place
for names or emails. Make sure any link shorteners or redirects preserve queries.
Use plain `&` separators in the posted URL, not the HTML spelling `&amp;`.

An untagged LinkedIn click is not necessarily Direct: GA4 can use a referrer when
present. Direct means attribution information was unavailable, not proof that the
visitor typed the URL. `_kx` suggests Klaviyo link tracking but does not prove a
human clicked or that the campaign worked. Email security scanners can create
visits too. Three engaged Reddit users are not enough evidence to scale a channel.

## Verification

Run these local checks:

```sh
node --test src/utils/analytics.test.js
npm run build
```

Normal local development does not send analytics. For a deliberate DebugView test,
set `VITE_GA_DEBUG=true` in your local Vite environment and restart the dev server.
This opt-in DOES send test events to your selected real property. Prefer a test
property using `VITE_GA_MEASUREMENT_ID`, or review a developer-traffic filter first.
The debug flag is ignored in production builds.

1. Open a tagged LinkedIn URL with analytics allowed by your consent setup/browser.
   In DebugView, confirm a single `page_view` with the tagged public URL.
2. Navigate to another public page and back. Expect one pageview per navigation,
   not two. Reloading legitimately creates another pageview.
3. Click Book a demo. Expect `book_demo_click`, not a completed-lead event.
4. Test a failed signup/login: no `sign_up`/`login`. Then use a test backend/account
   for successful flows: exactly one success event per successful submission.
5. Visit a reset URL containing a test token. Inspect payloads for `/portal` and
   confirm the token is absent. Check private routes and referrers too.
6. Make a real test booking through Calendly and verify its completion event and
   source attribution separately. This requires configuration outside the repo.
7. After deploying and processing, inspect Traffic acquisition by **Session
   source / medium** and **Session campaign**, with `sign_up` and confirmed bookings.
   Realtime/DebugView are faster for testing than processed reports.
8. On a test workspace, move between schedule, coverage, and billing. Confirm
   distinct `page_area` values and `site_area=workspace`, with no raw private
   queries. Verify the appropriate action event after a successful workflow;
   rejected requests must not produce completion events. A partially successful
   batch does not emit a batch-completion event, even if some records were saved.
9. Test a calculator summary rejection and acceptance, plus a PDF download.
   Expect no summary event for rejection and no submitted personal/financial
   values in GA4. Review checkout and export events against test backend outcomes.

Ad blockers, denied consent, network failures, and browser privacy limits can stop
collection. Client-side events are not an authoritative ledger of accounts or sales.
Reconcile them against your backend, Calendly, and billing records.

## Weekly business review

Compare visitors, completed demos, organization signups, and eventually paid
customers by campaign. Keep root marketing traffic separate from tenant staff
logins; frequent customer login is not evidence of new-customer acquisition.
In Explore, build separate funnels for `page_view` > `signup_click` > `sign_up`,
and demo clicks > verified booking completion once attribution is working.
GA4 can show drop-off, but cannot establish the reason without additional evidence.

For a chosen cohort, calculate signup rate as users completing signup divided by
users in that cohort. Do not confuse it with key-event counts divided by users,
or session key-event rate. Compare consistent date windows and denominators.
An engaged session lasts longer than the configured threshold (10 seconds by
default), contains a key event, or has at least two page/screen views. Active users
and engaged sessions are related but not interchangeable metrics.

Zero recorded key events could mean no completions, missing instrumentation, or
blocked collection. The pasted September report is not independently verified
here. Claims about hidden LinkedIn traffic, redirect problems, universal SaaS
benchmarks, or guaranteed marketing success cannot be established from it alone.
Attribution models allocate credit across observed eligible touchpoints; they do
not reveal untracked social impressions or explain every Direct visit.
