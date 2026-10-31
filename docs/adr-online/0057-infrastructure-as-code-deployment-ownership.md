# ADR-0057: Infrastructure-as-code and deployment ownership

- **Status:** Proposed
- **Date:** 2026-10-28
- **Deciders:** Snorre
- **Related:** ADR-0048, ADR-0053, ADR-0055, ADR-0056

## Context

ADR-0055 defines the M4 Worker/DO deployment shape: a Worker endpoint, one
`GameRoom` Durable Object, a `wrangler.jsonc`, and a separate
`deploy-worker.yml`. That is a deployment recipe, not a complete
infrastructure-as-code decision.

The open questions are:

- Is Wrangler the source of truth for Worker code and bindings?
- Is Terraform used for account-level resources such as DNS, custom domains,
  routes, WAF/rate limits, or future storage?
- Who owns a resource when both tools can manage it?
- Where does Terraform state live, and how are secrets kept out of it?
- How are multiple Workers and environments laid out?
- What happens on rollback when Worker code and account infrastructure change
  independently?

Wrangler is the official Workers build/deploy tool and understands bundling,
local development, Durable Object class lifecycle, versions, and
`workers.dev`. It is not a stateful IaC system: it has no plan, state, or drift
detection.

Terraform is a stateful IaC system and is appropriate for account/zone
resources. Cloudflare’s Terraform provider supports Workers scripts and
Durable Object namespaces, but its IaC guidance notes that Durable Object
migrations are applied with deployments; a first apply that creates a class and
binds to it in the same version can fail. The documented workaround is a
two-phase apply, or managing the Worker/deployment resource with Terraform while
using Wrangler for build and Version management.

M4 is a free-tier two-player demo with a `workers.dev` endpoint and no custom
domain. It needs a clear, low-risk ownership model now and a path to full
account-level IaC later.

## Decision

### 1. Wrangler is canonical for Worker code and configuration

The `worker/` project is the source of truth for:

- Worker name, entrypoint, compatibility date, and compatibility flags;
- Durable Object binding and class lifecycle (`exports`);
- `workers_dev` and Worker-scoped routes;
- vars, observability, limits, and assets (if added later);
- environment-specific Worker names and bindings.

The checked-in `worker/wrangler.jsonc` is authoritative. The Wrangler version is
pinned in `package.json`, and the config schema is resolved from that pinned
version. Deployments use the pinned version, not a global Wrangler install.

New Worker code should use the declarative `exports` field for Durable Object
classes, not the legacy `migrations` array. Existing Workers that already use
`migrations` keep their migration history until a separate migration decision.

```jsonc
{
  "name": "shrinkonauts-rooms",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-28",
  "workers_dev": true,
  "durable_objects": {
    "bindings": [
      { "name": "ROOMS", "class_name": "GameRoom" }
    ]
  },
  "exports": {
    "GameRoom": {
      "type": "durable-object",
      "storage": "sqlite"
    }
  }
}
```

`exports` and legacy `migrations` are mutually exclusive. A new M4 Worker uses
`exports`; a legacy Worker with migration history stays on `migrations`.

### 2. Terraform is optional and account-scoped

Terraform, if adopted, owns only account/zone resources:

- DNS records and custom domains;
- zone-level Worker routes that are not declared in `wrangler.jsonc`;
- WAF, rate limiting, and account-level security policy;
- future R2/KV/D1/Queues resources that are not auto-provisioned by Wrangler;
- account-level configuration and access policy.

Terraform does **not** own the M4 Worker script or its Durable Object class
unless a later ADR explicitly transfers that ownership. Wrangler remains the
build/version/deploy path for Worker code.

Terraform is **not required for M4**. A `workers.dev` deployment with no custom
domain can ship with Wrangler only. Terraform is introduced when a custom
domain, multiple Workers, shared account resources, or reproducible
account-level configuration justify it.

### 3. No dual ownership

Every resource has exactly one owner:

| Resource | Owner |
|---|---|
| Worker script, bindings, `exports`, compatibility settings | Wrangler |
| Worker-scoped routes declared in `wrangler.jsonc` | Wrangler |
| DNS, custom domain, zone-level routes | Terraform (if adopted) |
| WAF/rate limiting, account policy | Terraform (if adopted) |
| Runtime secrets | GitHub Actions + Cloudflare secret store |
| CI API token/account ID | GitHub Actions secrets |
| Terraform state | Remote state backend, never the repository |

A resource must not be created by Terraform and then redeployed with a
different Wrangler config (or vice versa). If ownership changes, the old tool
stops managing the resource in the same change that imports it into the new
tool.

### 4. Secrets

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live in GitHub Actions
  secrets.
- Worker runtime secrets use Wrangler/Cloudflare secret storage or Secrets
  Store, not `wrangler.jsonc` and not Terraform state.
- Terraform state must not contain API tokens, room secrets, or user data.
- No secret is committed to the repository or bundled into the client.

### 5. Environments

| Environment | Worker | Config | Deploy |
|---|---|---|---|
| Local | `wrangler dev` | local `wrangler.jsonc` / `.dev.vars` | manual |
| Staging | separate Worker name | `env.staging` | manual or protected workflow |
| Production | `shrinkonauts-rooms` | top-level config | `main` workflow |

M4 may ship only local + production. Staging is added when a custom domain or
multiple Workers make pre-production verification worthwhile. Environment
names and routes are explicit; no production deploy from a feature branch.

### 6. CI and deployment

- `deploy-worker.yml` runs online checks, then `npx wrangler deploy` or
  `cloudflare/wrangler-action` with the pinned Wrangler version.
- `deploy-pages.yml` remains independent.
- `terraform fmt -check` and `terraform plan` run only if `infra/terraform/`
  exists; `apply` is limited to `main` and protected environments.
- Workflows use concurrency groups so two Worker deploys cannot race.
- A Worker deploy disconnects WebSocket sessions; clients reconnect to a new
  room. A Terraform apply must not silently replace the Worker script.

### 7. Multiple Workers

If M4.1 or later adds Workers (for example a separate admin or matchmaking
Worker), use one directory per Worker:

```text
worker/
  relay/
    wrangler.jsonc
    src/
  admin/
    wrangler.jsonc
    src/
infra/
  terraform/
    cloudflare/
```

Each Worker has its own Wrangler config, bindings, and deploy workflow. Terraform
manages shared DNS/routes/policy only. Service bindings between Workers are
declared in Wrangler; Terraform does not create duplicate service bindings.

### 8. Rollback

- Worker code rollback: rerun the known-good `Deploy Worker` workflow or use
  `wrangler rollback`.
- Account infrastructure rollback: Terraform plan/apply against the previous
  state; never edit state by hand.
- Do not use a Terraform apply to roll back Worker code.
- Do not use Wrangler to roll back DNS, custom domains, or WAF policy.
- Rollback ends active online sessions; the client treats it as host-left or
  reconnect-to-new-room.

### 9. Migration path to Terraform

If the project later wants Terraform to own more:

1. Freeze Wrangler ownership for the target resource.
2. Import the existing resource into Terraform state.
3. Verify `terraform plan` is empty.
4. Remove the resource from Wrangler config or disable its management.
5. Document the ownership change in a new ADR.

Durable Object class migration into Terraform follows Cloudflare’s two-phase
procedure: create/apply the class without the binding first, then add the
binding in a second apply. Do not attempt a first apply that creates a class and
binds to it simultaneously.

## Consequences

**Easier:**

- Wrangler remains the fast, official path for Worker code and Durable Objects.
- M4 can ship with `workers.dev` and no Terraform state.
- Account-level resources can become reproducible later without rewriting the
  Worker.
- Ownership is explicit, so drift and deploy fights are avoided.
- Secrets never enter Terraform state.

**Harder:**

- Two tools mean two rollback paths and two sets of credentials.
- Terraform adds state, locking, and CI plan/apply work when adopted.
- DO migration ordering needs care if Terraform ever owns the class.
- Multiple Workers need a directory/workflow convention.

**Constrained:**

- No Terraform-only Worker deployment in M4.
- No dual-managed DNS/routes.
- No secrets in Terraform state or `wrangler.jsonc`.
- No production deploy from a feature branch.
- No automatic migration of existing DO classes in this ADR.

## Alternatives considered

- **Terraform-only for Workers and Durable Objects.** Rejected for M4: the
  first-apply DO migration ordering is awkward, iteration is slower, and
  Wrangler is still needed for local dev/bundling. Revisit only with a
  two-phase migration plan and a concrete need.
- **Wrangler-only forever.** Rejected as a long-term position: it cannot manage
  account-level DNS/WAF/policy or detect drift. Accepted for M4’s
  `workers.dev` scope.
- **Cloudflare dashboard clicks.** Rejected: not reproducible, not reviewable,
  and easy to drift.
- **A different IaC tool (Pulumi/CDK/Alchemy).** Not adopted in M4. A future
  ADR may evaluate one if it handles Workers/DO lifecycle better.
- **Terraform owns the Worker, Wrangler only builds.** Rejected for M4: two
  owners for one artifact and unclear version semantics.

## Tests

- `worker/wrangler.jsonc` validates against the pinned schema.
- `npx wrangler deploy --dry-run` succeeds without deploying.
- Local `wrangler dev` starts and serves `/ws`.
- CI uses the pinned Wrangler version; no global install is required.
- If Terraform exists: `terraform fmt -check`, `terraform validate`, and
  `terraform plan` run on PR; state is remote and locked.
- No secret appears in `wrangler.jsonc`, Terraform state, or the client bundle.
- A resource is not present in both Wrangler and Terraform ownership.
- Worker deploy disconnect is handled as a session end/reconnect.
- Terraform plan is empty after import/migration.

## References

- [ADR-0055](0055-deployment-versioning-rollback.md) — deployment, versioning,
  and rollback.
- [ADR-0048](0048-session-topology-room-lifecycle.md) — Worker/DO session
  topology.
- [ADR-0053](0053-failure-reconnect-host-lifecycle.md) — deploy disconnect and
  session end.
- [Cloudflare Workers IaC guidance](https://developers.cloudflare.com/workers/platform/infrastructure-as-code)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Durable Object class exports](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations)
