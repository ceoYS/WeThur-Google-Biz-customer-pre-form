# Customer flow

1. The administrator creates one case and configures common, industry, issue, prefilled, custom-question, and requested-evidence data.
2. The customer receives `/intake/<opaque-token>`. The token is a bearer secret and should be sent through the agreed private contact channel.
3. The opening explains that the questions organize history rather than find fault. It shows expected time, save-and-return behavior, and password/OTP warnings.
4. The customer moves through seven friendly sections. Conditional logic shows only relevant questions.
5. Repeatable history events and current profile candidates are limited to ten each. Approximate or unknown answers are accepted.
6. Evidence is signature-validated, stored privately, and removable by the customer until final submission.
7. Draft saves are server-side and the same link resumes the response. The link may also be used for optional local recovery, but Supabase remains authoritative.
8. Final submission runs required-answer validation and a database transaction. A submitted link shows completion and cannot submit twice unless an administrator reopens it.
9. The completion page provides the case code, review sequence, possible follow-up explanation, and a clear no-guarantee statement. It does not present an instant diagnosis as fact.

## Safety language

- Ask what the customer remembers; never imply wrongdoing.
- Offer `잘 모르겠어요`, `기억나지 않아요`, `해당 없음`, or `확인이 필요해요` where appropriate.
- Never ask for passwords, OTPs, recovery codes, or unnecessary identity/financial data.
- Never state that a visible profile is fake, illegal, duplicate, unauthorized, or a policy violation before verification.
- Never promise Google approval, restoration, visibility, deletion, ranking, verification, or ownership transfer.
