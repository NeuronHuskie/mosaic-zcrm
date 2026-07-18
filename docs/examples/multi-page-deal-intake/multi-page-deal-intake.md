# Example: New Deal Intake Wizard

A 3-page form wizard for capturing new deal information. Each page uses `default_values` to pre-populate from prior state, including CRM record data on page 1. Back buttons return unvalidated data so the user's entries are preserved when navigating between pages.

---

## What it demonstrates

- Multi-page loop using a shared `state` object and a `page` variable
- `validate: false` on Back buttons — form closes without enforcing required fields, returning whatever the user had typed
- `default_values` re-populating each page on return, preserving entries across navigation
- Page 1 seeded from `$Page.record` via per-field `default_value`, overridden by `default_values` after back-navigation
- A `group` with `style: 'outlined'` shown or hidden by a radio field condition
- A conditional field inside a group that references another field within the same group
- A labeled `divider` separating form sections
- Cancelling at any page aborts the entire flow

---

## Code

```javascript
const record = $Page.record;
const state  = {};
let   page   = 1;

while (page >= 1 && page <= 3) {

    // ╭──────────────────────────────────────────────────╮
    // │  page 1 · deal basics                            │
    // ╰──────────────────────────────────────────────────╯

    if (page === 1) {
        const r1 = mosaic.form({
            title:  'New Deal (1 of 3) — Basics',
            height: '420px',
            width:  '600px',
            fields: [
                { name: 'deal_name', label: 'Deal Name',  type: 'text',     required: true,
                  default_value: record.Deal_Name },
                { name: 'account',   label: 'Account',    type: 'text',     required: true,
                  default_value: record.Account_Name },
                { name: 'amount',    label: 'Amount ($)', type: 'number',   required: true, min: 0, width: '50%' },
                { name: 'stage',     label: 'Stage',      type: 'picklist', required: true, width: '50%',
                  options: ['Prospecting', 'Qualified', 'Proposal Sent', 'Negotiation'] }
            ],
            default_values: state.page1 ?? {},
            buttons: ['Cancel', { label: 'Next', style: 'primary' }]
        });

        if (mosaic.utils.isCancelled(r1) || mosaic.utils.wasDismissed(r1)) return;
        state.page1 = mosaic.utils.getData(r1);
        page = 2;
        continue;
    }

    // ╭──────────────────────────────────────────────────╮
    // │  page 2 · competitive context                    │
    // ╰──────────────────────────────────────────────────╯

    if (page === 2) {
        const r2 = mosaic.form({
            title:  'New Deal (2 of 3) — Competitive Context',
            height: '560px',
            width:  '600px',
            fields: [
                { name: 'has_competitor', label: 'Is there a competitor involved?',
                  type: 'radio', required: true, options: ['Yes', 'No'] },

                { name: 'competitor_details', type: 'group', label: 'Competitor Details', style: 'outlined',
                  conditions: [{ field: 'has_competitor', operator: 'equals', value: 'Yes' }],
                  fields: [
                      { name: 'competitor_name',      label: 'Competitor',      type: 'text',     required: true },
                      { name: 'competitor_strengths', label: 'Their Strengths', type: 'textarea', rows: 3 },
                      { name: 'is_incumbent', label: 'Are we the incumbent?',
                        type: 'radio', required: true, options: ['Yes', 'No'] },
                      { name: 'incumbent_notes', label: 'Incumbent Context', type: 'textarea', rows: 2,
                        instructions: 'Explain why the customer is considering switching.',
                        conditions: [{ field: 'is_incumbent', operator: 'equals', value: 'No' }] }
                  ]
                },

                { type: 'divider', label: 'Forecast' },

                { name: 'win_probability', label: 'Win Probability (%)', type: 'number', min: 0, max: 100,
                  instructions: 'Your current estimate. Leave blank if unknown.' }
            ],
            default_values: state.page2 ?? {},
            buttons: [
                'Cancel',
                { label: 'Back', value: 'back', style: 'secondary', validate: false },
                { label: 'Next', style: 'primary' }
            ]
        });

        if (mosaic.utils.isCancelled(r2) || mosaic.utils.wasDismissed(r2)) return;
        state.page2 = mosaic.utils.getData(r2);
        page = mosaic.utils.wasButtonValue(r2, 'back') ? 1 : 3;
        continue;
    }

    // ╭──────────────────────────────────────────────────╮
    // │  page 3 · next steps                             │
    // ╰──────────────────────────────────────────────────╯

    if (page === 3) {
        const r3 = mosaic.form({
            title:  'New Deal (3 of 3) — Next Steps',
            height: '500px',
            width:  '600px',
            fields: [
                { name: 'needs_follow_up', label: 'Schedule a follow-up?',
                  type: 'radio', required: true, options: ['Yes', 'No'] },

                { name: 'follow_up_details', type: 'group', label: 'Follow-up Details', style: 'outlined',
                  conditions: [{ field: 'needs_follow_up', operator: 'equals', value: 'Yes' }],
                  fields: [
                      { name: 'follow_up_date', label: 'Date', type: 'date', required: true,
                        disable_past_dates: true, width: '50%' },
                      { name: 'follow_up_type', label: 'Type', type: 'picklist', required: true,
                        options: ['Call', 'Email', 'Demo'], width: '50%' },
                      { name: 'follow_up_notes', label: 'Notes', type: 'textarea', rows: 3 }
                  ]
                }
            ],
            default_values: state.page3 ?? {},
            buttons: [
                'Cancel',
                { label: 'Back',   value: 'back', style: 'secondary', validate: false },
                { label: 'Submit', style: 'primary' }
            ]
        });

        if (mosaic.utils.isCancelled(r3) || mosaic.utils.wasDismissed(r3)) return;
        state.page3 = mosaic.utils.getData(r3);

        if (mosaic.utils.wasButtonValue(r3, 'back')) {
            page = 2;
            continue;
        }
        break;
    }
}

// ╭──────────────────────────────────────────────────╮
// │  submit                                          │
// ╰──────────────────────────────────────────────────╯

const deal = { ...state.page1, ...state.page2, ...state.page3 };

// deal.deal_name                       → string
// deal.account                         → string
// deal.amount                          → number
// deal.stage.actual_value              → string  (picklist)
// deal.has_competitor.actual_value     → 'Yes' | 'No'  (radio)
// deal.competitor_name                 → string | undefined  (absent when has_competitor = 'No')
// deal.win_probability                 → number | undefined  (optional — absent if left blank)
// deal.needs_follow_up.actual_value    → 'Yes' | 'No'  (radio)
// deal.follow_up_date                  → 'yyyy-MM-dd' | undefined  (absent when needs_follow_up = 'No')
// deal.follow_up_type.actual_value     → string | undefined

mosaic.splash.success('Deal intake complete.');
```

---

## Notes

- **`validate: false` on Back**: The Back button skips required-field validation and returns the raw (possibly incomplete) form data. Saving that to `state` and passing it back as `default_values` pre-fills whatever the user had typed when they return to the page. Required fields that were left blank simply won't block navigation.

- **`default_values` vs per-field `default_value`**: Page 1 seeds its fields from `$Page.record` using per-field `default_value`. On first load, `state.page1` is `undefined` so `?? {}` yields an empty object — no keys match and the per-field record values are used. After back-navigation, `state.page1` holds the user's entries and `default_values` overrides those keys, replacing the original record values with what the user had filled in.

- **Conditional fields are absent, not null**: Fields hidden by conditions at submit time are excluded from `response.data` entirely — not present as `null` or empty. When you spread the page state objects into `deal`, keys like `competitor_name` are simply missing when the competitor section was never shown. Use `'competitor_name' in deal` rather than `deal.competitor_name != null` to check presence.
