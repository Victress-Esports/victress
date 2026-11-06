# Stripe: record for M4 (nothing is implemented yet)

Billing stays off (`NEXT_PUBLIC_BILLING_ENABLED=false`) until checkout, cancellation and webhooks are tested.
These **test-mode** products and prices already exist. Do not create duplicates.

| Plan | Product | Price |
|---|---|---|
| Pro, monthly | `prod_VZmwLOIqKOJ988` | `price_1UYdMWP3pSL2v8NHDOoAeNmv` |
| Pro, annual | `prod_VZmwLOIqKOJ988` | `price_1UYdMWP3pSL2v8NHhLbhhXsB` |
| Team, monthly | `prod_VZmwzsdpWW9rtG` | `price_1UYdMuP3pSL2v8NH2e7HWUZD` |
| Scout, monthly | `prod_VZmx7WPkAn88pN` | `price_1UYdNCP3pSL2v8NHcIyuuyge` |

Price IDs are not secrets, but they go in server-side env vars (not `NEXT_PUBLIC_`):

```
STRIPE_PRICE_PRO_MONTHLY=price_1UYdMWP3pSL2v8NHDOoAeNmv
STRIPE_PRICE_PRO_ANNUAL=price_1UYdMWP3pSL2v8NHhLbhhXsB
STRIPE_PRICE_TEAM_MONTHLY=price_1UYdMuP3pSL2v8NH2e7HWUZD
STRIPE_PRICE_SCOUT_MONTHLY=price_1UYdNCP3pSL2v8NHcIyuuyge
```

At M4 the exact env vars and webhook events to enable will be listed here.
